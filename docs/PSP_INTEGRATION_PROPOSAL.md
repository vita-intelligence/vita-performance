# PSP ↔ vita-performance integration — proposal

> Draft. Audit complete on 2026-07-07. Read the audit sections first if you want the "why"; jump straight to §5 for the concrete plan.

## 0. TL;DR

PSP already owns Manufacturing Orders, Workstations, Routings, BOMs and Items with a full production lifecycle. vita-performance already owns the shop-floor execution layer — kiosks, workers, PINs, sessions, quantity/rejected/perf %, dynamic forms, QC. **The two apps model overlapping-but-not-identical concepts and today store both independently.** The integration collapses that overlap so **PSP is the source of truth for Items, Workstations, Workers, and MOs; vita-performance is the source of truth for real-time execution events on those entities, and pushes them back into PSP.**

Concretely, three pieces of new work:

1. **A service-token auth path in PSP** (new; PSP has no machine-to-machine today).
2. **An `HR` context in PSP** (new; PSP only has `User.hourly_wage` and no shift/skill/availability concept).
3. **A `psp_sync` app in vita-performance** that pulls Items/Workstations/Workers/MOs from PSP on a schedule + on-demand, and pushes session events back.

Everything else already exists. **Estimated ~6 weeks of engineering** if done as a single track, or 3 parallel PR streams that ship in ~3 weeks.

---

## 1. What each side already has (short version)

### PSP (Elixir/Phoenix, `vita-psp-*` — planned Azure deploy)

- **Manufacturing Order**: 8-state lifecycle (`draft → prepared → approved → scheduled → in_progress → completed/cancelled`), chains via `parent_mo_id`, output lot at Finish, purchasing gate, warehouse-pickup workflow, sign-off ceremony.
- **MO Step** (= operation): routing snapshot, has `planned_start` / `planned_end` / `actual_start` / `actual_end` / `planned_segments` (jsonb), bookings, assignment state.
- **Workstation**: `hourly_rate`, `productivity`, `idle_from/to`, belongs to `workstation_group` (rate inheritance), `default_workers` join table to `User`, **`external_id` UUID field already in place for vita-performance sync**.
- **Routing** + **BOM**: ordered steps per item, `is_primary` per item.
- **User**: RBAC via `permissions` array, MFA, `hourly_wage` (single decimal, no shift model).
- **Auth**: Phoenix.Token (7-day, `token_version` for revocation) OR DB-backed device tokens for mobile. **No machine-to-machine tokens.**
- **Tenancy**: singleton `Company` today; every query already scopes by `company_id`, multi-tenant-ready.

### vita-performance (Django/DRF, `vita-performance-*` on Azure UK South / West Europe)

- **User** = tenant. Vita is one user account.
- **Workstation**: `name`, `target_quantity`, `target_duration`, `uom`, `performance_formula` (simpleeval), `kiosk_token` (public UUID), overtime overrides.
- **Worker**: `full_name`, `pin` (hashed), `hourly_rate`, `is_qa`, `reputation_score` (300–850), `group`.
- **Item**: just `(user, name)`. Very thin — this is what needs the biggest change.
- **WorkSession**: workers M2M, workstation, item, `status` (active/completed/verified), start/end, `quantity_produced`, `quantity_rejected`, `performance_percentage`, `override_target_quantity / duration / task_name`.
- **DynamicForm**: JSON-schema forms triggered `start` / `end` / `both` per workstation. Numeric answers feed the performance formula.
- **Kiosk flow**: public UUID → PIN → **item search** → SOP → start-form → start → work → stop-form → stop (with quantity).
- **Auth**: JWT httpOnly cookies for the app; UUID tokens for kiosk + QC.
- **No `external_id` anywhere.** **No bulk import.** **No outbound webhooks.**

---

## 2. What each side is missing for this integration

| Capability | PSP | vita-performance |
|---|---|---|
| Machine-to-machine auth (API key) | **Missing** — add | Consumer only — no change |
| `HR` module (Employee, shift, skill, availability, wage history) | **Missing** — build new context | N/A — will consume via sync |
| `external_id` fields for cross-system mapping | On Workstation ✅ / Item ✅ / Customer ✅ / **missing on MO, MO Step, User** | **Missing everywhere** — add to Item, Worker, Workstation, WorkSession |
| Bulk read/pull endpoints | Existing REST endpoints suffice | **Missing** — add `/api/sync/pull-mos/` etc. or just push-based |
| Outbound webhooks / event push | Optional (broadcast on channels already exists) | **Missing** — need to add for session events |
| Idle-workstation availability for scheduler | ✅ (`idle_from/to`) | ✅ (`is_active`) |
| Kiosk item picker fed from live MO list | N/A | Currently: local `Item` fuzzy search — **change to: fetch active PSP MOs for this workstation** |

---

## 3. Integration goals (restated from your ask)

1. **When an operator picks a task at the kiosk, they should see only the currently-available MOs from PSP** for that workstation (not a free-text item search).
2. **People, wages, roles, working hours managed in PSP's HR tab** (new). vita-performance mirrors them so kiosks + reputation scores + wage costs still work.
3. **Workstations become PSP workstations** — one source of truth. vita-performance workstations disappear from the "Add workstation" UI and get created in PSP's `/production/workstations` page.
4. **Each MO has a proper route** — vita-performance sessions are attached to a specific MO step, so PSP can show "who worked on step 3 of MO-00042, how long, how much they produced, what QC verdict."
5. **Everything else operators do at the kiosk stays exactly the same** — PIN, forms, SOP, quantity, notes.

---

## 4. Proposed architecture — the 30-second view

```
                    ┌──────────────────────────────────┐
                    │            PSP (Phoenix)         │
                    │                                  │
                    │  Company · Users · HR (new) ·    │
                    │  Items · Workstations · Routings │
                    │  · BOMs · Manufacturing Orders   │
                    │  · MO Steps · MO Bookings        │
                    │                                  │
                    └─────────▲──────────────────▲─────┘
                              │                  │
                              │ REST + Bearer    │ REST + Bearer
                              │ (PSP → VP: reads) │ (VP → PSP: writes)
                              │                  │
                              │  X-Integration-  │
                              │  Token: eyJ…      │
                              │                  │
                    ┌─────────┴──────────────────┴─────┐
                    │       vita-performance (Django)   │
                    │                                  │
                    │  psp_sync (new app)              │
                    │    · pull MOs → local mirror     │
                    │    · pull Workers, Workstations, │
                    │      Items, MO Steps             │
                    │    · push WorkSession events     │
                    │      back to PSP                 │
                    │                                  │
                    │  Kiosk consumes local mirror     │
                    │  (fast, resilient to PSP down)   │
                    └──────────────────────────────────┘
```

- **PSP is the source of truth** for Items, Workstations, Workers, MOs, MO Steps.
- **vita-performance keeps a local mirror** (cache-plus, in Postgres tables it already has), refreshed on a 60-second timer + on-demand when the kiosk asks.
- **Reads** during a kiosk flow: local mirror first, PSP for freshness check on the specific MO the operator picks.
- **Writes** (WorkSession events): pushed to PSP immediately; queued in a local outbox table if PSP is unreachable, retried until delivered.

Why this shape:

- **Kiosk stays up if PSP is down.** Factory floors don't get to stop because a Phoenix release is being deployed. The 60-second-stale cache is fine.
- **Session data is real-time** to PSP because that's the whole point of the integration — planners see step progress live.
- **Both sides retain their operational stores** — no shared database, no logical replication, no ETL. Just REST + a token.

---

## 5. The concrete plan

### 5.1 Auth: new PSP `IntegrationToken` (Week 1)

**Why:** PSP has zero machine-to-machine paths today. Reusing a user account is tempting but wrong — bumping `token_version` on password change would silently break the integration, and the token would show up in RBAC audit as "that user did it" for every kiosk event.

**PSP changes:**

- New Ecto schema `Backend.Accounts.IntegrationToken`:
  - `id`, `company_id`, `name` (e.g. `"vita-performance"`), `token_hash` (bcrypt), `token_prefix` (first 12 chars for display), `scopes` (array — e.g. `["mo:read", "mo:write:session", "workstation:read", "user:read"]`), `is_active`, `last_used_at`, `created_by`, `revoked_at`, `revoked_by`.
- New plug `BackendWeb.Plugs.RequireIntegrationAuth` — reads `X-Integration-Token: psp_live_…` header, looks up by prefix, bcrypt-checks the remainder, denies on scope mismatch, updates `last_used_at`.
- New pipeline `api_integration` and route scope `/api/integration/…`.
- New page in `/settings/integrations` (mirrors the existing settings pattern) — Max mints/rotates/revokes tokens with a copy-once display.
- Full audit log entry on every request via this pipeline (`actor_kind = :integration_token`).

**vita-performance changes:**

- Store the token in the App Service config as `PSP_INTEGRATION_TOKEN` (never in the repo, never in git).
- Base URL: `PSP_API_BASE = "https://vita-psp-backend.azurewebsites.net/api/integration"`.
- Single `psp_sync/client.py` module wraps `requests.Session` with the header.

**Scopes to define upfront:**

| Scope | Endpoints |
|---|---|
| `mo:read` | GET manufacturing orders, MO steps, routings, BOMs |
| `mo:write:session` | POST session events, PATCH MO step `actual_start`/`actual_finish` |
| `mo:transition` | POST `manufacturing-orders/:id/transition` when kiosk starts/finishes the last step |
| `workstation:read` | GET workstations, workstation-groups |
| `item:read` | GET items |
| `user:read` | GET users + HR (once §5.4 lands) |

Least-privilege by default. The token vita-performance uses gets exactly these six.

### 5.2 vita-performance: add `external_id` everywhere + new `psp_sync` app (Week 1–2)

**Migrations on vita-performance:**

```python
# 0001_add_external_ids
Item.external_id           = CharField(64, unique=(user, external_id), db_index=True, nullable=True)
Worker.external_id         = CharField(64, unique=(user, external_id), db_index=True, nullable=True)
Workstation.external_id    = CharField(64, unique=(user, external_id), db_index=True, nullable=True)
WorkSession.external_id    = CharField(64, unique=(user, external_id), db_index=True, nullable=True)
WorkSession.mo_step_uuid   = CharField(64, db_index=True, nullable=True)   # what PSP MO step this belongs to
WorkSession.mo_uuid        = CharField(64, db_index=True, nullable=True)   # denormalized for filters
```

Nullable during rollout — every existing row stays valid, new rows fill in as PSP syncs.

**New Django app `psp_sync`:**

- `psp_sync/client.py` — `requests.Session` wrapper with retry + 5 sec timeout + PSP_INTEGRATION_TOKEN header.
- `psp_sync/pullers/` — one puller per entity: `pull_items()`, `pull_workstations()`, `pull_workers()`, `pull_manufacturing_orders()`, `pull_mo_steps(mo_uuid)`. Idempotent upserts keyed by `external_id`.
- `psp_sync/pushers/` — `push_session_started(session)`, `push_session_completed(session)`, `push_session_verified(session)`.
- `psp_sync/outbox.py` — `PspOutboxEntry(kind, payload, attempts, next_retry_at, delivered_at)`. Celery beat retries every 30 s.
- `psp_sync/tasks.py` — Celery beat every 60 s: pull workstations, workers, active MOs. On kiosk request: pull-if-stale (last-pulled < 60 s ago = skip).
- `psp_sync/signals.py` — `post_save` on `WorkSession` → enqueue outbox entry.

**Data model change on `Item`:** deprecate the free-text `Item(user, name)` in favor of MO-driven task selection. Keep `Item` as-is for backwards compat and for the small set of shops that don't yet have PSP data — add a subscription/feature flag `settings.use_psp_source_of_truth` so we can dark-launch per tenant.

### 5.3 PSP: pull-side endpoints for `/api/integration/…` (Week 2)

Most of these just wrap existing controllers with the new auth pipeline:

| Method | Path | Existing? | Notes |
|---|---|---|---|
| GET | `/api/integration/manufacturing-orders?status=scheduled,in_progress&workstation_uuid=…` | ✅ derived from existing `/api/production/manufacturing-orders` | Add `workstation_uuid` filter that returns MOs whose current-step's workstation matches |
| GET | `/api/integration/manufacturing-orders/:uuid` | ✅ | Include preloaded `steps` with routing snapshot |
| POST | `/api/integration/manufacturing-orders/:uuid/steps/:step_uuid/sessions` | **New** | The write endpoint. Body: `{worker_uuids: [...], started_at, finished_at?, quantity_produced?, quantity_rejected?, performance_percentage?, notes?, form_responses?, external_id}` |
| PATCH | `/api/integration/manufacturing-orders/:uuid/steps/:step_uuid` | Existing `PATCH /api/production/manufacturing-orders/:mo_id/steps/:id` reused | For `actual_start` / `actual_finish` stamps when the first / last session on the step lands |
| POST | `/api/integration/manufacturing-orders/:uuid/transition` | ✅ | vita-performance calls this when the last step completes → PSP MO becomes `completed` |
| GET | `/api/integration/workstations` | ✅ | Existing endpoint, gated to token |
| GET | `/api/integration/items?item_types=finished_product,semi_finished` | ✅ | Gated + filter (vita-performance doesn't need `raw_material`) |
| GET | `/api/integration/hr/employees` | **New** (see §5.4) | |

The new `POST /steps/:step_uuid/sessions` is the real work here — it needs to:

1. Validate the token has `mo:write:session`.
2. Validate the MO step belongs to the token's `company_id`.
3. Validate the MO is in `in_progress` (or auto-transition from `scheduled` on first session).
4. Insert a new `Backend.Production.MOStepSession` row (new schema, mirrors vita-performance's WorkSession).
5. Broadcast on the `entity:manufacturing_order:<uuid>` channel so any planner watching the schedule sees the actuals appear.
6. If it's the first session on the step: stamp `MOStep.actual_start`.
7. If it's marked `status=completed` and it's the last outstanding step: don't auto-transition the MO to `completed`, just stamp `actual_finish` on the step. The MO transition stays a separate deliberate action (respects PSP's Final Release ceremony).

New PSP schema:

```elixir
schema "mo_step_sessions" do
  belongs_to :company, Company
  belongs_to :manufacturing_order_step, ManufacturingOrderStep
  belongs_to :workstation, Workstation
  field :external_id, :string          # vita-performance's WorkSession UUID
  field :worker_uuids, {:array, :binary_id}, default: []
  field :started_at, :utc_datetime
  field :finished_at, :utc_datetime
  field :quantity_produced, :decimal
  field :quantity_rejected, :decimal
  field :performance_percentage, :float
  field :status, Ecto.Enum, values: [:active, :completed, :verified]
  field :notes, :string
  field :form_responses, :map          # JSONB, from DynamicForm answers
  timestamps()
end
```

### 5.4 PSP: new `Backend.HR` context (Week 2–3)

This is the biggest greenfield piece. Design proposal:

**`Backend.HR.Employee`** (new):

- `id`, `company_id`, `external_id` (for vita-performance mirror), `full_name`, `preferred_name`, `email`, `phone`, `hire_date`, `termination_date`, `employee_number` (auto-numbered via `company.numbering_formats["employee"]`), `is_active`, `avatar` (or FK to Storage file).
- Linked optionally to `User` (`user_id` nullable) — because most factory operators never log into PSP, they only PIN into the kiosk. Employees are a superset.
- `kiosk_pin_hash` — moved from vita-performance's `Worker.pin`. This means the PIN is set in the PSP HR page, not in vita-performance.
- `is_qa` boolean — reuses vita-performance's flag.

**`Backend.HR.EmployeeWage`** (append-only wage history):

- `id`, `employee_id`, `hourly_rate`, `currency`, `effective_from`, `effective_to` (nullable = current).
- Follows PSP's compliance rule: no `hourly_rate` field on Employee, wage is an event/interval. Displaying "current wage" is a computed projection.

**`Backend.HR.EmployeeSkill`** (many-to-many with workstations):

- `id`, `employee_id`, `workstation_group_id`, `certified_at`, `expires_at`, `certified_by`.
- When workstation.workstation_group has skill certification enabled, only certified employees can be booked. Enforced in `MOStepSession` insert.

**`Backend.HR.EmployeeShift`** (weekly working pattern, follows company `first_day_of_week`):

- `id`, `employee_id`, `day_of_week` (mon..sun), `start_time`, `end_time`, `effective_from`, `effective_to`.
- Feeds the scheduler for capacity planning.

**`Backend.HR.EmployeeAbsence`** (holidays, sick, training):

- `id`, `employee_id`, `kind` (holiday/sick/training/other), `starts_on`, `ends_on`, `approved_by`, `notes`.

**Frontend `/settings/hr`:** mirrors `/settings/users` structure. Adds tabs for Skills, Shifts, Absences, Wage history. **Follows the compliance-first field design rules from `psp/CLAUDE.md`** — hourly_rate is an event on `EmployeeWage`, not a settable field; skills are actions ("certify Employee on Workstation Group"); absences are events too.

**Migration path for existing vita-performance workers:**

- One-time script: for each active `Worker`, `POST /api/integration/hr/employees` with `full_name`, `pin` (transferred), `is_qa`, `hourly_rate` (as opening `EmployeeWage` row). PSP returns `employee.uuid`. Store as `Worker.external_id`.
- After migration, disable "Add Worker" in vita-performance UI. New workers come from PSP.

### 5.5 vita-performance kiosk change: MO picker replaces item picker (Week 3)

Current flow (from vita-performance audit):

```
Workstation load → List workers → Verify PIN → Item search → SOP → Start form → Start session
                                                    ↑
                                                    Replace this step
```

New flow:

```
Workstation load → List workers → Verify PIN → MO picker → SOP → Start form → Start session
                                                    ↑
                                                    GET /api/kiosk/<token>/available-mos/
                                                    which internally hits PSP's
                                                    /api/integration/manufacturing-orders?
                                                    workstation_uuid=<external_id>
                                                    &status=scheduled,in_progress
```

The picker shows:

- MO code (`MO-00042 · Blueberry Muffin 200×`)
- Current step's operation name (`Step 3/5 · Mixing`)
- Item name + quantity target for this step
- Route position (so operator knows this is one of multiple steps)
- Due date

Operator taps → kiosk calls PSP `PATCH /steps/:step_uuid` with `actual_start` if not set → session starts locally → on stop, session pushes to PSP and PSP stamps `actual_finish` on the step.

**Backwards compat:** operators who don't have PSP-connected workstations (any not-yet-synced) fall back to the current item picker. Controlled by `Workstation.psp_source_of_truth` boolean flag.

### 5.6 Sessions → MO Step attribution (Week 3–4)

Every `WorkSession.mo_step_uuid` is populated automatically at session start (from the MO picker's selection).

New reporting on the PSP side, in `/production/manufacturing-orders/:uuid`:

- **Actuals card** — per step, list every `MOStepSession` with worker names, start/end, produced, rejected, performance %.
- **Labour cost card** — sum of `session_duration × employee.current_hourly_rate` per step + MO total. This is what makes the "who worked on it, how much time spent" query trivial.
- **Timeline** — a Gantt-style row per step showing planned vs actual with sessions overlaid.

None of that touches vita-performance beyond the existing `/api/sessions/` responses.

### 5.7 vita-performance non-breaking `Company` migration (Week 2, parallel with §5.2)

This is one of only two places in the plan where production data is at risk. Handle carefully.

**State today** — every tenant-scoped table has `user = ForeignKey(User)`. `user` means "the tenant that owns this row." Vita is one user account. Testing / demo may be more.

**Target state** — every tenant-scoped table has `company = ForeignKey(Company)`. `user` remains as "creator" for audit / display. `Company` FKs are the query filter.

**Five deploys, one migration script, zero downtime, fully reversible until deploy 5.**

#### Deploy 1 — schema additive

- Migration `0001_add_company_model.py`:
  ```python
  class Company(models.Model):
      id = models.BigAutoField(primary_key=True)
      external_id = models.CharField(max_length=64, unique=True, null=True, db_index=True)  # PSP company uuid
      name = models.CharField(max_length=200)
      owner_user = models.OneToOneField(User, on_delete=models.PROTECT, related_name='owned_company', null=True)
      is_active = models.BooleanField(default=True)
      created_at = models.DateTimeField(auto_now_add=True)
      updated_at = models.DateTimeField(auto_now=True)

      class Meta:
          db_table = 'companies'
  ```
- Migration `0002_add_company_fk_nullable.py` on each of: `Item`, `Worker`, `WorkerGroup`, `Workstation`, `WorkSession`, `SOP`, `DynamicForm`, `FormResponse`, `WorkerReputationEvent`, `UserSettings`, `QCToken`, `Subscription`:
  ```python
  company = models.ForeignKey(Company, on_delete=models.CASCADE, null=True, blank=True, db_index=True)
  ```
- **No query changes.** Existing filters continue to use `user`. This deploy is purely additive.

#### Deploy 2 — backfill data

- Data migration `0003_backfill_companies.py`:
  ```python
  def forward(apps, schema_editor):
      User = apps.get_model("accounts", "User")
      Company = apps.get_model("companies", "Company")
      for user in User.objects.all():
          Company.objects.get_or_create(
              owner_user=user,
              defaults={"name": user.get_full_name() or user.username or user.email},
          )
      # For each tenant model, set company_id from user_id
      for model_label in [
          "items.Item", "workers.Worker", "workers.WorkerGroup",
          "workstations.Workstation", "work_sessions.WorkSession", ...
      ]:
          Model = apps.get_model(*model_label.split("."))
          for row in Model.objects.filter(company__isnull=True).iterator(chunk_size=500):
              row.company = Company.objects.get(owner_user_id=row.user_id)
              row.save(update_fields=["company"])
  ```
- Reverse migration deletes `Company` rows and nulls the FKs. Safe rollback.

#### Deploy 3 — dual-write

- Every ViewSet / view that creates or updates a tenant-scoped model now sets `company = request.user.owned_company` alongside `user = request.user`.
- Reads still filter by `user`. Nothing user-visible changes.
- Add an assertion in tests: for every row created in this deploy, `row.user_id == row.company.owner_user_id`. If it drifts, we know before cutover.

#### Deploy 4 — cut over reads

- Filters change from `.filter(user=request.user)` to `.filter(company=request.user.owned_company)`.
- Semantically identical for the current per-user tenancy. But now new users invited *into an existing company* (a future feature) see the company's data instead of their private silo.
- Rollback: revert to filter-by-user. Data is still valid because dual-write kept both FKs populated.

#### Deploy 5 — enforce non-null

- Migration `0006_make_company_non_null.py`. Only after 2 weeks of clean logs.
- Drop the `null=True` on all the `company` FKs.
- **After this deploy, `Company` is the tenant. `User.owned_company` is still the invariant for "who owns Vita's company"** — one User → one Company; future multi-user membership can be added via a `CompanyMembership` join table without touching this.

**PSP side** — the vita-performance `Company` gets an `external_id` that matches PSP's `Backend.Companies.current().uuid`. That's what the integration token binds to.

### 5.8 Deployment (Week 4–5)

- Create `vita-psp-backend` and `vita-psp-frontend` App Services in `Vita_Intelligence` RG (mirrors current vita-performance topology; not `Vita_NPD` — keep NPD isolated).
- Postgres: create new `psp` database on **`vita-performance-db`** (Postgres 16, already provisioned), separate schema — avoids provisioning a new server.
- Redis: reuse `vita-performance-redis` (Basic SKU) — Phoenix.Presence + PubSub can share with Django Channels since keys are prefixed.
- Custom domain: `psp.vitaintelligent.com`.
- Two-way networking: both apps on the same App Service Plan → same VNet → private communication over `.privatelink.azurewebsites.net`. Not strictly required (Bearer token protects the endpoints) but a nice-to-have if we're paying for the shared plan already.
- Secrets: introduce Azure Key Vault (`vita-intelligence-kv`) now. `PSP_INTEGRATION_TOKEN` lives there, not in App Service config. App Service references `@Microsoft.KeyVault(SecretUri=…)`. Same pattern as vita-cff will eventually adopt.

---

## 6. What the operator sees (end-to-end)

1. **Approaches kiosk** at Mixing Station 2. Tablet loads `/kiosk/<workstation_kiosk_token>`.
2. **Taps their name** in the worker list. (Workers list is the local mirror of PSP's HR/Employee list, filtered `is_active=true` and `Workstation.psp_source_of_truth=true`.)
3. **Types 4-digit PIN** — verified against `Worker.pin_hash` (mirrored from PSP HR).
4. **Sees a list of MOs currently at this workstation** — pulled from local mirror, refreshed on demand: `MO-00042 · Blueberry Muffin 200× · Step 3/5 Mixing · due Fri`.
5. **Taps an MO** → sees the SOP for the workstation + start-form (if any).
6. **Starts session** → local `WorkSession` created with `workstation`, `worker(s)`, `item` (auto-filled from MO), `mo_step_uuid`, `mo_uuid`. Immediately posted to PSP: `PATCH /steps/:step_uuid { actual_start: … }`. If PSP is down, queued in outbox — operator sees no delay.
7. **Works.** Timer runs on kiosk.
8. **Taps Stop** → enters `quantity_produced`, `quantity_rejected`, PIN, end-form answers.
9. Local `WorkSession` → `status: completed`, `performance_percentage` computed via existing formula. Immediately posted to PSP as `POST /steps/:step_uuid/sessions`. Outbox retries on failure.
10. **Planner viewing `/production/manufacturing-orders/MO-00042` in PSP** sees the actuals row appear within a second (via the entity channel broadcast).

---

## 7. Decisions locked in (2026-07-07)

### 7.1 Non-MO activity is a first-class citizen

**Decision:** Cleaning, maintenance, and "other" workstation activity happen without an MO. Item is optional today on `WorkSession` — that stays true.

**Engineering delta:**

- New enum on the PSP session schema: `activity_kind :: :mo | :cleaning | :maintenance | :other`. `manufacturing_order_step_id` becomes nullable when `activity_kind != :mo`.
- Rename `MOStepSession` → **`Backend.Production.WorkstationSession`** — reflects that not every session is against an MO step.
- Kiosk MO picker adds a persistent "None of the above" tile with three sub-options: **Cleaning · Maintenance · Other**. Selecting "Other" prompts a required text label (e.g., "Fire drill", "IT outage").
- vita-performance `WorkSession` schema gets `activity_kind` (same enum) + `activity_label` (nullable, free text for "Other"). `mo_step_uuid` stays nullable.
- Reporting on the PSP side: `/production/workstations/:uuid` gains an **"Off-MO time"** card — total hours per week, broken down by activity_kind.
- Non-MO sessions still push a `POST /steps/:step_uuid/sessions` — actually no; they push to a sibling endpoint **`POST /api/integration/workstations/:uuid/sessions`** for the no-MO case. Two write paths, one schema. Keeps the MO path clean.

### 7.2 PIN is owned by HR AND settable at the kiosk (both)

**Decision:** Initial PIN issued by HR when the employee is created. Operator can change their own PIN at the kiosk. Kiosk-side change propagates back to HR (source of truth stays PSP).

**Engineering delta:**

- HR `POST /api/integration/hr/employees/:uuid/pin` — mints or resets PIN. Only HR admins (or the employee themselves) can hit this.
- Kiosk gains a "Change PIN" flow: verify current PIN → enter new PIN (twice) → confirm. On confirm, vita-performance updates local `Worker.pin_hash` **and** pushes via the same HR endpoint. Push is required — kiosk change fails if PSP is unreachable (this is one of the few places we prioritise consistency over availability, because a divergent PIN is dangerous).
- Both sides bcrypt at cost 12 (same as PSP user passwords per CLAUDE.md).
- New scope: **`hr:write:pin`** — the kiosk's integration token has this alongside its read scopes. Change events audited on both sides.
- Audit event on PSP HR: `pin_changed_at`, `pin_changed_source :: :hr_admin | :kiosk_self`.

### 7.3 Company model added to vita-performance — non-breaking migration

**Decision:** Add a proper `Company` model. Existing production data must be preserved with zero downtime.

**Engineering delta — this is the trickiest one, so it gets its own section.** See **§5.7** below for the full non-breaking migration script. Summary of the approach:

1. **Add `Company` model, nullable `company_id` on every tenant-scoped table.** Deploy — no behavior change, no query change.
2. **Data-migration:** for each existing `User`, create `Company(name=user.username or "Vita Manufacture Ltd", owner_user=user)`. Backfill `company_id` on every existing row from `Company.get(owner_user=row.user)`. Deploy — still no behavior change; both `user_id` and `company_id` populated in parallel.
3. **Dual-write phase:** all new writes populate `company_id` (from `request.user.company`). Reads still filter by `user_id` for safety. Deploy — measure, verify counts match.
4. **Cut over reads to `company_id`.** Keep `user_id` populated for "created_by" semantics. Deploy — this is the semantically new behavior.
5. **Make `company_id` non-null in a later migration** (once dual-write has been running clean for a couple of weeks).

Existing FKs are preserved throughout. No `DROP COLUMN`. No `TRUNCATE`. Fully reversible until step 5.

### 7.4 Reputation and stats live in PSP HR

**Decision:** PSP HR owns reputation score, reputation events, and per-worker stats. vita-performance still *generates* the events (they fire when a session completes) but immediately forwards to PSP as the system of record.

**Engineering delta:**

- **PSP schema additions** (in `Backend.HR`):
  - `EmployeeReputationEvent`: `id, employee_id, session_uuid, event_type (enum: auto_perf_excellent / auto_perf_high / auto_perf_low / auto_perf_very_low / manual_positive / manual_negative), score_delta, reason, created_by_employee_id, created_at`.
  - `Employee.reputation_score` — computed by `Backend.HR.recompute_reputation_score/1` (mirrors vita-performance's 180-day linear-decay formula so the answer is identical regardless of which side runs it). Default 650, range 300-850.
  - `Employee.reputation_tier` — computed field (excellent / good / neutral / at_risk / red_flag) exposed on Employee show endpoint.
- **vita-performance changes:**
  - Existing `WorkerReputationEvent` model stays as a local record (for offline resilience).
  - Post-save signal on `WorkerReputationEvent` pushes to PSP via `POST /api/integration/hr/employees/:uuid/reputation-events`.
  - Outbox retries on failure.
  - `Worker.reputation_score` in vita-performance becomes a **mirror** field, updated from PSP on the 60-second sync. If it drifts (network partition), PSP wins on next sync.
- **PSP UI**: new `/settings/hr/employees/:uuid` → Reputation tab. Leaderboard on `/settings/hr` root. QC feedback flow already exists on kiosk side (via `QCToken`) — that continues, and the resulting reputation event is now HR-scoped rather than local.
- **Kiosk leaderboard** — currently `/api/workers/leaderboard/`. Rewired to read from local mirror of PSP-owned scores.

### 7.5 DynamicForm responses push into PSP

**Decision:** Form answers become part of the session payload PSP receives. QC / planners in PSP can query them alongside MO data.

**Engineering delta:**

- **PSP schema addition**:
  - `Backend.Production.WorkstationSessionFormResponse` — `id, workstation_session_id, form_uuid (vita-performance's DynamicForm UUID for cross-ref), form_name, form_schema_snapshot (JSONB — captures the form at answer time so schema evolution doesn't corrupt history), answers (JSONB — key/value pairs), submitted_at, submitted_by_employee_id`.
  - Alternative if schema pressure is a concern: embed as JSONB on `WorkstationSession.form_responses` (map of form_uuid → answers). Cleaner query story with a separate table though.
- **File upload complication**: per PSP CLAUDE.md, "files live on our server, not as URLs." If a DynamicForm has a `type: "file"` question, vita-performance must **upload the file to PSP first** (`POST /api/integration/files`), receive a `file_uuid`, and reference it in the form answer. New integration endpoint required. **This one is worth flagging** — it's a small but non-trivial addition. Practically: for MVP we can defer file-type form questions; text/number/select all work day one.
- **vita-performance** flow: existing `POST /api/kiosk/<token>/forms/<id>/respond/` stays. On session complete, the outbox picks up all form responses for that session and includes them in the `WorkstationSession` POST payload.
- **PSP UI**: new tab on MO detail page — **"Operator answers"** — aggregates form responses across all sessions on the MO. Filter by question ("show all sessions where `batch_temperature > 50`").

### 7.6 HR designed to be payroll-ready (BACS / Xero / Sage) — implementation later

**Decision:** Payroll integration is a future scope, but the HR data model must be shaped so it can be added without breaking migrations.

**Engineering delta on HR schemas:**

- **`Backend.HR.EmployeeWage`** — append-only wage history (already in the original proposal). Expanded fields:
  - `id, company_id, employee_id, effective_from (date), effective_to (date, nullable — null = current), hourly_rate (decimal 10,4 — sub-penny precision for downstream tax calcs), currency_code (ISO 4217 3-char), tax_treatment (enum: :paye_standard | :paye_bank | :self_employed | :off_payroll, nullable), source_kind (enum: :hire | :annual_review | :promotion | :market_adjustment | :correction), reason (string), approved_by_user_id, effective_document_file_uuid (FK to a Storage file — the signed offer letter / pay-review record), created_at`.
- **`Backend.HR.EmployeePayrollProfile`** (new — 1:1 with Employee, optional):
  - `id, company_id, employee_id, sort_code (encrypted), account_number (encrypted), account_holder_name, ni_number (encrypted), tax_code (string — "1257L" etc.), payroll_frequency (enum: :weekly | :fortnightly | :four_weekly | :monthly), pension_scheme_id (nullable FK to a pension_schemes table — future), holiday_entitlement_days_per_year (decimal), student_loan_plan (nullable enum), created_at, updated_at`.
- **`Backend.HR.PensionScheme`** (later — for the pension_scheme_id FK to resolve).
- Encryption reuses the existing `Cloak` vault (already used for tax numbers and TOTP secrets per PSP audit).
- **No payroll export code today**. Just make sure every field a payroll export would need is captured on the day the employee is entered. This costs an hour of extra migration work now and saves rewriting HR later.
- **`Backend.Payroll` context (future)** — will consume EmployeeWage + EmployeePayrollProfile + WorkstationSession (for hours worked) → produce BACS-format payment files, Xero invoice XML, or Sage import CSV. Not scoped for the current 6-week plan.

---

## 8. Risks and how the design handles them

| Risk | Mitigation |
|---|---|
| PSP down → kiosk down | Local mirror + outbox. Kiosk continues; syncs when PSP is back. |
| Token leaked | Scoped, revocable in `/settings/integrations`, hashed at rest, prefix visible for identification. Rate-limited. |
| Data drift between apps (e.g. Workstation renamed in PSP after sync) | 60-sec pull cadence + on-demand pull-if-stale on the specific entity. Push on channel event when we add PSP → vita-performance broadcasts (future). |
| Compliance ("who did this thing?") | Both sides audit: PSP logs every integration-token action with `actor_kind=:integration_token, token_name="vita-performance"`. vita-performance logs the session with `worker_id`. Reconstruct the story from either side. |
| Skill / certification bypass | `MOStepSession` insert in PSP validates worker is certified for the workstation group. Kiosk shows an error if not. |
| Schema evolution on either side | Every API response is versioned via a header `X-PSP-API-Version: 2026-07`. Client freezes on version until deliberately upgraded. |
| Migration of existing workers/items | One-shot script, dry-run mode, reversible via `external_id` cleanup. Non-destructive on either side. |

---

## 9. Phasing (updated with 2026-07-07 decisions)

| Phase | Scope | Weeks | Deliverable |
|---|---|---|---|
| 0 — this doc | ✅ Decisions locked in on 2026-07-07 | – | This document |
| 1 — auth | PSP `IntegrationToken` schema + `RequireIntegrationAuth` plug + `/api/integration/` pipeline + `/settings/integrations` UI + scope model (`mo:read`, `mo:write:session`, `mo:transition`, `workstation:read`, `item:read`, `user:read`, **`hr:write:pin`**) | 1 | Token can be minted, revoked, used |
| 2 — vita-performance tenancy | 5-deploy non-breaking Company migration (§5.7). Runs in parallel with phase 1 auth work. | 1.5 | vita-performance queries filter by Company; user preserved for audit |
| 3 — PSP reads | Integration endpoints for MOs (with `workstation_uuid` filter), workstations, items. `psp_sync` puller app in vita-performance with outbox pattern. | 1.5 | vita-performance mirrors PSP MOs / workstations / items every 60s |
| 4 — PSP HR + payroll-ready schemas | `Backend.HR` context: `Employee`, `EmployeeWage` (payroll-ready), `EmployeePayrollProfile` (encrypted bank / NI / tax code), `EmployeeSkill`, `EmployeeShift`, `EmployeeAbsence`, `EmployeeReputationEvent`. `/settings/hr` UI following PSP compliance-first field rules. One-shot Worker migration script. | 2 | HR runs from PSP; PIN + wages + reputation all sourced there |
| 5 — writes back | `Backend.Production.WorkstationSession` schema (with `activity_kind` enum for non-MO), sibling `POST /workstations/:uuid/sessions` for non-MO, `WorkstationSessionFormResponse` schema, outbox pusher in vita-performance, planner reporting cards on MO detail page + off-MO card on workstation detail page. | 1.5 | Sessions land in PSP with worker + step attribution; off-MO time visible; form answers queryable |
| 6 — rollout | Feature flag per workstation. Migrate one shift as pilot. Compare kiosk behaviour + planner visibility for 3 days. Roll out remaining workstations. | 1 | Kiosk item picker retired for all connected workstations |
| 7 — cost breakdown report | New endpoint `GET /api/production/manufacturing-orders/:uuid/cost-breakdown`. Aggregates labour (session duration × wage at session start_time from `EmployeeWage` history, overtime multiplier applied via workstation-effective settings), machine (session duration × `Workstation.hourly_rate`), materials (existing `ManufacturingOrderBooking` × `Stock.Lot.unit_cost`), rejected-material cost. Divides by `MO.quantity_produced` for per-unit. Non-MO time allocated per configurable policy (see below). New page in `/production/manufacturing-orders/:uuid/costs`. | 0.5 | Planner can see labour + material + machine + reject cost per MO and per unit |

**Non-MO overhead allocation** — introduces one company setting: `non_mo_overhead_policy :: :pool_prorata | :standalone_only | :ignore`. Default `:pool_prorata` (accountant-preferred): total non-MO workstation hours in a period are allocated across MOs that ran on the same workstation, weighted by MO production hours. `:standalone_only` shows non-MO cost on the workstation's own report but never bleeds into product cost. `:ignore` treats non-MO time as free. Setting lives in `/settings/company` under a new "Costing" tab.

**~9 weeks sequential total** (Phase 7 adds half a week). **~5.5 weeks with two engineers.**

### Blockers between phases

- **Phase 1 → Phase 3**: reads can't ship until the auth pipeline exists. Hard blocker.
- **Phase 2 → Phase 5**: writes-back can't ship until vita-performance has a `Company` model, because `WorkstationSession` on PSP needs a stable tenant identity.
- **Phase 4 → Phase 5**: writes-back needs HR to exist so `worker_uuids` in session payloads resolve to real PSP Employees.
- **Phase 5 → Phase 6**: obvious. Don't cut over until writes-back is running clean.

### Parallelisable

- Phase 1 and Phase 2 are fully independent (different repos).
- Phase 3 and Phase 4 are independent once Phase 1 lands (both consume the same auth pipeline but their code doesn't overlap).
- Documentation, `/settings/integrations` UI, `/settings/hr` UI can all be scoped as separate small PRs.

---

## 10. What I'd NOT do

- **Shared database.** Two apps reading the same tables. Tempting for read consistency, terrible for release cadence + schema evolution + tenancy.
- **Logical replication.** Same problem, different mechanism.
- **Azure Service Bus / event queue.** Overkill for a single writer / single reader today. Revisit when a third app enters the graph (vita-cff → PSP is coming).
- **Passing PSP's user Phoenix.Token to vita-performance for service auth.** Bad blast radius on `token_version` bump.
- **Killing vita-performance's local `WorkSession` table.** It's still the source of truth for kiosk state + reputation + dynamic forms. PSP just gets a mirror-with-attribution.

---

*Draft — happy to expand any section, or turn any phase into concrete tickets.*

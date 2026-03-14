# Subscription System

## Overview

Vita Performance uses a custom subscription system built on Django. It supports a 30-day free trial, multiple plans with feature gating and resource limits, grace periods, and is designed to plug directly into Stripe when ready.

---

## Architecture

### Key Files

| File                          | Purpose                                              |
| ----------------------------- | ---------------------------------------------------- |
| `subscription/models.py`      | `Subscription` model — one per user                  |
| `subscription/plans.py`       | Single source of truth for all plan definitions      |
| `subscription/serializers.py` | Exposes subscription data to the frontend            |
| `subscription/middleware.py`  | Blocks expired users from accessing the API          |
| `subscription/permissions.py` | DRF permission classes for feature/limit enforcement |
| `subscription/signals.py`     | Auto-creates subscription on user registration       |
| `subscription/views.py`       | `GET /api/subscription/` endpoint                    |
| `subscription/admin.py`       | Django admin for manual subscription management      |

---

## Subscription Model

Each user has exactly one `Subscription` record, created automatically on registration via a Django signal.

### Fields

| Field                      | Type          | Description                                   |
| -------------------------- | ------------- | --------------------------------------------- |
| `user`                     | OneToOneField | Linked user account                           |
| `status`                   | CharField     | Current status (see below)                    |
| `plan`                     | CharField     | Current plan key (see below)                  |
| `trial_ends_at`            | DateTimeField | Set to 30 days after registration             |
| `current_period_starts_at` | DateTimeField | Start of current billing period (Stripe)      |
| `current_period_ends_at`   | DateTimeField | End of current billing period (Stripe)        |
| `grace_period_ends_at`     | DateTimeField | End of grace period after missed payment      |
| `stripe_customer_id`       | CharField     | Stripe customer ID (null until connected)     |
| `stripe_subscription_id`   | CharField     | Stripe subscription ID (null until connected) |
| `stripe_price_id`          | CharField     | Stripe price ID (null until connected)        |

### Statuses

| Status     | Description                             | Has Access? |
| ---------- | --------------------------------------- | ----------- |
| `trialing` | Within 30-day free trial                | ✅ Yes      |
| `active`   | Paid and within billing period          | ✅ Yes      |
| `past_due` | Payment missed, within grace period     | ✅ Yes      |
| `expired`  | Trial or grace period ended, no payment | ❌ No       |
| `canceled` | Manually canceled                       | ❌ No       |

### Access Logic

Access is determined by the `has_access` property:

```python
@property
def has_access(self):
    return self.is_trialing or self.is_active or self.is_past_due
```

---

## Plans

All plan definitions live in one file: **`subscription/plans.py`**

This is the **only file you need to edit** to change prices, limits, or features.

### Current Plans

| Plan         | Price  | Workers   | Workstations | History   | Kiosk | QC  | Realtime |
| ------------ | ------ | --------- | ------------ | --------- | ----- | --- | -------- |
| `trial`      | Free   | Unlimited | Unlimited    | Unlimited | ✅    | ✅  | ✅       |
| `starter`    | £19/mo | 5         | 2            | 90 days   | ❌    | ❌  | ❌       |
| `growth`     | £49/mo | 15        | 5            | 1 year    | ✅    | ❌  | ❌       |
| `pro`        | £99/mo | 30        | 10           | Unlimited | ✅    | ✅  | ✅       |
| `enterprise` | Custom | Unlimited | Unlimited    | Unlimited | ✅    | ✅  | ✅       |

### Plan Structure

Each plan in `PLANS` dict follows this structure:

```python
'plan_key': {
    'name': 'Display Name',
    'price_gbp': 49,          # Set to None for custom/free
    'limits': {
        'workers': 15,         # Set to None for unlimited
        'workstations': 5,     # Set to None for unlimited
        'session_history_days': 365,  # Set to None for unlimited
    },
    'features': {
        'kiosk': True,
        'qc': False,
        'realtime': False,
    },
},
```

---

## How to Edit an Existing Plan

Open `subscription/plans.py` and find the plan you want to edit.

**Example — increase Starter worker limit from 5 to 10:**

```python
# Before
'starter': {
    'limits': {
        'workers': 5,
        ...
    },
    ...
}

# After
'starter': {
    'limits': {
        'workers': 10,
        ...
    },
    ...
}
```

**Example — change Starter price from £19 to £24:**

```python
'starter': {
    'price_gbp': 24,  # was 19
    ...
}
```

No migrations needed. No other files to update. Changes take effect immediately.

---

## How to Add a New Plan

**Step 1 — Add to `subscription/plans.py`:**

```python
'business': {
    'name': 'Business',
    'price_gbp': 69,
    'limits': {
        'workers': 20,
        'workstations': 7,
        'session_history_days': 365,
    },
    'features': {
        'kiosk': True,
        'qc': True,
        'realtime': False,
    },
},
```

**Step 2 — Add to `Subscription.PLAN_CHOICES` in `subscription/models.py`:**

```python
PLAN_CHOICES = [
    (PLAN_TRIAL, 'Trial'),
    (PLAN_STARTER, 'Starter'),
    (PLAN_GROWTH, 'Growth'),
    (PLAN_BUSINESS, 'Business'),  # 👈 add here
    (PLAN_PRO, 'Pro'),
    (PLAN_ENTERPRISE, 'Enterprise'),
]
```

**Step 3 — Add the constant:**

```python
PLAN_BUSINESS = 'business'
```

**Step 4 — Run migration** (only needed because `PLAN_CHOICES` changed):

```bash
python manage.py makemigrations subscription
python manage.py migrate
```

**Step 5 — Add to the billing page in `src/app/(main)/billing/page.tsx`:**

```tsx
{
    key: "business",
    name: "Business",
    price: "£69",
    workers: "20",
    workstations: "7",
    history: "1 year",
    kiosk: true,
    qc: true,
    realtime: false,
},
```

That's it — limits and feature enforcement are automatic via the permissions system.

---

## Enforcement

### Middleware — `subscription/middleware.py`

Runs on every API request. If `has_access` is `False`, returns `402 Payment Required`. The frontend catches this and redirects to `/billing`.

Exempt paths (never blocked):

- `/api/accounts/login`
- `/api/accounts/register`
- `/api/accounts/refresh`
- `/api/accounts/logout`
- `/api/accounts/user`
- `/api/subscription/`
- `/api/kiosk/`
- `/api/qc/`
- `/admin/`

### DRF Permissions — `subscription/permissions.py`

Applied per view. Returns `403 Forbidden` with a `code` field. The frontend interceptor shows a toast.

| Permission Class         | Applied To                                 | Blocks When                     |
| ------------------------ | ------------------------------------------ | ------------------------------- |
| `WithinWorkerLimit`      | `WorkerListView POST`                      | Worker count >= plan limit      |
| `WithinWorkstationLimit` | `WorkstationListView POST`                 | Workstation count >= plan limit |
| `HasKioskAccess`         | `WsTokenView` (indirectly via kiosk check) | Plan has no kiosk               |
| `HasQCAccess`            | QC views (inline check)                    | Plan has no QC                  |
| `HasRealtimeAccess`      | `WsTokenView POST`                         | Plan has no realtime            |

### Session History — `work_sessions/views.py`

`get_queryset` filters sessions by `session_history_days` from the plan. If `None`, no filter is applied (unlimited).

---

## Stripe Integration (Future)

The model already has Stripe fields ready:

- `stripe_customer_id`
- `stripe_subscription_id`
- `stripe_price_id`

When Stripe is connected:

1. On checkout success → set `status: active`, `plan`, `current_period_starts_at`, `current_period_ends_at`
2. On payment failure → set `status: past_due`, `grace_period_ends_at` (e.g. +7 days)
3. On grace period end → set `status: expired`
4. On cancellation → set `status: canceled`

All of the above will be handled via Stripe webhooks hitting a new endpoint `POST /api/subscription/webhook/`.

---

## Testing via Django Admin

Navigate to `http://localhost:8000/admin/subscription/subscription/`

To test a plan:

1. Find the user
2. Change `plan` to the desired plan key
3. Change `status` to `active`
4. Save

To test expiry:

1. Set `status` to `trialing`
2. Set `trial_ends_at` to a past date
3. Try accessing any API endpoint — should return `402`

To reset:

1. Set `status` to `trialing`
2. Set `plan` to `trial`
3. Set `trial_ends_at` to 30 days from today

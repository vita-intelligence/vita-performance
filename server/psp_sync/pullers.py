"""Sync PSP → vita-performance for the four entities the kiosk needs:
Workstations, Employees (→ Workers), Items, MOs (a lightweight
projection; the full MO list is fetched on-demand at kiosk-load
time to keep the mirror table small).

Idempotent: everything upserts keyed on ``external_id``. Deleted
rows on PSP are marked ``is_active=False`` here rather than hard-
deleted so historical WorkSessions keep resolving.

**Match-or-adopt rule** for every pull path: when the local table
has no row whose ``external_id`` matches the remote uuid, we look
for **exactly one** row with the same natural key (``full_name`` /
``name``) whose ``external_id`` is null and adopt it — stamp its
``external_id`` with the PSP uuid instead of creating a duplicate.
This is the load-bearing invariant that keeps a first-time sync on
a freshly-seeded tenant from doubling up: the seed pushes vp
workers to PSP, PSP returns uuids the seed stamps back, then the
next sync's pull matches those uuids and never creates a duplicate.
Without adopt-fallback, any operation that ever wiped
``external_id`` (data restore, migration, prod copy for testing)
would silently pump a new duplicate set into the ledger on the
very next Sync.
"""
from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from companies.models import Company
from items.models import Item
from workers.models import Worker
from workstations.models import Workstation
from .client import PspError, client_for_company

if TYPE_CHECKING:
    from .client import PspClient

logger = logging.getLogger(__name__)


class PullResult:
    """Bag of counts + errors for a single sync pass."""

    def __init__(self):
        self.created = 0
        self.updated = 0
        self.deactivated = 0
        self.errors: list[str] = []

    def merge(self, other: "PullResult") -> "PullResult":
        self.created += other.created
        self.updated += other.updated
        self.deactivated += other.deactivated
        self.errors.extend(other.errors)
        return self

    def __repr__(self):
        return (
            f"PullResult(created={self.created}, updated={self.updated}, "
            f"deactivated={self.deactivated}, errors={len(self.errors)})"
        )


def pull_all_for_company(company: Company) -> PullResult:
    """Convenience: run every puller for one company. Never raises
    — errors are collected onto the result so a bad response from
    one entity type doesn't stop the others."""
    result = PullResult()
    try:
        client = client_for_company(company)
    except (ValueError, PspError) as e:
        result.errors.append(f"client init: {e}")
        return result

    for puller in (pull_workstations, pull_employees, pull_items):
        try:
            result.merge(puller(company, client))
        except PspError as e:  # transient AND client errors bubble here
            result.errors.append(f"{puller.__name__}: {e}")

    return result


# ---- Workstations -------------------------------------------------------


def pull_workstations(company: Company, client: "PspClient") -> PullResult:
    result = PullResult()
    remote = client.list_workstations(source_of_truth_only=True)
    remote_uuids = {row["uuid"] for row in remote}

    for row in remote:
        defaults = {
            "user_id": company.owner_user_id,
            "name": row["name"] or f"WS {row['uuid'][:8]}",
            "is_active": row.get("is_active", True),
            "psp_source_of_truth": True,
        }
        created = _upsert_with_adopt(
            Workstation,
            company=company,
            external_id=row["uuid"],
            natural_key={"name": defaults["name"]},
            defaults=defaults,
        )
        result.created += int(created)
        result.updated += int(not created)

    # Deactivate any local workstation that was PSP-sourced but no
    # longer appears in the remote list. Preserves historical FKs.
    stale = Workstation.objects.filter(
        company=company,
        psp_source_of_truth=True,
        is_active=True,
    ).exclude(external_id__in=remote_uuids)

    for ws in stale:
        ws.is_active = False
        ws.save(update_fields=["is_active"])
        result.deactivated += 1

    return result


# ---- Employees → Workers ------------------------------------------------


def pull_employees(company: Company, client: "PspClient") -> PullResult:
    result = PullResult()
    remote = client.list_employees()
    remote_uuids = {row["uuid"] for row in remote}

    for row in remote:
        rate = row.get("current_hourly_rate")
        defaults = {
            "user_id": company.owner_user_id,
            "full_name": row.get("full_name") or f"Employee {row['uuid'][:8]}",
            "is_active": row.get("is_active", True),
            "is_qa": row.get("is_qa", False),
            "hourly_rate": rate if rate is not None else 0,
            "reputation_score": row.get("reputation_score") or 650,
        }
        created = _upsert_with_adopt(
            Worker,
            company=company,
            external_id=row["uuid"],
            natural_key={"full_name": defaults["full_name"]},
            defaults=defaults,
        )
        result.created += int(created)
        result.updated += int(not created)

    stale = Worker.objects.filter(
        company=company,
        is_active=True,
        external_id__isnull=False,
    ).exclude(external_id__in=remote_uuids)

    for w in stale:
        w.is_active = False
        w.save(update_fields=["is_active"])
        result.deactivated += 1

    return result


# ---- Items --------------------------------------------------------------


def pull_items(company: Company, client: "PspClient") -> PullResult:
    result = PullResult()
    remote = client.list_items(item_types=["finished_product", "semi_finished"])

    for row in remote:
        defaults = {
            "user_id": company.owner_user_id,
            "name": row["name"],
        }
        created = _upsert_with_adopt(
            Item,
            company=company,
            external_id=row["uuid"],
            natural_key={"name": defaults["name"]},
            defaults=defaults,
        )
        result.created += int(created)
        result.updated += int(not created)

    return result


# --- match-or-adopt primitive --------------------------------------------


def _upsert_with_adopt(model, *, company, external_id, natural_key, defaults):
    """Idempotent upsert that also prevents duplicate-name pumps.

    Order of resolution:

      1. Row exists with matching ``(company, external_id)`` → update
         it in place. This is the fast path for every subsequent sync
         after the seed stamped external_id onto vp rows.
      2. No external_id match, but exactly one row exists with the same
         natural key (name / full_name) whose ``external_id`` is null
         → adopt it. Stamp its external_id with the incoming PSP uuid
         + apply defaults. This closes the loopback that would
         otherwise duplicate a full ledger on any tenant where a data
         restore / migration wiped ``external_id`` between the seed
         and the next sync.
      3. Two or more null-external_id namesakes → **not safe** to
         adopt (would ambiguously pick one), so we fall back to
         creating a new row. The seed on PSP will then need an
         operator to reconcile.
      4. No candidate at all → create new.

    Returns ``True`` when a row was created, ``False`` when updated
    or adopted. Callers use the boolean to bump their created /
    updated counters.
    """
    qs = model.objects.filter(company=company)

    linked = qs.filter(external_id=external_id).first()
    if linked is not None:
        for k, v in defaults.items():
            setattr(linked, k, v)
        linked.save()
        return False

    unlinked_matches = list(
        qs.filter(external_id__isnull=True).filter(**natural_key)[:2]
    )
    if len(unlinked_matches) == 1:
        adoptee = unlinked_matches[0]
        adoptee.external_id = external_id
        for k, v in defaults.items():
            setattr(adoptee, k, v)
        adoptee.save()
        return False

    # Zero or ambiguous — create a fresh row.
    obj = model(company=company, external_id=external_id, **defaults)
    obj.save()
    return True

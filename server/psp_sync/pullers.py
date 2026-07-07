"""Sync PSP → vita-performance for the four entities the kiosk needs:
Workstations, Employees (→ Workers), Items, MOs (a lightweight
projection; the full MO list is fetched on-demand at kiosk-load
time to keep the mirror table small).

Idempotent: everything upserts keyed on ``external_id``. Deleted
rows on PSP are marked ``is_active=False`` here rather than hard-
deleted so historical WorkSessions keep resolving.
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
        ws, created = Workstation.objects.update_or_create(
            company=company,
            external_id=row["uuid"],
            defaults={
                "user_id": company.owner_user_id,
                "name": row["name"] or f"WS {row['uuid'][:8]}",
                "is_active": row.get("is_active", True),
                "psp_source_of_truth": True,
            },
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
        _, created = Worker.objects.update_or_create(
            company=company,
            external_id=row["uuid"],
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
        _, created = Item.objects.update_or_create(
            company=company,
            external_id=row["uuid"],
            defaults={
                "user_id": company.owner_user_id,
                "name": row["name"],
            },
        )
        result.created += int(created)
        result.updated += int(not created)

    return result

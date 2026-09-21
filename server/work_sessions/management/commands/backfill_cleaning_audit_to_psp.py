"""One-time backfill: replay historical cleaning WorkSessions into
the PSP audit-log tables.

Before the unified session-complete callback shipped, cleaning
sessions on vita-perf triggered a PSP endpoint that wrote a
``note`` event on every attached piece of equipment — not proper
``cleaning_completed`` rows on either audit table. This command
walks every completed ``WorkSession(activity_kind='cleaning')`` and
POSTs it to the new ``/api/integration/workstations/<uuid>/session-
complete/`` endpoint so the workstation_events (and equipment_events
where scoped) tables have full history.

Idempotency: the PSP endpoint writes a fresh audit row per call, so
running this twice would double-count. Because the historical
WorkSession count is small and this is a one-time migration, we
don't dedupe on the server side — callers should run this once per
tenant + verify counts before re-running.

Usage:
    python manage.py backfill_cleaning_audit_to_psp
    python manage.py backfill_cleaning_audit_to_psp --dry-run
    python manage.py backfill_cleaning_audit_to_psp --company-id 3
"""
from __future__ import annotations

import logging
from django.core.management.base import BaseCommand
from django.db.models import Q

from work_sessions.models import WorkSession
from workers.views.personal_kiosk import _post_session_complete_to_psp


class Command(BaseCommand):
    help = (
        "Backfill historical cleaning WorkSessions into the PSP audit "
        "tables via the unified session-complete callback."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Log what would be sent, but skip the POST.",
        )
        parser.add_argument(
            "--company-id",
            type=int,
            default=None,
            help="Narrow to a single vita-perf company id.",
        )
        parser.add_argument(
            "--since",
            type=str,
            default=None,
            help="Only replay sessions with start_time >= this ISO datetime.",
        )
        parser.add_argument(
            "--limit",
            type=int,
            default=None,
            help="Cap the total number of sessions replayed.",
        )

    def handle(self, *args, **opts):
        logger = logging.getLogger(__name__)
        dry_run: bool = opts["dry_run"]
        company_id = opts["company_id"]
        since = opts["since"]
        limit = opts["limit"]

        qs = (
            WorkSession.objects
            .filter(activity_kind="cleaning")
            .filter(Q(status="completed") | Q(status="verified"))
            .exclude(end_time__isnull=True)
            .select_related("workstation", "workstation__company", "user", "shift")
            .order_by("start_time")
        )
        if company_id is not None:
            qs = qs.filter(company_id=company_id)
        if since:
            qs = qs.filter(start_time__gte=since)
        if limit is not None:
            qs = qs[:limit]

        total = qs.count()
        self.stdout.write(
            f"Found {total} historical cleaning session(s) to backfill "
            f"(dry_run={dry_run})."
        )

        posted = 0
        skipped = 0
        for session in qs.iterator(chunk_size=200):
            workstation = session.workstation
            if not workstation or not workstation.external_id:
                skipped += 1
                continue

            # First worker on the session is the auditor of record —
            # matches what the live callback path does.
            worker = session.workers.first()
            start = session.start_time
            end = session.end_time
            duration = (
                int((end - start).total_seconds())
                if start and end
                else 0
            )

            if dry_run:
                self.stdout.write(
                    f"[DRY] session={session.id} ws={workstation.external_id} "
                    f"worker={getattr(worker, 'full_name', None)!r} "
                    f"duration={duration}s"
                )
                continue

            try:
                _post_session_complete_to_psp(
                    session.user,
                    workstation=workstation,
                    worker=worker,
                    session_id=session.id,
                    duration_seconds=duration,
                    started_at=start,
                    ended_at=end,
                    activity_kind="cleaning",
                    equipment_uuid=session.equipment_uuid,
                    shift=session.shift,
                )
                posted += 1
            except Exception:  # noqa: BLE001
                logger.exception(
                    "backfill: failed to post session %s to PSP",
                    session.id,
                )
                skipped += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Done. posted={posted} skipped={skipped} total={total}"
            )
        )

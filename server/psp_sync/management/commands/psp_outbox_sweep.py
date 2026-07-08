"""Retry every pending outbox entry that's due — the "periodic sweep"
signals.py refers to.

Usage:
    python manage.py psp_outbox_sweep
    python manage.py psp_outbox_sweep --include-failed

Meant for a cron job — every minute in prod. Rows in status
``pending`` or ``in_flight`` with ``next_retry_at`` in the past get
one push attempt. Pass ``--include-failed`` to also retry rows that
exhausted their max_attempts (operator-triggered rescue).
"""
from __future__ import annotations

from django.core.management.base import BaseCommand
from django.db.models import Q
from django.utils import timezone

from psp_sync.models import PspOutboxEntry
from psp_sync.signals import _try_push_now


class Command(BaseCommand):
    help = "Retry pending PspOutboxEntry rows against PSP."

    def add_arguments(self, parser):
        parser.add_argument(
            "--include-failed",
            action="store_true",
            help="Also reset+retry rows that hit max_attempts.",
        )

    def handle(self, *args, **opts):
        now = timezone.now()

        if opts["include_failed"]:
            PspOutboxEntry.objects.filter(status="failed").update(
                status="pending", last_error=""
            )

        due = PspOutboxEntry.objects.filter(
            Q(status__in=("pending", "in_flight"))
            & (Q(next_retry_at__isnull=True) | Q(next_retry_at__lte=now))
        )

        ids = list(due.values_list("id", flat=True))
        self.stdout.write(f"→ sweeping {len(ids)} row(s)")

        delivered = 0
        failed = 0
        for entry_id in ids:
            _try_push_now(entry_id)
            entry = PspOutboxEntry.objects.filter(pk=entry_id).values(
                "status"
            ).first()
            if entry and entry["status"] == "delivered":
                delivered += 1
            elif entry and entry["status"] == "failed":
                failed += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"done — delivered={delivered} failed={failed} "
                f"still_pending={len(ids) - delivered - failed}"
            )
        )

"""Sync PSP → vita-performance for every configured Company.

Usage:
    python manage.py psp_pull             # all configured tenants
    python manage.py psp_pull --company 1 # single tenant

Meant for a cron job — hourly is a sensible default. Runs the same
puller path the "Sync now" button hits, but skips silently over
companies that haven't wired their PSP creds yet.
"""
from __future__ import annotations

from django.core.cache import cache
from django.core.management.base import BaseCommand
from django.utils import timezone

from companies.models import Company
from psp_sync.pullers import pull_all_for_company


class Command(BaseCommand):
    help = "Pull workstations + employees + items from PSP for each Company."

    def add_arguments(self, parser):
        parser.add_argument(
            "--company",
            type=int,
            default=None,
            help="Only sync this Company id (default: every configured tenant).",
        )

    def handle(self, *args, **opts):
        qs = Company.objects.filter(is_active=True).exclude(
            psp_base_url__isnull=True
        ).exclude(psp_base_url="").exclude(
            psp_integration_token__isnull=True
        ).exclude(psp_integration_token="")

        if opts["company"]:
            qs = qs.filter(id=opts["company"])

        total = 0
        for company in qs:
            self.stdout.write(f"→ {company.name} (id={company.id})")
            result = pull_all_for_company(company)
            cache.set(
                f"psp:last_pull:{company.id}",
                timezone.now().isoformat(),
                None,
            )
            self.stdout.write(
                f"  created={result.created} updated={result.updated} "
                f"deactivated={result.deactivated} errors={len(result.errors)}"
            )
            for err in result.errors:
                self.stderr.write(f"  ! {err}")
            total += 1

        self.stdout.write(self.style.SUCCESS(f"done — {total} tenant(s) synced"))

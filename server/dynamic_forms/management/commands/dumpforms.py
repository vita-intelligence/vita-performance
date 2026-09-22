"""Dump legacy DynamicForm rows for manual migration to PSP.

Now that PSP is the authoring source of truth, one-off command to
export the pre-migration `source='legacy'` rows so an admin can
recreate them on PSP. Output is a JSON array on stdout — one entry
per form with fields shaped for a `POST /api/form-templates` call
on the PSP side:

    [
      {
        "vita_perf_id": 42,
        "name": "…",
        "trigger": "workstation_start" | "workstation_end" | "cleaning",
        "workstation_external_id": "<uuid>" | null,
        "workstation_name": "…" | null,
        "schema": { "fields": [...] },
        "is_active": true
      },
      ...
    ]

Usage:

    python manage.py dumpforms --out /tmp/legacy-forms.json

The `trigger` values are already remapped to PSP's vocabulary
(vita-perf's `start` → `workstation_start`, `end` → `workstation_end`,
`both` → duplicated as one row for each). Non-mappable rows are
skipped with a warning to stderr.
"""
from __future__ import annotations

import json
import sys

from django.core.management.base import BaseCommand

from dynamic_forms.models import DynamicForm


# vita-perf local enum → PSP publish enum.
TRIGGER_MAP = {
    DynamicForm.TRIGGER_START: ["workstation_start"],
    DynamicForm.TRIGGER_END: ["workstation_end"],
    DynamicForm.TRIGGER_BOTH: ["workstation_start", "workstation_end"],
    DynamicForm.TRIGGER_CLEANING_END: ["cleaning"],
}


class Command(BaseCommand):
    help = "Export legacy DynamicForm rows as JSON for manual import to PSP."

    def add_arguments(self, parser):
        parser.add_argument(
            "--include-inactive",
            action="store_true",
            help="Also dump `is_active=False` rows (default: skip them).",
        )
        parser.add_argument(
            "--only-psp",
            action="store_true",
            help="Dump only `source='psp'` rows (i.e. already-migrated).",
        )
        parser.add_argument(
            "--out",
            type=str,
            default=None,
            help=(
                "Write the JSON array to this path (recommended). "
                "Omit to print to stdout — but note that settings.py "
                "emits a startup banner on stdout too, so you'll need "
                "to strip it. Prefer `--out /tmp/legacy-forms.json`."
            ),
        )

    def handle(self, *args, **opts):
        qs = DynamicForm.objects.all()
        if opts["only_psp"]:
            qs = qs.filter(source=DynamicForm.SOURCE_PSP)
        else:
            qs = qs.filter(source=DynamicForm.SOURCE_LEGACY)

        if not opts["include_inactive"]:
            qs = qs.filter(is_active=True)

        rows = []
        skipped = 0
        for form in qs.select_related("workstation"):
            triggers = TRIGGER_MAP.get(form.trigger)
            if not triggers:
                sys.stderr.write(
                    f"! skip #{form.id} '{form.name}': unknown trigger {form.trigger!r}\n"
                )
                skipped += 1
                continue

            schema = form.schema
            # Normalise to the shape PSP form_template.schema expects:
            # `{ "fields": [...] , "per_equipment_fields": null }`.
            # Legacy rows carry either a bare list or already the dict
            # (post-migration 0003).
            if isinstance(schema, list):
                normalised_schema = {
                    "fields": schema,
                    "per_equipment_fields": None,
                }
            elif isinstance(schema, dict):
                normalised_schema = {
                    "fields": schema.get("fields") or [],
                    "per_equipment_fields": schema.get("per_equipment_fields"),
                }
            else:
                sys.stderr.write(
                    f"! skip #{form.id} '{form.name}': schema is {type(schema).__name__!r}, expected list or dict\n"
                )
                skipped += 1
                continue

            for trigger in triggers:
                # If the form had trigger='both' we emit two rows so
                # the operator lands them under distinct workstation
                # start / end assignments — same behaviour vita-perf
                # already had at kiosk render time.
                suffix = "" if len(triggers) == 1 else f" — {trigger.replace('workstation_', '')}"
                rows.append({
                    "vita_perf_id": form.id,
                    "name": form.name + suffix,
                    "trigger": trigger,
                    "workstation_external_id": (
                        str(form.workstation.external_id)
                        if form.workstation and form.workstation.external_id
                        else None
                    ),
                    "workstation_name": (
                        form.workstation.name if form.workstation else None
                    ),
                    "schema": normalised_schema,
                    "is_active": form.is_active,
                })

        blob = json.dumps(rows, indent=2, ensure_ascii=False)
        if opts["out"]:
            with open(opts["out"], "w", encoding="utf-8") as fh:
                fh.write(blob)
                fh.write("\n")
            sys.stderr.write(
                f"\nWrote {len(rows)} form(s) → {opts['out']}"
                + (f" ({skipped} skipped)" if skipped else "")
                + "\n"
            )
        else:
            self.stdout.write(blob)
            sys.stderr.write(
                f"\n{len(rows)} form(s) exported"
                + (f", {skipped} skipped" if skipped else "")
                + "\n"
            )

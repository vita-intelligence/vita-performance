"""PSP → vita-perf publish ingest.

PSP is the source of truth for form templates. When a template is
saved on PSP (task #8 publisher), it POSTs the resolved form to
`/api/dynamic-forms/publish/` here. This view upserts the mirror row
by `psp_uuid`, keyed for idempotency + monotonic versioning.

Auth: a shared secret in ``PSP_PUBLISH_TOKEN`` (env). PSP presents it
as ``X-PSP-Publish-Token``. Single-tenant today; future-proof by
minting per-tenant tokens once we have a second customer.

Payload:

    {
      "psp_uuid": "9c...",
      "psp_version": 3,
      "name": "Filler line — start of shift",
      "trigger": "start_of_shift",   // or "end_of_shift" | "cleaning"
      "schema": { "fields": [...] }, // ALREADY-RESOLVED flat FormField[]
      "is_active": true,
      "workstation_external_id": null | "<workstation.uuid on PSP>",
      // Optional. Present on cleaning-form publishes so the kiosk WS
      // picker gets fresh "due soon" chips. Ignored for other triggers.
      "workstation_cleaning_schedule": {
          "last_cleaning_at": null | "2026-09-16T14:23:00Z",
          "next_cleaning_due_at": null | "2026-09-23"
      }
    }

Late writes (incoming ``psp_version`` <= stored) return 204 without
touching the row so out-of-order retries never overwrite fresh data.
"""
from __future__ import annotations

import logging
import os
from datetime import date, datetime
from uuid import UUID

from django.db import transaction
from django.utils.dateparse import parse_date, parse_datetime
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from workstations.models import Workstation
from ..models import DynamicForm

logger = logging.getLogger(__name__)

# Map PSP triggers to vita-perf's local trigger enum. PSP always
# uses honest names for what fires + when (workstation vs equipment,
# start vs end phase); vp mirrors 1:1. Legacy single-phase names
# (cleaning, maintenance, equipment_cleaning, equipment_maintenance)
# were renamed to `_end` by migration 0007 — kept as accepted-alias
# keys here so an in-flight publish from a stale PSP build doesn't
# 400.
_TRIGGER_MAP = {
    "workstation_start": DynamicForm.TRIGGER_START,
    "workstation_end": DynamicForm.TRIGGER_END,
    "cleaning_start": DynamicForm.TRIGGER_CLEANING_START,
    "cleaning_end": DynamicForm.TRIGGER_CLEANING_END,
    "maintenance_start": DynamicForm.TRIGGER_MAINTENANCE_START,
    "maintenance_end": DynamicForm.TRIGGER_MAINTENANCE_END,
    "equipment_cleaning_start": DynamicForm.TRIGGER_EQUIPMENT_CLEANING_START,
    "equipment_cleaning_end": DynamicForm.TRIGGER_EQUIPMENT_CLEANING_END,
    "equipment_maintenance_start": DynamicForm.TRIGGER_EQUIPMENT_MAINTENANCE_START,
    "equipment_maintenance_end": DynamicForm.TRIGGER_EQUIPMENT_MAINTENANCE_END,
    # Legacy aliases — old PSP builds emit these; treat as the _end
    # phase since that's the semantic they always carried.
    "cleaning": DynamicForm.TRIGGER_CLEANING_END,
    "maintenance": DynamicForm.TRIGGER_MAINTENANCE_END,
    "equipment_cleaning": DynamicForm.TRIGGER_EQUIPMENT_CLEANING_END,
    "equipment_maintenance": DynamicForm.TRIGGER_EQUIPMENT_MAINTENANCE_END,
}

_EQUIPMENT_SCOPED_TRIGGERS = {
    DynamicForm.TRIGGER_EQUIPMENT_CLEANING_START,
    DynamicForm.TRIGGER_EQUIPMENT_CLEANING_END,
    DynamicForm.TRIGGER_EQUIPMENT_MAINTENANCE_START,
    DynamicForm.TRIGGER_EQUIPMENT_MAINTENANCE_END,
}


def _authorised(request) -> bool:
    expected = os.environ.get("PSP_PUBLISH_TOKEN")
    if not expected:
        # Fail closed — no token configured means the deployment
        # isn't set up to receive publishes.
        logger.warning("PSP_PUBLISH_TOKEN not set; refusing publish request")
        return False
    header = request.META.get("HTTP_X_PSP_PUBLISH_TOKEN", "")
    # Constant-time compare would be nicer but Python's `==` on short
    # secrets is fine for our threat model.
    return bool(header) and header == expected


def _bad(detail: str, code: str = "invalid_payload", http=status.HTTP_400_BAD_REQUEST):
    return Response({"error": code, "detail": detail}, status=http)


class DynamicFormPublishView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        if not _authorised(request):
            return _bad(
                "Bad or missing X-PSP-Publish-Token.",
                code="unauthorized",
                http=status.HTTP_401_UNAUTHORIZED,
            )

        data = request.data or {}

        try:
            psp_uuid = UUID(str(data["psp_uuid"]))
        except (KeyError, ValueError, TypeError):
            return _bad("`psp_uuid` must be a valid UUID.")

        psp_version = data.get("psp_version")
        if not isinstance(psp_version, int) or psp_version < 1:
            return _bad("`psp_version` must be a positive integer.")

        name = (data.get("name") or "").strip()
        if not name:
            return _bad("`name` is required.")
        if len(name) > 200:
            return _bad("`name` exceeds 200 characters.")

        raw_trigger = data.get("trigger")
        trigger = _TRIGGER_MAP.get(raw_trigger)
        if trigger is None:
            return _bad(
                f"`trigger` must be one of {sorted(_TRIGGER_MAP.keys())}.",
                code="invalid_trigger",
            )

        schema = data.get("schema")
        if not isinstance(schema, dict) and not isinstance(schema, list):
            return _bad("`schema` must be an object or array.")

        is_active = bool(data.get("is_active", True))

        worker_uuids_raw = data.get("worker_uuids") or []
        if not isinstance(worker_uuids_raw, list):
            return _bad(
                "`worker_uuids` must be a list of uuid strings.",
                code="invalid_worker_uuids",
            )
        worker_uuids: list[str] = []
        for entry in worker_uuids_raw:
            if not isinstance(entry, str):
                return _bad(
                    "`worker_uuids` entries must be strings.",
                    code="invalid_worker_uuids",
                )
            try:
                worker_uuids.append(str(UUID(entry)))
            except (ValueError, TypeError):
                return _bad(
                    "`worker_uuids` entries must be valid UUIDs.",
                    code="invalid_worker_uuids",
                )
        # De-dupe while preserving order.
        seen: set[str] = set()
        worker_uuids = [u for u in worker_uuids if not (u in seen or seen.add(u))]

        # Resolve workstation FK from PSP's uuid → local Workstation.
        workstation_uuid_raw = data.get("workstation_external_id")
        workstation = None
        if workstation_uuid_raw:
            try:
                workstation_uuid = UUID(str(workstation_uuid_raw))
            except (ValueError, TypeError):
                return _bad(
                    "`workstation_external_id` must be a valid UUID.",
                    code="invalid_workstation_uuid",
                )
            workstation = (
                Workstation.objects.filter(external_id=workstation_uuid).first()
            )
            if workstation is None:
                # Not fatal — the sync may not have caught up yet. Store
                # the form as unassigned; a later publish (after the WS
                # sync lands) will fix it.
                logger.info(
                    "Publish for psp_uuid=%s references unknown workstation "
                    "external_id=%s; storing unassigned",
                    psp_uuid,
                    workstation_uuid,
                )

        # Equipment scope — only present when the template's trigger
        # is equipment-scoped. PSP publishes one mirror row per
        # (workstation × equipment) so the kiosk keys the query
        # tightly. Reject a nullable equipment_uuid for the
        # equipment-scoped triggers (payload bug on PSP side) so
        # bad data never lands.
        equipment_uuid_raw = data.get("equipment_uuid")
        equipment_uuid: UUID | None = None
        if equipment_uuid_raw:
            try:
                equipment_uuid = UUID(str(equipment_uuid_raw))
            except (ValueError, TypeError):
                return _bad(
                    "`equipment_uuid` must be a valid UUID.",
                    code="invalid_equipment_uuid",
                )
        if trigger in _EQUIPMENT_SCOPED_TRIGGERS and equipment_uuid is None:
            return _bad(
                "`equipment_uuid` is required for equipment-scoped triggers.",
                code="missing_equipment_uuid",
            )

        # Optional cleaning schedule mirror — only meaningful when
        # trigger == cleaning AND the workstation resolved. Parsed
        # upfront so a bad shape rejects the whole request rather than
        # silently dropping half the write.
        schedule_last_at: datetime | None = None
        schedule_next_due: date | None = None
        schedule_present = False
        schedule = data.get("workstation_cleaning_schedule")
        if trigger == DynamicForm.TRIGGER_CLEANING_END and isinstance(schedule, dict):
            schedule_present = True
            raw_last = schedule.get("last_cleaning_at")
            if raw_last is not None:
                schedule_last_at = parse_datetime(str(raw_last))
                if schedule_last_at is None:
                    return _bad(
                        "`workstation_cleaning_schedule.last_cleaning_at` "
                        "must be an ISO-8601 datetime.",
                        code="invalid_cleaning_schedule",
                    )
            raw_next = schedule.get("next_cleaning_due_at")
            if raw_next is not None:
                schedule_next_due = parse_date(str(raw_next))
                if schedule_next_due is None:
                    return _bad(
                        "`workstation_cleaning_schedule.next_cleaning_due_at` "
                        "must be an ISO-8601 date.",
                        code="invalid_cleaning_schedule",
                    )

        # Parallel maintenance schedule mirror. Same shape, same rules
        # — only meaningful when trigger == maintenance AND the
        # workstation resolved. Feeds the "next maintenance due" chip
        # on the kiosk maintenance entry point.
        maint_last_at: datetime | None = None
        maint_next_due: date | None = None
        maint_schedule_present = False
        maint_schedule = data.get("workstation_maintenance_schedule")
        if trigger == DynamicForm.TRIGGER_MAINTENANCE_END and isinstance(maint_schedule, dict):
            maint_schedule_present = True
            raw_last = maint_schedule.get("last_maintenance_at")
            if raw_last is not None:
                maint_last_at = parse_datetime(str(raw_last))
                if maint_last_at is None:
                    return _bad(
                        "`workstation_maintenance_schedule.last_maintenance_at` "
                        "must be an ISO-8601 datetime.",
                        code="invalid_maintenance_schedule",
                    )
            raw_next = maint_schedule.get("next_maintenance_due_at")
            if raw_next is not None:
                maint_next_due = parse_date(str(raw_next))
                if maint_next_due is None:
                    return _bad(
                        "`workstation_maintenance_schedule.next_maintenance_due_at` "
                        "must be an ISO-8601 date.",
                        code="invalid_maintenance_schedule",
                    )

        sort_order_raw = data.get("sort_order", 0)
        try:
            sort_order = int(sort_order_raw) if sort_order_raw is not None else 0
        except (TypeError, ValueError):
            return _bad("`sort_order` must be an integer.", code="invalid_sort_order")

        with transaction.atomic():
            # Composite upsert key: (psp_uuid, workstation,
            # equipment_uuid). One template can attach to N
            # workstations AND N machines = N distinct mirror rows.
            existing = (
                DynamicForm.objects.select_for_update()
                .filter(
                    psp_uuid=psp_uuid,
                    workstation=workstation,
                    equipment_uuid=equipment_uuid,
                )
                .first()
            )

            if existing:
                stored_version = existing.psp_version or 0

                # Workstation cadence lives on the WORKSTATION row,
                # not on the DynamicForm — it's independent state
                # that piggybacks on every publish. Write it BEFORE
                # the version-gate short-circuit so a stale
                # template push (schema unchanged) still refreshes
                # the "next due" chip when only the cadence moved.
                if schedule_present and workstation is not None:
                    workstation.last_cleaning_at = schedule_last_at
                    workstation.next_cleaning_due_at = schedule_next_due
                    workstation.save(
                        update_fields=["last_cleaning_at", "next_cleaning_due_at"]
                    )

                if maint_schedule_present and workstation is not None:
                    workstation.last_maintenance_at = maint_last_at
                    workstation.next_maintenance_due_at = maint_next_due
                    workstation.save(
                        update_fields=[
                            "last_maintenance_at",
                            "next_maintenance_due_at",
                        ]
                    )

                if psp_version <= stored_version:
                    logger.info(
                        "Dropping stale template publish: psp_uuid=%s ws=%s "
                        "equipment=%s incoming=%d stored=%d "
                        "(cadence still applied)",
                        psp_uuid,
                        workstation.id if workstation else None,
                        equipment_uuid,
                        psp_version,
                        stored_version,
                    )
                    return Response(
                        {
                            "status": "stale",
                            "stored_version": stored_version,
                        },
                        status=status.HTTP_204_NO_CONTENT,
                    )

                existing.name = name
                existing.trigger = trigger
                existing.schema = schema
                existing.is_active = is_active
                existing.psp_version = psp_version
                existing.source = DynamicForm.SOURCE_PSP
                existing.worker_uuids = worker_uuids
                existing.sort_order = sort_order
                existing.save()

                return Response(
                    {
                        "status": "updated",
                        "id": existing.id,
                        "psp_uuid": str(existing.psp_uuid),
                        "psp_version": existing.psp_version,
                    },
                    status=status.HTTP_200_OK,
                )

            row = DynamicForm.objects.create(
                psp_uuid=psp_uuid,
                psp_version=psp_version,
                equipment_uuid=equipment_uuid,
                source=DynamicForm.SOURCE_PSP,
                user=None,
                workstation=workstation,
                name=name,
                trigger=trigger,
                schema=schema,
                sort_order=sort_order,
                is_active=is_active,
                worker_uuids=worker_uuids,
            )

            if schedule_present and workstation is not None:
                workstation.last_cleaning_at = schedule_last_at
                workstation.next_cleaning_due_at = schedule_next_due
                workstation.save(
                    update_fields=["last_cleaning_at", "next_cleaning_due_at"]
                )

            return Response(
                {
                    "status": "created",
                    "id": row.id,
                    "psp_uuid": str(row.psp_uuid),
                    "psp_version": row.psp_version,
                },
                status=status.HTTP_201_CREATED,
            )

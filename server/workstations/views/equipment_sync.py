"""Inbound endpoint: PSP → vp sync of a workstation's equipment roster.

PSP is the source of truth for equipment. Whenever equipment is
inserted / updated / detached against a workstation on PSP, PSP
POSTs the *entire* current roster for that workstation to this
endpoint. We upsert the mirror rows on ``workstation_equipment``
and deactivate anything not present in the incoming set.

Payload:

    {
      "workstation_external_id": "<PSP workstation uuid>",
      "equipment": [
        {
          "uuid": "<PSP equipment uuid>",
          "name": "V-blender · Bosch VMB-100",
          "serial_number": "SN-1234",
          "category_name": "Blender",
          "psp_updated_at": "2026-09-21T14:00:00Z"
        },
        ...
      ]
    }

Full-replace semantics — anything that used to be attached and is
now missing from the array is marked ``is_active=False`` (soft
deleted) so the kiosk doesn't show a machine that PSP just
detached, but audit history that referenced the row (via
``WorkSession.equipment_uuid``) still resolves.

Auth: same shared secret as forms publisher (``PSP_PUBLISH_TOKEN``).
"""

from __future__ import annotations

import logging
import os
from uuid import UUID
from datetime import datetime

from django.db import transaction
from django.utils.dateparse import parse_datetime
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from workstations.models import Workstation, WorkstationEquipment

logger = logging.getLogger(__name__)


def _authorised(request) -> bool:
    """Shared secret. Same env var + header as forms publisher."""
    expected = os.environ.get("PSP_PUBLISH_TOKEN")
    if not expected:
        logger.warning(
            "PSP_PUBLISH_TOKEN not set; refusing equipment-sync request"
        )
        return False
    header = request.META.get("HTTP_X_PSP_PUBLISH_TOKEN", "")
    return bool(header) and header == expected


def _bad(detail: str, code: str = "invalid_payload"):
    return Response(
        {"error": code, "detail": detail},
        status=status.HTTP_400_BAD_REQUEST,
    )


class WorkstationEquipmentSyncView(APIView):
    """``POST /api/kiosk/psp/workstation-equipment/``

    Full-replace sync of one workstation's equipment roster.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        if not _authorised(request):
            return Response(
                {
                    "error": "unauthorized",
                    "detail": "Bad or missing X-PSP-Publish-Token.",
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        data = request.data or {}

        ws_external_id = data.get("workstation_external_id")
        if not isinstance(ws_external_id, str) or not ws_external_id:
            return _bad("`workstation_external_id` is required.")

        try:
            UUID(ws_external_id)
        except (ValueError, TypeError):
            return _bad(
                "`workstation_external_id` must be a UUID.",
                code="invalid_workstation_external_id",
            )

        try:
            workstation = Workstation.objects.get(external_id=ws_external_id)
        except Workstation.DoesNotExist:
            # Not a hard error — PSP may publish equipment for a
            # workstation the vp side hasn't mirrored yet. Return 202
            # so the reconciler retries once the workstation shows up.
            logger.info(
                "equipment-sync: workstation %s not yet mirrored on vp",
                ws_external_id,
            )
            return Response(
                {
                    "status": "workstation_not_mirrored",
                    "workstation_external_id": ws_external_id,
                },
                status=status.HTTP_202_ACCEPTED,
            )

        raw_list = data.get("equipment")
        if not isinstance(raw_list, list):
            return _bad("`equipment` must be a list.", code="invalid_equipment")

        parsed: list[dict] = []
        for entry in raw_list:
            if not isinstance(entry, dict):
                return _bad(
                    "each `equipment` entry must be an object.",
                    code="invalid_equipment_entry",
                )
            uuid_str = entry.get("uuid")
            if not isinstance(uuid_str, str) or not uuid_str:
                return _bad(
                    "`equipment[].uuid` is required.",
                    code="invalid_equipment_uuid",
                )
            try:
                UUID(uuid_str)
            except (ValueError, TypeError):
                return _bad(
                    f"`equipment[].uuid` must be a UUID (got {uuid_str}).",
                    code="invalid_equipment_uuid",
                )

            name = (entry.get("name") or "").strip()
            if not name:
                return _bad(
                    f"`equipment[].name` is required (uuid={uuid_str}).",
                    code="invalid_equipment_name",
                )

            psp_updated_at_raw = entry.get("psp_updated_at")
            psp_updated_at: datetime | None = None
            if psp_updated_at_raw:
                psp_updated_at = parse_datetime(str(psp_updated_at_raw))

            parsed.append(
                {
                    "uuid": uuid_str,
                    "name": name[:200],
                    "serial_number": (entry.get("serial_number") or "")[:120],
                    "category_name": (entry.get("category_name") or "")[:120],
                    "psp_updated_at": psp_updated_at,
                }
            )

        incoming_uuids = {row["uuid"] for row in parsed}

        with transaction.atomic():
            # Upsert every incoming row.
            for row in parsed:
                WorkstationEquipment.objects.update_or_create(
                    workstation=workstation,
                    equipment_uuid=row["uuid"],
                    defaults={
                        "name": row["name"],
                        "serial_number": row["serial_number"],
                        "category_name": row["category_name"],
                        "psp_updated_at": row["psp_updated_at"],
                        "is_active": True,
                    },
                )

            # Soft-deactivate anything missing from the incoming
            # roster. Keeps historical WorkSession.equipment_uuid
            # references resolvable while making sure the kiosk
            # picker never shows a detached machine.
            (
                WorkstationEquipment.objects
                .filter(workstation=workstation, is_active=True)
                .exclude(equipment_uuid__in=incoming_uuids)
                .update(is_active=False)
            )

        return Response(
            {
                "status": "ok",
                "workstation_id": workstation.id,
                "workstation_external_id": ws_external_id,
                "active_count": len(incoming_uuids),
            },
            status=status.HTTP_200_OK,
        )

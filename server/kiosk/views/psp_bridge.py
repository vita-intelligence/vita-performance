"""Kiosk endpoints that source their data from PSP via psp_sync.

Two entry points:

  * ``GET /api/kiosk/<token>/mos/`` — the MO picker. Replaces the
    legacy free-text Item search when the workstation has
    ``psp_source_of_truth=True``. Returns only MOs whose current
    routing step targets this workstation.

  * ``GET /api/kiosk/<token>/non-mo-activities/`` — the tile list
    for cleaning / maintenance / other. Static-ish today but
    exposed as an endpoint so the kiosk client fetches it the same
    way it fetches MOs (uniform picker pattern).

Silent fallback: when ``psp_source_of_truth=False`` the MOs endpoint
returns ``{"items": [], "psp_source_of_truth": false}`` — the kiosk
UI reads the flag and falls back to the legacy Item search on that
signal. No 404s so the FE stays boring.
"""
from __future__ import annotations

import logging

from django.conf import settings
from rest_framework import status as http_status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from psp_sync.client import PspError, client_for_company

from .kiosk import get_workstation_by_token, check_kiosk_access

logger = logging.getLogger(__name__)


NON_MO_TILES = [
    {
        "activity_kind": "cleaning",
        "label": "Cleaning",
        "description": "Deep clean, sanitation, changeover cleaning.",
    },
    {
        "activity_kind": "maintenance",
        "label": "Maintenance",
        "description": "Preventive maintenance, inspection, minor repair.",
    },
    {
        "activity_kind": "other",
        "label": "Other (specify)",
        "description": "Anything else. Type a short label when you start.",
    },
]


class KioskMOsView(APIView):
    """GET /api/kiosk/<token>/mos/ — MO picker for this workstation.

    Response shape::

        {
          "psp_source_of_truth": true,
          "items": [
            {
              "mo_uuid": "…",
              "mo_status": "in_progress",
              "step_uuid": "…",
              "step_name": "Mixing",
              "step_sort_order": 3,
              "step_planned_start": "…",
              "step_planned_finish": "…",
              "item_name": "Blueberry Muffin",
              "quantity": "200.00",
              "due_date": "2026-07-14"
            },
            …
          ]
        }
    """

    permission_classes = [AllowAny]

    def get(self, request, token):
        workstation = get_workstation_by_token(token)
        if not workstation:
            return Response(
                {"detail": "Invalid kiosk link."},
                status=http_status.HTTP_404_NOT_FOUND,
            )

        if not check_kiosk_access(workstation):
            return Response(
                {"detail": "Kiosk not available on this plan."},
                status=http_status.HTTP_403_FORBIDDEN,
            )

        # Not cut over yet — kiosk falls back to legacy item search
        # when it reads this flag.
        if not workstation.psp_source_of_truth:
            return Response({"psp_source_of_truth": False, "items": []})

        if not workstation.external_id:
            logger.warning(
                "workstation %s has psp_source_of_truth=True but no external_id",
                workstation.id,
            )
            return Response({"psp_source_of_truth": True, "items": []})

        company = workstation.company
        if not company:
            return Response({"psp_source_of_truth": True, "items": []})

        try:
            client = client_for_company(company)
        except (ValueError, PspError):
            # No PSP creds yet — return empty rather than 500 so the
            # kiosk UI shows a benign "no MOs available" state.
            return Response({"psp_source_of_truth": True, "items": []})

        try:
            # Only expose MOs an operator can actually clock into —
            # that means the supervisor has already hit "Start
            # production" and the MO is `in_progress` on PSP.
            # `scheduled` MOs are still on the calendar; showing them
            # on the kiosk would let operators start work PSP thinks
            # hasn't kicked off yet, breaking the labour-cost timeline.
            remote_mos = client.list_manufacturing_orders(
                workstation_uuid=str(workstation.external_id),
                status="in_progress",
            )
        except PspError as e:
            logger.warning("psp_sync list_manufacturing_orders failed: %s", e)
            return Response({"psp_source_of_truth": True, "items": []})

        rows: list[dict] = []
        for mo in remote_mos:
            mo_uuid = mo.get("uuid")
            mo_status = mo.get("status")
            quantity = mo.get("quantity")
            due_date = mo.get("due_date")
            item = mo.get("item") or {}

            for step in mo.get("steps") or []:
                # Steps are routed at group level on PSP — PSP tags
                # each step with `for_this_workstation` telling us
                # whether the step's group matches our station. We
                # only surface matching steps so the operator doesn't
                # see the encapsulation step on a bottling kiosk.
                if not step.get("for_this_workstation"):
                    continue

                group = step.get("workstation_group") or {}

                rows.append({
                    "mo_uuid": mo_uuid,
                    "mo_status": mo_status,
                    "step_uuid": step.get("uuid"),
                    "step_name": step.get("name"),
                    "step_sort_order": step.get("sort_order"),
                    "step_status": step.get("status"),
                    "step_planned_start": step.get("planned_start"),
                    "step_planned_finish": step.get("planned_finish"),
                    "workstation_group_name": group.get("name"),
                    "item_name": item.get("name"),
                    "quantity": quantity,
                    "due_date": due_date,
                })

        return Response({"psp_source_of_truth": True, "items": rows})


class KioskNonMOActivitiesView(APIView):
    """GET /api/kiosk/<token>/non-mo-activities/ — tile catalogue."""

    permission_classes = [AllowAny]

    def get(self, request, token):
        workstation = get_workstation_by_token(token)
        if not workstation:
            return Response(
                {"detail": "Invalid kiosk link."},
                status=http_status.HTTP_404_NOT_FOUND,
            )

        return Response({
            "items": NON_MO_TILES,
            "psp_source_of_truth": workstation.psp_source_of_truth,
        })

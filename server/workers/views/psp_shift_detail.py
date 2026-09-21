"""Inbound endpoint that PSP hits when rendering the
``/hr/employees/<uuid>/shifts/<uuid>`` detail page.

PSP already mirrors shift-level rows on close (see :class:`Backend.
HR.EmployeeShift` on the PSP side) but never gets session-level
detail — no way to render the timeline / activity breakdown the HR
detail page shows. This endpoint hands PSP everything it needs in
one round-trip:

* the shift row + duration
* every WorkSession on that shift (workstation, item, MO, times,
  performance, quantity, activity_kind)
* rolled-up summary counters (total working / idle time, breakdown
  by ``activity_kind``, session counts)
* reputation events fired during the shift window
* the worker's rolling-average window so the page can render a
  "vs their normal" comparison chip

Auth: shared secret in ``PSP_PUBLISH_TOKEN`` — reuses the same env
var the forms-publisher endpoint validates against so tenants that
already have the two apps talking don't need a second credential.

Silent-degrade posture: this is a read endpoint on hot data —
malformed rows / a stale worker FK should log and skip rather
than 500 the whole detail page. Sessions with missing FK targets
still surface in the timeline as best-effort rows.
"""

from __future__ import annotations

import logging
import os
from datetime import timedelta

from django.db.models import Sum, Count, Q
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

logger = logging.getLogger(__name__)


def _authorised(request) -> bool:
    """Shared-secret auth. Same env var + header the forms
    publisher validates against — one credential for the whole
    PSP → vita-perf inbound surface."""

    expected = os.environ.get("PSP_PUBLISH_TOKEN")
    if not expected:
        logger.warning("PSP_PUBLISH_TOKEN not set; refusing shift-detail request")
        return False
    header = request.META.get("HTTP_X_PSP_PUBLISH_TOKEN", "")
    return bool(header) and header == expected


class PspShiftDetailView(APIView):
    """``GET /api/kiosk/psp/shifts/<int:shift_id>/detail/``

    Returns the full shift breakdown for the detail page:

    .. code-block:: json

      {
        "shift": {...},
        "sessions": [{...}, ...],
        "summary": {
          "total_shift_seconds": 28800,
          "working_seconds": 22400,
          "idle_seconds": 6400,
          "by_activity_kind": {
            "cleaning": {"count": 2, "seconds": 800},
            "mo": {"count": 3, "seconds": 20000},
            "maintenance": {"count": 0, "seconds": 0},
            "other": {"count": 1, "seconds": 1600}
          },
          "sessions_completed": 5,
          "sessions_active": 1
        },
        "reputation_events": [...],
        "rolling_average": {
          "window_days": 30,
          "shifts_counted": 12,
          "avg_working_seconds_per_shift": 21500,
          "avg_idle_seconds_per_shift": 5200,
          "avg_sessions_per_shift": 4.5
        }
      }
    """

    permission_classes = [AllowAny]

    def get(self, request, shift_id: int):
        if not _authorised(request):
            return Response(
                {"detail": "Bad or missing X-PSP-Publish-Token."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        from workers.models.shift import WorkerShift
        from workers.models.reputation_event import WorkerReputationEvent
        from work_sessions.models import WorkSession
        from django.utils import timezone

        try:
            shift = (
                WorkerShift.objects
                .select_related("worker")
                .get(pk=shift_id)
            )
        except WorkerShift.DoesNotExist:
            return Response(
                {"detail": "Shift not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Shift envelope.
        clocked_in = shift.clocked_in_at
        clocked_out = shift.clocked_out_at
        end_ref = clocked_out or timezone.now()
        total_shift_seconds = max(
            0, int((end_ref - clocked_in).total_seconds())
        )

        # Sessions on this shift. Ordered chronologically for the
        # timeline; the summary below walks the same list so both
        # views agree on the numbers.
        sessions_qs = (
            WorkSession.objects
            .filter(shift=shift)
            .select_related("workstation", "item")
            .prefetch_related("workers")
            .order_by("start_time", "id")
        )

        session_rows: list[dict] = []
        working_seconds = 0
        by_kind: dict[str, dict[str, int]] = {
            "cleaning": {"count": 0, "seconds": 0},
            "mo": {"count": 0, "seconds": 0},
            "maintenance": {"count": 0, "seconds": 0},
            "other": {"count": 0, "seconds": 0},
        }
        completed = 0
        active = 0

        for s in sessions_qs:
            # Duration: for closed sessions use end - start; for
            # still-active sessions use now - start so the running
            # session's slice is visible on the timeline too.
            s_end = s.end_time or timezone.now()
            dur = max(0, int((s_end - s.start_time).total_seconds()))
            working_seconds += dur

            kind = s.activity_kind or "other"
            if kind not in by_kind:
                by_kind[kind] = {"count": 0, "seconds": 0}
            by_kind[kind]["count"] += 1
            by_kind[kind]["seconds"] += dur

            if s.status == "completed":
                completed += 1
            elif s.status == "active":
                active += 1

            session_rows.append({
                "id": s.id,
                "activity_kind": kind,
                "status": s.status,
                "workstation_id": s.workstation_id,
                "workstation_name": s.workstation.name if s.workstation else None,
                "item_id": s.item_id,
                "item_name": s.item.name if s.item else None,
                "mo_uuid": s.mo_uuid if hasattr(s, "mo_uuid") else None,
                # ``override_task_name`` is what cleaning sessions
                # stamp for their timeline label; production sessions
                # fall back to item name / activity_kind.
                "activity_label": (
                    getattr(s, "override_task_name", None)
                    or (s.item.name if s.item else None)
                    or kind
                ),
                "start_time": s.start_time.isoformat() if s.start_time else None,
                "end_time": s.end_time.isoformat() if s.end_time else None,
                "duration_seconds": dur,
                "quantity_produced": (
                    str(s.quantity_produced)
                    if s.quantity_produced is not None else None
                ),
                "quantity_rejected": (
                    str(s.quantity_rejected)
                    if s.quantity_rejected is not None else None
                ),
                "performance_percentage": (
                    s.performance_percentage
                    if s.performance_percentage is not None else None
                ),
            })

        idle_seconds = max(0, total_shift_seconds - working_seconds)

        # Reputation events fired within the shift window. Uses
        # ``created_at`` since ReputationEvent doesn't carry a
        # shift FK on this deployment yet — the window filter is
        # good enough for the "what feedback did they get this
        # shift" chip on the page.
        rep_rows: list[dict] = []
        try:
            rep_qs = (
                WorkerReputationEvent.objects
                .filter(
                    worker=shift.worker,
                    created_at__gte=clocked_in,
                )
                .order_by("created_at")
            )
            if clocked_out:
                rep_qs = rep_qs.filter(created_at__lte=clocked_out)
            for ev in rep_qs:
                rep_rows.append({
                    "id": ev.id,
                    "kind": ev.event_type,
                    "delta": ev.score_delta,
                    "reason": ev.reason or None,
                    "created_at": ev.created_at.isoformat(),
                })
        except Exception:  # noqa: BLE001 — reputation is a nice-to-have; never 500 on it
            logger.exception(
                "psp shift-detail: reputation event lookup failed for shift %s",
                shift.pk,
            )

        # Rolling average across the worker's recent shifts (30d),
        # so the page can render a "vs your normal" comparison. Only
        # counts CLOSED shifts so mid-shift viewers don't skew their
        # own average. Excludes this shift so the number is a peer
        # comparison, not self-inclusion.
        rolling = {
            "window_days": 30,
            "shifts_counted": 0,
            "avg_working_seconds_per_shift": 0,
            "avg_idle_seconds_per_shift": 0,
            "avg_sessions_per_shift": 0.0,
        }
        try:
            cutoff = timezone.now() - timedelta(days=30)
            recent_shifts = (
                WorkerShift.objects
                .filter(
                    worker=shift.worker,
                    status="closed",
                    clocked_out_at__isnull=False,
                    clocked_out_at__gte=cutoff,
                )
                .exclude(pk=shift.pk)
            )
            shift_ids = list(recent_shifts.values_list("id", flat=True))
            if shift_ids:
                # Per-shift working seconds: sum(end - start) across
                # sessions grouped by shift, then average.
                # SQLite doesn't have a good "epoch delta" primitive
                # so compute in Python — fine at 30-shifts-per-worker.
                working_by_shift: dict[int, int] = {}
                session_counts: dict[int, int] = {}
                q = (
                    WorkSession.objects
                    .filter(shift_id__in=shift_ids, end_time__isnull=False)
                    .values("shift_id", "start_time", "end_time")
                )
                for row in q:
                    sid = row["shift_id"]
                    delta = int((row["end_time"] - row["start_time"]).total_seconds())
                    working_by_shift[sid] = working_by_shift.get(sid, 0) + max(0, delta)
                    session_counts[sid] = session_counts.get(sid, 0) + 1

                shift_durations = {
                    s.id: max(
                        0,
                        int((s.clocked_out_at - s.clocked_in_at).total_seconds())
                    )
                    for s in recent_shifts
                }
                n = len(shift_ids)
                total_working = sum(working_by_shift.values())
                total_shift = sum(shift_durations.values())
                total_sessions = sum(session_counts.values())
                rolling.update({
                    "shifts_counted": n,
                    "avg_working_seconds_per_shift": total_working // n if n else 0,
                    "avg_idle_seconds_per_shift": (
                        max(0, total_shift - total_working) // n if n else 0
                    ),
                    "avg_sessions_per_shift": (
                        round(total_sessions / n, 2) if n else 0.0
                    ),
                })
        except Exception:  # noqa: BLE001
            logger.exception(
                "psp shift-detail: rolling-average calc failed for shift %s",
                shift.pk,
            )

        return Response({
            "shift": {
                "id": shift.id,
                "external_id": str(shift.id),
                "worker_uuid": (
                    str(shift.worker.uuid) if shift.worker
                    and getattr(shift.worker, "uuid", None) else None
                ),
                "worker_external_id": (
                    shift.worker.external_id if shift.worker else None
                ),
                "worker_name": shift.worker.full_name if shift.worker else None,
                "clocked_in_at": clocked_in.isoformat() if clocked_in else None,
                "clocked_out_at": clocked_out.isoformat() if clocked_out else None,
                "duration_seconds": total_shift_seconds,
                "is_open": shift.status == WorkerShift.STATUS_ACTIVE,
                "device_id": shift.device_id or None,
                "notes": shift.notes or None,
            },
            "sessions": session_rows,
            "summary": {
                "total_shift_seconds": total_shift_seconds,
                "working_seconds": working_seconds,
                "idle_seconds": idle_seconds,
                "by_activity_kind": by_kind,
                "sessions_completed": completed,
                "sessions_active": active,
            },
            "reputation_events": rep_rows,
            "rolling_average": rolling,
        })

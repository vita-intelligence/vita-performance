from datetime import datetime, time
from django.db import IntegrityError
from django.db.models import Avg, Count, Sum
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from ..models import Worker, WorkerReputationEvent, WorkerShift
from ..serializers import WorkerShiftSerializer


def _worker_for_request(request, worker_id):
    """Fetch a worker owned by the request's tenant (user), else None.

    Mirrors the tenant scoping used by the existing worker endpoints —
    every worker row carries `user_id` == the tenant admin. Personal
    kiosk endpoints will always resolve a worker before mutating a
    shift, so all business rules stay tenant-scoped.
    """
    try:
        return Worker.objects.select_related('company').get(
            pk=worker_id, user=request.user
        )
    except Worker.DoesNotExist:
        return None


class ActiveShiftView(APIView):
    """GET /api/workers/shifts/active?worker_id=… — returns the open
    shift for the given worker, or 204 if they're clocked out.

    The personal kiosk hits this on load so it knows whether to show
    the clock-in card or the tile-menu home.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        worker_id = request.query_params.get('worker_id')
        if not worker_id:
            return Response(
                {'detail': 'worker_id query param is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        worker = _worker_for_request(request, worker_id)
        if not worker:
            return Response(
                {'detail': 'Worker not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        shift = (
            WorkerShift.objects
            .filter(worker=worker, status=WorkerShift.STATUS_ACTIVE)
            .first()
        )
        if not shift:
            return Response(status=status.HTTP_204_NO_CONTENT)

        return Response(WorkerShiftSerializer(shift).data)


class StartShiftView(APIView):
    """POST /api/workers/shifts/start — opens a shift for a worker.

    Body: {"worker_id": int, "pin": str, "device_id"?: str}. The PIN
    is verified against Worker.pin using constant-time hashing —
    workers with no PIN set can clock in without one (dev / import
    fixtures), but the personal kiosk should always send one. Returns
    409 if the worker already has an open shift (partial unique index
    enforces this at the DB level — we catch the IntegrityError to
    translate into a friendly response).
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        worker_id = request.data.get('worker_id')
        pin = (request.data.get('pin') or '').strip()
        device_id = (request.data.get('device_id') or '').strip()[:64]

        if not worker_id:
            return Response(
                {'detail': 'worker_id is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        worker = _worker_for_request(request, worker_id)
        if not worker:
            return Response(
                {'detail': 'Worker not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not worker.company_id:
            return Response(
                {'detail': 'Worker has no company — assign one before clocking in.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # PIN gate — if the worker has one set, the request MUST
        # provide the matching PIN. Workers without a PIN (legacy /
        # import) skip this check, but the kiosk UX should still
        # collect one when has_pin is true.
        if worker.has_pin:
            if not pin or not worker.check_pin(pin):
                return Response(
                    {'detail': 'Incorrect PIN.'},
                    status=status.HTTP_401_UNAUTHORIZED,
                )

        try:
            shift = WorkerShift.objects.create(
                worker=worker,
                company=worker.company,
                device_id=device_id,
            )
        except IntegrityError:
            # Partial unique index tripped — worker already has an
            # active shift open. Return the existing shift so the FE
            # can just carry on.
            existing = (
                WorkerShift.objects
                .filter(worker=worker, status=WorkerShift.STATUS_ACTIVE)
                .first()
            )
            return Response(
                {
                    'detail': 'Worker already has an open shift.',
                    'shift': WorkerShiftSerializer(existing).data if existing else None,
                },
                status=status.HTTP_409_CONFLICT,
            )

        return Response(
            WorkerShiftSerializer(shift).data,
            status=status.HTTP_201_CREATED,
        )


class WorkerStationsView(APIView):
    """GET /api/workers/<worker_id>/stations/ — tile menu for the
    personal kiosk.

    A worker sees a station tile if:
      * the station is marked `is_general=True` (open to everyone), OR
      * the station is in their `authorized_workstations` M2M.

    We return the `kiosk_token` on each row so the FE can deep-link
    into the existing per-station kiosk (`/kiosk/<token>`) instead of
    duplicating the workflow. QA workers additionally get a synthetic
    `qa` tile — the QA flow doesn't hang off a station.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, worker_id):
        worker = _worker_for_request(request, worker_id)
        if not worker:
            return Response(
                {'detail': 'Worker not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        from workstations.models import Workstation  # local — avoid app-load cycles
        from django.db.models import Q

        stations = (
            Workstation.objects
            .filter(user=request.user, is_active=True)
            .filter(Q(is_general=True) | Q(authorized_workers=worker))
            .distinct()
            .order_by('-is_general', 'name')
        )

        station_payload = [
            {
                'id': s.id,
                'name': s.name,
                'description': s.description or '',
                'kiosk_token': str(s.kiosk_token),
                'is_general': s.is_general,
                'is_authorized': not s.is_general,  # if not general we got here via M2M
            }
            for s in stations
        ]

        return Response({
            'stations': station_payload,
            'qa_enabled': worker.is_qa,
        })


class TodaySummaryView(APIView):
    """GET /api/workers/<worker_id>/today-summary/ — kiosk home stats.

    Compact payload the personal-kiosk home renders on landing after
    clock-in: today's session count, avg performance, latest session,
    QA reviews done, and the worker's current reputation. Deliberately
    thin — the dashboard endpoint already covers deep drill-downs;
    this is the "am I on track today?" glance.

    "Today" = midnight in the server's TZ. When we add per-tenant TZs
    we should feed that through here.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, worker_id):
        worker = _worker_for_request(request, worker_id)
        if not worker:
            return Response(
                {'detail': 'Worker not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)

        # Session stats for this worker today. Filter on the join
        # to `workers` (M2M) so a worker who's just one of many on
        # a session still gets credit.
        from work_sessions.models import WorkSession  # local import — avoid app-load cycles

        sessions_today_qs = (
            WorkSession.objects
            .filter(
                workers=worker,
                user=request.user,
                status__in=['completed', 'verified'],
                start_time__gte=today_start,
            )
        )
        session_stats = sessions_today_qs.aggregate(
            sessions_count=Count('id'),
            avg_performance=Avg('performance_percentage'),
            total_quantity=Sum('quantity_produced'),
        )

        latest = (
            sessions_today_qs
            .select_related('workstation')
            .order_by('-start_time')
            .first()
        )
        latest_payload = None
        if latest:
            latest_payload = {
                'id': latest.id,
                'workstation_name': latest.workstation.name if latest.workstation else None,
                'performance_percentage': latest.performance_percentage,
                'ended_at': latest.end_time.isoformat() if latest.end_time else None,
                'status': latest.status,
            }

        # QA reviews done by this worker today = manual_positive /
        # manual_negative reputation events they authored.
        qa_reviews_today = (
            WorkerReputationEvent.objects
            .filter(
                created_by=worker,
                event_type__in=['manual_positive', 'manual_negative'],
                created_at__gte=today_start,
            )
            .count()
        )

        # Current active shift (if any) so the FE can render the
        # header without a second call.
        active_shift = (
            WorkerShift.objects
            .filter(worker=worker, status=WorkerShift.STATUS_ACTIVE)
            .first()
        )

        # Total shift seconds today = elapsed of the open shift +
        # closed shifts' durations that STARTED today (naïve; if a
        # shift crosses midnight it counts the whole thing under
        # today's start date — good enough for MVP).
        shifts_today = list(
            WorkerShift.objects
            .filter(worker=worker, clocked_in_at__gte=today_start)
        )
        total_shift_seconds = sum(s.duration_seconds for s in shifts_today)

        return Response({
            'worker': {
                'id': worker.id,
                'name': worker.full_name,
                'reputation_score': worker.reputation_score,
                'reputation_tier': worker.reputation_tier,
                'is_qa': worker.is_qa,
            },
            'active_shift': WorkerShiftSerializer(active_shift).data if active_shift else None,
            'shift_seconds_today': total_shift_seconds,
            'sessions_today': {
                'count': session_stats['sessions_count'] or 0,
                'avg_performance': round(session_stats['avg_performance'], 2) if session_stats['avg_performance'] else None,
                'total_quantity': float(session_stats['total_quantity'] or 0),
            },
            'latest_session': latest_payload,
            'qa_reviews_today': qa_reviews_today,
        })


class DayOverviewView(APIView):
    """GET /api/workers/<worker_id>/day/<yyyy-mm-dd>/ — one day's
    activity for a worker, grouped by shift.

    Payload shape:
        {
            "date": "2026-08-04",
            "worker": {...},
            "shifts": [
                {
                    id, clocked_in_at, clocked_out_at, is_active,
                    duration_seconds, sessions_count, sessions_seconds,
                    qa_reviews_count,
                    sessions: [ {id, workstation_name, start, end,
                                 perf, quantity, item, status}, ... ],
                    qa_reviews: [ {id, target_worker_name, event_type,
                                   score_delta, reason, created_at}, ... ],
                    idle_seconds  # shift duration - on-station time
                }, ...
            ],
            # Sessions / reviews with no shift association (station
            # kiosk pre-shift, admin flows, etc.) so nothing is hidden.
            "unattached_sessions": [...],
            "unattached_reviews": [...]
        }

    Manager-facing (audit) + worker-facing (self-review).
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, worker_id, date):
        worker = _worker_for_request(request, worker_id)
        if not worker:
            return Response(
                {'detail': 'Worker not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            day = datetime.strptime(date, '%Y-%m-%d').date()
        except (TypeError, ValueError):
            return Response(
                {'detail': 'date must be YYYY-MM-DD.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Day window in the server TZ. When per-tenant TZ lands, feed
        # it through here.
        tz = timezone.get_current_timezone()
        day_start = timezone.make_aware(datetime.combine(day, time.min), tz)
        day_end = timezone.make_aware(datetime.combine(day, time.max), tz)

        # Shifts that were OPEN during any part of this day — either
        # clocked in on this day, or still running when the day began.
        from work_sessions.models import WorkSession
        shifts = list(
            WorkerShift.objects
            .filter(worker=worker)
            .filter(clocked_in_at__lte=day_end)
            .filter(
                # Still open OR closed after day started
                clocked_out_at__isnull=True,
            )
            | WorkerShift.objects.filter(
                worker=worker,
                clocked_in_at__lte=day_end,
                clocked_out_at__gte=day_start,
            )
        )
        shifts = list({s.id: s for s in shifts}.values())  # dedupe
        shifts.sort(key=lambda s: s.clocked_in_at)

        # All sessions that overlap the day for this worker.
        session_qs = (
            WorkSession.objects
            .filter(
                workers=worker,
                user=request.user,
                start_time__lte=day_end,
            )
            .filter(
                # end_time null (still active) OR ended after day start
                end_time__isnull=True,
            )
            | WorkSession.objects.filter(
                workers=worker,
                user=request.user,
                start_time__lte=day_end,
                end_time__gte=day_start,
            )
        )
        sessions = list(
            session_qs.select_related('workstation', 'item').distinct()
        )
        sessions.sort(key=lambda s: s.start_time)

        # QA reviews authored today by this worker (target of review).
        # We include both target-of and author-of so the timeline shows
        # feedback ABOUT this worker on their shift AND reviews they
        # authored (relevant for QA workers).
        reviews = list(
            WorkerReputationEvent.objects
            .filter(created_at__gte=day_start, created_at__lte=day_end)
            .filter(
                # Reviews about this worker OR authored by this worker
                worker=worker,
            )
            .select_related('created_by', 'session__workstation')
            | WorkerReputationEvent.objects
            .filter(
                created_at__gte=day_start,
                created_at__lte=day_end,
                created_by=worker,
            )
            .select_related('created_by', 'session__workstation')
        )
        reviews = list({r.id: r for r in reviews}.values())
        reviews.sort(key=lambda r: r.created_at)

        # Bucket sessions + reviews by shift_id.
        sessions_by_shift = {}
        unattached_sessions = []
        for s in sessions:
            if s.shift_id:
                sessions_by_shift.setdefault(s.shift_id, []).append(s)
            else:
                unattached_sessions.append(s)

        reviews_by_shift = {}
        unattached_reviews = []
        for r in reviews:
            if r.shift_id:
                reviews_by_shift.setdefault(r.shift_id, []).append(r)
            else:
                unattached_reviews.append(r)

        shift_payload = [
            _serialize_shift_day(
                shift,
                sessions_by_shift.get(shift.id, []),
                reviews_by_shift.get(shift.id, []),
            )
            for shift in shifts
        ]

        return Response({
            'date': date,
            'worker': {
                'id': worker.id,
                'name': worker.full_name,
                'is_qa': worker.is_qa,
            },
            'shifts': shift_payload,
            'unattached_sessions': [_serialize_session(s) for s in unattached_sessions],
            'unattached_reviews': [_serialize_review(r) for r in unattached_reviews],
        })


def _serialize_session(s):
    return {
        'id': s.id,
        'workstation_name': s.workstation.name if s.workstation else None,
        'item_name': s.item.name if s.item else None,
        'start_time': s.start_time.isoformat() if s.start_time else None,
        'end_time': s.end_time.isoformat() if s.end_time else None,
        'duration_seconds': int((s.end_time - s.start_time).total_seconds()) if s.end_time and s.start_time else None,
        'performance_percentage': s.performance_percentage,
        'quantity_produced': float(s.quantity_produced) if s.quantity_produced else None,
        'status': s.status,
        'shift_id': s.shift_id,
    }


def _serialize_review(r):
    return {
        'id': r.id,
        'target_worker_name': r.worker.full_name if r.worker else None,
        'author_name': r.created_by.full_name if r.created_by else None,
        'event_type': r.event_type,
        'score_delta': r.score_delta,
        'reason': r.reason,
        'session_workstation': r.session.workstation.name if r.session and r.session.workstation else None,
        'created_at': r.created_at.isoformat(),
        'shift_id': r.shift_id,
    }


def _serialize_shift_day(shift, sessions, reviews):
    # On-station seconds = sum of session durations that have ended.
    on_station = 0
    for s in sessions:
        if s.end_time and s.start_time:
            on_station += int((s.end_time - s.start_time).total_seconds())

    shift_seconds = shift.duration_seconds
    idle_seconds = max(0, shift_seconds - on_station)

    return {
        'id': shift.id,
        'clocked_in_at': shift.clocked_in_at.isoformat(),
        'clocked_out_at': shift.clocked_out_at.isoformat() if shift.clocked_out_at else None,
        'is_active': shift.is_active,
        'duration_seconds': shift_seconds,
        'on_station_seconds': on_station,
        'idle_seconds': idle_seconds,
        'sessions_count': len(sessions),
        'qa_reviews_count': len(reviews),
        'notes': shift.notes,
        'sessions': [_serialize_session(s) for s in sessions],
        'qa_reviews': [_serialize_review(r) for r in reviews],
    }


class EndShiftView(APIView):
    """POST /api/workers/shifts/<pk>/end — closes an open shift.

    Body: {"notes"?: str}. Idempotent: closing an already-closed
    shift returns 200 with the row unchanged. This makes the kiosk
    "Clock out" button safe to double-tap.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            shift = WorkerShift.objects.select_related('worker').get(
                pk=pk, worker__user=request.user
            )
        except WorkerShift.DoesNotExist:
            return Response(
                {'detail': 'Shift not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if shift.is_active:
            notes = request.data.get('notes')
            shift.close(notes=notes)

        return Response(WorkerShiftSerializer(shift).data)

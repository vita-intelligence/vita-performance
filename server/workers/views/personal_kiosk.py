"""Public, token-paired endpoints for the personal-kiosk tablet.

Mirrors the workstation-kiosk pattern (`/api/kiosk/<token>/…`) and the
QC pattern (`/api/qc/<token>/…`):
  * The tablet is paired to a tenant via a `PersonalKioskToken` UUID
    stored on the user (tenant admin) with a `OneToOne`.
  * Public URLs like `/api/kiosk/personal/<token>/workers/…` resolve
    the token to a user, then apply the SAME tenant scoping the
    authenticated variants use — `worker.user == token.user`.
  * `AllowAny` so the tablet never has to send a bearer. The token
    IS the auth.

Kept in its own file so the existing auth-gated `shift.py` (dashboard
/ admin views) stays clean.
"""

import uuid
from datetime import datetime, time
from django.core.cache import cache
from django.db import IntegrityError, transaction
from django.db.models import Avg, Count, Q, Sum
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from ..models import (
    PersonalKioskAuthSession,
    PersonalKioskToken,
    Worker,
    WorkerReputationEvent,
    WorkerShift,
)
from ..serializers import WorkerSerializer, WorkerShiftSerializer
from .shift import _serialize_review, _serialize_session, _serialize_shift_day


def _resolve_token(token):
    """Look up the tenant user behind a paired-tablet token. Returns
    None on any error so the caller can surface a friendly 404."""
    try:
        uuid.UUID(str(token))
    except (TypeError, ValueError):
        return None
    return (
        PersonalKioskToken.objects
        .select_related('user')
        .filter(token=token)
        .first()
    )


def _client_ip(request):
    """Extract the client IP, respecting the reverse-proxy header."""
    xff = request.META.get('HTTP_X_FORWARDED_FOR')
    if xff:
        return xff.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', '') or 'unknown'


# Anti-enumeration threshold for personal-kiosk token brute-force.
# The tablet-facing endpoints resolve UUID tokens from the URL —
# without a soft limit an attacker can iterate the UUID space at
# wire speed to discover which tenants have kiosks paired. 5 failed
# lookups per IP per minute keeps a legitimate typo-recovery flow
# working (operator mis-scans, retries) while dropping enumeration
# throughput to ~1 attempt per 12 seconds per IP.
_KIOSK_TOKEN_FAIL_LIMIT = 5
_KIOSK_TOKEN_FAIL_WINDOW_SECS = 60


def _resolve_token_or_rate_limit(request, token):
    """Resolve a kiosk token; enforce a soft rate limit of failed
    lookups per IP to slow UUID enumeration. Callers use::

        tok, err = _resolve_token_or_rate_limit(request, token)
        if err:
            return err
        if not tok:
            return Response({"detail": "..."}, status=404)

    A successful lookup returns ``(token_obj, None)``. An invalid
    token that's under the fail-count limit returns ``(None, None)``
    so the caller emits the normal friendly 404. An IP over the
    limit gets ``(None, Response(429))`` immediately.
    """
    tok = _resolve_token(token)
    if tok:
        return tok, None

    ip = _client_ip(request)
    cache_key = f"vita_kiosk_token_fails:{ip}"
    fails = (cache.get(cache_key) or 0) + 1
    cache.set(cache_key, fails, timeout=_KIOSK_TOKEN_FAIL_WINDOW_SECS)

    if fails > _KIOSK_TOKEN_FAIL_LIMIT:
        return None, Response(
            {"detail": "Too many invalid kiosk-token attempts — try again in a minute."},
            status=status.HTTP_429_TOO_MANY_REQUESTS,
        )

    return None, None


def _worker_for_token(tok, worker_id):
    try:
        return (
            Worker.objects
            .select_related('company')
            .get(pk=worker_id, user=tok.user)
        )
    except Worker.DoesNotExist:
        return None


def _resolve_session(kiosk_token, session_uuid):
    """Look up an active session under the given kiosk. Rejects a
    session that belongs to a different tablet — supervisor rotating
    the tablet URL invalidates every child session."""
    try:
        uuid.UUID(str(session_uuid))
    except (TypeError, ValueError):
        return None
    session = (
        PersonalKioskAuthSession.objects
        .select_related('worker', 'kiosk_token')
        .filter(token=session_uuid, kiosk_token=kiosk_token)
        .first()
    )
    if not session or not session.is_active:
        return None
    return session


def _worker_snapshot(worker):
    """Slim payload the FE hydrates the worker card / hero from."""
    return {
        'id': worker.id,
        'full_name': worker.full_name,
        'is_qa': worker.is_qa,
        'has_pin': worker.has_pin,
        'group_name': worker.group.name if worker.group_id else None,
        'reputation_score': worker.reputation_score,
        'reputation_tier': worker.reputation_tier,
    }


# -----------------------------------------------------------------------------
# Owner endpoint (auth) — admin gets / regenerates the tablet token
# -----------------------------------------------------------------------------
class PersonalKioskTokenView(APIView):
    """GET  /api/kiosk/personal/token/  — return the current token
    POST /api/kiosk/personal/token/  — regenerate (invalidates old tablet)"""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        tok, _ = PersonalKioskToken.objects.get_or_create(user=request.user)
        return Response({'token': str(tok.token)})

    def post(self, request):
        tok, _ = PersonalKioskToken.objects.get_or_create(user=request.user)
        tok.token = uuid.uuid4()
        tok.save()
        return Response({'token': str(tok.token)})


# -----------------------------------------------------------------------------
# Public endpoints (AllowAny) — tenant identified by token in URL
# -----------------------------------------------------------------------------
class PublicPersonalKioskRosterView(APIView):
    """GET /api/kiosk/personal/<token>/workers/?q=<query> — roster
    search for the tenant. Returns at most 5 matches on `full_name`
    (case-insensitive substring); scales to million-worker tenants
    where a full roster grid would be unusable.

    Empty / missing `q` returns an empty list so the tablet doesn't
    accidentally paint a full roster on landing (privacy + payload).
    A worker will always type at least their name's first letters.
    """

    permission_classes = [AllowAny]
    MAX_RESULTS = 5

    def get(self, request, token):
        tok, err = _resolve_token_or_rate_limit(request, token)
        if err:
            return err
        if not tok:
            return Response({'detail': 'Invalid kiosk link.'}, status=status.HTTP_404_NOT_FOUND)

        # Fire a background sync in case supervisors added/renamed
        # employees on PSP since the last pull.
        _sync_psp_if_stale(tok.user)

        q = (request.query_params.get('q') or '').strip()
        if not q:
            return Response([])

        workers = (
            Worker.objects
            .filter(user=tok.user, is_active=True, full_name__icontains=q)
            .order_by('full_name')[: self.MAX_RESULTS]
        )
        data = [
            {
                'id': w.id,
                'full_name': w.full_name,
                'group_name': w.group.name if w.group_id else None,
                'has_pin': bool(w.pin),
                'is_qa': w.is_qa,
                'reputation_score': w.reputation_score,
                'reputation_tier': w.reputation_tier,
            }
            for w in workers
        ]
        return Response(data)


class PublicPersonalKioskActiveShiftView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, token, worker_id):
        tok = _resolve_token(token)
        if not tok:
            return Response({'detail': 'Invalid kiosk link.'}, status=status.HTTP_404_NOT_FOUND)
        worker = _worker_for_token(tok, worker_id)
        if not worker:
            return Response({'detail': 'Worker not found.'}, status=status.HTTP_404_NOT_FOUND)

        shift = (
            WorkerShift.objects
            .filter(worker=worker, status=WorkerShift.STATUS_ACTIVE)
            .first()
        )
        if not shift:
            return Response(status=status.HTTP_204_NO_CONTENT)
        return Response(WorkerShiftSerializer(shift).data)


class PublicPersonalKioskVerifyPinView(APIView):
    """POST /api/kiosk/personal/<token>/workers/<id>/verify-pin/
    body: {"pin": "1234", "device_id": "abc..."}

    Confirms a worker's PIN and MINTS a 24h auth session. The FE stores
    `session_token` in localStorage and re-hydrates the worker on page
    load, so a browser refresh no longer prompts for the PIN again.
    Workers without a PIN pass with an empty body."""

    permission_classes = [AllowAny]

    def post(self, request, token, worker_id):
        tok = _resolve_token(token)
        if not tok:
            return Response({'detail': 'Invalid kiosk link.'}, status=status.HTTP_404_NOT_FOUND)
        worker = _worker_for_token(tok, worker_id)
        if not worker:
            return Response({'detail': 'Worker not found.'}, status=status.HTTP_404_NOT_FOUND)

        pin = (request.data.get('pin') or '').strip()
        device_id = (request.data.get('device_id') or '').strip()[:64]
        if worker.has_pin and (not pin or not worker.check_pin(pin)):
            return Response({'detail': 'Incorrect PIN.'}, status=status.HTTP_401_UNAUTHORIZED)

        session = PersonalKioskAuthSession.issue(
            kiosk_token=tok,
            worker=worker,
            device_id=device_id,
        )

        return Response({
            'worker': _worker_snapshot(worker),
            'session_token': str(session.token),
            'expires_at': session.expires_at.isoformat(),
        })


class PublicPersonalKioskSessionView(APIView):
    """/api/kiosk/personal/<token>/sessions/<session_token>/

    GET    — rehydrate the worker so the FE can restore the hub after
             a page refresh without re-prompting for the PIN.
    DELETE — revoke the session. Called from the persistent Log out
             button on the app shell."""

    permission_classes = [AllowAny]

    def get(self, request, token, session_token):
        tok = _resolve_token(token)
        if not tok:
            return Response({'detail': 'Invalid kiosk link.'}, status=status.HTTP_404_NOT_FOUND)
        session = _resolve_session(tok, session_token)
        if not session:
            return Response({'detail': 'Session expired.'}, status=status.HTTP_401_UNAUTHORIZED)
        # `revoked_at` / `expires_at` filter already applied in
        # `_resolve_session`; refresh the worker projection so the
        # tier / score reflect any changes since the PIN entry.
        session.worker.refresh_from_db()
        return Response({
            'worker': _worker_snapshot(session.worker),
            'session_token': str(session.token),
            'expires_at': session.expires_at.isoformat(),
        })

    def delete(self, request, token, session_token):
        tok = _resolve_token(token)
        if not tok:
            return Response({'detail': 'Invalid kiosk link.'}, status=status.HTTP_404_NOT_FOUND)
        session = _resolve_session(tok, session_token)
        if session:
            session.revoke()
        return Response(status=status.HTTP_204_NO_CONTENT)


class PublicPersonalKioskStartShiftView(APIView):
    """POST /api/kiosk/personal/<token>/shifts/start/

    Auth accepted in either form:
      * `session_token` — issued by /verify-pin/; the normal path
        because the FE persists the session across refreshes.
      * `pin` — legacy fallback for a worker with no cached session
        (e.g. very first PIN entry on a fresh tablet).
    """

    permission_classes = [AllowAny]

    def post(self, request, token):
        tok = _resolve_token(token)
        if not tok:
            return Response({'detail': 'Invalid kiosk link.'}, status=status.HTTP_404_NOT_FOUND)

        session_uuid = request.data.get('session_token')
        worker_id = request.data.get('worker_id')
        pin = (request.data.get('pin') or '').strip()
        device_id = (request.data.get('device_id') or '').strip()[:64]

        worker = None
        if session_uuid:
            session = _resolve_session(tok, session_uuid)
            if not session:
                return Response({'detail': 'Session expired.'}, status=status.HTTP_401_UNAUTHORIZED)
            worker = session.worker
        else:
            if not worker_id:
                return Response({'detail': 'worker_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
            worker = _worker_for_token(tok, worker_id)
            if not worker:
                return Response({'detail': 'Worker not found.'}, status=status.HTTP_404_NOT_FOUND)
            if worker.has_pin:
                if not pin or not worker.check_pin(pin):
                    return Response({'detail': 'Incorrect PIN.'}, status=status.HTTP_401_UNAUTHORIZED)

        if not worker.company_id:
            return Response(
                {'detail': 'Worker has no company — assign one before clocking in.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            shift = WorkerShift.objects.create(
                worker=worker,
                company=worker.company,
                device_id=device_id,
            )
        except IntegrityError:
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

        return Response(WorkerShiftSerializer(shift).data, status=status.HTTP_201_CREATED)


class PublicPersonalKioskEndShiftView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, token, shift_id):
        tok = _resolve_token(token)
        if not tok:
            return Response({'detail': 'Invalid kiosk link.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            shift = WorkerShift.objects.select_related('worker').get(
                pk=shift_id, worker__user=tok.user
            )
        except WorkerShift.DoesNotExist:
            return Response({'detail': 'Shift not found.'}, status=status.HTTP_404_NOT_FOUND)

        if shift.is_active:
            shift.close(notes=request.data.get('notes'))
        return Response(WorkerShiftSerializer(shift).data)


class PublicPersonalKioskTodaySummaryView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, token, worker_id):
        tok = _resolve_token(token)
        if not tok:
            return Response({'detail': 'Invalid kiosk link.'}, status=status.HTTP_404_NOT_FOUND)
        worker = _worker_for_token(tok, worker_id)
        if not worker:
            return Response({'detail': 'Worker not found.'}, status=status.HTTP_404_NOT_FOUND)

        today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)

        from work_sessions.models import WorkSession
        sessions_today_qs = (
            WorkSession.objects
            .filter(
                workers=worker,
                user=tok.user,
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

        qa_reviews_today = (
            WorkerReputationEvent.objects
            .filter(
                created_by=worker,
                event_type__in=['manual_positive', 'manual_negative'],
                created_at__gte=today_start,
            )
            .count()
        )

        active_shift = (
            WorkerShift.objects
            .filter(worker=worker, status=WorkerShift.STATUS_ACTIVE)
            .first()
        )
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


class PublicPersonalKioskStationsView(APIView):
    """GET /api/kiosk/personal/<token>/workers/<id>/stations/?q=<query>&page=1
    — station tiles the worker can open on this tablet.

    Paginated infinite-scroll list in alphabetic order. Search is
    optional: `q` narrows via `name__icontains`. Empty `q` returns the
    full catalogue page-by-page so an operator on a slow tablet doesn't
    have to guess a spelling before they can start work.

    Uses `page`/`page_size` (matches QC + history) so the FE reuses the
    same infinite-scroll wiring it already has. A DB `name` index keeps
    this cheap on million-station tenants — Django's Postgres backend
    hits it for the ORDER BY, and SQLite falls back to a filesort.

    QA is a separate flag (not a station row) so the FE can render it
    as a permanent tile above the list regardless of pagination.
    """

    permission_classes = [AllowAny]
    PAGE_SIZE = 20

    def get(self, request, token, worker_id):
        tok = _resolve_token(token)
        if not tok:
            return Response({'detail': 'Invalid kiosk link.'}, status=status.HTTP_404_NOT_FOUND)
        worker = _worker_for_token(tok, worker_id)
        if not worker:
            return Response({'detail': 'Worker not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Self-heal from PSP before we read. If the mirror is empty
        # (first-ever load for this tenant) block so the operator
        # never sees an empty catalogue; otherwise fire in the
        # background and serve whatever we already have.
        _sync_psp_if_stale(tok.user, block_when_empty=True)

        q = (request.query_params.get('q') or '').strip()
        try:
            page = max(1, int(request.query_params.get('page') or 1))
        except (TypeError, ValueError):
            page = 1

        from workstations.models import Workstation
        base_qs = (
            Workstation.objects
            .filter(user=tok.user, is_active=True)
            .filter(Q(is_general=True) | Q(authorized_workers=worker))
            .distinct()
        )
        total_available = base_qs.count()

        filtered_qs = base_qs
        if q:
            filtered_qs = filtered_qs.filter(name__icontains=q)

        # Alphabetic with general stations pinned to the top of each
        # page so the "open to everyone" ones stay easy to reach.
        filtered_qs = filtered_qs.order_by('-is_general', 'name')
        total_matches = filtered_qs.count()
        offset = (page - 1) * self.PAGE_SIZE
        stations = list(filtered_qs[offset:offset + self.PAGE_SIZE])

        payload = [
            {
                'id': s.id,
                'name': s.name,
                'description': s.description or '',
                'kiosk_token': str(s.kiosk_token),
                'is_general': s.is_general,
                'is_authorized': not s.is_general,
            }
            for s in stations
        ]
        # QA tile deep-links to /qc/<qc_token> — mirror how the QC
        # kiosk pattern is paired per-tenant. Only surface the token
        # if the worker is actually a reviewer.
        qc_token = None
        if worker.is_qa:
            from qc.models import QCToken
            qc_row = QCToken.objects.filter(user=tok.user).first()
            if qc_row:
                qc_token = str(qc_row.token)

        # "Recent" shortcut: the 3 workstations this worker has clocked
        # the most sessions on lately. Skips search so an operator can
        # jump straight to their usual spots. Only include stations the
        # worker is still authorised on today (in case supervisors have
        # since revoked access).
        from work_sessions.models import WorkSession
        recent_ids = list(
            WorkSession.objects
            .filter(workers=worker, user=tok.user)
            .order_by('-start_time')
            .values_list('workstation_id', flat=True)
        )
        seen = set()
        ordered_recent_ids = []
        for wid in recent_ids:
            if wid and wid not in seen:
                seen.add(wid)
                ordered_recent_ids.append(wid)
            if len(ordered_recent_ids) >= 3:
                break

        recent_payload = []
        if ordered_recent_ids:
            authorised_ids = set(
                base_qs.filter(pk__in=ordered_recent_ids).values_list('id', flat=True)
            )
            by_id = {
                s.id: s
                for s in base_qs.filter(pk__in=ordered_recent_ids)
            }
            for wid in ordered_recent_ids:
                if wid not in authorised_ids:
                    continue
                s = by_id.get(wid)
                if not s:
                    continue
                recent_payload.append({
                    'id': s.id,
                    'name': s.name,
                    'description': s.description or '',
                    'kiosk_token': str(s.kiosk_token),
                    'is_general': s.is_general,
                    'is_authorized': not s.is_general,
                })

        return Response({
            'stations': payload,
            'qa_enabled': worker.is_qa,
            'qc_token': qc_token,
            'total_available': total_available,
            'recent': recent_payload,
            'page': page,
            'page_size': self.PAGE_SIZE,
            'total_matches': total_matches,
            'has_more': offset + len(stations) < total_matches,
        })


class PublicPersonalKioskPerformanceView(APIView):
    """GET /api/kiosk/personal/<token>/workers/<id>/performance/
    — sessions + trend for the worker's own detail page.

    Returns 14-day daily perf averages + summary stats + last 10
    sessions. Sized for a mobile hero screen, not a manager dashboard.
    """

    permission_classes = [AllowAny]
    TREND_DAYS = 14
    RECENT_LIMIT = 10

    def get(self, request, token, worker_id):
        from datetime import timedelta
        from django.utils.dateparse import parse_datetime

        tok = _resolve_token(token)
        if not tok:
            return Response({'detail': 'Invalid kiosk link.'}, status=status.HTTP_404_NOT_FOUND)
        worker = _worker_for_token(tok, worker_id)
        if not worker:
            return Response({'detail': 'Worker not found.'}, status=status.HTTP_404_NOT_FOUND)

        from work_sessions.models import WorkSession

        since = timezone.now() - timedelta(days=self.TREND_DAYS)
        base_qs = (
            WorkSession.objects
            .filter(
                workers=worker,
                user=tok.user,
                status__in=['completed', 'verified'],
                start_time__gte=since,
            )
        )

        summary = base_qs.aggregate(
            sessions_count=Count('id'),
            avg_performance=Avg('performance_percentage'),
            total_quantity=Sum('quantity_produced'),
        )

        # Group by day for a small line/bar viz. Bucket in Python to
        # keep the query portable (Django ORM date_trunc varies by DB).
        buckets = {}  # date -> {sum, count}
        for s in base_qs.only('start_time', 'performance_percentage'):
            day = s.start_time.date().isoformat()
            b = buckets.setdefault(day, {'sum': 0.0, 'count': 0})
            if s.performance_percentage is not None:
                b['sum'] += float(s.performance_percentage)
                b['count'] += 1

        # Emit every day in the window, even zero-session days, so the
        # chart shows gaps honestly instead of collapsing the axis.
        trend = []
        today = timezone.now().date()
        for i in range(self.TREND_DAYS - 1, -1, -1):
            d = (today - timedelta(days=i)).isoformat()
            b = buckets.get(d)
            avg = (b['sum'] / b['count']) if b and b['count'] else None
            trend.append({'date': d, 'avg_performance': avg, 'sessions_count': b['count'] if b else 0})

        recent = list(
            base_qs
            .select_related('workstation', 'item')
            .order_by('-start_time')[: self.RECENT_LIMIT]
        )
        recent_payload = [
            {
                'id': s.id,
                'workstation_name': s.workstation.name if s.workstation else None,
                'item_name': (s.item.name if s.item else (s.override_task_name or None)),
                'started_at': s.start_time.isoformat() if s.start_time else None,
                'ended_at': s.end_time.isoformat() if s.end_time else None,
                'performance_percentage': s.performance_percentage,
                'quantity_produced': float(s.quantity_produced) if s.quantity_produced else None,
                'status': s.status,
                'mo_uuid': s.mo_uuid,
            }
            for s in recent
        ]

        # R&D chip data — cached PSP lookup, silent-degrade if PSP is
        # down or the tenant isn't integrated.
        from psp_sync.mo_meta import enrich_rows_with_project_type
        enrich_rows_with_project_type(recent_payload, _tenant_company(tok.user))

        return Response({
            'worker': {
                'id': worker.id,
                'name': worker.full_name,
            },
            'window_days': self.TREND_DAYS,
            'summary': {
                'sessions_count': summary['sessions_count'] or 0,
                'avg_performance': round(summary['avg_performance'], 1) if summary['avg_performance'] else None,
                'total_quantity': float(summary['total_quantity'] or 0),
            },
            'trend': trend,
            'recent_sessions': recent_payload,
        })


class PublicPersonalKioskReputationView(APIView):
    """GET /api/kiosk/personal/<token>/workers/<id>/reputation/
    — score, tier, tier progress, recent events."""

    permission_classes = [AllowAny]
    RECENT_LIMIT = 15

    # Tier thresholds mirror workers/models/worker.py::reputation_tier
    TIERS = [
        (800, 'excellent'),
        (740, 'very_good'),
        (670, 'good'),
        (580, 'fair'),
        (0, 'poor'),
    ]

    def get(self, request, token, worker_id):
        tok = _resolve_token(token)
        if not tok:
            return Response({'detail': 'Invalid kiosk link.'}, status=status.HTTP_404_NOT_FOUND)
        worker = _worker_for_token(tok, worker_id)
        if not worker:
            return Response({'detail': 'Worker not found.'}, status=status.HTTP_404_NOT_FOUND)

        score = worker.reputation_score
        tier = worker.reputation_tier

        # Next tier + points needed. Sorted high→low so we walk the
        # thresholds until the current score fits, then the previous
        # step is "next tier up".
        next_tier = None
        points_to_next = None
        for i, (threshold, name) in enumerate(self.TIERS):
            if score >= threshold:
                # Look one entry above for the next tier
                if i > 0:
                    next_threshold, next_name = self.TIERS[i - 1]
                    next_tier = next_name
                    points_to_next = max(0, next_threshold - score)
                break

        events = list(
            WorkerReputationEvent.objects
            .filter(worker=worker)
            .select_related('created_by', 'session__workstation')
            .order_by('-created_at')[: self.RECENT_LIMIT]
        )
        events_payload = [
            {
                'id': e.id,
                'event_type': e.event_type,
                'score_delta': e.score_delta,
                'reason': e.reason,
                'author_name': e.created_by.full_name if e.created_by else None,
                'session_workstation': e.session.workstation.name if e.session and e.session.workstation else None,
                'created_at': e.created_at.isoformat(),
            }
            for e in events
        ]

        return Response({
            'worker': {
                'id': worker.id,
                'name': worker.full_name,
            },
            'score': score,
            'tier': tier,
            'next_tier': next_tier,
            'points_to_next': points_to_next,
            'recent_events': events_payload,
        })


class PublicPersonalKioskLiveStatusView(APIView):
    """GET /api/kiosk/personal/<token>/workers/<id>/live-status/

    "What is this worker currently doing right now?" — returns the
    single open `WorkSession` (`status = 'active'`) the worker is on,
    plus the workstation + item snapshot the WorkerHome ticker needs
    to render "Currently on Station X — Item Y — 12m elapsed".

    Returns `{active_session: null}` when the worker is idle so the
    FE can render an empty state without treating it as an error.
    Polled every 15s from the WorkerHome hub.
    """

    permission_classes = [AllowAny]

    def get(self, request, token, worker_id):
        tok = _resolve_token(token)
        if not tok:
            return Response({'detail': 'Invalid kiosk link.'}, status=status.HTTP_404_NOT_FOUND)
        worker = _worker_for_token(tok, worker_id)
        if not worker:
            return Response({'detail': 'Worker not found.'}, status=status.HTTP_404_NOT_FOUND)

        from work_sessions.models import WorkSession

        session = (
            WorkSession.objects
            .filter(workers=worker, user=tok.user, status='active')
            .select_related('workstation', 'item')
            .order_by('-start_time')
            .first()
        )

        if not session:
            return Response({'active_session': None})

        # Human-facing task label. `override_task_name` wins for
        # non-MO activities; otherwise fall back to the activity kind
        # or item name so the ticker never renders an ugly "None".
        task_label = (
            session.override_task_name
            or (session.item.name if session.item else None)
            or session.activity_label
            or session.get_activity_kind_display()
        )

        # Resolve PSP project_type for the R&D chip. Single-row lookup;
        # cached so ticker refreshes don't re-hit PSP.
        from psp_sync.mo_meta import resolve_project_types_for_uuids
        _project_type = None
        if session.mo_uuid:
            _lookup = resolve_project_types_for_uuids(
                _tenant_company(tok.user), [session.mo_uuid]
            )
            _project_type = _lookup.get(session.mo_uuid)

        return Response({
            'active_session': {
                'id': session.id,
                'workstation_id': session.workstation_id,
                'workstation_name': session.workstation.name if session.workstation else None,
                'workstation_kiosk_token': str(session.workstation.kiosk_token) if session.workstation else None,
                'item_name': (
                    session.item.name
                    if session.item
                    else (session.override_task_name or None)
                ),
                'task_label': task_label,
                'activity_kind': session.activity_kind,
                'started_at': session.start_time.isoformat() if session.start_time else None,
                'mo_uuid': session.mo_uuid,
                'project_type': _project_type,
            }
        })


# =============================================================================
# Embedded workstation-session endpoints
# -----------------------------------------------------------------------------
# The personal kiosk hosts a "run a session on Station X" panel inline so a
# worker never has to switch to the standalone `/kiosk/<workstation-token>`
# page (which would demand another PIN). Auth is the `session_token` minted
# by /verify-pin/ — the tablet URL token proves tenant, the session token
# proves worker identity.
# =============================================================================


def _resolve_session_worker(kiosk_token, request):
    """Pull the session_token off the payload / query and validate it.
    Returns (session, worker) or (None, None). Callers must 401 on None."""
    session_uuid = request.data.get('session_token') if request.method != 'GET' else request.query_params.get('session_token')
    if not session_uuid:
        return None, None
    session = _resolve_session(kiosk_token, session_uuid)
    if not session:
        return None, None
    return session, session.worker


def _resolve_workstation_for_tenant(tok, ws_id):
    """Workstation must belong to the same tenant as the kiosk token.
    Returns the row or None."""
    from workstations.models import Workstation
    try:
        return Workstation.objects.get(pk=ws_id, user=tok.user, is_active=True)
    except Workstation.DoesNotExist:
        return None


def _worker_authorized_on(workstation, worker):
    """Same rule the stations endpoint uses: general workstations are
    open to anyone, otherwise the worker must be in the authorised set."""
    if workstation.is_general:
        return True
    return workstation.authorized_workers.filter(pk=worker.pk).exists()


def _tenant_is_psp_integrated(tok_user) -> bool:
    """True when the tenant has PSP credentials configured. Prefer the
    workstation's company row when present, but fall back to the
    kiosk token owner's Company because some seed data leaves the
    workstation.company FK blank."""
    from companies.models import Company
    company = Company.objects.filter(owner_user=tok_user).first()
    return bool(
        company and company.psp_base_url and company.psp_integration_token
    )


def _tenant_company(tok_user):
    """Resolve the Company row for this tenant, or None."""
    from companies.models import Company
    return Company.objects.filter(owner_user=tok_user).first()


def _psp_group_throughput(company, group_uuid: str):
    """Return ``(target_quantity, target_duration_hours)`` for a PSP
    workstation group so the personal kiosk can score sessions on
    PSP-mirrored stations. Both values are stamped onto a WorkSession
    as ``override_target_*`` at start-time — that's what
    ``WorkSession.compute_performance`` reads.

    Convention: ``target_quantity=1`` unit produced in
    ``avg_seconds_per_unit / 3600`` hours. The compute path then scales
    with worker count + actual duration so the result matches how
    kiosk sessions have always been scored.

    Silent fail (returns ``(None, None)``) so a PSP outage never blocks
    starting a session — the session just won't get a performance %."""
    if not group_uuid or not company:
        return (None, None)
    if not company.psp_base_url or not company.psp_integration_token:
        return (None, None)
    try:
        from psp_sync.client import PspError, client_for_company
        client = client_for_company(company)
        items = client.workstation_group_costs([group_uuid])
    except (ValueError, PspError, Exception):  # noqa: BLE001 — never block start.
        return (None, None)
    row = next((r for r in items if r.get('uuid') == group_uuid), None)
    if not row:
        return (None, None)
    raw = row.get('avg_seconds_per_unit')
    try:
        seconds_per_unit = float(raw) if raw is not None else 0.0
    except (TypeError, ValueError):
        return (None, None)
    if seconds_per_unit <= 0:
        return (None, None)
    from decimal import Decimal
    # target_qty=1 unit in `seconds_per_unit / 3600` hours. Rounded to
    # match the DecimalField precision on WorkSession.
    return (
        Decimal('1'),
        Decimal(str(round(seconds_per_unit / 3600.0, 4))),
    )


def _sync_psp_if_stale(tok_user, *, block_when_empty: bool = False) -> None:
    """Self-healing PSP → vita-performance pull. Called from every
    kiosk read that depends on the mirror being fresh. Silent no-op
    when PSP isn't wired for this tenant.

    ``block_when_empty=True`` runs synchronously if the local mirror
    has NOTHING for this tenant yet — used on the first-ever kiosk
    load so the operator sees the catalogue immediately instead of
    an empty list they can't do anything with."""
    company = _tenant_company(tok_user)
    if not company or not company.psp_base_url or not company.psp_integration_token:
        return
    from psp_sync.pullers import sync_if_stale, sync_now_blocking
    from workstations.models import Workstation as _WS

    if block_when_empty:
        has_local = _WS.objects.filter(user=tok_user).exists()
        if not has_local:
            sync_now_blocking(company)
            return
    sync_if_stale(company)


def _session_snapshot(session):
    """One payload shape used by every start/stop/context response so
    the FE only has to learn it once.

    Includes ``operation_description`` — the human-readable "what am
    I supposed to do" text from the MO step, fetched live from PSP
    when the session is MO-attributed AND still active. Skipped on
    completed sessions (the FE never renders the operation card for
    finished work) so we don't waste a PSP round-trip on Stop."""
    op_desc = None
    if session.status == 'active':
        # Lazy import to avoid a hard dep on the standalone kiosk module.
        from kiosk.views.kiosk import operation_description_for
        op_desc = operation_description_for(session)
    # `override_task_name` holds the MO's item name for PSP sessions
    # (the local Item FK stays null because the item lives on PSP).
    display_item_name = (
        session.item.name if session.item else (session.override_task_name or None)
    )
    # PSP stream marker for the R&D chip. Only fires the lookup for
    # MO-attributed sessions with a mo_uuid — cleaning / other
    # activities never carry one. Cached so the start / stop /
    # context calls a worker fires in rapid succession only hit PSP
    # once per unique MO per hour.
    project_type = None
    if session.mo_uuid and session.company_id:
        from psp_sync.mo_meta import resolve_project_types_for_uuids
        _lookup = resolve_project_types_for_uuids(
            session.company, [session.mo_uuid]
        )
        project_type = _lookup.get(session.mo_uuid)
    return {
        'id': session.id,
        'workstation_id': session.workstation_id,
        'workstation_name': session.workstation.name if session.workstation else None,
        'item_id': session.item_id,
        'item_name': display_item_name,
        'activity_kind': session.activity_kind,
        'activity_label': session.activity_label,
        'started_at': session.start_time.isoformat() if session.start_time else None,
        'ended_at': session.end_time.isoformat() if session.end_time else None,
        'status': session.status,
        'quantity_produced': float(session.quantity_produced) if session.quantity_produced else None,
        'performance_percentage': session.performance_percentage,
        'operation_description': op_desc,
        # Snapshot values for the completion celebration screen so the
        # FE has everything it needs without a second call.
        'duration_hours': session.duration_hours,
        'workstation_uom': session.workstation.uom if session.workstation else None,
        'worker_name': _first_worker_name(session),
        'mo_uuid': session.mo_uuid,
        'project_type': project_type,
    }


def _first_worker_name(session):
    """Return the first worker's name on a session, or None. Kept
    separate so the snapshot function stays a plain projection."""
    workers = list(session.workers.all()[:1]) if session.pk else []
    return workers[0].full_name if workers else None


class PublicPersonalKioskWorkstationContextView(APIView):
    """GET /api/kiosk/personal/<token>/workstations/<ws_id>/context/?session_token=…

    "Everything the StationView needs to render on load" in one round-trip:
    workstation identity + whether this worker already has a session open
    here + a short item shortlist so the picker isn't empty on first paint.
    """

    permission_classes = [AllowAny]
    ITEM_SHORTLIST = 20

    def get(self, request, token, ws_id):
        tok = _resolve_token(token)
        if not tok:
            return Response({'detail': 'Invalid kiosk link.'}, status=status.HTTP_404_NOT_FOUND)
        session, worker = _resolve_session_worker(tok, request)
        if not worker:
            return Response({'detail': 'Session expired.'}, status=status.HTTP_401_UNAUTHORIZED)

        # Keep the mirror fresh in the background — a supervisor may
        # have renamed the station or bumped its hourly rate on PSP.
        _sync_psp_if_stale(tok.user)

        ws = _resolve_workstation_for_tenant(tok, ws_id)
        if not ws:
            return Response({'detail': 'Workstation not found.'}, status=status.HTTP_404_NOT_FOUND)
        if not _worker_authorized_on(ws, worker):
            return Response({'detail': 'Not authorised on this station.'}, status=status.HTTP_403_FORBIDDEN)

        from work_sessions.models import WorkSession
        from items.models import Item

        active = (
            WorkSession.objects
            .filter(workstation=ws, status='active', workers=worker)
            .select_related('item', 'workstation')
            .first()
        )

        # Tenant-wide PSP flag — when the company has PSP creds
        # configured, the FE must force the MO picker for every
        # station so workers can't clock time against a local item
        # that PSP knows nothing about. Local items become dev-only.
        tenant_psp = _tenant_is_psp_integrated(tok.user)

        # Only load the local shortlist when PSP is NOT the source of
        # truth — otherwise it's dead weight the FE will never render.
        items_payload = []
        if not tenant_psp:
            items_payload = [
                {'id': i.id, 'name': i.name}
                for i in Item.objects.filter(user=tok.user).order_by('name')[: self.ITEM_SHORTLIST]
            ]

        # SOP for the workstation (procedure the operator follows).
        # OneToOne, may not exist — treat missing as an empty SOP so
        # the FE can render a "not written yet" placeholder without
        # branching on null vs empty string.
        from workstations.models import SOP
        try:
            sop_row = SOP.objects.get(workstation=ws)
            sop_content = sop_row.content or ''
            sop_updated_at = sop_row.updated_at.isoformat() if sop_row.updated_at else None
        except SOP.DoesNotExist:
            sop_content = ''
            sop_updated_at = None

        return Response({
            'workstation': {
                'id': ws.id,
                'name': ws.name,
                'description': ws.description or '',
                'is_general': ws.is_general,
                'uom': ws.uom or '',
                'kiosk_token': str(ws.kiosk_token),
                'psp_source_of_truth': ws.psp_source_of_truth,
                # Operators read the SOP while the session is running.
                # Empty string when unwritten so the FE always renders
                # the panel and can nudge a supervisor to fill it.
                'sop_content': sop_content,
                'sop_updated_at': sop_updated_at,
            },
            'tenant_psp_integrated': tenant_psp,
            'active_session': _session_snapshot(active) if active else None,
            'items': items_payload,
        })


class PublicPersonalKioskWorkstationItemsView(APIView):
    """GET /api/kiosk/personal/<token>/workstations/<ws_id>/items/?q=&session_token=…
    Debounced-search endpoint used by the StationView item picker."""

    permission_classes = [AllowAny]
    MAX_RESULTS = 20

    def get(self, request, token, ws_id):
        tok = _resolve_token(token)
        if not tok:
            return Response({'detail': 'Invalid kiosk link.'}, status=status.HTTP_404_NOT_FOUND)
        _s, worker = _resolve_session_worker(tok, request)
        if not worker:
            return Response({'detail': 'Session expired.'}, status=status.HTTP_401_UNAUTHORIZED)
        ws = _resolve_workstation_for_tenant(tok, ws_id)
        if not ws:
            return Response({'detail': 'Workstation not found.'}, status=status.HTTP_404_NOT_FOUND)

        from items.models import Item
        q = (request.query_params.get('q') or '').strip()
        qs = Item.objects.filter(user=tok.user)
        if q:
            qs = qs.filter(name__icontains=q)
        return Response([
            {'id': i.id, 'name': i.name}
            for i in qs.order_by('name')[: self.MAX_RESULTS]
        ])


class PublicPersonalKioskStartWorkstationSessionView(APIView):
    """POST /api/kiosk/personal/<token>/workstations/<ws_id>/sessions/start/

    body: {session_token, item_id?, quantity_target?, activity_kind?, activity_label?, mo_uuid?, mo_step_uuid?}

    Mirrors KioskStartSessionView's core logic but resolves the worker
    from the personal-kiosk session token — no per-station PIN prompt.
    Stamps the current worker shift so day-overview groups activity."""

    permission_classes = [AllowAny]

    def post(self, request, token, ws_id):
        tok = _resolve_token(token)
        if not tok:
            return Response({'detail': 'Invalid kiosk link.'}, status=status.HTTP_404_NOT_FOUND)
        session, worker = _resolve_session_worker(tok, request)
        if not worker:
            return Response({'detail': 'Session expired.'}, status=status.HTTP_401_UNAUTHORIZED)
        ws = _resolve_workstation_for_tenant(tok, ws_id)
        if not ws:
            return Response({'detail': 'Workstation not found.'}, status=status.HTTP_404_NOT_FOUND)
        if not _worker_authorized_on(ws, worker):
            return Response({'detail': 'Not authorised on this station.'}, status=status.HTTP_403_FORBIDDEN)

        item_id = request.data.get('item_id')
        activity_kind = request.data.get('activity_kind') or 'other'
        activity_label = request.data.get('activity_label')
        mo_uuid = request.data.get('mo_uuid')
        mo_step_uuid = request.data.get('mo_step_uuid')
        # PSP MO sessions: the item lives on PSP, not our local
        # Item table, so we can't set `item_id`. Snapshot the item
        # name into `override_task_name` so it shows up on every
        # downstream display (recent sessions, history, celebration
        # screen) without a PSP round-trip.
        item_name = (request.data.get('item_name') or '').strip() or None
        # PSP workstation group uuid — echoed back from the MO picker
        # response. We use it to fetch the group's throughput so the
        # session can be scored even though PSP-linked local workstations
        # don't carry ``target_quantity`` / ``target_duration``.
        workstation_group_uuid = (
            request.data.get('workstation_group_uuid') or None
        )

        if activity_kind not in {'mo', 'cleaning', 'maintenance', 'other'}:
            return Response(
                {'detail': f'Unknown activity_kind: {activity_kind}'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if activity_kind == 'mo' and ws.psp_source_of_truth and not mo_uuid:
            return Response(
                {'detail': 'This station requires an MO — start it from the workstation kiosk.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from work_sessions.models import WorkSession

        # Guard against double-start on non-general stations; on general
        # stations, only reject if THIS worker is already in a session
        # here.
        if ws.is_general:
            if WorkSession.objects.filter(workstation=ws, status='active', workers=worker).exists():
                return Response(
                    {'detail': 'You already have a session running here.'},
                    status=status.HTTP_409_CONFLICT,
                )
        else:
            if WorkSession.objects.filter(workstation=ws, status='active').exists():
                return Response(
                    {'detail': 'A session is already active on this workstation.'},
                    status=status.HTTP_409_CONFLICT,
                )

        # Stamp the open shift (if any) so this session shows up in
        # today's shift narrative — same logic KioskStartSessionView uses.
        shift = (
            WorkerShift.objects
            .filter(worker=worker, status=WorkerShift.STATUS_ACTIVE)
            .first()
        )

        # Pull the PSP workstation group's throughput so we can score
        # this session on stop. Only relevant for MO sessions with a
        # group uuid + configured PSP integration; anything else falls
        # back to the local Workstation target fields (which are null
        # on PSP-mirrored rows, hence this whole dance).
        target_qty_override = None
        target_dur_override = None
        if activity_kind == 'mo' and workstation_group_uuid:
            company = ws.company or _tenant_company(tok.user)
            if company:
                target_qty_override, target_dur_override = (
                    _psp_group_throughput(company, workstation_group_uuid)
                )

        with transaction.atomic():
            ws_session = WorkSession.objects.create(
                user=tok.user,
                company=ws.company,
                workstation=ws,
                item_id=item_id,
                status='active',
                activity_kind=activity_kind,
                activity_label=activity_label if activity_kind == 'other' else None,
                mo_uuid=mo_uuid if activity_kind == 'mo' else None,
                mo_step_uuid=mo_step_uuid if activity_kind == 'mo' else None,
                # PSP MO item name (or any FE-provided label) lives here
                # so every read path — running card, history, celebration
                # screen — can render it without a PSP round-trip. Saved
                # unconditionally when provided so a mis-classified
                # activity_kind doesn't silently drop the label.
                override_task_name=item_name,
                # Throughput snapshot so save_performance() has targets
                # to compare against. Both fields ride together — either
                # both set or both null (compute_performance guards).
                override_target_quantity=target_qty_override,
                override_target_duration=target_dur_override,
                start_time=_parse_iso(request.data.get('requested_at')) or timezone.now(),
                shift=shift,
            )
            ws_session.workers.set([worker.id])

        # Reload with select_related so the snapshot has item / workstation.
        ws_session = (
            WorkSession.objects
            .select_related('item', 'workstation')
            .get(pk=ws_session.pk)
        )
        return Response(_session_snapshot(ws_session), status=status.HTTP_201_CREATED)


class PublicPersonalKioskStopWorkstationSessionView(APIView):
    """POST /api/kiosk/personal/<token>/work-sessions/<sess_id>/stop/

    body: {session_token, quantity_produced?, notes?}

    Only the authenticated worker can stop their own session. Missing
    quantity is allowed — the session closes with `quantity_produced=None`
    and `performance_percentage` stays null (no target to compare)."""

    permission_classes = [AllowAny]

    def post(self, request, token, sess_id):
        tok = _resolve_token(token)
        if not tok:
            return Response({'detail': 'Invalid kiosk link.'}, status=status.HTTP_404_NOT_FOUND)
        _s, worker = _resolve_session_worker(tok, request)
        if not worker:
            return Response({'detail': 'Session expired.'}, status=status.HTTP_401_UNAUTHORIZED)

        from work_sessions.models import WorkSession
        try:
            ws_session = (
                WorkSession.objects
                .select_related('item', 'workstation')
                .prefetch_related('workers')
                .get(pk=sess_id, user=tok.user)
            )
        except WorkSession.DoesNotExist:
            return Response({'detail': 'Session not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not ws_session.workers.filter(pk=worker.pk).exists():
            return Response({'detail': 'Not your session.'}, status=status.HTTP_403_FORBIDDEN)
        if ws_session.status != 'active':
            return Response({'detail': 'Session already closed.'}, status=status.HTTP_409_CONFLICT)

        qty_raw = request.data.get('quantity_produced')
        notes = request.data.get('notes') or ''

        with transaction.atomic():
            ws_session.end_time = _parse_iso(request.data.get('requested_at')) or timezone.now()
            ws_session.status = 'completed'
            if qty_raw is not None and str(qty_raw).strip() != '':
                try:
                    ws_session.quantity_produced = qty_raw
                except (TypeError, ValueError):
                    return Response(
                        {'detail': 'quantity_produced must be a number.'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
            if notes:
                ws_session.notes = notes
            ws_session.save()
            # Only compute perf if there's a target — save_performance
            # already guards internally but keep it explicit here so
            # future readers know why we call it unconditionally.
            try:
                ws_session.save_performance()
            except Exception:  # noqa: BLE001 — never fail the stop over a perf calc.
                pass
        ws_session.refresh_from_db()
        return Response(_session_snapshot(ws_session))


def _parse_iso(raw):
    if not raw:
        return None
    try:
        return parse_datetime(raw)
    except (TypeError, ValueError):
        return None


class PublicPersonalKioskHistoryView(APIView):
    """GET /api/kiosk/personal/<token>/workers/<id>/history/
        ?session_token=…&page=…&workstation=…&date_from=YYYY-MM-DD&date_to=YYYY-MM-DD

    Paginated shift history with sessions nested inside each shift.
    Feeds the History page — infinite scroll on the FE reuses the
    same `page` / `total_pages` shape as QC.

    Attached (session.shift = shift) sessions live inside their
    parent's `sessions` list. Sessions that ran while the worker was
    NOT clocked in (station-kiosk-only path) are grouped into a
    synthetic `orphan` shift so nothing hides from the timeline."""

    permission_classes = [AllowAny]
    PAGE_SIZE = 10  # shifts per page

    def get(self, request, token, worker_id):
        tok = _resolve_token(token)
        if not tok:
            return Response({'detail': 'Invalid kiosk link.'}, status=status.HTTP_404_NOT_FOUND)
        _s, session_worker = _resolve_session_worker(tok, request)
        if not session_worker:
            return Response({'detail': 'Session expired.'}, status=status.HTTP_401_UNAUTHORIZED)
        # Workers can only view their own history from the personal
        # kiosk — no cross-worker peeking. Supervisors have their own
        # dashboard for that.
        if int(worker_id) != session_worker.id:
            return Response({'detail': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)

        worker = session_worker

        from django.utils.dateparse import parse_date

        # ---- filters ----
        date_from = parse_date(request.query_params.get('date_from') or '')
        date_to = parse_date(request.query_params.get('date_to') or '')
        workstation_id_raw = request.query_params.get('workstation')
        try:
            workstation_id = int(workstation_id_raw) if workstation_id_raw else None
        except (TypeError, ValueError):
            workstation_id = None

        try:
            page = max(1, int(request.query_params.get('page') or 1))
        except (TypeError, ValueError):
            page = 1

        shifts_qs = WorkerShift.objects.filter(worker=worker).order_by('-clocked_in_at')
        if date_from:
            shifts_qs = shifts_qs.filter(clocked_in_at__date__gte=date_from)
        if date_to:
            shifts_qs = shifts_qs.filter(clocked_in_at__date__lte=date_to)

        total = shifts_qs.count()
        offset = (page - 1) * self.PAGE_SIZE
        shifts = list(shifts_qs[offset:offset + self.PAGE_SIZE])
        shift_ids = [s.id for s in shifts]

        from work_sessions.models import WorkSession
        sessions_qs = (
            WorkSession.objects
            .filter(workers=worker, user=tok.user, shift_id__in=shift_ids)
            .select_related('workstation', 'item')
            .order_by('start_time')
        )
        if workstation_id:
            sessions_qs = sessions_qs.filter(workstation_id=workstation_id)

        sessions_by_shift: dict[int, list] = {sid: [] for sid in shift_ids}
        for s in sessions_qs:
            sessions_by_shift.setdefault(s.shift_id, []).append(s)

        # Resolve project_type in one shot for every session in this
        # window so the per-row R&D badge doesn't fan out N PSP calls.
        from psp_sync.mo_meta import resolve_project_types_for_uuids
        _mo_uuids = [s.mo_uuid for s in sessions_qs if s.mo_uuid]
        _project_types = (
            resolve_project_types_for_uuids(_tenant_company(tok.user), _mo_uuids)
            if _mo_uuids
            else {}
        )

        def _session_row(s):
            return {
                'id': s.id,
                'workstation_id': s.workstation_id,
                'workstation_name': s.workstation.name if s.workstation else None,
                'workstation_uom': s.workstation.uom if s.workstation else None,
                'item_name': (s.item.name if s.item else (s.override_task_name or None)),
                'activity_kind': s.activity_kind,
                'activity_label': s.activity_label,
                'start_time': s.start_time.isoformat() if s.start_time else None,
                'end_time': s.end_time.isoformat() if s.end_time else None,
                'duration_hours': s.duration_hours,
                'quantity_produced': float(s.quantity_produced) if s.quantity_produced else None,
                'performance_percentage': s.performance_percentage,
                'status': s.status,
                'mo_uuid': s.mo_uuid,
                'project_type': _project_types.get(s.mo_uuid) if s.mo_uuid else None,
            }

        shift_rows = []
        for sh in shifts:
            child = sessions_by_shift.get(sh.id, [])
            if workstation_id and not child:
                # If the operator is filtering by station, don't show
                # a shift with zero matching sessions — collapse it out.
                continue
            shift_rows.append({
                'id': sh.id,
                'status': sh.status,
                'clocked_in_at': sh.clocked_in_at.isoformat(),
                'clocked_out_at': sh.clocked_out_at.isoformat() if sh.clocked_out_at else None,
                'duration_seconds': sh.duration_seconds,
                'device_id': sh.device_id or '',
                'notes': sh.notes or '',
                'sessions_count': len(child),
                'sessions': [_session_row(s) for s in child],
            })

        # Total shift count reflects the workstation filter's blanks
        # already because we skip empty shifts above. Adjust for the
        # accurate has-more calculation.
        response_total = total
        return Response({
            'count': response_total,
            'page': page,
            'page_size': self.PAGE_SIZE,
            'total_pages': (response_total + self.PAGE_SIZE - 1) // self.PAGE_SIZE if response_total else 0,
            'results': shift_rows,
        })


class PublicPersonalKioskWorkstationMOsView(APIView):
    """GET /api/kiosk/personal/<token>/workstations/<ws_id>/mos/?session_token=…

    Mirrors `kiosk.views.psp_bridge.KioskMOsView` — the shopfloor rule
    is identical here: only surface MOs that are `in_progress` on PSP
    AND have a step routed to this workstation. Anything else is
    either not-yet-started (supervisor hasn't hit Start Production)
    or belongs on another station's kiosk.

    Returns `{psp_source_of_truth: false, items: []}` for stations
    not linked to PSP — the FE uses that signal to fall back to the
    legacy Item picker."""

    permission_classes = [AllowAny]

    def get(self, request, token, ws_id):
        import logging
        logger = logging.getLogger(__name__)

        tok = _resolve_token(token)
        if not tok:
            return Response({'detail': 'Invalid kiosk link.'}, status=status.HTTP_404_NOT_FOUND)
        _s, worker = _resolve_session_worker(tok, request)
        if not worker:
            return Response({'detail': 'Session expired.'}, status=status.HTTP_401_UNAUTHORIZED)
        ws = _resolve_workstation_for_tenant(tok, ws_id)
        if not ws:
            return Response({'detail': 'Workstation not found.'}, status=status.HTTP_404_NOT_FOUND)
        if not _worker_authorized_on(ws, worker):
            return Response({'detail': 'Not authorised on this station.'}, status=status.HTTP_403_FORBIDDEN)

        # Tenant-wide gate: any station on a PSP-integrated tenant
        # must show ONLY MOs, never local items. Individual station's
        # `psp_source_of_truth` flag is legacy per-station config that
        # we now treat as an alias for "tenant is PSP integrated".
        tenant_psp = _tenant_is_psp_integrated(tok.user)
        if not tenant_psp and not ws.psp_source_of_truth:
            return Response({'psp_source_of_truth': False, 'items': []})
        # Fall back to the tenant-user's Company row when the
        # workstation's own company FK is blank (seed data quirk).
        from companies.models import Company
        company = ws.company or Company.objects.filter(owner_user=tok.user).first()

        if not ws.external_id or not company:
            # Station belongs to a PSP tenant but isn't wired to a PSP
            # workstation. Signal empty so FE can guide the operator
            # to ask a supervisor to link it.
            return Response({'psp_source_of_truth': True, 'items': []})

        # Deferred import — psp_sync isn't loaded eagerly and only
        # PSP-tagged tenants ever hit this branch.
        from psp_sync.client import PspError, client_for_company

        try:
            client = client_for_company(company)
        except (ValueError, PspError):
            # Missing PSP creds — surface an empty list, not a 500.
            return Response({'psp_source_of_truth': True, 'items': []})

        try:
            remote_mos = client.list_manufacturing_orders(
                workstation_uuid=str(ws.external_id),
                status='in_progress',
            )
        except PspError as e:
            logger.warning('personal_kiosk mos list failed: %s', e)
            return Response({'psp_source_of_truth': True, 'items': []})

        rows: list[dict] = []
        for mo in remote_mos:
            mo_uuid = mo.get('uuid')
            mo_status = mo.get('status')
            quantity = mo.get('quantity')
            due_date = mo.get('due_date')
            item = mo.get('item') or {}
            for step in mo.get('steps') or []:
                if not step.get('for_this_workstation'):
                    continue
                group = step.get('workstation_group') or {}
                rows.append({
                    'mo_uuid': mo_uuid,
                    'mo_status': mo_status,
                    'step_uuid': step.get('uuid'),
                    'step_name': step.get('name'),
                    'step_sort_order': step.get('sort_order'),
                    'step_status': step.get('status'),
                    'step_planned_start': step.get('planned_start'),
                    'step_planned_finish': step.get('planned_finish'),
                    'workstation_group_uuid': group.get('uuid'),
                    'workstation_group_name': group.get('name'),
                    'item_name': item.get('name'),
                    'quantity': quantity,
                    'quantity_produced': step.get('quantity_produced'),
                    'due_date': due_date,
                    # PSP already returns project_type on the MO
                    # payload — surface it so the R&D chip lights up
                    # on the station's MO picker too.
                    'project_type': mo.get('project_type'),
                })

        return Response({'psp_source_of_truth': True, 'items': rows})


class PublicPersonalKioskJobsView(APIView):
    """GET /api/kiosk/personal/<token>/jobs/?session_token=…[&nocache=1]

    Cross-workstation "what can I work on right now" list. Every PSP MO
    with ``status = in_progress`` that routes to a station this worker
    can open shows up here, one row per (MO, workstation), so clicking
    a row can open StationView with the MO preselected.

    Returns ``{psp_source_of_truth: false, items: []}`` for non-PSP
    tenants — the personal kiosk stays useful without PSP, the Jobs
    tab just goes empty.

    Performance — the ONE-CALL path:
      * Sends every station's PSP uuid in a single POST to
        ``/manufacturing-orders/for-workstations``. PSP does the cross
        product server-side in two SQL queries (uuid→group_id, then
        MOs whose step targets any of those groups). ONE round-trip,
        regardless of station count. Scales to millions of MOs because
        the aggregation runs on PSP's DB.
      * Response is Redis-cached for ~10s keyed by (kiosk, worker).
      * ``?nocache=1`` bypasses the cache so Refresh always fetches
        fresh.
      * Hard row cap protects against pathological tenants; the FE
        renders a "showing top jobs only" hint when truncated.
    """

    permission_classes = [AllowAny]

    JOBS_MAX_ROWS = 500
    CACHE_TTL_SECONDS = 10

    def get(self, request, token):
        import logging
        logger = logging.getLogger(__name__)

        tok = _resolve_token(token)
        if not tok:
            return Response(
                {'detail': 'Invalid kiosk link.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        _s, worker = _resolve_session_worker(tok, request)
        if not worker:
            return Response(
                {'detail': 'Session expired.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        tenant_psp = _tenant_is_psp_integrated(tok.user)
        if not tenant_psp:
            return Response({'psp_source_of_truth': False, 'items': []})

        company = _tenant_company(tok.user)
        if not company:
            return Response({'psp_source_of_truth': True, 'items': []})

        from django.core.cache import cache
        cache_key = f'jobs:{tok.pk}:{worker.pk}'
        nocache = request.query_params.get('nocache') in ('1', 'true')
        if not nocache:
            cached = cache.get(cache_key)
            if cached is not None:
                return Response(cached)

        # PSP-linked workstations the worker can open on this tablet.
        from workstations.models import Workstation
        stations = list(
            Workstation.objects
            .filter(user=tok.user, is_active=True)
            .filter(Q(is_general=True) | Q(authorized_workers=worker))
            .exclude(external_id__isnull=True)
            .only('id', 'name', 'external_id', 'kiosk_token')
            .distinct()
        )
        if not stations:
            payload = {'psp_source_of_truth': True, 'items': []}
            cache.set(cache_key, payload, self.CACHE_TTL_SECONDS)
            return Response(payload)

        # Local ws.external_id → Workstation, so we can map the PSP
        # response back to local ids in O(1).
        stations_by_uuid = {str(ws.external_id): ws for ws in stations}

        # Deferred import — psp_sync only loaded for PSP tenants.
        from psp_sync.client import PspError, client_for_company

        try:
            client = client_for_company(company)
        except (ValueError, PspError):
            return Response({'psp_source_of_truth': True, 'items': []})

        # ONE call. PSP returns the flat cross-product already.
        try:
            psp_items = client.list_manufacturing_orders_for_workstations(
                workstation_uuids=list(stations_by_uuid.keys()),
                statuses=['in_progress'],
            )
        except PspError as e:
            logger.warning('personal_kiosk jobs list failed: %s', e)
            payload = {'psp_source_of_truth': True, 'items': []}
            cache.set(cache_key, payload, self.CACHE_TTL_SECONDS)
            return Response(payload)

        rows: list[dict] = []
        for entry in psp_items:
            if len(rows) >= self.JOBS_MAX_ROWS:
                break
            ws_uuid = entry.get('workstation_uuid')
            ws = stations_by_uuid.get(ws_uuid)
            if not ws:
                continue
            mo = entry.get('mo') or {}
            step = entry.get('step') or {}
            mo_uuid = mo.get('uuid')
            step_uuid = step.get('uuid')
            if not mo_uuid or not step_uuid:
                continue

            group = step.get('workstation_group') or {}
            item = mo.get('item') or {}
            rows.append({
                'mo_uuid': mo_uuid,
                'mo_status': mo.get('status'),
                'step_uuid': step_uuid,
                'step_name': step.get('name'),
                'step_sort_order': step.get('sort_order'),
                'step_status': step.get('status'),
                'step_planned_start': step.get('planned_start'),
                'step_planned_finish': step.get('planned_finish'),
                'workstation_group_uuid': group.get('uuid'),
                'workstation_group_name': group.get('name'),
                'workstation_id': ws.id,
                'workstation_name': ws.name,
                'workstation_kiosk_token': str(ws.kiosk_token),
                'item_uuid': item.get('uuid'),
                'item_code': item.get('code'),
                'item_name': item.get('name'),
                'quantity': mo.get('quantity'),
                'quantity_produced': step.get('quantity_produced'),
                'due_date': mo.get('due_date'),
                # Stream marker so the FE can badge R&D vs production
                # jobs distinctly. PSP already emits this on the MO
                # payload (see BackendWeb.IntegrationReadController's
                # ``manufacturing_orders_for_workstations``). Operators
                # scanning the Jobs list can tell at a glance whether
                # a job feeds R&D output (trial batch / sample kit)
                # vs commercial production, which matters for
                # quality-check cadence + which stock pool the outputs
                # land in.
                'project_type': mo.get('project_type'),
            })

        # Stable ordering — soonest due first, then step_sort_order,
        # so the FE list feels deterministic across refreshes.
        rows.sort(
            key=lambda r: (
                r.get('due_date') or '9999-12-31',
                r.get('step_sort_order') if r.get('step_sort_order') is not None else 9999,
                r.get('mo_uuid') or '',
            )
        )

        payload = {
            'psp_source_of_truth': True,
            'items': rows,
            'truncated': len(rows) >= self.JOBS_MAX_ROWS,
        }
        cache.set(cache_key, payload, self.CACHE_TTL_SECONDS)
        return Response(payload)


class PublicPersonalKioskMovementPhotoView(APIView):
    """GET /api/kiosk/personal/<token>/movement-photos/<uuid>/file?session_token=…

    Proxies a PSP movement-photo binary to the tablet. The upstream
    /api/stock/movement-photos endpoint on PSP is UI-JWT-gated so the
    kiosk browser can't hit it directly; we fetch it here with the
    company's integration bearer and stream the bytes back.

    Cached ~10 minutes via a Cache-Control header so the kiosk's HTTP
    cache spares us the round-trip when a worker re-opens the same
    modal — photos are effectively immutable (a new snap creates a new
    UUID; the URL never changes what it points to).
    """

    permission_classes = [AllowAny]

    def get(self, request, token, uuid):
        from django.http import HttpResponse
        import logging
        logger = logging.getLogger(__name__)

        tok = _resolve_token(token)
        if not tok:
            return Response(
                {'detail': 'Invalid kiosk link.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        _s, worker = _resolve_session_worker(tok, request)
        if not worker:
            return Response(
                {'detail': 'Session expired.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        company = _tenant_company(tok.user)
        if not company:
            return Response(
                {'detail': 'PSP integration not configured.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        from psp_sync.client import PspClientError, PspError, client_for_company
        try:
            client = client_for_company(company)
        except (ValueError, PspError):
            return Response(
                {'detail': 'PSP integration not configured.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            body, content_type = client.get_movement_photo_bytes(str(uuid))
        except PspClientError as e:
            code = getattr(e, 'status_code', 502)
            if code == 404:
                return Response(
                    {'detail': 'Photo not found.'},
                    status=status.HTTP_404_NOT_FOUND,
                )
            logger.warning('movement photo proxy client-error: %s', e)
            return Response(
                {'detail': 'Photo unavailable.'},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except PspError as e:
            logger.warning('movement photo proxy failed: %s', e)
            return Response(
                {'detail': 'Photo unavailable.'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        response = HttpResponse(body, content_type=content_type)
        # Photos are effectively immutable — the URL uuid maps 1:1 to
        # a specific snapshot. Let the browser cache aggressively.
        response['Cache-Control'] = 'private, max-age=600'
        return response


class PublicPersonalKioskJobPreviewView(APIView):
    """GET /api/kiosk/personal/<token>/workstations/<ws_id>/jobs/<mo_uuid>/preview/?session_token=…

    "Everything the Jobs modal + Running-panel BOM card need to render"
    in one round-trip: the target workstation's SOP + the MO's scaled
    BOM parts. Called from two surfaces:

      1. Jobs tab — when the operator taps a job card, we open a modal
         showing SOP + operation description + BOM before they hit
         Start. Fetched with the workstation the JobRow was routed to
         (server pre-resolves that on the Jobs list).
      2. Running session — the RunningPanel already has SOP + operation
         description locally, but calls this endpoint to load the BOM
         parts section. Server-side we return everything so the same
         hook works for both callers.

    Non-PSP tenants / missing PSP creds / PSP round-trip failures
    degrade the ``parts`` list to ``[]`` and let the modal still render
    SOP — the operator can still Start the session without the BOM.
    """

    permission_classes = [AllowAny]

    def get(self, request, token, ws_id, mo_uuid):
        import logging
        logger = logging.getLogger(__name__)

        tok = _resolve_token(token)
        if not tok:
            return Response(
                {'detail': 'Invalid kiosk link.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        _s, worker = _resolve_session_worker(tok, request)
        if not worker:
            return Response(
                {'detail': 'Session expired.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        ws = _resolve_workstation_for_tenant(tok, ws_id)
        if not ws:
            return Response(
                {'detail': 'Workstation not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        if not _worker_authorized_on(ws, worker):
            return Response(
                {'detail': 'Not authorised on this station.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        # SOP payload matches the shape already returned by the
        # workstation-context endpoint so the FE can reuse SopCard.
        from workstations.models import SOP
        try:
            sop_row = SOP.objects.get(workstation=ws)
            sop_content = sop_row.content or ''
            sop_updated_at = (
                sop_row.updated_at.isoformat() if sop_row.updated_at else None
            )
        except SOP.DoesNotExist:
            sop_content = ''
            sop_updated_at = None

        workstation_payload = {
            'id': ws.id,
            'name': ws.name,
            'description': ws.description or '',
            'sop_content': sop_content,
            'sop_updated_at': sop_updated_at,
        }

        # BOM parts + MO header from PSP. Only attempted for PSP tenants;
        # otherwise we return an empty parts list (the modal still
        # renders SOP + operation description, and Start still works —
        # local-item sessions don't have a BOM concept anyway).
        parts_mo: dict = {}
        parts: list[dict] = []
        company = _tenant_company(tok.user)
        if company:
            from psp_sync.client import PspError, client_for_company
            try:
                client = client_for_company(company)
            except (ValueError, PspError):
                client = None
            if client is not None:
                try:
                    result = client.get_manufacturing_order_parts(str(mo_uuid))
                    parts_mo = result.get('mo') or {}
                    parts = result.get('parts') or []
                except PspError as e:
                    # Log + degrade to empty BOM so the modal still opens.
                    logger.warning(
                        'personal_kiosk job preview parts failed: %s', e
                    )

        return Response({
            'workstation': workstation_payload,
            'mo': parts_mo,
            'parts': parts,
        })


# =============================================================================
# Embedded QC endpoints
# -----------------------------------------------------------------------------
# Mirrors qc.views.qc.{QCSessionsView, QCVerifySessionView} but
# authenticates via the personal-kiosk session_token so QA reviewers
# never have to jump out to /qc/<qc_token> and re-enter a PIN.
# =============================================================================


def _require_qa_worker(worker):
    """QC endpoints only accept is_qa=True workers, matching what the
    standalone QC kiosk enforces via its own PIN check."""
    return bool(worker and worker.is_qa)


class PublicPersonalKioskQCSessionsView(APIView):
    """GET /api/kiosk/personal/<token>/qc/sessions/?session_token=…&page=…

    Paginated list of completed sessions pending QC. Same filters as
    the standalone QC kiosk (workstation, worker, search, date range)
    so a supervisor can find the row they're looking for even when
    a shift produced dozens of sessions."""

    permission_classes = [AllowAny]

    def get(self, request, token):
        tok = _resolve_token(token)
        if not tok:
            return Response({'detail': 'Invalid kiosk link.'}, status=status.HTTP_404_NOT_FOUND)
        _s, worker = _resolve_session_worker(tok, request)
        if not worker:
            return Response({'detail': 'Session expired.'}, status=status.HTTP_401_UNAUTHORIZED)
        if not _require_qa_worker(worker):
            return Response({'detail': 'QA reviewers only.'}, status=status.HTTP_403_FORBIDDEN)

        from work_sessions.models import WorkSession

        qs = (
            WorkSession.objects
            .filter(user=tok.user, status='completed')
            .select_related('workstation', 'item')
            .prefetch_related('workers')
            .order_by('-start_time')
        )

        workstation_id = request.query_params.get('workstation')
        if workstation_id:
            qs = qs.filter(workstation_id=workstation_id)
        worker_id = request.query_params.get('worker')
        if worker_id:
            qs = qs.filter(workers__pk=worker_id)
        search = (request.query_params.get('search') or '').strip()
        if search:
            qs = qs.filter(
                Q(workstation__name__icontains=search)
                | Q(workers__full_name__icontains=search)
                | Q(item__name__icontains=search)
            )
        qs = qs.distinct()

        try:
            page = max(1, int(request.query_params.get('page') or 1))
        except (TypeError, ValueError):
            page = 1
        page_size = 25
        total = qs.count()
        offset = (page - 1) * page_size
        sessions = qs[offset:offset + page_size]

        results = [
            {
                'id': s.id,
                'workstation_id': s.workstation_id,
                'workstation_name': s.workstation.name if s.workstation else None,
                'workstation_uom': s.workstation.uom if s.workstation else None,
                'start_time': s.start_time.isoformat(),
                'end_time': s.end_time.isoformat() if s.end_time else None,
                'duration_hours': s.duration_hours,
                'quantity_produced': float(s.quantity_produced) if s.quantity_produced else None,
                'item_name': (s.item.name if s.item else (s.override_task_name or None)),
                'workers': [
                    {'id': w.id, 'name': w.full_name}
                    for w in s.workers.all()
                ],
                'mo_uuid': s.mo_uuid,
            }
            for s in sessions
        ]

        # R&D chip enrichment — batched PSP lookup, silent-degrade.
        from psp_sync.mo_meta import enrich_rows_with_project_type
        enrich_rows_with_project_type(results, _tenant_company(tok.user))

        return Response({
            'count': total,
            'page': page,
            'page_size': page_size,
            'total_pages': (total + page_size - 1) // page_size if total else 0,
            'results': results,
        })


# Kept in-sync with `qc.views.qc.MANUAL_DELTAS` / `MANUAL_TYPES`.
_QC_MANUAL_DELTAS = {'positive': 10, 'negative': -10}
_QC_MANUAL_TYPES = {'positive': 'manual_positive', 'negative': 'manual_negative'}


class PublicPersonalKioskQCRosterView(APIView):
    """GET /api/kiosk/personal/<token>/qc/workers/?session_token=…&q=…

    Roster search for the "leave general feedback" flow — QA taps a
    worker by name, no session required. Same 5-result cap as the
    landing roster to keep the picker responsive on large tenants."""

    permission_classes = [AllowAny]
    MAX_RESULTS = 5

    def get(self, request, token):
        tok = _resolve_token(token)
        if not tok:
            return Response({'detail': 'Invalid kiosk link.'}, status=status.HTTP_404_NOT_FOUND)
        _s, inspector = _resolve_session_worker(tok, request)
        if not inspector:
            return Response({'detail': 'Session expired.'}, status=status.HTTP_401_UNAUTHORIZED)
        if not _require_qa_worker(inspector):
            return Response({'detail': 'QA reviewers only.'}, status=status.HTTP_403_FORBIDDEN)

        q = (request.query_params.get('q') or '').strip()
        if not q:
            return Response([])
        workers = (
            Worker.objects
            .filter(user=tok.user, is_active=True, full_name__icontains=q)
            .order_by('full_name')[: self.MAX_RESULTS]
        )
        return Response([
            {
                'id': w.id,
                'full_name': w.full_name,
                'group_name': w.group.name if w.group_id else None,
                'reputation_score': w.reputation_score,
                'reputation_tier': w.reputation_tier,
            }
            for w in workers
        ])


class PublicPersonalKioskQCGeneralFeedbackView(APIView):
    """POST /api/kiosk/personal/<token>/qc/feedback/

    body: {session_token, worker_id, mark, reason}

    Session-less reputation mark — for feedback that isn't tied to a
    specific WorkSession (attitude, behaviour, standing complaints).
    Mirrors qc.views.qc.QCGeneralFeedbackView but auths via the
    personal-kiosk session so no external PIN prompt is needed."""

    permission_classes = [AllowAny]

    def post(self, request, token):
        tok = _resolve_token(token)
        if not tok:
            return Response({'detail': 'Invalid kiosk link.'}, status=status.HTTP_404_NOT_FOUND)
        _s, inspector = _resolve_session_worker(tok, request)
        if not inspector:
            return Response({'detail': 'Session expired.'}, status=status.HTTP_401_UNAUTHORIZED)
        if not _require_qa_worker(inspector):
            return Response({'detail': 'QA reviewers only.'}, status=status.HTTP_403_FORBIDDEN)

        worker_id = request.data.get('worker_id')
        mark = request.data.get('mark')
        reason = (request.data.get('reason') or '').strip()
        if mark not in _QC_MANUAL_DELTAS:
            return Response({'detail': 'mark must be positive or negative.'}, status=status.HTTP_400_BAD_REQUEST)
        if not reason:
            return Response({'detail': 'reason is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            worker = Worker.objects.get(pk=worker_id, user=tok.user, is_active=True)
        except Worker.DoesNotExist:
            return Response({'detail': 'Worker not found.'}, status=status.HTTP_400_BAD_REQUEST)

        # Attribute to the inspector's active shift if they're clocked
        # in — day-overview groups the review under their shift.
        inspector_shift = (
            WorkerShift.objects
            .filter(worker=inspector, status=WorkerShift.STATUS_ACTIVE)
            .first()
        )

        with transaction.atomic():
            WorkerReputationEvent.objects.create(
                worker=worker,
                session=None,
                event_type=_QC_MANUAL_TYPES[mark],
                score_delta=_QC_MANUAL_DELTAS[mark],
                reason=reason,
                created_by=inspector,
                shift=inspector_shift,
            )
            worker.recompute_reputation_score()

        return Response({
            'detail': 'Feedback recorded.',
            'reputation_score': worker.reputation_score,
        }, status=status.HTTP_201_CREATED)


class PublicPersonalKioskQCVerifySessionView(APIView):
    """POST /api/kiosk/personal/<token>/qc/sessions/<id>/verify/

    body: {session_token, quantity_rejected?, feedback: [{worker_id, mark, reason}]}

    Mirrors QCVerifySessionView. The authenticated worker is
    automatically the inspector — no separate inspector picker is
    needed on the personal kiosk (you sign in as yourself)."""

    permission_classes = [AllowAny]

    def post(self, request, token, session_id):
        tok = _resolve_token(token)
        if not tok:
            return Response({'detail': 'Invalid kiosk link.'}, status=status.HTTP_404_NOT_FOUND)
        _s, inspector = _resolve_session_worker(tok, request)
        if not inspector:
            return Response({'detail': 'Session expired.'}, status=status.HTTP_401_UNAUTHORIZED)
        if not _require_qa_worker(inspector):
            return Response({'detail': 'QA reviewers only.'}, status=status.HTTP_403_FORBIDDEN)

        from work_sessions.models import WorkSession

        try:
            session = (
                WorkSession.objects
                .select_related('workstation')
                .prefetch_related('workers')
                .get(pk=session_id, user=tok.user, status='completed')
            )
        except WorkSession.DoesNotExist:
            return Response({'detail': 'Session not found.'}, status=status.HTTP_404_NOT_FOUND)

        quantity_rejected = request.data.get('quantity_rejected', 0)
        feedback_payload = request.data.get('feedback') or []
        session_worker_ids = {w.id for w in session.workers.all()}

        cleaned = []
        for i, item in enumerate(feedback_payload):
            if not isinstance(item, dict):
                return Response({'detail': f'feedback[{i}] must be an object.'}, status=status.HTTP_400_BAD_REQUEST)
            mark = item.get('mark')
            worker_id = item.get('worker_id')
            reason = (item.get('reason') or '').strip()
            if mark not in _QC_MANUAL_DELTAS:
                return Response({'detail': f'feedback[{i}].mark must be positive or negative.'}, status=status.HTTP_400_BAD_REQUEST)
            if worker_id not in session_worker_ids:
                return Response({'detail': f'feedback[{i}].worker_id is not part of this session.'}, status=status.HTTP_400_BAD_REQUEST)
            if not reason:
                return Response({'detail': f'feedback[{i}].reason is required.'}, status=status.HTTP_400_BAD_REQUEST)
            cleaned.append({'worker_id': worker_id, 'mark': mark, 'reason': reason})

        # Stamp reviews on the inspector's active shift so QA activity
        # attaches to today's shift narrative.
        inspector_shift = (
            WorkerShift.objects
            .filter(worker=inspector, status=WorkerShift.STATUS_ACTIVE)
            .first()
        )

        with transaction.atomic():
            session.quantity_rejected = quantity_rejected
            session.status = 'verified'
            session.save()
            session.save_performance()

            touched = set()
            for item in cleaned:
                WorkerReputationEvent.objects.create(
                    worker_id=item['worker_id'],
                    session=session,
                    event_type=_QC_MANUAL_TYPES[item['mark']],
                    score_delta=_QC_MANUAL_DELTAS[item['mark']],
                    reason=item['reason'],
                    created_by=inspector,
                    shift=inspector_shift,
                )
                touched.add(item['worker_id'])

            for w in Worker.objects.filter(pk__in=touched):
                w.recompute_reputation_score()

        return Response({
            'detail': 'Verified.',
            'session_id': session.id,
        })

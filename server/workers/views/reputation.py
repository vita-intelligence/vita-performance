from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q
from django.utils.dateparse import parse_date
from ..models import WorkerReputationEvent


class WorkerReputationEventListView(APIView):
    """Paginated, filterable timeline of reputation events for the current user's workers."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = (
            WorkerReputationEvent.objects
            .filter(worker__user=request.user)
            .select_related('worker', 'created_by', 'session__workstation')
            .order_by('-created_at')
        )

        worker_id = request.query_params.get('worker')
        if worker_id:
            qs = qs.filter(worker_id=worker_id)

        event_type = request.query_params.get('event_type')
        if event_type:
            qs = qs.filter(event_type=event_type)

        category = request.query_params.get('category')
        if category == 'auto':
            qs = qs.filter(event_type__startswith='auto_')
        elif category == 'manual':
            qs = qs.filter(event_type__startswith='manual_')

        sign = request.query_params.get('sign')
        if sign == 'positive':
            qs = qs.filter(score_delta__gt=0)
        elif sign == 'negative':
            qs = qs.filter(score_delta__lt=0)

        search = (request.query_params.get('search') or '').strip()
        if search:
            qs = qs.filter(
                Q(worker__full_name__icontains=search)
                | Q(reason__icontains=search)
                | Q(created_by__full_name__icontains=search)
                | Q(session__workstation__name__icontains=search)
            )

        date_from = parse_date(request.query_params.get('date_from') or '')
        if date_from:
            qs = qs.filter(created_at__date__gte=date_from)

        date_to = parse_date(request.query_params.get('date_to') or '')
        if date_to:
            qs = qs.filter(created_at__date__lte=date_to)

        try:
            page = max(1, int(request.query_params.get('page') or 1))
        except (TypeError, ValueError):
            page = 1
        try:
            page_size = min(100, max(1, int(request.query_params.get('page_size') or 30)))
        except (TypeError, ValueError):
            page_size = 30

        total = qs.count()
        offset = (page - 1) * page_size
        events = qs[offset:offset + page_size]

        results = [
            {
                'id': e.id,
                'worker_id': e.worker_id,
                'worker_name': e.worker.full_name,
                'event_type': e.event_type,
                'score_delta': e.score_delta,
                'reason': e.reason,
                'session_id': e.session_id,
                'session_workstation': e.session.workstation.name if e.session and e.session.workstation else None,
                'created_by_id': e.created_by_id,
                'created_by_name': e.created_by.full_name if e.created_by else None,
                'created_at': e.created_at.isoformat(),
            }
            for e in events
        ]

        return Response({
            'count': total,
            'page': page,
            'page_size': page_size,
            'total_pages': (total + page_size - 1) // page_size if total else 0,
            'has_more': offset + len(results) < total,
            'results': results,
        })

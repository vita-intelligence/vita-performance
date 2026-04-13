from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Avg, Sum, Count, Max, Q
from collections import defaultdict
from workers.models import Worker, WorkerReputationEvent
from work_sessions.models import WorkSession
from core.utils.date_utils import get_date_range


def get_grouping(range_param):
    if range_param == 'today':
        return 'hour'
    if range_param in ('week', 'month'):
        return 'day'
    return 'week'


def group_sessions_by(sessions, grouping):
    groups = defaultdict(list)
    for s in sessions:
        if grouping == 'hour':
            key = s.start_time.strftime('%Y-%m-%d %H:00')
        elif grouping == 'day':
            key = s.start_time.strftime('%Y-%m-%d')
        else:  # week
            key = s.start_time.strftime('%Y-W%W')
        groups[key].append(s)

    chart = []
    for date_key in sorted(groups.keys()):
        group = groups[date_key]
        performances = [s.performance_percentage for s in group if s.performance_percentage is not None]
        chart.append({
            'date': date_key,
            'avg_performance': round(sum(performances) / len(performances), 2) if performances else None,
            'sessions_count': len(group),
            'total_quantity': sum(float(s.quantity_produced) for s in group if s.quantity_produced),
        })
    return chart


class WorkerStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            worker = Worker.objects.get(pk=pk, user=request.user)
        except Worker.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        range_param = request.query_params.get('range', 'month')
        since = get_date_range(range_param)

        base_filter = Q(
            workers=worker,
            user=request.user,
            status__in=['completed', 'verified'],
        )
        if since:
            base_filter &= Q(start_time__gte=since)

        # Summary via DB aggregation — single query, no Python loops
        summary_qs = WorkSession.objects.filter(base_filter).aggregate(
            sessions_count=Count('id'),
            avg_performance=Avg('performance_percentage'),
            best_performance=Max('performance_percentage'),
            total_quantity=Sum('quantity_produced'),
        )

        # Fetch sessions for chart + recent — single query, prefetch workers
        sessions = list(
            WorkSession.objects
            .filter(base_filter)
            .select_related('workstation', 'item')
            .prefetch_related('workers')
            .order_by('start_time')
        )

        # wage_cost uses workers.all() — already prefetched, no extra queries
        total_hours = sum(s.duration_hours or 0 for s in sessions)
        total_wage_cost = sum(s.wage_cost or 0 for s in sessions)

        # Chart
        grouping = get_grouping(range_param)
        chart = group_sessions_by(sessions, grouping)

        # Recent 20
        recent = [
            {
                'id': s.id,
                'workstation_name': s.workstation.name,
                'date': s.start_time.isoformat(),
                'duration_hours': s.duration_hours,
                'quantity_produced': float(s.quantity_produced) if s.quantity_produced else None,
                'performance_percentage': s.performance_percentage,
                'wage_cost': s.wage_cost,
                'item_name': s.item.name if s.item else None,
                'worker_count': len(s.workers.all()),  # prefetched, no DB hit
                'status': s.status,
            }
            for s in reversed(sessions[-20:])
        ]

        reputation_events = (
            WorkerReputationEvent.objects
            .filter(worker=worker)
            .select_related('created_by', 'session__workstation')
            .order_by('-created_at')[:20]
        )
        reputation_history = [
            {
                'id': e.id,
                'event_type': e.event_type,
                'score_delta': e.score_delta,
                'reason': e.reason,
                'session_id': e.session_id,
                'session_workstation': e.session.workstation.name if e.session and e.session.workstation else None,
                'created_by': e.created_by.full_name if e.created_by else None,
                'created_at': e.created_at.isoformat(),
            }
            for e in reputation_events
        ]

        return Response({
            'worker': {
                'id': worker.id,
                'name': worker.full_name,
                'hourly_rate': float(worker.hourly_rate),
                'is_active': worker.is_active,
                'reputation_score': worker.reputation_score,
                'reputation_tier': worker.reputation_tier,
            },
            'reputation_history': reputation_history,
            'summary': {
                'sessions_count': summary_qs['sessions_count'] or 0,
                'avg_performance': round(summary_qs['avg_performance'], 2) if summary_qs['avg_performance'] else None,
                'best_performance': summary_qs['best_performance'],
                'total_quantity': float(summary_qs['total_quantity'] or 0),
                'total_hours': round(total_hours, 2),
                'total_wage_cost': round(total_wage_cost, 2),
            },
            'chart': chart,
            'sessions': recent,
            'range': range_param,
            'grouping': grouping,
        })
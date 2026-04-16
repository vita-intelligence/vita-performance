from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Avg, Sum, Count, Max, Min, Q, F
from collections import defaultdict
from workstations.models import Workstation
from work_sessions.models import WorkSession
from core.utils.date_utils import get_date_range
from .worker_stats import get_grouping, group_sessions_by


class WorkstationStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            workstation = Workstation.objects.get(pk=pk, user=request.user)
        except Workstation.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        range_param = request.query_params.get('range', 'month')
        since = get_date_range(range_param)

        base_filter = Q(
            workstation=workstation,
            user=request.user,
            status__in=['completed', 'verified'],
        )
        if since:
            base_filter &= Q(start_time__gte=since)

        # Summary via DB aggregation
        summary_qs = WorkSession.objects.filter(base_filter).aggregate(
            sessions_count=Count('id'),
            avg_performance=Avg('performance_percentage'),
            best_performance=Max('performance_percentage'),
            worst_performance=Min('performance_percentage'),
            total_quantity=Sum('quantity_produced'),
            total_rejected=Sum('quantity_rejected'),
        )

        # Fetch sessions for chart, workers breakdown, and recent list
        sessions = list(
            WorkSession.objects
            .filter(base_filter)
            .select_related('workstation', 'item')
            .prefetch_related('workers')
            .order_by('start_time')
        )

        total_hours = sum(s.duration_hours or 0 for s in sessions)
        total_overtime = sum(s.overtime_hours or 0 for s in sessions)
        total_wage_cost = sum(s.wage_cost or 0 for s in sessions)
        total_qty = float(summary_qs['total_quantity'] or 0)

        avg_time_per_unit = None
        if total_qty > 0 and total_hours > 0:
            avg_time_per_unit = round((total_hours * 60) / total_qty, 2)

        unique_workers = set()
        for s in sessions:
            for w in s.workers.all():
                unique_workers.add(w.id)

        # Chart
        grouping = get_grouping(range_param)
        chart = group_sessions_by(sessions, grouping)

        # Top workers - aggregate per worker across sessions
        worker_map = defaultdict(lambda: {
            'id': 0,
            'name': '',
            'sessions_count': 0,
            'performances': [],
            'total_quantity': 0,
            'total_hours': 0,
        })
        for s in sessions:
            worker_count = len(s.workers.all())
            for w in s.workers.all():
                entry = worker_map[w.id]
                entry['id'] = w.id
                entry['name'] = w.full_name
                entry['sessions_count'] += 1
                if s.performance_percentage is not None:
                    entry['performances'].append(s.performance_percentage)
                if s.quantity_produced:
                    entry['total_quantity'] += float(s.quantity_produced) / worker_count
                entry['total_hours'] += (s.duration_hours or 0)

        top_workers = sorted(
            [
                {
                    'id': v['id'],
                    'name': v['name'],
                    'sessions_count': v['sessions_count'],
                    'avg_performance': round(
                        sum(v['performances']) / len(v['performances']), 2
                    ) if v['performances'] else None,
                    'total_quantity': round(v['total_quantity'], 2),
                    'total_hours': round(v['total_hours'], 2),
                }
                for v in worker_map.values()
            ],
            key=lambda x: x['avg_performance'] or 0,
            reverse=True,
        )

        # Items breakdown
        item_map = defaultdict(lambda: {
            'id': None,
            'name': '',
            'sessions_count': 0,
            'total_quantity': 0,
            'performances': [],
        })
        for s in sessions:
            item_key = s.item_id or 0
            entry = item_map[item_key]
            entry['id'] = s.item_id
            entry['name'] = s.item.name if s.item else 'No item'
            entry['sessions_count'] += 1
            if s.quantity_produced:
                entry['total_quantity'] += float(s.quantity_produced)
            if s.performance_percentage is not None:
                entry['performances'].append(s.performance_percentage)

        items_breakdown = sorted(
            [
                {
                    'id': v['id'],
                    'name': v['name'],
                    'sessions_count': v['sessions_count'],
                    'total_quantity': round(v['total_quantity'], 2),
                    'avg_performance': round(
                        sum(v['performances']) / len(v['performances']), 2
                    ) if v['performances'] else None,
                }
                for v in item_map.values()
            ],
            key=lambda x: x['total_quantity'],
            reverse=True,
        )

        # Recent 20 sessions
        recent = [
            {
                'id': s.id,
                'worker_names': [w.full_name for w in s.workers.all()],
                'date': s.start_time.isoformat(),
                'duration_hours': s.duration_hours,
                'quantity_produced': float(s.quantity_produced) if s.quantity_produced else None,
                'performance_percentage': s.performance_percentage,
                'wage_cost': s.wage_cost,
                'item_name': s.item.name if s.item else None,
                'worker_count': len(s.workers.all()),
                'status': s.status,
            }
            for s in reversed(sessions[-20:])
        ]

        return Response({
            'workstation': {
                'id': workstation.id,
                'name': workstation.name,
                'description': workstation.description,
                'is_active': workstation.is_active,
                'is_general': workstation.is_general,
                'target_quantity': float(workstation.target_quantity) if workstation.target_quantity else None,
                'target_duration': float(workstation.target_duration) if workstation.target_duration else None,
                'uom': workstation.uom,
                'performance_formula': workstation.performance_formula,
                'effective_settings': workstation.get_effective_settings(),
            },
            'summary': {
                'sessions_count': summary_qs['sessions_count'] or 0,
                'avg_performance': round(summary_qs['avg_performance'], 2) if summary_qs['avg_performance'] else None,
                'best_performance': summary_qs['best_performance'],
                'worst_performance': summary_qs['worst_performance'],
                'total_quantity': total_qty,
                'total_rejected': float(summary_qs['total_rejected'] or 0),
                'total_hours': round(total_hours, 2),
                'total_overtime_hours': round(total_overtime, 2),
                'total_wage_cost': round(total_wage_cost, 2),
                'avg_time_per_unit': avg_time_per_unit,
                'unique_workers_count': len(unique_workers),
            },
            'chart': chart,
            'top_workers': top_workers,
            'items_breakdown': items_breakdown,
            'sessions': recent,
            'range': range_param,
            'grouping': grouping,
        })

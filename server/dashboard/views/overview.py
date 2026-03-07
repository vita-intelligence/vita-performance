from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from workstations.models import Workstation
from workers.models import Worker
from work_sessions.models import WorkSession


class DashboardOverviewView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        today = timezone.now().date()

        # Workers
        workers = Worker.objects.filter(user=user)
        total_workers = workers.count()
        active_workers = workers.filter(is_active=True).count()

        # Workstations
        workstations = Workstation.objects.filter(user=user)
        total_workstations = workstations.count()
        active_workstations = workstations.filter(is_active=True).count()

        # Sessions
        sessions = WorkSession.objects.filter(user=user)
        active_sessions = sessions.filter(status='active').count()

        # Today's completed sessions
        today_sessions = list(
            sessions.filter(
                status__in=['completed', 'verified'],
                start_time__date=today
            ).select_related('workstation').prefetch_related('workers')
        )

        # Today's wage cost
        today_wage_cost = sum(
            s.wage_cost for s in today_sessions if s.wage_cost is not None
        )

        # Today's average performance
        performances = [
            s.performance_percentage
            for s in today_sessions
            if s.performance_percentage is not None
        ]
        avg_performance = round(sum(performances) / len(performances), 2) if performances else None

        # Best performing workstation today
        workstation_performance = {}
        for s in today_sessions:
            if s.performance_percentage is not None:
                wid = s.workstation_id
                if wid not in workstation_performance:
                    workstation_performance[wid] = {
                        'name': s.workstation.name,
                        'performances': []
                    }
                workstation_performance[wid]['performances'].append(s.performance_percentage)

        best_workstation = None
        if workstation_performance:
            best_wid = max(
                workstation_performance,
                key=lambda wid: sum(workstation_performance[wid]['performances']) / len(workstation_performance[wid]['performances'])
            )
            best_workstation = {
                'name': workstation_performance[best_wid]['name'],
                'avg_performance': round(
                    sum(workstation_performance[best_wid]['performances']) / len(workstation_performance[best_wid]['performances']), 2
                )
            }

        # Best performing worker today (across all workers in each session)
        worker_performance = {}
        for s in today_sessions:
            if s.performance_percentage is not None:
                for worker in s.workers.all():
                    if worker.id not in worker_performance:
                        worker_performance[worker.id] = {
                            'name': worker.full_name,
                            'performances': []
                        }
                    worker_performance[worker.id]['performances'].append(s.performance_percentage)

        best_worker = None
        if worker_performance:
            best_wid = max(
                worker_performance,
                key=lambda wid: sum(worker_performance[wid]['performances']) / len(worker_performance[wid]['performances'])
            )
            best_worker = {
                'name': worker_performance[best_wid]['name'],
                'avg_performance': round(
                    sum(worker_performance[best_wid]['performances']) / len(worker_performance[best_wid]['performances']), 2
                )
            }

        # Recent sessions
        recent_sessions = list(
            sessions.filter(status__in=['completed', 'verified'])
            .select_related('workstation')
            .prefetch_related('workers')
            .order_by('-start_time')[:5]
        )

        recent = [
            {
                'id': s.id,
                'worker_names': [w.full_name for w in s.workers.all()],
                'workstation_name': s.workstation.name,
                'duration_hours': s.duration_hours,
                'performance_percentage': s.performance_percentage,
                'wage_cost': s.wage_cost,
                'start_time': s.start_time,
                'status': s.status,
            }
            for s in recent_sessions
        ]

        return Response({
            'workers': {
                'total': total_workers,
                'active': active_workers,
            },
            'workstations': {
                'total': total_workstations,
                'active': active_workstations,
            },
            'active_sessions': active_sessions,
            'today': {
                'wage_cost': today_wage_cost,
                'avg_performance': avg_performance,
                'sessions_count': len(today_sessions),
                'best_workstation': best_workstation,
                'best_worker': best_worker,
            },
            'recent_sessions': recent,
        })
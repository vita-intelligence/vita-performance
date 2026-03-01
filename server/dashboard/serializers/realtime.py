from work_sessions.models import WorkSession
from workers.models import Worker


def serialize_active_session(session):
    return {
        'id': session.id,
        'worker_name': session.worker.full_name,
        'workstation_name': session.workstation.name,
        'start_time': session.start_time.isoformat(),
        'status': session.status,
    }


def serialize_leaderboard_entry(worker, sessions):
    performances = [
        s.performance_percentage
        for s in sessions
        if s.performance_percentage is not None
    ]
    avg_performance = round(
        sum(performances) / len(performances), 2
    ) if performances else None

    return {
        'worker_id': worker.id,
        'worker_name': worker.full_name,
        'sessions_count': len(sessions),
        'avg_performance': avg_performance,
    }


def serialize_workstation_status(workstation, active_sessions):
    active = any(s.workstation_id == workstation.id for s in active_sessions)
    return {
        'id': workstation.id,
        'name': workstation.name,
        'is_active': workstation.is_active,
        'has_active_session': active,
    }


def build_dashboard_payload(user):
    from django.utils import timezone
    from workstations.models import Workstation
    from work_sessions.models import WorkSession

    today = timezone.now().date()

    active_sessions = list(
        WorkSession.objects.filter(
            user=user,
            status='active'
        ).select_related('worker', 'workstation')
    )

    today_sessions = list(
        WorkSession.objects.filter(
            user=user,
            status='completed',
            start_time__date=today
        ).select_related('worker', 'workstation')
    )

    workstations = list(
        Workstation.objects.filter(user=user, is_active=True)
    )

    # Leaderboard
    worker_sessions = {}
    for s in today_sessions:
        if s.worker_id not in worker_sessions:
            worker_sessions[s.worker_id] = {
                'worker': s.worker,
                'sessions': []
            }
        worker_sessions[s.worker_id]['sessions'].append(s)

    leaderboard = sorted(
        [
            serialize_leaderboard_entry(v['worker'], v['sessions'])
            for v in worker_sessions.values()
        ],
        key=lambda x: x['avg_performance'] or 0,
        reverse=True
    )[:10]

    # Today summary
    performances = [
        s.performance_percentage
        for s in today_sessions
        if s.performance_percentage is not None
    ]
    avg_performance = round(
        sum(performances) / len(performances), 2
    ) if performances else None

    return {
        'type': 'dashboard_update',
        'active_sessions': [serialize_active_session(s) for s in active_sessions],
        'workstation_statuses': [
            serialize_workstation_status(w, active_sessions)
            for w in workstations
        ],
        'leaderboard': leaderboard,
        'summary': {
            'active_sessions_count': len(active_sessions),
            'completed_today': len(today_sessions),
            'avg_performance': avg_performance,
        }
    }
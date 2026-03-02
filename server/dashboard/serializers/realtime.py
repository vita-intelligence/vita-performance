import uuid


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


def build_alerts(user, active_sessions, today_sessions, workstations):
    from django.utils import timezone
    from settings.models import UserSettings
    alerts = []
    now = timezone.now()

    try:
        user_settings = UserSettings.objects.get(user=user)
        working_hours = float(user_settings.working_hours_per_day)
        work_start = user_settings.work_start_time.hour
    except UserSettings.DoesNotExist:
        working_hours = 8.0
        work_start = 8

    work_end = work_start + int(working_hours)
    is_working_hours = work_start <= now.hour < work_end

    if is_working_hours and not active_sessions:
        alerts.append({
            "id": "state_no_active_sessions",
            "type": "warning",
            "code": "NO_ACTIVE_SESSIONS",
            "data": {},
        })

    active_workstation_ids = {s.workstation_id for s in active_sessions}
    for w in workstations:
        if w.id not in active_workstation_ids:
            completed = [s for s in today_sessions if s.workstation_id == w.id and s.end_time]
            if completed:
                last_session = max(completed, key=lambda s: s.end_time)
                idle_hours = (now - last_session.end_time).total_seconds() / 3600
                if idle_hours >= 2:
                    alerts.append({
                        "id": f"state_idle_{w.id}",
                        "type": "warning",
                        "code": "WORKSTATION_IDLE",
                        "data": {
                            "workstation_name": w.name,
                            "hours": int(idle_hours),
                        },
                    })

    count = len(today_sessions)
    if count > 0 and count % 5 == 0:
        alerts.append({
            "id": f"state_milestone_{count}",
            "type": "milestone",
            "code": "TEAM_MILESTONE",
            "data": {"count": count},
        })

    return alerts


def build_dashboard_payload(user, event_alerts=None):
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

    performances = [
        s.performance_percentage
        for s in today_sessions
        if s.performance_percentage is not None
    ]
    avg_performance = round(
        sum(performances) / len(performances), 2
    ) if performances else None

    # Combine event-based alerts with state-based alerts
    state_alerts = build_alerts(user, active_sessions, today_sessions, workstations)
    all_alerts = (event_alerts or []) + state_alerts

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
        },
        'alerts': all_alerts,
    }
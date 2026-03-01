import uuid
from django.db.models.signals import post_save
from django.dispatch import receiver
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from work_sessions.models import WorkSession
from dashboard.serializers.realtime import build_dashboard_payload


@receiver(post_save, sender=WorkSession)
def session_changed(sender, instance, created, **kwargs):
    channel_layer = get_channel_layer()
    if not channel_layer:
        return

    event_alerts = []

    if created and instance.status == 'active':
        event_alerts.append({
            "id": str(uuid.uuid4()),
            "type": "info",
            "code": "SESSION_STARTED",
            "data": {
                "worker_name": instance.worker.full_name,
                "workstation_name": instance.workstation.name,
            },
        })

    elif not created and instance.status == 'completed':
        perf = instance.performance_percentage

        event_alerts.append({
            "id": str(uuid.uuid4()),
            "type": "info",
            "code": "SESSION_COMPLETED",
            "data": {
                "worker_name": instance.worker.full_name,
                "performance": perf or 0,
            },
        })

        if perf is not None:
            if perf >= 100:
                event_alerts.append({
                    "id": str(uuid.uuid4()),
                    "type": "success",
                    "code": "PERFORMANCE_HIGH",
                    "data": {
                        "worker_name": instance.worker.full_name,
                        "performance": perf,
                    },
                })
            elif perf < 75:
                event_alerts.append({
                    "id": str(uuid.uuid4()),
                    "type": "warning",
                    "code": "PERFORMANCE_LOW",
                    "data": {
                        "worker_name": instance.worker.full_name,
                        "performance": perf,
                    },
                })

        from django.utils import timezone
        today = timezone.now().date()
        today_count = WorkSession.objects.filter(
            user=instance.user,
            status='completed',
            start_time__date=today,
        ).count()

        if today_count == 1:
            event_alerts.append({
                "id": str(uuid.uuid4()),
                "type": "milestone",
                "code": "FIRST_SESSION_TODAY",
                "data": {
                    "worker_name": instance.worker.full_name,
                },
            })

    group_name = f"dashboard_{instance.user_id}"
    payload = build_dashboard_payload(instance.user, event_alerts=event_alerts)

    async_to_sync(channel_layer.group_send)(
        group_name,
        {
            "type": "dashboard_update",
            "data": payload,
        }
    )
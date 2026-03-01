from django.db.models.signals import post_save
from django.dispatch import receiver
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from work_sessions.models import WorkSession
from dashboard.serializers.realtime import build_dashboard_payload


@receiver(post_save, sender=WorkSession)
def session_changed(sender, instance, **kwargs):
    """
    Fires whenever a WorkSession is created or updated.
    Rebuilds the dashboard payload and pushes to all
    connected TV screens for this user.
    """
    channel_layer = get_channel_layer()
    if not channel_layer:
        return

    group_name = f"dashboard_{instance.user_id}"
    payload = build_dashboard_payload(instance.user)

    async_to_sync(channel_layer.group_send)(
        group_name,
        {
            "type": "dashboard_update",
            "data": payload,
        }
    )
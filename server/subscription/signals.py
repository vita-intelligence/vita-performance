from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings
from .models import Subscription


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_subscription(sender, instance, created, **kwargs):
    if created:
        Subscription.create_for_user(instance)
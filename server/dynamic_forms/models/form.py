from django.db import models
from django.conf import settings
from workstations.models import Workstation


class DynamicForm(models.Model):
    TRIGGER_START = 'start'
    TRIGGER_END = 'end'
    TRIGGER_BOTH = 'both'

    TRIGGER_CHOICES = [
        (TRIGGER_START, 'Session Start'),
        (TRIGGER_END, 'Session End'),
        (TRIGGER_BOTH, 'Both'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='dynamic_forms'
    )
    workstation = models.ForeignKey(
        Workstation,
        on_delete=models.CASCADE,
        related_name='dynamic_forms',
        null=True,
        blank=True,
    )
    name = models.CharField(max_length=200)
    trigger = models.CharField(max_length=10, choices=TRIGGER_CHOICES, default=TRIGGER_START)
    schema = models.JSONField(default=dict)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'dynamic_forms'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.trigger})"
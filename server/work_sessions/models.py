from django.db import models
from django.conf import settings
from workstations.models import Workstation
from workers.models import Worker


class WorkSession(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('completed', 'Completed'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='work_sessions')
    workstation = models.ForeignKey(Workstation, on_delete=models.CASCADE, related_name='sessions')
    worker = models.ForeignKey(Worker, on_delete=models.CASCADE, related_name='sessions')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='completed')
    start_time = models.DateTimeField()
    end_time = models.DateTimeField(null=True, blank=True)
    quantity_produced = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'work_sessions'
        ordering = ['-start_time']

    def __str__(self):
        return f'{self.worker.full_name} @ {self.workstation.name} ({self.start_time})'

    @property
    def duration_hours(self):
        if not self.end_time:
            return None
        delta = self.end_time - self.start_time
        return round(delta.total_seconds() / 3600, 2)

    @property
    def performance_percentage(self):
        if not self.end_time or not self.quantity_produced:
            return None
        if not self.workstation.target_quantity or not self.workstation.target_duration:
            return None
        if not self.duration_hours or self.duration_hours == 0:
            return None
        target_rate = float(self.workstation.target_quantity) / float(self.workstation.target_duration)
        expected_quantity = target_rate * self.duration_hours
        if expected_quantity == 0:
            return None
        return round((float(self.quantity_produced) / expected_quantity) * 100, 2)

    @property
    def overtime_hours(self):
        if not self.duration_hours:
            return None
        effective = self.workstation.get_effective_settings()
        threshold = float(effective['overtime_threshold'])
        return max(0, self.duration_hours - threshold)

    @property
    def wage_cost(self):
        if not self.duration_hours:
            return None
        effective = self.workstation.get_effective_settings()
        regular_hours = min(self.duration_hours, float(effective['overtime_threshold']))
        overtime_hours = self.overtime_hours or 0
        multiplier = float(effective['overtime_multiplier'])
        hourly_rate = float(self.worker.hourly_rate)
        return round((regular_hours * hourly_rate) + (overtime_hours * hourly_rate * multiplier), 2)
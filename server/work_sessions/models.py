from django.db import models
from django.conf import settings
from workstations.models import Workstation
from workers.models import Worker
from items.models import Item


class WorkSession(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('verified', 'Verified'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='work_sessions')
    workers = models.ManyToManyField(Worker, through='SessionWorker', related_name='work_sessions')
    workstation = models.ForeignKey(Workstation, on_delete=models.CASCADE, related_name='sessions')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='completed')
    start_time = models.DateTimeField()
    end_time = models.DateTimeField(null=True, blank=True)
    performance_percentage = models.FloatField(null=True, blank=True)
    item = models.ForeignKey(Item, on_delete=models.SET_NULL, null=True, blank=True, related_name='sessions')
    quantity_produced = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    quantity_rejected = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'work_sessions'
        ordering = ['-start_time']

    def __str__(self):
        worker_names = ", ".join(w.full_name for w in self.workers.all())
        return f'{worker_names} @ {self.workstation.name} ({self.start_time})'

    def compute_performance(self):
        if not self.quantity_produced or not self.workstation:
            return None

        settings = self.workstation.get_effective_settings()
        target_qty = self.workstation.target_quantity
        target_dur = self.workstation.target_duration

        if not target_qty or not target_dur:
            return None

        quantity_accepted = float(self.quantity_produced) - float(self.quantity_rejected or 0)
        duration = self.duration_hours or 0

        if duration <= 0:
            return None

        expected_qty = (duration / float(target_dur)) * float(target_qty)
        if expected_qty <= 0:
            return None

        return round((quantity_accepted / expected_qty) * 100, 2)

    def save_performance(self):
        self.performance_percentage = self.compute_performance()
        WorkSession.objects.filter(pk=self.pk).update(
            performance_percentage=self.performance_percentage
        )

    @property
    def duration_hours(self):
        if not self.end_time:
            return None
        delta = self.end_time - self.start_time
        return round(delta.total_seconds() / 3600, 2)

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
        total = 0
        for worker in self.workers.all():
            hourly_rate = float(worker.hourly_rate)
            total += (regular_hours * hourly_rate) + (overtime_hours * hourly_rate * multiplier)
        return round(total, 2)


class SessionWorker(models.Model):
    session = models.ForeignKey(WorkSession, on_delete=models.CASCADE, related_name='session_workers')
    worker = models.ForeignKey(Worker, on_delete=models.CASCADE, related_name='worker_sessions')

    class Meta:
        db_table = 'session_workers'
        unique_together = ('session', 'worker')

    def __str__(self):
        return f'{self.worker.full_name} in session {self.session.id}'
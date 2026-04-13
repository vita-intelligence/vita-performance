from django.db import models
from .worker import Worker


class WorkerReputationEvent(models.Model):
    EVENT_TYPES = [
        ('auto_perf_excellent', 'Performance >=125%'),
        ('auto_perf_high', 'Performance 100-124%'),
        ('auto_perf_low', 'Performance 50-74%'),
        ('auto_perf_very_low', 'Performance <50%'),
        ('manual_positive', 'Positive QC feedback'),
        ('manual_negative', 'Negative QC feedback'),
    ]

    AUTO_TYPES = ('auto_perf_excellent', 'auto_perf_high', 'auto_perf_low', 'auto_perf_very_low')
    MANUAL_TYPES = ('manual_positive', 'manual_negative')

    worker = models.ForeignKey(
        Worker,
        on_delete=models.CASCADE,
        related_name='reputation_events',
    )
    session = models.ForeignKey(
        'work_sessions.WorkSession',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reputation_events',
    )
    event_type = models.CharField(max_length=32, choices=EVENT_TYPES)
    score_delta = models.IntegerField()
    reason = models.TextField(blank=True)
    created_by = models.ForeignKey(
        Worker,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='given_feedback',
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'worker_reputation_events'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.worker.full_name} {self.score_delta:+d} ({self.event_type})'

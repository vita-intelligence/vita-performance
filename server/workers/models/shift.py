from django.db import models
from django.db.models import Q
from django.utils import timezone


class WorkerShift(models.Model):
    """A worker's clock-in → clock-out window on the personal kiosk.

    Every station session, QA review, or reputation event the worker
    logs while the shift is `active` gets tagged with `shift_id`, so
    the day-overview page can group activity by shift instead of by
    per-station session. `worker × active` is enforced unique so a
    worker can't accidentally open two shifts at once.
    """

    STATUS_ACTIVE = 'active'
    STATUS_CLOSED = 'closed'
    STATUS_CHOICES = [
        (STATUS_ACTIVE, 'Active'),
        (STATUS_CLOSED, 'Closed'),
    ]

    worker = models.ForeignKey(
        'workers.Worker',
        on_delete=models.CASCADE,
        related_name='shifts',
    )
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='shifts',
    )
    clocked_in_at = models.DateTimeField(default=timezone.now, db_index=True)
    clocked_out_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(
        max_length=16,
        choices=STATUS_CHOICES,
        default=STATUS_ACTIVE,
    )
    # Optional tablet fingerprint (userAgent hash / device UUID) so
    # supervisors can spot when a worker's shift jumps devices mid-day.
    device_id = models.CharField(max_length=64, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'worker_shifts'
        ordering = ['-clocked_in_at']
        constraints = [
            # One open shift per worker at any time — the personal
            # kiosk enforces this before it lets a worker clock in.
            models.UniqueConstraint(
                fields=['worker'],
                condition=Q(status='active'),
                name='one_open_shift_per_worker',
            ),
        ]

    def __str__(self):
        end = self.clocked_out_at.isoformat() if self.clocked_out_at else 'open'
        return f'Shift #{self.pk} {self.worker_id} {self.clocked_in_at.isoformat()}→{end}'

    @property
    def is_active(self):
        return self.status == self.STATUS_ACTIVE

    @property
    def duration_seconds(self):
        end = self.clocked_out_at or timezone.now()
        return int((end - self.clocked_in_at).total_seconds())

    def close(self, notes=None):
        """Stamp clock-out and flip to closed. No-op if already closed."""
        if self.status != self.STATUS_ACTIVE:
            return
        self.status = self.STATUS_CLOSED
        self.clocked_out_at = timezone.now()
        if notes:
            self.notes = (self.notes + '\n' if self.notes else '') + notes.strip()
        self.save(update_fields=['status', 'clocked_out_at', 'notes', 'updated_at'])

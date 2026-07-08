"""Reliable-push outbox for events that need to reach PSP.

Every WorkSession that lands in a state we push (`completed` /
`verified`) writes a row here first, then a synchronous attempt is
made. If the sync attempt fails (network, PSP down, 5xx), the row
stays in the outbox and a periodic sweep retries with exponential
backoff.

Kept as one model — no separate "session_pushes" / "reputation_pushes"
tables — because every payload we send is derived from a session
event; the `kind` column discriminates.
"""
from __future__ import annotations

from django.db import models


class PspOutboxEntry(models.Model):
    """Pending outbound event to PSP.

    States:

      * ``pending``    — enqueued, no attempt made yet.
      * ``in_flight``  — currently being pushed (a worker set this
                          just before the HTTP call).
      * ``delivered``  — successfully accepted by PSP. Row kept for
                          audit; a cleanup task can archive older
                          than N days.
      * ``failed``     — exhausted max_attempts. Requires operator
                          triage.
    """

    KIND_MO_SESSION = 'mo_session'
    KIND_WS_SESSION = 'workstation_session'
    KIND_REPUTATION = 'reputation_event'

    KIND_CHOICES = [
        (KIND_MO_SESSION, 'MO session'),
        (KIND_WS_SESSION, 'Workstation session (off-MO)'),
        (KIND_REPUTATION, 'Reputation event'),
    ]

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('in_flight', 'In flight'),
        ('delivered', 'Delivered'),
        ('failed', 'Failed'),
    ]

    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='psp_outbox_entries',
    )

    # Kind + payload are what actually goes to PSP.
    kind = models.CharField(max_length=32, choices=KIND_CHOICES, db_index=True)
    endpoint_path = models.CharField(
        max_length=500,
        help_text='Path segment under /api/integration, e.g. /workstations/<uuid>/sessions',
    )
    payload = models.JSONField(default=dict)

    # Correlation back to the vita-performance row that produced the
    # event. Kept nullable so cleanup doesn't require FK gymnastics.
    session = models.ForeignKey(
        'work_sessions.WorkSession',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='psp_outbox_entries',
    )

    # Idempotency key echoed back to PSP as `external_id`. The PSP
    # side's UNIQUE (company_id, external_id) index protects us from
    # duplicates on retry.
    external_id = models.CharField(max_length=64, db_index=True)

    status = models.CharField(
        max_length=16,
        choices=STATUS_CHOICES,
        default='pending',
        db_index=True,
    )
    attempts = models.PositiveIntegerField(default=0)
    max_attempts = models.PositiveIntegerField(default=8)

    next_retry_at = models.DateTimeField(null=True, blank=True, db_index=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    last_error = models.TextField(blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'psp_outbox'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'next_retry_at']),
        ]

    def __str__(self):
        return f'{self.kind}[{self.status}] session={self.session_id} attempts={self.attempts}'

    # Backoff schedule for the periodic sweep. Doubles until 1h then
    # holds. 0s (immediate), 30s, 1m, 2m, 5m, 10m, 30m, 1h.
    BACKOFF_SECONDS = [0, 30, 60, 120, 300, 600, 1800, 3600]

    def compute_next_retry_delay_seconds(self) -> int:
        idx = min(self.attempts, len(self.BACKOFF_SECONDS) - 1)
        return self.BACKOFF_SECONDS[idx]

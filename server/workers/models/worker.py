from django.db import models
from django.conf import settings
from django.utils import timezone
from .group import WorkerGroup
from django.contrib.auth.hashers import make_password, check_password


REPUTATION_BASE = 650
REPUTATION_MIN = 300
REPUTATION_MAX = 850
REPUTATION_DECAY_DAYS = 180


def reputation_tier(score):
    if score >= 800:
        return 'excellent'
    if score >= 740:
        return 'very_good'
    if score >= 670:
        return 'good'
    if score >= 580:
        return 'fair'
    return 'poor'


class Worker(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='workers')
    group = models.ForeignKey(WorkerGroup, on_delete=models.SET_NULL, null=True, blank=True, related_name='workers')
    full_name = models.CharField(max_length=200)
    pin = models.CharField(max_length=128, null=True, blank=True)
    hourly_rate = models.DecimalField(max_digits=10, decimal_places=2)
    is_active = models.BooleanField(default=True)
    is_qa = models.BooleanField(default=False)
    reputation_score = models.IntegerField(default=REPUTATION_BASE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'workers'
        ordering = ['-created_at']

    def __str__(self):
        return self.full_name

    def set_pin(self, raw_pin):
        self.pin = make_password(raw_pin)

    def check_pin(self, raw_pin):
        if not self.pin:
            return False
        return check_password(raw_pin, self.pin)

    @property
    def has_pin(self):
        return bool(self.pin)

    @property
    def reputation_tier(self):
        return reputation_tier(self.reputation_score)

    def recompute_reputation_score(self):
        """Recalculate reputation_score from all events with linear time decay."""
        now = timezone.now()
        score = float(REPUTATION_BASE)
        for event in self.reputation_events.all():
            days = (now - event.created_at).total_seconds() / 86400.0
            weight = max(0.0, 1.0 - days / REPUTATION_DECAY_DAYS)
            score += event.score_delta * weight
        clamped = max(REPUTATION_MIN, min(REPUTATION_MAX, round(score)))
        self.reputation_score = clamped
        # Skip signals — direct UPDATE.
        Worker.objects.filter(pk=self.pk).update(reputation_score=clamped)
        return clamped

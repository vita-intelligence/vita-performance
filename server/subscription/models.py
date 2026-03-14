from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from .plans import get_limit, has_feature


class Subscription(models.Model):
    STATUS_TRIALING = 'trialing'
    STATUS_ACTIVE = 'active'
    STATUS_PAST_DUE = 'past_due'
    STATUS_EXPIRED = 'expired'
    STATUS_CANCELED = 'canceled'

    STATUS_CHOICES = [
        (STATUS_TRIALING, 'Trialing'),
        (STATUS_ACTIVE, 'Active'),
        (STATUS_PAST_DUE, 'Past Due'),
        (STATUS_EXPIRED, 'Expired'),
        (STATUS_CANCELED, 'Canceled'),
    ]

    PLAN_TRIAL = 'trial'
    PLAN_STARTER = 'starter'
    PLAN_GROWTH = 'growth'
    PLAN_PRO = 'pro'
    PLAN_ENTERPRISE = 'enterprise'

    PLAN_CHOICES = [
        (PLAN_TRIAL, 'Trial'),
        (PLAN_STARTER, 'Starter'),
        (PLAN_GROWTH, 'Growth'),
        (PLAN_PRO, 'Pro'),
        (PLAN_ENTERPRISE, 'Enterprise'),
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='subscription'
    )

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_TRIALING)
    plan = models.CharField(max_length=20, choices=PLAN_CHOICES, default=PLAN_TRIAL)

    # Trial
    trial_ends_at = models.DateTimeField()

    # Billing period
    current_period_starts_at = models.DateTimeField(null=True, blank=True)
    current_period_ends_at = models.DateTimeField(null=True, blank=True)

    # Grace period after missed payment
    grace_period_ends_at = models.DateTimeField(null=True, blank=True)

    # Stripe — ready for later integration
    stripe_customer_id = models.CharField(max_length=255, null=True, blank=True)
    stripe_subscription_id = models.CharField(max_length=255, null=True, blank=True)
    stripe_price_id = models.CharField(max_length=255, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'subscriptions'

    def __str__(self):
        return f"{self.user} — {self.status}"

    @property
    def is_trialing(self):
        return self.status == self.STATUS_TRIALING and timezone.now() < self.trial_ends_at

    @property
    def is_active(self):
        return self.status == self.STATUS_ACTIVE and self.current_period_ends_at and timezone.now() < self.current_period_ends_at

    @property
    def is_past_due(self):
        return self.status == self.STATUS_PAST_DUE and self.grace_period_ends_at and timezone.now() < self.grace_period_ends_at

    @property
    def is_expired(self):
        if self.status == self.STATUS_EXPIRED:
            return True
        if self.status == self.STATUS_TRIALING and timezone.now() >= self.trial_ends_at:
            return True
        if self.status == self.STATUS_PAST_DUE and self.grace_period_ends_at and timezone.now() >= self.grace_period_ends_at:
            return True
        return False

    @property
    def has_access(self):
        return self.is_trialing or self.is_active or self.is_past_due

    @property
    def days_remaining(self):
        if self.is_trialing:
            return max(0, (self.trial_ends_at - timezone.now()).days)
        if self.is_active:
            return max(0, (self.current_period_ends_at - timezone.now()).days)
        if self.is_past_due:
            return max(0, (self.grace_period_ends_at - timezone.now()).days)
        return 0
    
    @property
    def worker_limit(self):
        return get_limit(self.plan, 'workers')

    @property
    def workstation_limit(self):
        return get_limit(self.plan, 'workstations')

    @property
    def session_history_days(self):
        return get_limit(self.plan, 'session_history_days')

    @property
    def has_kiosk(self):
        return has_feature(self.plan, 'kiosk')

    @property
    def has_qc(self):
        return has_feature(self.plan, 'qc')

    @property
    def has_realtime(self):
        return has_feature(self.plan, 'realtime')

    @classmethod
    def create_for_user(cls, user):
        return cls.objects.create(
            user=user,
            status=cls.STATUS_TRIALING,
            plan=cls.PLAN_TRIAL,
            trial_ends_at=timezone.now() + timedelta(days=30),
        )
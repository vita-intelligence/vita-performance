from rest_framework import serializers
from .models import Subscription


class SubscriptionSerializer(serializers.ModelSerializer):
    has_access = serializers.ReadOnlyField()
    is_trialing = serializers.ReadOnlyField()
    is_active = serializers.ReadOnlyField()
    is_past_due = serializers.ReadOnlyField()
    is_expired = serializers.ReadOnlyField()
    days_remaining = serializers.ReadOnlyField()

    class Meta:
        model = Subscription
        fields = (
            'status',
            'has_access',
            'is_trialing',
            'is_active',
            'is_past_due',
            'is_expired',
            'days_remaining',
            'trial_ends_at',
            'current_period_ends_at',
            'grace_period_ends_at',
            'stripe_customer_id',
            'stripe_subscription_id',
        )
        read_only_fields = fields
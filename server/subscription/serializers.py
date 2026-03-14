from rest_framework import serializers
from .models import Subscription
from .plans import PLANS


class SubscriptionSerializer(serializers.ModelSerializer):
    has_access = serializers.ReadOnlyField()
    is_trialing = serializers.ReadOnlyField()
    is_active = serializers.ReadOnlyField()
    is_past_due = serializers.ReadOnlyField()
    is_expired = serializers.ReadOnlyField()
    days_remaining = serializers.ReadOnlyField()
    has_kiosk = serializers.ReadOnlyField()
    has_qc = serializers.ReadOnlyField()
    has_realtime = serializers.ReadOnlyField()
    worker_limit = serializers.ReadOnlyField()
    workstation_limit = serializers.ReadOnlyField()
    session_history_days = serializers.ReadOnlyField()
    plan_details = serializers.SerializerMethodField()

    class Meta:
        model = Subscription
        fields = (
            'status',
            'plan',
            'plan_details',
            'has_access',
            'is_trialing',
            'is_active',
            'is_past_due',
            'is_expired',
            'days_remaining',
            'has_kiosk',
            'has_qc',
            'has_realtime',
            'worker_limit',
            'workstation_limit',
            'session_history_days',
            'trial_ends_at',
            'current_period_ends_at',
            'grace_period_ends_at',
            'stripe_customer_id',
            'stripe_subscription_id',
        )
        read_only_fields = fields

    def get_plan_details(self, obj):
        plan = PLANS.get(obj.plan, {})
        return {
            'name': plan.get('name', ''),
            'price_gbp': plan.get('price_gbp'),
        }
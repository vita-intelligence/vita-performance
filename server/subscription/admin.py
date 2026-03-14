from django.contrib import admin
from .models import Subscription


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ('user', 'status', 'trial_ends_at', 'current_period_ends_at', 'grace_period_ends_at', 'created_at')
    list_filter = ('status',)
    search_fields = ('user__email',)
    list_editable = ('status',)
    readonly_fields = ('created_at', 'updated_at', 'stripe_customer_id', 'stripe_subscription_id')
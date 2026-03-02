from rest_framework import serializers
from ..models import UserSettings


class UserSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserSettings
        fields = (
            'id', 'currency', 'currency_symbol', 'date_format', 'time_format',
            'timezone', 'language', 'decimal_separator', 'thousands_separator',
            'working_hours_per_day', 'working_days_per_week', 'overtime_threshold',
            'overtime_multiplier', 'week_starts_on', 'work_start_time'
        )
        read_only_fields = ('id',)
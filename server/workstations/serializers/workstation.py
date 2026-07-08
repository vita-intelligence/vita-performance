from rest_framework import serializers
from ..models import Workstation


class WorkstationSerializer(serializers.ModelSerializer):
    effective_settings = serializers.SerializerMethodField()

    class Meta:
        model = Workstation
        fields = (
            'id', 'name', 'description', 'is_active', 'is_general', 'created_at', 'updated_at',
            'target_quantity', 'target_duration', 'uom', 'performance_formula',
            'working_hours_per_day', 'overtime_threshold', 'overtime_multiplier',
            'week_starts_on', 'effective_settings', 'kiosk_token',
            # PSP integration signal — the FE badges each row so the
            # operator knows what's tenant-managed vs mirrored.
            'external_id', 'psp_source_of_truth',
        )
        read_only_fields = (
            'id', 'created_at', 'updated_at', 'effective_settings',
            'kiosk_token', 'external_id', 'psp_source_of_truth',
        )

    def get_effective_settings(self, obj):
        return obj.get_effective_settings()
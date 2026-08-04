from rest_framework import serializers

from ..models import WorkerShift


class WorkerShiftSerializer(serializers.ModelSerializer):
    """Serialised view of a shift. `duration_seconds` is live (ticks
    up on GETs while the shift is open), so the personal kiosk header
    can show an accurate "on shift for 2h 14m" chip without a client
    clock."""

    worker_name = serializers.CharField(source='worker.full_name', read_only=True)
    duration_seconds = serializers.IntegerField(read_only=True)
    is_active = serializers.BooleanField(read_only=True)

    class Meta:
        model = WorkerShift
        fields = [
            'id',
            'worker',
            'worker_name',
            'company',
            'status',
            'clocked_in_at',
            'clocked_out_at',
            'duration_seconds',
            'is_active',
            'device_id',
            'notes',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'company',
            'status',
            'clocked_in_at',
            'clocked_out_at',
            'created_at',
            'updated_at',
        ]

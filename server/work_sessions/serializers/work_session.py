from rest_framework import serializers
from ..models import WorkSession


class WorkSessionSerializer(serializers.ModelSerializer):
    duration_hours = serializers.ReadOnlyField()
    performance_percentage = serializers.ReadOnlyField()
    overtime_hours = serializers.ReadOnlyField()
    wage_cost = serializers.ReadOnlyField()
    worker_name = serializers.SerializerMethodField()
    workstation_name = serializers.SerializerMethodField()

    class Meta:
        model = WorkSession
        fields = (
            'id', 'workstation', 'workstation_name', 'worker', 'worker_name',
            'status', 'start_time', 'end_time', 'quantity_produced', 'notes',
            'duration_hours', 'performance_percentage', 'overtime_hours', 'wage_cost',
            'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'created_at', 'updated_at')

    def get_worker_name(self, obj):
        return obj.worker.full_name

    def get_workstation_name(self, obj):
        return obj.workstation.name
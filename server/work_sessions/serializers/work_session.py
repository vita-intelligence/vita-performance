from rest_framework import serializers
from ..models import WorkSession
from workers.serializers import WorkerSerializer
from workers.models import Worker


class WorkSessionSerializer(serializers.ModelSerializer):
    duration_hours = serializers.ReadOnlyField()
    overtime_hours = serializers.ReadOnlyField()
    wage_cost = serializers.ReadOnlyField()
    item_name = serializers.CharField(source='item.name', read_only=True, allow_null=True)

    workers = WorkerSerializer(many=True, read_only=True)

    worker_ids = serializers.PrimaryKeyRelatedField(
        queryset=Worker.objects.all(),
        many=True,
        write_only=True,
    )

    workstation_name = serializers.CharField(source='workstation.name', read_only=True)

    class Meta:
        model = WorkSession
        fields = (
            'id',
            'workstation',
            'workstation_name',
            'workers',
            'worker_ids',
            'status',
            'start_time',
            'end_time',
            'quantity_produced',
            'notes',
            'item',
            'item_name',
            'duration_hours',
            'performance_percentage',
            'overtime_hours',
            'wage_cost',
            'created_at',
            'updated_at'
        )
        read_only_fields = ('id', 'created_at', 'updated_at')

    def create(self, validated_data):
        worker_ids = validated_data.pop('worker_ids', [])
        session = WorkSession.objects.create(**validated_data)
        session.workers.set(worker_ids)
        session.save_performance()
        return WorkSession.objects.prefetch_related('workers').get(pk=session.pk)

    def update(self, instance, validated_data):
        worker_ids = validated_data.pop('worker_ids', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if worker_ids is not None:
            instance.workers.set(worker_ids)
        instance.save_performance()
        return WorkSession.objects.prefetch_related('workers').get(pk=instance.pk)
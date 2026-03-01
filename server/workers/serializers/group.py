from rest_framework import serializers
from ..models import WorkerGroup


class WorkerGroupSerializer(serializers.ModelSerializer):
    workers_count = serializers.SerializerMethodField()

    class Meta:
        model = WorkerGroup
        fields = ('id', 'name', 'description', 'workers_count', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_at', 'updated_at', 'workers_count')

    def get_workers_count(self, obj):
        return obj.workers.count()
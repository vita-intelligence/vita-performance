from rest_framework import serializers
from ..models import Worker


class WorkerSerializer(serializers.ModelSerializer):
    group_name = serializers.SerializerMethodField()

    class Meta:
        model = Worker
        fields = ('id', 'full_name', 'hourly_rate', 'is_active', 'group', 'group_name', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_at', 'updated_at', 'group_name')

    def get_group_name(self, obj):
        return obj.group.name if obj.group else None
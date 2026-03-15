from rest_framework import serializers
from ..models import DynamicForm


class DynamicFormSerializer(serializers.ModelSerializer):
    workstation_name = serializers.CharField(source='workstation.name', read_only=True, allow_null=True)

    class Meta:
        model = DynamicForm
        fields = (
            'id', 'name', 'trigger', 'schema', 'is_active',
            'workstation', 'workstation_name',
            'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at', 'workstation_name')
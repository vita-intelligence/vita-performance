from rest_framework import serializers
from ..models import Worker


class WorkerSerializer(serializers.ModelSerializer):
    group_name = serializers.SerializerMethodField()
    pin = serializers.CharField(write_only=True, required=False, allow_null=True, allow_blank=True)

    class Meta:
        model = Worker
        fields = ('id', 'full_name', 'hourly_rate', 'is_active', 'group', 'group_name', 'has_pin', 'created_at', 'updated_at', 'pin')
        read_only_fields = ('id', 'created_at', 'updated_at', 'group_name', 'has_pin')

    def get_group_name(self, obj):
        return obj.group.name if obj.group else None

    def update(self, instance, validated_data):
        pin = validated_data.pop('pin', None)
        if pin:
            instance.set_pin(pin)
        return super().update(instance, validated_data)

    def create(self, validated_data):
        pin = validated_data.pop('pin', None)
        instance = super().create(validated_data)
        if pin:
            instance.set_pin(pin)
            instance.save()
        return instance
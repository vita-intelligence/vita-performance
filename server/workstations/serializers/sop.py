from rest_framework import serializers
from ..models import SOP


class SOPSerializer(serializers.ModelSerializer):
    class Meta:
        model = SOP
        fields = ('id', 'content', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_at', 'updated_at')
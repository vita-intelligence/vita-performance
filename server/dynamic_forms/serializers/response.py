from rest_framework import serializers
from ..models import FormResponse


class FormResponseSerializer(serializers.ModelSerializer):
    form_name = serializers.CharField(source='form.name', read_only=True)

    class Meta:
        model = FormResponse
        fields = ('id', 'session', 'form', 'form_name', 'answers', 'submitted_at')
        read_only_fields = ('id', 'submitted_at', 'form_name')
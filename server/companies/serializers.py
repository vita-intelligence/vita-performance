from django.core.cache import cache
from django.db.models import Count
from rest_framework import serializers

from psp_sync.models import PspOutboxEntry

from .models import Company


class CompanyIntegrationSerializer(serializers.ModelSerializer):
    """PSP integration config on the Company row.

    Read side never returns the raw bearer — only a masked preview so
    an operator can eyeball "yes that's the token I pasted" without
    exposing it. Write side accepts a full token or empty string to
    clear.
    """

    psp_integration_token_masked = serializers.SerializerMethodField(read_only=True)
    psp_integration_token = serializers.CharField(
        write_only=True,
        allow_blank=True,
        allow_null=True,
        required=False,
        max_length=100,
    )
    last_pull_at = serializers.SerializerMethodField(read_only=True)
    outbox = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Company
        fields = (
            "id",
            "name",
            "psp_base_url",
            "psp_integration_token",
            "psp_integration_token_masked",
            "last_pull_at",
            "outbox",
        )
        read_only_fields = ("id", "name", "last_pull_at", "outbox")

    def get_psp_integration_token_masked(self, obj):
        token = obj.psp_integration_token
        if not token:
            return None
        if len(token) <= 12:
            return "•" * len(token)
        return f"{token[:8]}…{token[-4:]}"

    def get_last_pull_at(self, obj):
        return cache.get(f"psp:last_pull:{obj.id}")

    def get_outbox(self, obj):
        counts = {
            row["status"]: row["n"]
            for row in (
                PspOutboxEntry.objects
                .filter(company=obj)
                .values("status")
                .annotate(n=Count("id"))
            )
        }
        return {
            "pending": counts.get("pending", 0) + counts.get("in_flight", 0),
            "delivered": counts.get("delivered", 0),
            "failed": counts.get("failed", 0),
        }

    def update(self, instance, validated_data):
        # Empty string on the token clears it — DRF treats "" as valid
        # for a nullable CharField, so translate to None on the way in.
        if validated_data.get("psp_integration_token") == "":
            validated_data["psp_integration_token"] = None
        return super().update(instance, validated_data)

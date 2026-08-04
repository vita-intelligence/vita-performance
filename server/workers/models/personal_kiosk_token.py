import uuid
from django.conf import settings
from django.db import models


class PersonalKioskToken(models.Model):
    """Per-tenant token that pairs a personal-kiosk tablet to a
    company without requiring an admin login on the device.

    Mirrors `QCToken` shape exactly:
      * OneToOne with the tenant user (each tenant has at most one).
      * UUIDv4 stored in `token`, exposed via the public URL
        `/kiosk/personal/<token>`.
      * Admin generates / regenerates through the settings UI. Losing
        the tablet means regenerating the token to invalidate the
        stolen device.
    """

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='personal_kiosk_token',
    )
    token = models.UUIDField(
        default=uuid.uuid4,
        unique=True,
        db_index=True,
        editable=False,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'personal_kiosk_tokens'

    def __str__(self):
        return f'PersonalKioskToken for {self.user}'

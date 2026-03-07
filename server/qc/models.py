import uuid
from django.db import models
from django.conf import settings


class QCToken(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='qc_token')
    token = models.UUIDField(default=uuid.uuid4, unique=True, db_index=True, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'qc_tokens'

    def __str__(self):
        return f"QCToken for {self.user}"
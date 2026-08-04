import uuid
from datetime import timedelta
from django.db import models
from django.utils import timezone

from .personal_kiosk_token import PersonalKioskToken
from .worker import Worker


DEFAULT_SESSION_TTL_HOURS = 24


class PersonalKioskAuthSession(models.Model):
    """Server-issued session for a worker on a paired personal-kiosk tablet.

    Issued by POST /verify-pin/ after a successful PIN check. Persists
    a signed-in worker across page refreshes so operators aren't asked
    for their PIN every time the browser reloads.

    Life cycle:
      * Created with `expires_at = now + 24h` on verify-pin success.
      * `POST /sessions/<token>/logout/` sets `revoked_at` (soft-delete)
        so the same session token can't be replayed.
      * `GET /sessions/<token>/` rehydrates the worker on FE mount.
      * Presented as `session_token` on `POST /shifts/start/` to
        prove authentication without re-sending the PIN.

    We deliberately scope the session to a specific
    `personal_kiosk_token` — regenerating the tablet's URL token also
    invalidates every child session, matching the "lost tablet" story."""

    token = models.UUIDField(
        default=uuid.uuid4,
        unique=True,
        db_index=True,
        editable=False,
    )
    kiosk_token = models.ForeignKey(
        PersonalKioskToken,
        on_delete=models.CASCADE,
        related_name='auth_sessions',
    )
    worker = models.ForeignKey(
        Worker,
        on_delete=models.CASCADE,
        related_name='personal_kiosk_sessions',
    )
    device_id = models.CharField(max_length=64, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    revoked_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'personal_kiosk_auth_sessions'
        indexes = [
            models.Index(fields=['worker', 'revoked_at']),
            models.Index(fields=['expires_at']),
        ]

    def __str__(self):
        return f'AuthSession {self.token} worker={self.worker_id}'

    # ---------- helpers ----------

    @property
    def is_active(self) -> bool:
        if self.revoked_at is not None:
            return False
        return self.expires_at > timezone.now()

    def revoke(self):
        if self.revoked_at is None:
            self.revoked_at = timezone.now()
            self.save(update_fields=['revoked_at'])

    @classmethod
    def issue(cls, *, kiosk_token: PersonalKioskToken, worker: Worker,
              device_id: str = '', ttl_hours: int = DEFAULT_SESSION_TTL_HOURS):
        """Mint a fresh session. Revokes any prior active sessions for
        the same (worker × kiosk × device) triple so a re-login on the
        same tablet cleanly supersedes the old cookie."""
        now = timezone.now()
        cls.objects.filter(
            kiosk_token=kiosk_token,
            worker=worker,
            device_id=device_id,
            revoked_at__isnull=True,
        ).update(revoked_at=now)
        return cls.objects.create(
            kiosk_token=kiosk_token,
            worker=worker,
            device_id=device_id or '',
            expires_at=now + timedelta(hours=ttl_hours),
        )

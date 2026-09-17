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


class QCNote(models.Model):
    """Free-form inspection note captured by a QC operator against an
    in-progress MO on the Live-QC personal-kiosk page.

    Immutable — no edit / delete once written. QC can write many notes
    per MO across a run; each row is one save. The MO is referenced by
    PSP UUID (vita-perf never mirrors the MO row locally beyond the
    per-session `work_sessions.mo_uuid` handle) so the note travels
    across PSP MO revisions.

    A fire-and-forget PSP push mirrors the note onto PSP's MO audit
    log via ``mo:write:qc_note``; the local row is the source of
    truth so a PSP outage never blocks capture.
    """
    uuid = models.UUIDField(default=uuid.uuid4, unique=True, db_index=True, editable=False)
    # PSP MO UUID (string form). Not a FK because vita-perf doesn't
    # keep an ``mos`` table — the ``work_sessions.mo_uuid`` handle is
    # the only pointer to a PSP MO in this database.
    mo_uuid = models.CharField(max_length=64, db_index=True)
    # Optional step within the MO the note applies to. Blank / null =
    # the whole MO.
    mo_step_uuid = models.CharField(max_length=64, blank=True, null=True)
    author_worker = models.ForeignKey(
        'workers.Worker',
        on_delete=models.PROTECT,
        related_name='qc_notes_authored',
    )
    # Snapshot the workstation the operator was standing at when they
    # captured the note. Nullable — the FK protects a still-live
    # workstation (rows never delete a station) but a legacy note
    # written before this column landed may not have one.
    workstation = models.ForeignKey(
        'workstations.Workstation',
        on_delete=models.PROTECT,
        related_name='qc_notes',
        blank=True,
        null=True,
    )
    note_text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'qc_notes'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['mo_uuid', '-created_at'], name='qc_notes_mo_idx'),
        ]

    def __str__(self):
        return f"QCNote {self.uuid} on MO {self.mo_uuid[:8]}"
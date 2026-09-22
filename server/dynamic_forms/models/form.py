from django.db import models
from django.conf import settings
from workstations.models import Workstation


class DynamicForm(models.Model):
    TRIGGER_START = 'start'
    TRIGGER_END = 'end'
    TRIGGER_BOTH = 'both'
    # Cleaning + maintenance triggers are two-phase. `_start` fires
    # BEFORE the kiosk timer opens (pre-session PPE / setup); `_end`
    # fires AFTER Stop (post-session verification). Legacy names
    # `cleaning` / `maintenance` / `equipment_cleaning` /
    # `equipment_maintenance` were renamed to `_end` by migration
    # 0007 — their old form-fill semantic was always end-of-session.
    TRIGGER_CLEANING_START = 'cleaning_start'
    TRIGGER_CLEANING_END = 'cleaning_end'
    TRIGGER_MAINTENANCE_START = 'maintenance_start'
    TRIGGER_MAINTENANCE_END = 'maintenance_end'
    TRIGGER_EQUIPMENT_CLEANING_START = 'equipment_cleaning_start'
    TRIGGER_EQUIPMENT_CLEANING_END = 'equipment_cleaning_end'
    TRIGGER_EQUIPMENT_MAINTENANCE_START = 'equipment_maintenance_start'
    TRIGGER_EQUIPMENT_MAINTENANCE_END = 'equipment_maintenance_end'

    TRIGGER_CHOICES = [
        (TRIGGER_START, 'Session Start'),
        (TRIGGER_END, 'Session End'),
        (TRIGGER_BOTH, 'Both'),
        (TRIGGER_CLEANING_START, 'Cleaning · start'),
        (TRIGGER_CLEANING_END, 'Cleaning · end'),
        (TRIGGER_MAINTENANCE_START, 'Maintenance · start'),
        (TRIGGER_MAINTENANCE_END, 'Maintenance · end'),
        (TRIGGER_EQUIPMENT_CLEANING_START, 'Equipment cleaning · start'),
        (TRIGGER_EQUIPMENT_CLEANING_END, 'Equipment cleaning · end'),
        (TRIGGER_EQUIPMENT_MAINTENANCE_START, 'Equipment maintenance · start'),
        (TRIGGER_EQUIPMENT_MAINTENANCE_END, 'Equipment maintenance · end'),
    ]

    SOURCE_LEGACY = 'legacy'
    SOURCE_PSP = 'psp'

    SOURCE_CHOICES = [
        (SOURCE_LEGACY, 'Vita-perf legacy'),
        (SOURCE_PSP, 'PSP mirror'),
    ]

    # Nullable because PSP-published rows have no vita-perf user.
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='dynamic_forms',
        null=True,
        blank=True,
    )
    workstation = models.ForeignKey(
        Workstation,
        on_delete=models.CASCADE,
        related_name='dynamic_forms',
        null=True,
        blank=True,
    )
    name = models.CharField(max_length=200)
    trigger = models.CharField(max_length=32, choices=TRIGGER_CHOICES, default=TRIGGER_START)
    schema = models.JSONField(default=dict)
    is_active = models.BooleanField(default=True)

    # PSP-mirror columns. Populated when `source = 'psp'`; NULL for
    # locally-authored legacy rows. `psp_uuid` is the idempotency key
    # the publish endpoint upserts on; `psp_version` is a monotonic
    # counter that drops late writes when a newer one already landed.
    # Same template can appear on multiple workstations — uniqueness
    # lives on `unique_together = ('psp_uuid', 'workstation')` in Meta.
    psp_uuid = models.UUIDField(null=True, blank=True, db_index=True)
    psp_version = models.IntegerField(null=True, blank=True)
    # When set, this DynamicForm is equipment-scoped — it fires only
    # when a cleaning / maintenance session on ``workstation`` also
    # targets this specific equipment. NULL = workstation-scoped
    # (the legacy behaviour). Indexed because the kiosk queries by
    # ``(workstation, equipment_uuid, trigger)`` on every session
    # start where an equipment is picked.
    equipment_uuid = models.UUIDField(null=True, blank=True, db_index=True)
    # Kiosk walks forms in this order per slot. Sent by the PSP
    # publisher from the workstation_form_assignment.sort_order.
    sort_order = models.IntegerField(default=0)
    source = models.CharField(
        max_length=10,
        choices=SOURCE_CHOICES,
        default=SOURCE_LEGACY,
    )

    # Optional audience allowlist mirrored from PSP. Empty list = every
    # worker on the assigned workstation gets the form. Non-empty = only
    # workers whose ``uuid`` appears here (kiosk audience-gates when
    # injecting the form).
    worker_uuids = models.JSONField(default=list, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'dynamic_forms'
        ordering = ['-created_at']
        # One mirror row per (template × workstation × equipment).
        # Postgres treats `(NULL, anything)` as distinct so a single
        # equipment-scoped template attached to two different
        # machines on the same workstation produces two distinct
        # rows (one per equipment_uuid). Legacy rows with
        # psp_uuid=NULL still coexist freely.
        unique_together = [('psp_uuid', 'workstation', 'equipment_uuid')]

    def __str__(self):
        return f"{self.name} ({self.trigger})"

"""Local mirror of the PSP equipment roster attached to a workstation.

vita-perf is not the source of truth for equipment — PSP is. But the
kiosk needs to render "which machines are on this workstation" so
an operator can scope a cleaning / maintenance session to a specific
piece (e.g. "I'm cleaning the V-blender, not the whole cell"). Instead
of round-tripping to PSP every time the kiosk opens, we mirror the
minimal shape here and PSP re-publishes on every equipment insert /
update / detach.

Shape kept tight: uuid + display name + serial + category name.
Everything else (cost, cadence, lifecycle) stays on PSP. The audit
truth for a machine also lives on PSP (``equipment_events``); this
row is just a rendering aid for the kiosk.
"""

from django.db import models
from .workstation import Workstation


class WorkstationEquipment(models.Model):
    workstation = models.ForeignKey(
        Workstation,
        on_delete=models.CASCADE,
        related_name='equipment_units',
    )
    equipment_uuid = models.CharField(
        max_length=64,
        db_index=True,
        help_text='PSP equipment uuid — cross-service identifier.',
    )
    name = models.CharField(
        max_length=200,
        help_text=(
            'Display label the kiosk shows on the equipment picker. '
            'Denormalised (from item name / manufacturer / model on '
            "PSP) so archiving the source doesn't blank the row."
        ),
    )
    serial_number = models.CharField(max_length=120, blank=True, default='')
    category_name = models.CharField(max_length=120, blank=True, default='')
    is_active = models.BooleanField(default=True)

    # Sync provenance — every publish carries the PSP ``updated_at``
    # so drift can be spotted from the kiosk-config page.
    psp_updated_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'workstation_equipment'
        ordering = ['workstation_id', 'name']
        # One mirror row per (workstation × equipment). PSP is the
        # source of truth for the attachment relationship — vp just
        # reflects the current snapshot.
        unique_together = [('workstation', 'equipment_uuid')]

    def __str__(self):
        return f'{self.workstation_id} · {self.name}'

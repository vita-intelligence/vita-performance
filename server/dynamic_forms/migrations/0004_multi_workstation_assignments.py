"""Support multiple form attachments per workstation.

PSP now models workstation ↔ form as many-to-many (see PSP migration
`20260916170000_workstation_form_assignments`). The publisher POSTs
one row per (template × workstation) attachment, so a single PSP
template can produce multiple `DynamicForm` mirror rows.

Changes:

* Drop the plain `unique=True` on `psp_uuid` — the same template
  can now legitimately appear on multiple workstations, each as its
  own mirror row.
* Add `sort_order` (integer, default 0). Publisher sends the
  assignment's sort_order; kiosk walks forms per slot in this order.
* Add `unique_together = [('psp_uuid', 'workstation')]` — one mirror
  row per (template × workstation). Postgres treats `(NULL, x)` as
  distinct, so legacy `source='legacy'` rows (psp_uuid=NULL) coexist
  freely.
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('dynamic_forms', '0003_worker_uuids_allowlist'),
    ]

    operations = [
        migrations.AlterField(
            model_name='dynamicform',
            name='psp_uuid',
            field=models.UUIDField(null=True, blank=True, db_index=True),
        ),
        migrations.AddField(
            model_name='dynamicform',
            name='sort_order',
            field=models.IntegerField(default=0),
        ),
        migrations.AlterUniqueTogether(
            name='dynamicform',
            unique_together={('psp_uuid', 'workstation')},
        ),
    ]

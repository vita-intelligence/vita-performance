"""Worker allowlist mirror.

PSP-side FormBuilder lets an author narrow a form's audience to a
subset of workers. The uuid strings map back to vita-perf's Worker
model via `Worker.uuid`. Empty array = every worker on the assigned
workstation gets the form (existing behaviour). Non-empty = the
kiosk audience-gates injection on the current worker's uuid.

Stored as a JSONField rather than an M2M to keep the write shape
symmetric with PSP's `form_templates.worker_uuids` (`text[]`) — the
publish view stores the array verbatim.
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('dynamic_forms', '0002_psp_mirror_columns'),
    ]

    operations = [
        migrations.AddField(
            model_name='dynamicform',
            name='worker_uuids',
            field=models.JSONField(default=list, blank=True),
        ),
    ]

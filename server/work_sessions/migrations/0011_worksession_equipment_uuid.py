"""Add ``equipment_uuid`` to :class:`WorkSession`.

Cleaning + maintenance sessions can now target either the parent
workstation OR a specific piece of equipment attached to it (audit
requirement — cleaning a work-cell is not the same as CIP'ing a
machine on it, and BRCGS / FSSC 22000 auditors ask about each level
independently).

The column is nullable (workstation-scoped sessions leave it blank)
and indexed so the "what happened to this machine" query on the PSP
audit-log side can filter cheaply.
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('work_sessions', '0010_worksession_override_setup_seconds'),
    ]

    operations = [
        migrations.AddField(
            model_name='worksession',
            name='equipment_uuid',
            field=models.CharField(
                max_length=64,
                null=True,
                blank=True,
                db_index=True,
                help_text=(
                    'PSP equipment uuid when a cleaning / maintenance '
                    'session targeted a specific machine attached to this '
                    'workstation (as opposed to the workstation itself). '
                    'Null means the session was workstation-scoped.'
                ),
            ),
        ),
    ]

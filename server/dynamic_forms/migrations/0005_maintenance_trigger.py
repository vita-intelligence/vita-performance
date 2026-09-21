"""Add the ``maintenance`` trigger to :class:`DynamicForm`.

Kiosk now supports a maintenance-session flow — mirrors the existing
cleaning flow but tagged with ``activity_kind='maintenance'`` on
:class:`WorkSession` and publishes to a distinct audit table on PSP
(``workstation_events`` / ``equipment_events`` with a
``maintenance_completed`` kind). Adding a new trigger enum value
lets PSP publish maintenance-triggered form templates through the
same ``/api/dynamic-forms/publish/`` endpoint that already handles
start / end / cleaning.

Also bumps ``trigger`` max_length from 10 → 32 because ``maintenance``
(11 chars) doesn't fit in the current column width. Kept generous
headroom so a follow-up trigger (``inspection``, ``changeover``, …)
doesn't need another schema round trip.
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('dynamic_forms', '0004_multi_workstation_assignments'),
    ]

    operations = [
        migrations.AlterField(
            model_name='dynamicform',
            name='trigger',
            field=models.CharField(
                choices=[
                    ('start', 'Session Start'),
                    ('end', 'Session End'),
                    ('both', 'Both'),
                    ('cleaning', 'Cleaning'),
                    ('maintenance', 'Maintenance'),
                ],
                default='start',
                max_length=32,
            ),
        ),
    ]

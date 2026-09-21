"""Add equipment-scoped forms to :class:`DynamicForm`.

Cleaning + maintenance sessions on the personal kiosk can now scope
to either the workstation OR a specific machine on it. PSP forms
authored with an equipment-scoped trigger (``equipment_cleaning`` /
``equipment_maintenance``) attach to an equipment CATEGORY on PSP;
the publisher pushes one mirror row per (workstation × equipment)
so the kiosk can key off ``(workstation, equipment_uuid, trigger)``.

Also widens the uniqueness key to include ``equipment_uuid`` — a
single equipment-scoped template attached to two different machines
on the same workstation must produce two distinct mirror rows.
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('dynamic_forms', '0005_maintenance_trigger'),
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
                    ('equipment_cleaning', 'Equipment cleaning'),
                    ('equipment_maintenance', 'Equipment maintenance'),
                ],
                default='start',
                max_length=32,
            ),
        ),
        migrations.AddField(
            model_name='dynamicform',
            name='equipment_uuid',
            field=models.UUIDField(null=True, blank=True, db_index=True),
        ),
        # Widen uniqueness to include equipment_uuid — one template
        # can now attach to N machines on the same workstation.
        migrations.AlterUniqueTogether(
            name='dynamicform',
            unique_together={('psp_uuid', 'workstation', 'equipment_uuid')},
        ),
    ]

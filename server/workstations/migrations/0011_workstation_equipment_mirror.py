"""Create the ``workstation_equipment`` mirror table.

PSP is the source of truth for equipment attached to workstations;
vita-perf just needs a rendering snapshot for the kiosk equipment
picker (cleaning / maintenance session scoping). PSP re-publishes
the workstation's equipment roster on every insert / update /
detach so this table stays fresh without vita-perf pulling.

Kept tight: uuid + display name + serial + category. Cost / cadence
/ lifecycle stay on PSP.
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('workstations', '0010_maintenance_schedule_mirror'),
    ]

    operations = [
        migrations.CreateModel(
            name='WorkstationEquipment',
            fields=[
                (
                    'id',
                    models.AutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name='ID',
                    ),
                ),
                (
                    'equipment_uuid',
                    models.CharField(db_index=True, max_length=64),
                ),
                ('name', models.CharField(max_length=200)),
                ('serial_number', models.CharField(blank=True, default='', max_length=120)),
                ('category_name', models.CharField(blank=True, default='', max_length=120)),
                ('is_active', models.BooleanField(default=True)),
                ('psp_updated_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                (
                    'workstation',
                    models.ForeignKey(
                        on_delete=models.deletion.CASCADE,
                        related_name='equipment_units',
                        to='workstations.workstation',
                    ),
                ),
            ],
            options={
                'db_table': 'workstation_equipment',
                'ordering': ['workstation_id', 'name'],
                'unique_together': {('workstation', 'equipment_uuid')},
            },
        ),
    ]

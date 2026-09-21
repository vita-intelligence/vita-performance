"""Mirror PSP's maintenance schedule cache onto Workstation.

Parallel to migration 0009 (cleaning schedule). Two nullable
timestamp fields synced from PSP whenever the maintenance schedule
changes there — either via the form publisher (workstation config
save) or when the maintenance-session complete callback bumps the
scalars on the PSP side and republishes.

The kiosk WS picker reads these locally so offline / flaky-wifi
kiosks still get correct "due soon" chips on the maintenance entry
point, matching what cleaning already does.
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('workstations', '0009_cleaning_schedule_mirror'),
    ]

    operations = [
        migrations.AddField(
            model_name='workstation',
            name='last_maintenance_at',
            field=models.DateTimeField(null=True, blank=True),
        ),
        migrations.AddField(
            model_name='workstation',
            name='next_maintenance_due_at',
            field=models.DateField(null=True, blank=True, db_index=True),
        ),
    ]

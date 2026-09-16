"""Mirror PSP's cleaning schedule cache onto Workstation.

Two nullable timestamp fields synced from PSP whenever the cleaning
schedule changes there (form publish, or cleaning-complete callback
recomputing the next due date). The kiosk WS picker reads these
locally so offline / flaky-wifi kiosks still get correct "due soon"
chips on the cleaning entry point.
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('workstations', '0008_workstation_company_external_id_psp_flag'),
    ]

    operations = [
        migrations.AddField(
            model_name='workstation',
            name='last_cleaning_at',
            field=models.DateTimeField(null=True, blank=True),
        ),
        migrations.AddField(
            model_name='workstation',
            name='next_cleaning_due_at',
            field=models.DateField(null=True, blank=True, db_index=True),
        ),
    ]

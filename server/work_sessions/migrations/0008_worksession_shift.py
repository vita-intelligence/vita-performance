import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('workers', '0007_worker_authorized_workstations'),
        ('work_sessions', '0007_worksession_company_activity_mo'),
    ]

    operations = [
        migrations.AddField(
            model_name='worksession',
            name='shift',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='work_sessions',
                to='workers.workershift',
            ),
        ),
    ]

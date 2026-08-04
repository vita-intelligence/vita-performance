import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('workers', '0007_worker_authorized_workstations'),
    ]

    operations = [
        migrations.AddField(
            model_name='workerreputationevent',
            name='shift',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='authored_reputation_events',
                to='workers.workershift',
            ),
        ),
    ]

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('workstations', '0008_workstation_company_external_id_psp_flag'),
        ('workers', '0006_workershift'),
    ]

    operations = [
        migrations.AddField(
            model_name='worker',
            name='authorized_workstations',
            field=models.ManyToManyField(
                blank=True,
                related_name='authorized_workers',
                to='workstations.workstation',
            ),
        ),
    ]

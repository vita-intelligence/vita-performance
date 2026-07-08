from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('workstations', '0007_workstation_performance_formula'),
        ('companies', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='workstation',
            name='company',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=models.deletion.CASCADE,
                related_name='workstations',
                to='companies.company',
            ),
        ),
        migrations.AddField(
            model_name='workstation',
            name='external_id',
            field=models.CharField(
                blank=True,
                db_index=True,
                help_text='PSP workstation uuid — populated by psp_sync when the workstation is mirrored from PSP.',
                max_length=64,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name='workstation',
            name='psp_source_of_truth',
            field=models.BooleanField(default=False),
        ),
    ]

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('workers', '0004_worker_reputation_score_workerreputationevent'),
        ('companies', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='worker',
            name='company',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=models.deletion.CASCADE,
                related_name='workers',
                to='companies.company',
            ),
        ),
        migrations.AddField(
            model_name='worker',
            name='external_id',
            field=models.CharField(
                blank=True,
                db_index=True,
                help_text='PSP employee uuid — populated by psp_sync when the worker is mirrored from PSP HR.',
                max_length=64,
                null=True,
            ),
        ),
    ]

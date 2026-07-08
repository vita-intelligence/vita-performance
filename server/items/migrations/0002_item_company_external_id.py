from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('items', '0001_initial'),
        ('companies', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='item',
            name='company',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=models.deletion.CASCADE,
                related_name='items',
                to='companies.company',
            ),
        ),
        migrations.AddField(
            model_name='item',
            name='external_id',
            field=models.CharField(
                blank=True,
                db_index=True,
                help_text='PSP item uuid — populated by psp_sync for items sourced from PSP.',
                max_length=64,
                null=True,
            ),
        ),
    ]

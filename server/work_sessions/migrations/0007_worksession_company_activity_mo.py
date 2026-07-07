from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('work_sessions', '0006_worksession_override_target_duration_and_more'),
        ('companies', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='worksession',
            name='company',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=models.deletion.CASCADE,
                related_name='work_sessions',
                to='companies.company',
            ),
        ),
        migrations.AddField(
            model_name='worksession',
            name='external_id',
            field=models.CharField(
                blank=True,
                db_index=True,
                help_text='PSP workstation-session uuid once the outbox has flushed this row to PSP.',
                max_length=64,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name='worksession',
            name='activity_kind',
            field=models.CharField(
                choices=[
                    ('mo', 'Manufacturing order'),
                    ('cleaning', 'Cleaning'),
                    ('maintenance', 'Maintenance'),
                    ('other', 'Other'),
                ],
                db_index=True,
                default='mo',
                max_length=16,
            ),
        ),
        migrations.AddField(
            model_name='worksession',
            name='activity_label',
            field=models.CharField(
                blank=True,
                help_text='Free-form label when activity_kind = "other". Ignored otherwise.',
                max_length=200,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name='worksession',
            name='mo_uuid',
            field=models.CharField(
                blank=True,
                db_index=True,
                help_text='PSP manufacturing-order uuid when activity_kind = "mo".',
                max_length=64,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name='worksession',
            name='mo_step_uuid',
            field=models.CharField(
                blank=True,
                db_index=True,
                help_text='PSP MO-step uuid when activity_kind = "mo".',
                max_length=64,
                null=True,
            ),
        ),
    ]

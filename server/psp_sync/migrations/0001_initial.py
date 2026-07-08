from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('companies', '0001_initial'),
        ('work_sessions', '0007_worksession_company_activity_mo'),
    ]

    operations = [
        migrations.CreateModel(
            name='PspOutboxEntry',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('kind', models.CharField(choices=[('mo_session', 'MO session'), ('workstation_session', 'Workstation session (off-MO)'), ('reputation_event', 'Reputation event')], db_index=True, max_length=32)),
                ('endpoint_path', models.CharField(help_text='Path segment under /api/integration, e.g. /workstations/<uuid>/sessions', max_length=500)),
                ('payload', models.JSONField(default=dict)),
                ('external_id', models.CharField(db_index=True, max_length=64)),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('in_flight', 'In flight'), ('delivered', 'Delivered'), ('failed', 'Failed')], db_index=True, default='pending', max_length=16)),
                ('attempts', models.PositiveIntegerField(default=0)),
                ('max_attempts', models.PositiveIntegerField(default=8)),
                ('next_retry_at', models.DateTimeField(blank=True, db_index=True, null=True)),
                ('delivered_at', models.DateTimeField(blank=True, null=True)),
                ('last_error', models.TextField(blank=True, default='')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('company', models.ForeignKey(on_delete=models.deletion.CASCADE, related_name='psp_outbox_entries', to='companies.company')),
                ('session', models.ForeignKey(blank=True, null=True, on_delete=models.deletion.SET_NULL, related_name='psp_outbox_entries', to='work_sessions.worksession')),
            ],
            options={
                'db_table': 'psp_outbox',
                'ordering': ['-created_at'],
                'indexes': [models.Index(fields=['status', 'next_retry_at'], name='psp_outbox_status_5b4f31_idx')],
            },
        ),
    ]

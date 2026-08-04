import django.db.models.deletion
import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('companies', '0002_backfill_from_users'),
        ('workers', '0005_worker_company_external_id'),
    ]

    operations = [
        migrations.CreateModel(
            name='WorkerShift',
            fields=[
                (
                    'id',
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name='ID',
                    ),
                ),
                (
                    'clocked_in_at',
                    models.DateTimeField(
                        db_index=True,
                        default=django.utils.timezone.now,
                    ),
                ),
                ('clocked_out_at', models.DateTimeField(blank=True, null=True)),
                (
                    'status',
                    models.CharField(
                        choices=[('active', 'Active'), ('closed', 'Closed')],
                        default='active',
                        max_length=16,
                    ),
                ),
                ('device_id', models.CharField(blank=True, max_length=64)),
                ('notes', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                (
                    'company',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='shifts',
                        to='companies.company',
                    ),
                ),
                (
                    'worker',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='shifts',
                        to='workers.worker',
                    ),
                ),
            ],
            options={
                'db_table': 'worker_shifts',
                'ordering': ['-clocked_in_at'],
                'constraints': [
                    models.UniqueConstraint(
                        fields=('worker',),
                        condition=models.Q(('status', 'active')),
                        name='one_open_shift_per_worker',
                    ),
                ],
            },
        ),
    ]

import uuid
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('workers', '0008_workerreputationevent_shift'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='PersonalKioskToken',
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
                    'token',
                    models.UUIDField(
                        db_index=True,
                        default=uuid.uuid4,
                        editable=False,
                        unique=True,
                    ),
                ),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                (
                    'user',
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='personal_kiosk_token',
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                'db_table': 'personal_kiosk_tokens',
            },
        ),
    ]

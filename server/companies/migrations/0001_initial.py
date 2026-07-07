from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Company',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('external_id', models.CharField(blank=True, db_index=True, help_text='PSP company identifier — pairs a vita-performance tenant with its PSP counterpart.', max_length=64, null=True, unique=True)),
                ('name', models.CharField(max_length=200)),
                ('psp_base_url', models.URLField(blank=True, help_text='Base URL of the PSP backend, e.g. https://vita-psp-backend.azurewebsites.net', null=True)),
                ('psp_integration_token', models.CharField(blank=True, help_text='Bearer token minted at /settings/integrations on the PSP side. Presented as X-Integration-Token on every call.', max_length=100, null=True)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('owner_user', models.OneToOneField(blank=True, null=True, on_delete=models.deletion.PROTECT, related_name='owned_company', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name_plural': 'companies',
                'db_table': 'companies',
                'ordering': ['name'],
            },
        ),
    ]

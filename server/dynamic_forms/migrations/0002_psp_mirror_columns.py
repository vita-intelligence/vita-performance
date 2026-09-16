"""Add PSP-mirror columns to DynamicForm.

PSP is becoming the source of truth for form templates — vita-perf's
`dynamic_forms` table stays as a read-only mirror consumed by the
kiosk. These columns give the publish endpoint what it needs to
upsert idempotently:

* ``psp_uuid``     — stable id from PSP's `form_templates.uuid`. Unique
                     among mirrored rows; NULL for legacy rows still
                     authored via vita-perf's own /forms page.
* ``psp_version``  — monotonic version from PSP. Late writes (incoming
                     version <= stored) are dropped by the view.
* ``source``       — 'psp' when published from PSP, 'legacy' for rows
                     authored on vita-perf. Migration script (task #13)
                     bumps legacy rows to 'psp' after upserting them
                     into PSP.

Also extends the trigger enum with 'cleaning' so cleaning templates
can round-trip through the same table.
"""
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('dynamic_forms', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='dynamicform',
            name='psp_uuid',
            field=models.UUIDField(null=True, blank=True, unique=True),
        ),
        migrations.AddField(
            model_name='dynamicform',
            name='psp_version',
            field=models.IntegerField(null=True, blank=True),
        ),
        migrations.AddField(
            model_name='dynamicform',
            name='source',
            field=models.CharField(
                max_length=10,
                choices=[('legacy', 'Vita-perf legacy'), ('psp', 'PSP mirror')],
                default='legacy',
            ),
        ),
        migrations.AlterField(
            model_name='dynamicform',
            name='trigger',
            field=models.CharField(
                max_length=10,
                choices=[
                    ('start', 'Session Start'),
                    ('end', 'Session End'),
                    ('both', 'Both'),
                    ('cleaning', 'Cleaning'),
                ],
                default='start',
            ),
        ),
        migrations.AlterField(
            model_name='dynamicform',
            name='user',
            field=models.ForeignKey(
                null=True,
                blank=True,
                on_delete=models.deletion.CASCADE,
                related_name='dynamic_forms',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]

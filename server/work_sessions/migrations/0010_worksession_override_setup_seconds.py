from django.db import migrations, models


class Migration(migrations.Migration):
    """Per-session setup-time snapshot from the PSP routing target.

    Stamped at session start-time from the MO step's ``effective_setup_seconds``
    (which itself is the healed observation, or the authored setup ×60
    when no heal has run yet). ``compute_performance`` subtracts it from
    ``duration_seconds`` before scoring so a packer isn't punished for the
    first 12 min of a 15-min run that was legitimate setup.

    Nullable — legacy sessions + non-PSP tenants keep working exactly as
    before (compute treats ``None`` as zero setup).
    """

    dependencies = [
        ('work_sessions', '0009_hot_path_indexes'),
    ]

    operations = [
        migrations.AddField(
            model_name='worksession',
            name='override_setup_seconds',
            field=models.PositiveIntegerField(null=True, blank=True),
        ),
    ]

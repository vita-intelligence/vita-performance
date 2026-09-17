from django.db import migrations, models


class Migration(migrations.Migration):
    """Composite indexes for the two hottest WorkSession filter patterns.

    * ``(status, start_time)`` — every kiosk / QC endpoint that lists
      "sessions running right now" filters on ``status='active'`` and
      orders by ``start_time``. At 1M+ rows the planner does a bitmap
      scan on the tiny ``activity_kind`` index and then a filesort;
      this index turns both into an index-only lookup.
    * ``(user, status)`` — per-tenant + status filters (``filter(
      user=tok.user, status='active')``). Partial index would be
      cheaper but Django's ``Index`` conditional support is uneven
      across engines; we keep it portable and let the planner pick.
    """

    dependencies = [
        ('work_sessions', '0008_worksession_shift'),
    ]

    operations = [
        migrations.AddIndex(
            model_name='worksession',
            index=models.Index(
                fields=['status', 'start_time'],
                name='ws_status_starttime_idx',
            ),
        ),
        migrations.AddIndex(
            model_name='worksession',
            index=models.Index(
                fields=['user', 'status'],
                name='ws_user_status_idx',
            ),
        ),
    ]

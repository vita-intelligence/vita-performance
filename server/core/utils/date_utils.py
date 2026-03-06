from django.utils import timezone
from datetime import timedelta


def get_date_range(range_param: str):
    """
    Returns a 'since' datetime for the given range param.
    Returns None for 'all' (no filter).
    """
    now = timezone.now()
    today = now.date()

    ranges = {
        'today': timezone.make_aware(
            timezone.datetime.combine(today, timezone.datetime.min.time())
        ),
        'week': now - timedelta(days=7),
        'month': now - timedelta(days=30),
        '3months': now - timedelta(days=90),
        'year': now - timedelta(days=365),
    }

    return ranges.get(range_param, None)  # None = all time
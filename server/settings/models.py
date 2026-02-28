from django.db import models
from django.conf import settings


class UserSettings(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='settings')
    currency = models.CharField(max_length=3, default='GBP')
    currency_symbol = models.CharField(max_length=5, default='£')
    date_format = models.CharField(max_length=20, default='DD/MM/YYYY')
    time_format = models.CharField(max_length=5, choices=[('12h', '12h'), ('24h', '24h')], default='24h')
    timezone = models.CharField(max_length=50, default='Europe/London')
    language = models.CharField(max_length=10, default='en')
    decimal_separator = models.CharField(max_length=1, choices=[('.', 'Period (1,000.00)'), (',', 'Comma (1.000,00)')], default='.')
    thousands_separator = models.CharField(max_length=1, choices=[(',', 'Comma (1,000.00)'), ('.', 'Period (1.000,00)'), (' ', 'Space (1 000,00)')], default=',')
    working_hours_per_day = models.DecimalField(max_digits=4, decimal_places=2, default=8.00)
    working_days_per_week = models.IntegerField(default=5)
    overtime_threshold = models.DecimalField(max_digits=4, decimal_places=2, default=8.00)
    overtime_multiplier = models.DecimalField(max_digits=3, decimal_places=2, default=1.50)
    week_starts_on = models.CharField(max_length=10, choices=[('monday', 'Monday'), ('sunday', 'Sunday')], default='monday')

    class Meta:
        db_table = 'user_settings'
        verbose_name = 'User Settings'

    def __str__(self):
        return f'{self.user.username} settings'
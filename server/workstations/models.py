from django.db import models
from django.conf import settings


class Workstation(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='workstations')
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # nullable overrides — null means use global settings
    working_hours_per_day = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    overtime_threshold = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    overtime_multiplier = models.DecimalField(max_digits=3, decimal_places=2, null=True, blank=True)
    week_starts_on = models.CharField(max_length=10, choices=[('monday', 'Monday'), ('sunday', 'Sunday')], null=True, blank=True)

    class Meta:
        db_table = 'workstations'
        ordering = ['-created_at']

    def __str__(self):
        return self.name

    def get_effective_settings(self):
        user_settings = self.user.settings
        return {
            'working_hours_per_day': self.working_hours_per_day or user_settings.working_hours_per_day,
            'overtime_threshold': self.overtime_threshold or user_settings.overtime_threshold,
            'overtime_multiplier': self.overtime_multiplier or user_settings.overtime_multiplier,
            'week_starts_on': self.week_starts_on or user_settings.week_starts_on,
        }
from django.db import models
from django.conf import settings
from .group import WorkerGroup


class Worker(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='workers')
    group = models.ForeignKey(WorkerGroup, on_delete=models.SET_NULL, null=True, blank=True, related_name='workers')
    full_name = models.CharField(max_length=200)
    hourly_rate = models.DecimalField(max_digits=10, decimal_places=2)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'workers'
        ordering = ['-created_at']

    def __str__(self):
        return self.full_name
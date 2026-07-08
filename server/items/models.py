from django.db import models
from django.conf import settings


class Item(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='items')
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='items',
        null=True,
        blank=True,
    )
    external_id = models.CharField(
        max_length=64,
        blank=True,
        null=True,
        db_index=True,
        help_text='PSP item uuid — populated by psp_sync for items sourced from PSP.',
    )
    name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']
        unique_together = ('user', 'name')

    def __str__(self):
        return self.name
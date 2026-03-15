from django.db import models
from .workstation import Workstation


class SOP(models.Model):
    workstation = models.OneToOneField(
        Workstation,
        on_delete=models.CASCADE,
        related_name='sop'
    )
    content = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'sops'

    def __str__(self):
        return f"SOP for {self.workstation.name}"
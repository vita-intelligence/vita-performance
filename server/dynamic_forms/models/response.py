from django.db import models
from work_sessions.models import WorkSession
from .form import DynamicForm


class FormResponse(models.Model):
    session = models.ForeignKey(
        WorkSession,
        on_delete=models.CASCADE,
        related_name='form_responses'
    )
    form = models.ForeignKey(
        DynamicForm,
        on_delete=models.CASCADE,
        related_name='responses'
    )
    answers = models.JSONField(default=dict)
    submitted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'form_responses'
        ordering = ['-submitted_at']

    def __str__(self):
        return f"Response to {self.form.name} for session {self.session.id}"
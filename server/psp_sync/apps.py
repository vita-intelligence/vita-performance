from django.apps import AppConfig


class PspSyncConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'psp_sync'

    def ready(self):
        # Wire the WorkSession -> PSP post_save handler once the app
        # registry is ready. Top-level import would break app loading
        # since signals.py touches work_sessions.models.
        from . import signals  # noqa: F401


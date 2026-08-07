from django.apps import AppConfig


class WorkersConfig(AppConfig):
    name = 'workers'

    def ready(self):
        # Register the WorkerShift → PSP push signal handler. Imported
        # for side-effects only — the module registers via @receiver.
        from . import signals  # noqa: F401

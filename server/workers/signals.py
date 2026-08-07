"""Signal handlers for the workers app.

Fires on every ``WorkerShift`` write to push the row upstream to PSP.
The push is best-effort — a PSP outage must never block a kiosk
clock-in / clock-out (workers on the shop floor should not know or
care about the sync layer). All errors are logged and swallowed.
"""
from __future__ import annotations

import logging
from threading import Thread

from django.db.models.signals import post_save
from django.dispatch import receiver

from workers.models import WorkerShift

logger = logging.getLogger(__name__)


@receiver(post_save, sender=WorkerShift)
def push_shift_to_psp(sender, instance: WorkerShift, created, **kwargs):
    """Best-effort mirror to PSP on every WorkerShift write.

    Fires on both create (clock-in) and update (clock-out). The push
    upserts on PSP via ``external_id = shift.pk``, so the same row
    updates in place across the open → closed lifecycle.

    Runs on a daemon thread so the HTTP request path returns
    immediately — the operator's kiosk isn't waiting for PSP.
    """
    # Deferred import — psp_sync isn't loaded eagerly so a company
    # without PSP config never pulls the HTTP layer in.
    from psp_sync.pushers import push_shift

    def _fire():
        try:
            push_shift(instance)
        except Exception:  # noqa: BLE001
            logger.exception("push_shift signal failed for shift %s", instance.pk)

    Thread(target=_fire, daemon=True).start()

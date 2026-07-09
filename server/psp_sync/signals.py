"""Signal handlers that fan WorkSession completions out to PSP.

Design:

  1. On WorkSession save (state transition to ``completed`` or
     ``verified``) we enqueue a `PspOutboxEntry` inside the same
     transaction. The outbox row is the durable record.

  2. Right after commit, we attempt a synchronous push. Success
     flips the row to ``delivered`` in the same commit-hook.
     Failure leaves the row `pending` for the periodic sweep to
     retry. **We never fail the caller's request** because of a
     PSP hiccup — the kiosk operator cares about the local
     stop-session working; PSP catches up when it can.

  3. Skips: sessions on stations without ``psp_source_of_truth``,
     sessions with no ``mo_uuid`` when activity_kind='mo', and
     sessions on tenants without a configured PSP client.
"""
from __future__ import annotations

import logging
import threading

from django.db import transaction
from django.db.models.signals import m2m_changed, post_save
from django.dispatch import receiver

from work_sessions.models import WorkSession

from .client import PspError, client_for_company
from .models import PspOutboxEntry
from .pushers import build_session_payload

logger = logging.getLogger(__name__)

# Guard against re-entrant enqueues when the outbox row's save
# fires unrelated signals inside the same transaction.
_enqueue_local = threading.local()


def _push_kind(session: WorkSession) -> str:
    if session.activity_kind == 'mo':
        return PspOutboxEntry.KIND_MO_SESSION
    return PspOutboxEntry.KIND_WS_SESSION


def _endpoint_path(session: WorkSession) -> str | None:
    workstation = session.workstation
    if not workstation or not workstation.external_id:
        return None

    if session.activity_kind == 'mo':
        if not (session.mo_uuid and session.mo_step_uuid):
            return None
        return (
            f"/manufacturing-orders/{session.mo_uuid}"
            f"/steps/{session.mo_step_uuid}/sessions"
        )
    return f"/workstations/{workstation.external_id}/sessions"


def _should_push(session: WorkSession) -> bool:
    # Push active sessions too — PSP needs the "started" event so the
    # MO detail + wizard timelines can show a live running row + the
    # kiosk's timer keeps ticking on the operator's screen even
    # after they lock the phone. Idempotent on PSP side.
    if session.status not in ('active', 'completed', 'verified'):
        return False
    workstation = session.workstation
    if not workstation or not workstation.psp_source_of_truth:
        return False
    if not workstation.external_id:
        return False
    if not session.company:
        return False
    if session.activity_kind == 'mo' and not (session.mo_uuid and session.mo_step_uuid):
        return False
    return True


@receiver(post_save, sender=WorkSession)
def on_work_session_saved(sender, instance: WorkSession, created: bool, **kwargs):
    if getattr(_enqueue_local, "busy", False):
        return

    if not _should_push(instance):
        return

    endpoint_path = _endpoint_path(instance)
    if endpoint_path is None:
        return

    payload = build_session_payload(instance)

    _enqueue_local.busy = True
    try:
        entry, _ = PspOutboxEntry.objects.update_or_create(
            company=instance.company,
            external_id=str(instance.id),
            defaults={
                'kind': _push_kind(instance),
                'endpoint_path': endpoint_path,
                'payload': payload,
                'session': instance,
                # If a previous attempt failed, reset the status so
                # the sweep picks it up again. Delivered rows stay
                # delivered (idempotent).
                'status': 'delivered' if not created and False else 'pending',
            },
        )
    finally:
        _enqueue_local.busy = False

    if entry.status == 'delivered':
        return

    # Attempt synchronous push after the transaction commits so we
    # don't try to reach PSP with a session row that hasn't landed
    # yet (Postgres would return an FK error for the through-table).
    transaction.on_commit(lambda: _try_push_now(entry.pk))


@receiver(m2m_changed, sender=WorkSession.workers.through)
def on_work_session_workers_changed(sender, instance, action, **kwargs):
    """WorkSession.workers is set AFTER the WorkSession row is created,
    so the ``post_save`` signal above fires with an empty M2M. Without
    this handler, the very first push to PSP would ship an empty
    ``employee_uuids`` array and the session on PSP would forever
    show ``unattributed`` even though the vp side has the worker
    linked correctly. Every add / remove on the through table
    re-enqueues the outbox entry with a fresh payload, and the
    subsequent push overwrites the previous one via the same
    ``external_id`` idempotency key on the PSP-side upsert."""
    if action not in ("post_add", "post_remove", "post_clear"):
        return
    if not isinstance(instance, WorkSession):
        return
    if not _should_push(instance):
        return

    endpoint_path = _endpoint_path(instance)
    if endpoint_path is None:
        return

    # Rebuild the payload against the current M2M so PSP sees the
    # attribution as it now stands. `update_or_create` on the outbox
    # keeps a single entry per session id — repeated churns coalesce
    # into one row that ships the latest snapshot.
    payload = build_session_payload(instance)

    entry, _ = PspOutboxEntry.objects.update_or_create(
        company=instance.company,
        external_id=str(instance.id),
        defaults={
            'kind': _push_kind(instance),
            'endpoint_path': endpoint_path,
            'payload': payload,
            'session': instance,
            'status': 'pending',
        },
    )
    transaction.on_commit(lambda: _try_push_now(entry.pk))


def _try_push_now(entry_id: int) -> None:
    """Attempt one push. Kept out of the request path so the caller
    sees an instant response; failures leave the entry pending for
    the sweep."""
    try:
        entry = PspOutboxEntry.objects.select_related('company', 'session').get(pk=entry_id)
    except PspOutboxEntry.DoesNotExist:
        return

    if entry.status == 'delivered':
        return

    try:
        client = client_for_company(entry.company)
    except ValueError:
        # Not configured yet — leave the entry pending. A later
        # sweep will retry once the company row gets creds.
        entry.last_error = 'no PSP creds on Company row'
        entry.save(update_fields=['last_error', 'updated_at'])
        return

    entry.attempts = entry.attempts + 1
    entry.status = 'in_flight'
    entry.save(update_fields=['attempts', 'status', 'updated_at'])

    try:
        client.post(entry.endpoint_path, body=entry.payload)
    except PspError as e:
        entry.status = 'failed' if entry.attempts >= entry.max_attempts else 'pending'
        entry.last_error = str(e)[:1000]
        entry.save(update_fields=['status', 'last_error', 'updated_at'])
        logger.warning(
            "psp push failed for outbox entry %s (attempt %d/%d): %s",
            entry.id, entry.attempts, entry.max_attempts, e,
        )
        return

    from django.utils import timezone
    entry.status = 'delivered'
    entry.delivered_at = timezone.now()
    entry.last_error = ''
    entry.save(update_fields=['status', 'delivered_at', 'last_error', 'updated_at'])

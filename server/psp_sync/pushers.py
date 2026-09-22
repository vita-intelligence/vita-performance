"""vita-performance → PSP writeback for WorkSessions.

Fires from a post_save signal on WorkSession (or via a management
command in the E2E test). Payload shape mirrors PSP's
``IntegrationSessionController`` expectations.
"""
from __future__ import annotations

import logging
from decimal import Decimal
from typing import TYPE_CHECKING, Any

from workers.models import Worker

from .client import PspClient, PspError, client_for_company

if TYPE_CHECKING:
    from work_sessions.models import WorkSession
    from workers.models import WorkerShift

logger = logging.getLogger(__name__)


def _decimal_or_none(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, Decimal):
        return format(value, "f")
    return str(value)


def _worker_uuids(session: "WorkSession") -> list[str]:
    """Resolve the PSP Employee uuids for every worker on the session.
    Workers not linked to a PSP employee (``external_id`` is None)
    are silently dropped — they don't contribute to labour cost
    upstream and would fail the FK check anyway."""
    ids = (
        Worker.objects
        .filter(work_sessions=session)
        .exclude(external_id__isnull=True)
        .exclude(external_id="")
        .values_list("external_id", flat=True)
    )
    return list(ids)


def build_session_payload(session: "WorkSession") -> dict:
    """Serialize a WorkSession into the JSON PSP's
    ``create_mo_session`` / ``create_workstation_session`` expects.

    Includes ``workstation_uuid`` — PSP-side MO steps route to a
    workstation *group*, not a specific station, so the kiosk has to
    tell PSP which physical station the session ran on."""
    workstation = session.workstation
    return {
        "external_id": str(session.id),
        "activity_kind": session.activity_kind,
        "activity_label": session.activity_label,
        "employee_uuids": _worker_uuids(session),
        "workstation_uuid": (
            str(workstation.external_id) if workstation and workstation.external_id else None
        ),
        "started_at": session.start_time.isoformat() if session.start_time else None,
        "finished_at": session.end_time.isoformat() if session.end_time else None,
        "quantity_produced": _decimal_or_none(session.quantity_produced),
        "quantity_rejected": _decimal_or_none(session.quantity_rejected),
        "performance_percentage": session.performance_percentage,
        "notes": session.notes,
        "status": session.status,
    }


def push_session(session: "WorkSession", client: PspClient | None = None) -> dict | None:
    """Send `session` upstream to PSP. Returns the parsed response
    body on success, or None if the workstation isn't linked to
    PSP yet (silent skip — kiosk is running in local-only mode)."""
    workstation = session.workstation
    if not workstation.psp_source_of_truth or not workstation.external_id:
        return None  # station not cut over — nothing to push

    if client is None:
        if not session.company:
            logger.warning("push_session skipped: session %s has no company", session.id)
            return None
        client = client_for_company(session.company)

    payload = build_session_payload(session)

    if session.activity_kind == "mo":
        if not (session.mo_uuid and session.mo_step_uuid):
            logger.warning(
                "push_session skipped: session %s has activity_kind=mo but no mo_uuid/step",
                session.id,
            )
            return None
        try:
            return client.create_mo_session(
                mo_uuid=session.mo_uuid,
                step_uuid=session.mo_step_uuid,
                payload=payload,
            )
        except PspError:
            logger.exception("push_session (MO) failed for session %s", session.id)
            raise
    else:
        if not workstation.external_id:
            return None
        try:
            return client.create_workstation_session(
                workstation_uuid=str(workstation.external_id),
                payload=payload,
            )
        except PspError:
            logger.exception("push_session (off-MO) failed for session %s", session.id)
            raise


def build_form_submission_payload(response) -> dict | None:
    """Serialize a FormResponse into the JSON PSP's
    ``IntegrationFormSubmissionController.create`` expects.

    Returns ``None`` when the response can't be mirrored (form has
    no PSP linkage, session has no parent workstation with PSP
    linkage, etc.) — the caller skips the push in that case.

    Idempotency key on the PSP side is
    ``(company_id, vp_response_id)`` so an outbox retry lands on the
    same row.
    """
    from workers.models import Worker

    form = response.form
    session = response.session
    if form is None or session is None:
        return None
    if not form.psp_uuid:
        # Locally-authored legacy form — no PSP template to link to.
        return None
    workstation = session.workstation
    if workstation is None or not workstation.external_id:
        return None

    # Primary submitter — the first worker on the session. Sessions
    # can be multi-worker but the FormResponse row itself doesn't
    # carry a specific worker attribution; the first mirrored worker
    # is the pragmatic pick.
    submitter = (
        Worker.objects
        .filter(work_sessions=session)
        .exclude(external_id__isnull=True)
        .exclude(external_id="")
        .order_by("id")
        .first()
    )
    submitter_uuid = submitter.external_id if submitter else None
    submitter_name = submitter.full_name if submitter else None

    equipment_uuid = session.equipment_uuid or (
        str(form.equipment_uuid) if form.equipment_uuid else None
    )

    # Trigger on the vp DynamicForm can be a legacy name (``end``,
    # ``both``) that predates the PSP two-phase vocabulary. Omit it
    # from the payload so PSP's receive controller falls back to the
    # authoritative trigger on its own FormTemplate row.
    return {
        "vp_response_id": response.pk,
        "workstation_uuid": str(workstation.external_id),
        "workstation_session_uuid": session.external_id,
        "form_template_uuid": str(form.psp_uuid),
        "schema_version": form.psp_version,
        "schema_snapshot": form.schema,
        "equipment_uuid": equipment_uuid,
        "activity_kind": session.activity_kind,
        "submitted_by_uuid": submitter_uuid,
        "submitted_by_name": submitter_name,
        "submitted_at": response.submitted_at.isoformat() if response.submitted_at else None,
        "answers": response.answers or {},
    }


def push_form_submission(response, client: PspClient | None = None) -> dict | None:
    """Send `response` upstream to PSP. Silent skip when the payload
    can't be built (form / session / workstation not PSP-linked)."""
    payload = build_form_submission_payload(response)
    if payload is None:
        return None

    if client is None:
        session = response.session
        if not session or not session.company:
            logger.warning("push_form_submission skipped: response %s has no company", response.pk)
            return None
        try:
            client = client_for_company(session.company)
        except ValueError:
            return None

    try:
        return client.post("/form-submissions", body=payload)
    except PspError:
        logger.exception("push_form_submission failed for response %s", response.pk)
        raise


def build_shift_payload(shift: "WorkerShift") -> dict:
    """Serialize a WorkerShift into the JSON PSP's
    ``upsert_shift`` expects.

    ``external_id`` is the vp PK so the same row updates in place
    across the open-push → closed-push lifecycle. ``ended_at`` is
    None for open shifts; PSP stores nil and materialises the
    duration only when we later post the close.
    """
    ended_iso = shift.clocked_out_at.isoformat() if shift.clocked_out_at else None
    duration = shift.duration_seconds if shift.clocked_out_at else None

    return {
        "external_id": str(shift.pk),
        "started_at": shift.clocked_in_at.isoformat(),
        "ended_at": ended_iso,
        "duration_seconds": duration,
        "device_id": shift.device_id or "",
        "notes": shift.notes or "",
    }


def push_shift(shift: "WorkerShift", client: PspClient | None = None) -> dict | None:
    """Send `shift` upstream to PSP. Silent-fail on missing PSP creds
    or an unlinked worker — clock-in / clock-out mustn't block the
    kiosk if PSP happens to be down."""
    worker = shift.worker
    if not worker.external_id:
        return None  # worker not linked to a PSP employee — nothing to push

    if client is None:
        if not shift.company:
            logger.warning("push_shift skipped: shift %s has no company", shift.id)
            return None
        try:
            client = client_for_company(shift.company)
        except ValueError:
            # Company not configured for PSP — silent skip so kiosk
            # keeps functioning in local-only mode.
            return None

    payload = build_shift_payload(shift)

    try:
        return client.upsert_shift(
            employee_uuid=str(worker.external_id),
            payload=payload,
        )
    except PspError:
        logger.exception("push_shift failed for shift %s", shift.id)
        # Never re-raise — a PSP outage must not block a clock-out.
        return None

"""Live QC — kiosk pages for a QC operator to walk the shop floor
and capture free-form notes against MOs that are currently in
production.

Three endpoints under ``/api/kiosk/personal/<token>/qc/live-mos/``:

  * ``GET  /live-mos/?session_token=…``
      Every distinct MO with at least one in-progress work_session.
      Rows include the item name, the mo_uuid, which workstation the
      session is on, which workers are running it, and elapsed time.

  * ``GET  /mos/<mo_uuid>/notes/?session_token=…``
      Reverse-chronological note history for one MO. Feeds the
      timeline shown under the note-taking text area.

  * ``POST /mos/<mo_uuid>/notes/`` ``{note_text, session_token,
      mo_step_uuid?}``
      Append a new note. Also fires a fire-and-forget push to PSP so
      the MO's audit log picks up the note — silent-degrade on any
      PSP outage.

All three are gated on ``session.worker.is_qa == True``. The auth
pattern (token → session_token → worker) is shared with the rest of
the personal-kiosk API; helpers are imported from
``workers.views.personal_kiosk`` so the resolution rules stay in one
place.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from django.db.models import Max, Min
from django.http import HttpResponse
from django.utils.decorators import method_decorator
from django.views.decorators.clickjacking import xframe_options_exempt
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from qc.models import QCNote
from workers.views.personal_kiosk import (
    _resolve_session,
    _resolve_token_or_rate_limit,
)
from work_sessions.models import WorkSession

logger = logging.getLogger(__name__)


def _reject(status_code: int, detail: str, code: str | None = None) -> Response:
    body: dict[str, object] = {'detail': detail}
    if code:
        body['code'] = code
    return Response(body, status=status_code)


def _resolve_qc_session(request, token):
    """Shared prologue: token → kiosk → session (via session_token) →
    worker. Returns ``(session, error_response)``. On success
    ``error_response`` is None; on any auth failure it's a Response
    the view should return immediately."""
    tok, rate_err = _resolve_token_or_rate_limit(request, token)
    if rate_err:
        return None, rate_err
    if not tok:
        return None, _reject(status.HTTP_404_NOT_FOUND, 'Kiosk token not recognised.')

    session_token = (
        request.query_params.get('session_token')
        or request.data.get('session_token')
    )
    if not session_token:
        return None, _reject(status.HTTP_400_BAD_REQUEST, 'session_token is required.')

    session = _resolve_session(tok, session_token)
    if not session:
        return None, _reject(status.HTTP_401_UNAUTHORIZED, 'Session expired — sign in again.')

    if not getattr(session.worker, 'is_qa', False):
        return None, _reject(
            status.HTTP_403_FORBIDDEN,
            'Live QC is only available to workers with QC authorisation.',
            code='not_qa',
        )
    return session, None


class PublicPersonalKioskLiveMOsView(APIView):
    """``GET /api/kiosk/personal/<token>/qc/live-mos/?session_token=…``

    Returns every distinct MO with at least one in-progress work
    session on the tenant right now. Payload shape (per row):

        {
          "mo_uuid": "e50f236e-…",
          "item_name": "Sleep Capsules Powder",
          "item_id": 1848,
          "started_at": "2026-09-17T10:14:00Z",
          "elapsed_seconds": 3720,
          "sessions": [
             {"session_id": 42, "workstation_id": 7, "workstation_name":
              "Encapsulation 1", "worker_id": 3, "worker_full_name":
              "Alice Smith", "started_at": "…"},
             ...
          ]
        }
    """
    permission_classes = (AllowAny,)

    def get(self, request, token):
        session, err = _resolve_qc_session(request, token)
        if err:
            return err

        company = getattr(session.worker, 'company', None)
        active = (
            WorkSession.objects
            .select_related('user', 'workstation', 'item')
            .filter(
                status='active',
                activity_kind='mo',
                mo_uuid__isnull=False,
            )
            .exclude(mo_uuid='')
            .order_by('mo_uuid', 'start_time')
        )
        if company is not None:
            active = active.filter(company=company)

        # Group by mo_uuid. `sessions` inside each row lists every
        # active session on that MO across workstations, so the QC
        # operator sees "MO X is running on two lines by three people".
        now = datetime.now(timezone.utc)
        by_mo: dict[str, dict] = {}
        for ws_session in active:
            key = ws_session.mo_uuid
            row = by_mo.get(key)
            if row is None:
                # Prefer ``override_task_name`` — the start-session view
                # writes the PSP MO's product name into that column
                # precisely so downstream reads don't need a live PSP
                # round-trip. ``item.name`` is the fallback for legacy
                # sessions that pre-date the override + for non-PSP
                # tenants where every session has a locally-mirrored
                # item. The last fallback is a short MO uuid prefix so
                # the row is never actually empty ("(unnamed)" was the
                # symptom that prompted this fix).
                item_name = (
                    (ws_session.override_task_name or '').strip()
                    or (getattr(ws_session.item, 'name', '') or '').strip()
                    or f"MO {key[:8]}"
                )
                row = {
                    'mo_uuid': key,
                    'item_name': item_name,
                    'item_id': getattr(ws_session.item, 'id', None),
                    'started_at': ws_session.start_time,
                    'sessions': [],
                }
                by_mo[key] = row
            # Track the earliest start time on the MO as the "MO
            # started" timestamp — useful for the "in progress for X"
            # header.
            if ws_session.start_time < row['started_at']:
                row['started_at'] = ws_session.start_time

            worker_full_name = ''
            for attr in ('full_name', 'name', 'username'):
                value = getattr(ws_session.user, attr, None)
                if value:
                    worker_full_name = value
                    break

            row['sessions'].append({
                'session_id': ws_session.id,
                'workstation_id': ws_session.workstation_id,
                'workstation_name': getattr(ws_session.workstation, 'name', '') or '',
                'worker_id': ws_session.user_id,
                'worker_full_name': worker_full_name,
                'started_at': ws_session.start_time.isoformat(),
                'mo_step_uuid': ws_session.mo_step_uuid or None,
            })

        # Latest QC note per MO in a single SQL — powers the shared
        # "20-min check due" reminder. When ANY QA worker logs a note,
        # every other QA's row for that MO clears together (no
        # duplicate reminders). Fetches only the MOs currently on the
        # floor to keep the payload cheap.
        mo_uuids = list(by_mo.keys())
        latest_by_mo: dict[str, datetime] = {}
        if mo_uuids:
            latest_rows = (
                QCNote.objects
                .filter(mo_uuid__in=mo_uuids)
                .values('mo_uuid')
                .annotate(last_at=Max('created_at'))
            )
            for r in latest_rows:
                latest_by_mo[r['mo_uuid']] = r['last_at']

        rows = []
        for row in by_mo.values():
            started_at = row['started_at']
            row['started_at'] = started_at.isoformat()
            row['elapsed_seconds'] = int((now - started_at).total_seconds())

            last_note_at = latest_by_mo.get(row['mo_uuid'])
            reference = last_note_at or started_at
            minutes_since = int((now - reference).total_seconds() // 60)
            row['last_qc_note_at'] = (
                last_note_at.isoformat() if last_note_at else None
            )
            row['minutes_since_last_qc_note'] = minutes_since
            # Threshold hardcoded here for now — 20 min per the ask.
            # If per-company config becomes needed, promote to a
            # company setting + read on the same fetch.
            row['qc_check_overdue'] = minutes_since >= 20
            rows.append(row)

        # Overdue MOs first, then longest-running. Puts the ones that
        # need a QA visit right at the top of the QA's list.
        rows.sort(
            key=lambda r: (
                not r['qc_check_overdue'],
                -r['minutes_since_last_qc_note'],
                -r['elapsed_seconds'],
            )
        )
        return Response({'results': rows, 'count': len(rows)})


def _serialise_note(note: QCNote) -> dict:
    return {
        'uuid': str(note.uuid),
        'mo_uuid': note.mo_uuid,
        'mo_step_uuid': note.mo_step_uuid or None,
        'note_text': note.note_text,
        'created_at': note.created_at.isoformat(),
        'author': {
            'worker_id': note.author_worker_id,
            'full_name': getattr(note.author_worker, 'full_name', '') or '',
        },
        'workstation': (
            {
                'id': note.workstation_id,
                'name': getattr(note.workstation, 'name', '') or '',
            }
            if note.workstation_id
            else None
        ),
    }


class PublicPersonalKioskQCNotesListView(APIView):
    """``GET /api/kiosk/personal/<token>/qc/mos/<mo_uuid>/notes/?session_token=…``

    Reverse-chronological QC-note history for one MO. Feeds the
    timeline below the text area on the note-taking page."""
    permission_classes = (AllowAny,)

    def get(self, request, token, mo_uuid):
        session, err = _resolve_qc_session(request, token)
        if err:
            return err

        notes = (
            QCNote.objects
            .select_related('author_worker', 'workstation')
            .filter(mo_uuid=str(mo_uuid))
            .order_by('-created_at')[:200]
        )
        return Response({
            'results': [_serialise_note(n) for n in notes],
            'count': notes.count() if hasattr(notes, 'count') else len(notes),
        })


class PublicPersonalKioskQCNoteCreateView(APIView):
    """``POST /api/kiosk/personal/<token>/qc/mos/<mo_uuid>/notes/``

    Body: ``{session_token, note_text, mo_step_uuid?}``.

    Appends a QCNote row and fires a fire-and-forget PSP push so the
    MO's audit log gets the note too. Silent-degrade on PSP failure —
    the local note is always saved."""
    permission_classes = (AllowAny,)

    def post(self, request, token, mo_uuid):
        session, err = _resolve_qc_session(request, token)
        if err:
            return err

        note_text = (request.data.get('note_text') or '').strip()
        if not note_text:
            return _reject(
                status.HTTP_400_BAD_REQUEST,
                'note_text is required.',
                code='note_text_required',
            )
        if len(note_text) > 8000:
            return _reject(
                status.HTTP_400_BAD_REQUEST,
                'note_text is too long — keep it under 8000 characters.',
                code='note_text_too_long',
            )

        # Snapshot the workstation the operator was standing at, if
        # the client sent one — useful context on the timeline.
        workstation_id = request.data.get('workstation_id')
        try:
            workstation_id = int(workstation_id) if workstation_id else None
        except (TypeError, ValueError):
            workstation_id = None

        note = QCNote.objects.create(
            mo_uuid=str(mo_uuid),
            mo_step_uuid=(request.data.get('mo_step_uuid') or None),
            author_worker=session.worker,
            workstation_id=workstation_id,
            note_text=note_text,
        )
        _post_qc_note_to_psp(session.worker, note)
        return Response(_serialise_note(note), status=status.HTTP_201_CREATED)


class PublicPersonalKioskLiveQCContextView(APIView):
    """``GET /api/kiosk/personal/<token>/qc/mos/<mo_uuid>/context/?session_token=…``

    Aggregates the read-only context a QC operator wants at their
    fingertips while writing notes against a running MO:

      * MO summary (code, item, quantity, status)
      * Finished-product spec (dosage form, warnings, storage, ...)
        — pulled from PSP's integration read as an additive field.
      * BOM breakdown for this MO — parts + required_qty scaled to
        the MO's output quantity.
      * Deep-links to NPD's spec sheet + product-validation pages
        (opened by the FE in a new tab). Nil when PSP has no NPD
        integration configured OR when the MO has no NPD trial-batch
        provenance (e.g. a manual PSP-native MO).

    Silent-degrade on any PSP outage — returns the sections that
    resolved and empty stubs for the rest so the operator still
    sees the notes area.
    """

    permission_classes = (AllowAny,)

    def get(self, request, token, mo_uuid):
        session, err = _resolve_qc_session(request, token)
        if err:
            return err

        company = getattr(session.worker, 'company', None)
        payload: dict = {
            'mo': None,
            'finished_product_spec': None,
            'parts': [],
            'npd_links': {'spec_sheet': None, 'validation': None},
        }

        base_url = getattr(company, 'psp_base_url', None) if company else None
        token_str = getattr(company, 'psp_integration_token', None) if company else None
        if not base_url or not token_str:
            return Response(payload)

        from psp_sync.client import PspError, client_for_company

        try:
            client = client_for_company(company)
        except (ValueError, PspError):
            return Response(payload)

        mo_uuid_str = str(mo_uuid)

        try:
            mo_data = client.get_manufacturing_order(mo_uuid_str)
        except PspError as exc:
            logger.warning('Live QC context: PSP MO fetch failed: %s', exc)
            mo_data = {}

        item = mo_data.get('item') or {}
        payload['mo'] = {
            'uuid': mo_data.get('uuid') or mo_uuid_str,
            'status': mo_data.get('status'),
            'quantity': mo_data.get('quantity'),
            'due_date': mo_data.get('due_date'),
            'project_type': mo_data.get('project_type'),
            'item_name': item.get('name') or '',
            'item_uuid': item.get('uuid'),
            'item_type': item.get('item_type'),
        }
        payload['finished_product_spec'] = mo_data.get('finished_product_spec')

        try:
            parts_data = client.get_manufacturing_order_parts(mo_uuid_str)
        except PspError as exc:
            logger.warning('Live QC context: PSP parts fetch failed: %s', exc)
            parts_data = {}

        for row in (parts_data.get('parts') or []):
            part = row.get('part') or {}
            payload['parts'].append({
                'uuid': row.get('uuid'),
                'sort_order': row.get('sort_order'),
                'is_fixed': row.get('is_fixed'),
                'part_name': part.get('name') or '',
                'part_code': part.get('code') or part.get('external_sku') or '',
                'required_qty': row.get('required_qty'),
                'uom': row.get('uom') or (part.get('stock_uom') or {}).get('symbol') or '',
            })

        # Build NPD deep-links from the info PSP just returned. Both
        # are gated on ``npd_frontend_url`` being set on the PSP
        # company row AND the MO carrying an NPD provenance uuid.
        npd_root = mo_data.get('npd_frontend_url')
        formulation_uuid = mo_data.get('npd_formulation_uuid')
        trial_batch_uuid = mo_data.get('npd_trial_batch_uuid')
        if npd_root and formulation_uuid:
            base = npd_root.rstrip('/')
            payload['npd_links']['spec_sheet'] = (
                f"{base}/formulations/{formulation_uuid}/spec-sheets/final"
            )
            if trial_batch_uuid:
                payload['npd_links']['validation'] = (
                    f"{base}/formulations/{formulation_uuid}"
                    f"/trial-batches/{trial_batch_uuid}/validation"
                )

        return Response(payload)


@method_decorator(xframe_options_exempt, name='dispatch')
class _PublicKioskNpdEmbedProxy(APIView):
    """Base for the two NPD-embed proxies. Streams PSP's rendered HTML
    back to the kiosk browser under vita-perf's origin so the iframe
    stays same-origin and no PSP session / integration token ever
    reaches the DOM. Kind is set by subclass (``spec`` | ``validation``).

    We deliberately pass NPD's error stubs through with their original
    HTTP status — the ``NpdSheetEmbed`` component on the FE already
    renders a friendly message from a 404 body, so we don't want to
    dress it up as a 200 here.
    """

    permission_classes = (AllowAny,)
    kind: str = ''

    def get(self, request, token, mo_uuid):
        session, err = _resolve_qc_session(request, token)
        if err:
            return err

        company = getattr(session.worker, 'company', None)
        if not company:
            return HttpResponse(
                _stub_html('No company on this kiosk worker.'),
                status=500,
                content_type='text/html',
            )

        from psp_sync.client import PspError, client_for_company

        try:
            client = client_for_company(company)
        except (ValueError, PspError) as exc:
            return HttpResponse(
                _stub_html(f'PSP not reachable: {exc}'),
                status=502,
                content_type='text/html',
            )

        try:
            body, content_type, upstream_status = client.get_mo_npd_html(
                str(mo_uuid), self.kind,
            )
        except PspError as exc:
            logger.warning('NPD %s proxy: PSP transport error: %s', self.kind, exc)
            return HttpResponse(
                _stub_html(f'PSP transport error: {exc}'),
                status=502,
                content_type='text/html',
            )

        resp = HttpResponse(
            body,
            status=upstream_status,
            content_type=content_type or 'text/html',
        )
        resp['Cache-Control'] = 'no-store'
        # Explicitly drop upstream's X-Frame-Options: SAMEORIGIN.
        # The Django API (e.g. :8000) and the kiosk FE (e.g. :3020)
        # are different origins, so SAMEORIGIN blocks the iframe.
        # The security perimeter for this content is the kiosk
        # ``session_token`` on every request, not framing itself.
        if 'X-Frame-Options' in resp:
            del resp['X-Frame-Options']
        return resp


class PublicPersonalKioskNpdSpecHtmlView(_PublicKioskNpdEmbedProxy):
    kind = 'spec'


class PublicPersonalKioskNpdValidationHtmlView(_PublicKioskNpdEmbedProxy):
    kind = 'validation'


def _stub_html(message: str) -> str:
    from html import escape
    return (
        '<!doctype html><html><head><meta charset="utf-8" /></head>'
        '<body style="font-family: system-ui, sans-serif; padding: 2rem; '
        'color: #555;"><p>{msg}</p></body></html>'
    ).format(msg=escape(message))


def _post_qc_note_to_psp(worker, note: QCNote) -> None:
    """Fire-and-forget mirror of a QC note to PSP's MO audit log.
    Silent-degrade on any transport / auth failure — the local note
    is already committed and the kiosk UX must never stall on a PSP
    outage."""
    company = getattr(worker, 'company', None)
    base_url = getattr(company, 'psp_base_url', None) if company else None
    token = getattr(company, 'psp_integration_token', None) if company else None
    if not base_url or not token:
        logger.info(
            'qc-note callback skipped: PSP integration not configured '
            'on company %s', getattr(company, 'id', None),
        )
        return

    import requests
    url = (
        f"{base_url.rstrip('/')}"
        f"/api/integration/manufacturing-orders/{note.mo_uuid}/qc-note/"
    )
    body = {
        'note_text': note.note_text,
        'worker_uuid': str(getattr(worker, 'uuid', '')) if getattr(worker, 'uuid', None) else None,
        'worker_name': getattr(worker, 'full_name', ''),
        'workstation_uuid': getattr(note.workstation, 'external_id', None) if note.workstation_id else None,
        'mo_step_uuid': note.mo_step_uuid,
        'captured_at': note.created_at.isoformat(),
    }
    try:
        resp = requests.post(
            url,
            json=body,
            headers={'X-Integration-Token': token},
            timeout=10,
        )
        if resp.status_code >= 400:
            logger.warning(
                'PSP qc-note callback rejected (%s): %s',
                resp.status_code,
                resp.text[:400],
            )
    except requests.RequestException as exc:
        logger.warning('PSP qc-note callback transport failure: %s', exc)

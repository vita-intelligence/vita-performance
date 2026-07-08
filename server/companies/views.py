from django.core.cache import cache
from django.db import IntegrityError, transaction
from django.db.models import Count
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from datetime import date

from psp_sync.client import (
    PspClient,
    PspClientError,
    PspError,
    PspTransientError,
    client_for_company,
)
from psp_sync.models import PspOutboxEntry
from psp_sync.pullers import pull_all_for_company
from psp_sync.signals import _try_push_now

from .models import Company
from .serializers import CompanyIntegrationSerializer


def _last_pull_cache_key(company_id: int) -> str:
    return f"psp:last_pull:{company_id}"


def _outbox_summary(company: Company) -> dict:
    counts = {row["status"]: row["n"] for row in (
        PspOutboxEntry.objects
        .filter(company=company)
        .values("status")
        .annotate(n=Count("id"))
    )}
    recent = list(
        PspOutboxEntry.objects
        .filter(company=company)
        .order_by("-created_at")[:5]
        .values(
            "id", "kind", "status", "endpoint_path",
            "attempts", "max_attempts", "last_error",
            "created_at", "delivered_at", "next_retry_at",
        )
    )
    total_pending = counts.get("pending", 0) + counts.get("in_flight", 0)
    return {
        "counts": {
            "pending": counts.get("pending", 0),
            "in_flight": counts.get("in_flight", 0),
            "delivered": counts.get("delivered", 0),
            "failed": counts.get("failed", 0),
        },
        "has_stuck": counts.get("failed", 0) > 0,
        "has_pending": total_pending > 0,
        "recent": recent,
    }


def _company_for(user):
    company = Company.objects.filter(owner_user=user).first()
    if company is None:
        raise NotFound("no_company")
    return company


class CompanyIntegrationView(APIView):
    """CRUD for the PSP integration credentials on the user's Company.

    GET returns the base URL + a masked preview of the token; PATCH
    accepts either or both fields. Anything else on the company row
    is out of scope for this endpoint.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(
            CompanyIntegrationSerializer(_company_for(request.user)).data
        )

    def patch(self, request):
        company = _company_for(request.user)
        s = CompanyIntegrationSerializer(
            company, data=request.data, partial=True
        )
        s.is_valid(raise_exception=True)
        s.save()
        return Response(CompanyIntegrationSerializer(company).data)


class CompanyIntegrationTestView(APIView):
    """Ping PSP's /api/integration/health from the current user's
    Company credentials + return the round-trip verdict.

    Two paths:
      * No body                → test the *stored* base URL + token.
      * Body has base_url/token → test those unsaved values (so the
        operator can verify a token before hitting Save). The stored
        row is never touched.

    Response is always 200; the ``ok`` flag tells the FE what to
    render. Failure modes map to ``kind`` so the FE can show the
    right icon + hint without parsing a stack trace.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        company = _company_for(request.user)

        base_url = (
            request.data.get("psp_base_url")
            or company.psp_base_url
            or ""
        ).strip()
        token = (
            request.data.get("psp_integration_token")
            or company.psp_integration_token
            or ""
        ).strip()

        if not base_url or not token:
            return Response(
                {
                    "ok": False,
                    "kind": "not_configured",
                    "detail": (
                        "Paste the PSP base URL and integration token, "
                        "then try again."
                    ),
                }
            )

        try:
            client = PspClient(base_url=base_url, token=token, timeout=5.0)
            body = client.health()
        except PspClientError as e:
            return Response(
                {
                    "ok": False,
                    "kind": "unauthorized" if e.status_code in (401, 403) else "bad_request",
                    "status_code": e.status_code,
                    "detail": e.detail or "PSP rejected the request.",
                    "code": e.code,
                }
            )
        except PspTransientError as e:
            return Response(
                {
                    "ok": False,
                    "kind": "unreachable",
                    "detail": (
                        "Couldn't reach PSP. Check the base URL and that "
                        "the server is running."
                    ),
                    "raw": str(e),
                }
            )
        except Exception as e:  # noqa: BLE001 — defensive; surface as generic
            return Response(
                {
                    "ok": False,
                    "kind": "unknown",
                    "detail": str(e),
                }
            )

        return Response(
            {
                "ok": True,
                "kind": "connected",
                "psp": body,
            }
        )


class CompanyIntegrationSyncView(APIView):
    """Pull PSP → vita-performance for the current user's Company.

    Runs ``pull_all_for_company`` synchronously (the puller is fast —
    workstations + employees + items in three sequential HTTP calls
    per company), stashes ``last_pull_at`` in the cache, and returns
    a compact summary the FE can render inline.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        company = _company_for(request.user)

        if not company.psp_base_url or not company.psp_integration_token:
            return Response(
                {
                    "ok": False,
                    "detail": (
                        "Paste the PSP base URL and integration token, "
                        "then sync."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        result = pull_all_for_company(company)
        now = timezone.now()
        # Cache the timestamp so a page reload still shows "3m ago"
        # without needing a new column on Company.
        cache.set(_last_pull_cache_key(company.id), now.isoformat(), None)

        return Response(
            {
                "ok": not result.errors,
                "created": result.created,
                "updated": result.updated,
                "deactivated": result.deactivated,
                "errors": result.errors,
                "last_pull_at": now.isoformat(),
            }
        )


class CompanyIntegrationOutboxView(APIView):
    """Read-side snapshot of the PSP push outbox for this company."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        company = _company_for(request.user)
        return Response(_outbox_summary(company))


class CompanyIntegrationOutboxSweepView(APIView):
    """Retry every pending / stuck outbox entry for this company.

    Rows in status ``pending`` or ``failed`` (the operator explicitly
    asked to retry — reset failed rows too) get one push attempt.
    Successful ones flip to ``delivered``. Results reported inline.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        company = _company_for(request.user)

        if not company.psp_base_url or not company.psp_integration_token:
            return Response(
                {"ok": False, "detail": "Not configured."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Reset failed rows to pending so the retry runs; leave the
        # attempts counter as-is so we still notice chronic failures.
        stuck = PspOutboxEntry.objects.filter(
            company=company, status="failed"
        )
        stuck.update(status="pending", last_error="")

        pending_ids = list(
            PspOutboxEntry.objects
            .filter(company=company, status__in=("pending", "in_flight"))
            .values_list("id", flat=True)
        )

        for entry_id in pending_ids:
            _try_push_now(entry_id)

        return Response(
            {
                "ok": True,
                "attempted": len(pending_ids),
                "outbox": _outbox_summary(company),
            }
        )


class CompanyIntegrationSeedHRView(APIView):
    """One-shot: push every active vp Worker to PSP as an HR Employee.

    Each Worker becomes an Employee on PSP; the returned uuid is
    stamped onto ``worker.external_id`` so the next kiosk session
    attributes correctly and the psp_sync pull won't try to create a
    duplicate. Silent on Workers that already have an ``external_id``
    — those are already linked.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        company = _company_for(request.user)

        if not company.psp_base_url or not company.psp_integration_token:
            return Response(
                {"ok": False, "detail": "Configure PSP integration first."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            client = client_for_company(company)
        except (ValueError, PspError) as e:
            return Response(
                {"ok": False, "detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from workers.models import Worker, WorkerReputationEvent

        workers = Worker.objects.filter(
            company=company,
            is_active=True,
        )
        # We sweep every active worker every time: the create_employee
        # / create_wage / create_reputation_event endpoints on PSP are
        # all idempotent (external_id keyed), so a re-seed is a no-op
        # for anything already carried across. This also means the
        # "close the loop" now covers workers that were linked in an
        # earlier, thinner seed and never got their wage / reputation
        # rows pushed. `matched` counts already-existing PSP rows.
        candidates = list(workers)
        already_linked_before = sum(
            1 for w in candidates if w.external_id
        )

        created = 0
        matched = 0
        wages_created = 0
        reputation_events_created = 0
        failed: list[dict] = []
        wage_failures: list[dict] = []
        reputation_failures: list[dict] = []

        for w in candidates:
            hire_date_iso = w.created_at.date().isoformat() if w.created_at else None
            payload = {
                "full_name": w.full_name,
                "is_active": True,
                "is_qa": bool(w.is_qa),
                "hire_date": hire_date_iso,
                # vp's Worker.pin is a Django pbkdf2 hash (see
                # Worker.set_pin -> make_password). PSP stores it
                # verbatim; kiosk PIN verification cross-format is a
                # deferred piece of work (see PSP Employee module).
                "kiosk_pin_hash": w.pin or None,
                # vp Worker ids are stable per-tenant so they double
                # as a good "external_id" for PSP's idempotency check.
                "external_id": f"vp-worker-{w.id}",
            }
            try:
                result = client.create_employee(payload)
                psp_uuid = result.get("uuid")
            except PspError as e:
                failed.append({"worker_id": w.id, "name": w.full_name, "detail": str(e)})
                continue

            if not psp_uuid:
                failed.append(
                    {
                        "worker_id": w.id,
                        "name": w.full_name,
                        "detail": "PSP did not return a uuid.",
                    }
                )
                continue

            w.external_id = psp_uuid
            w.save(update_fields=["external_id"])
            if result.get("_matched"):
                matched += 1
            else:
                created += 1

            # Push the initial wage row. Non-fatal per-worker so one
            # bad rate doesn't kill the whole seed.
            if w.hourly_rate and w.hourly_rate > 0:
                try:
                    wage_result = client.create_wage(psp_uuid, {
                        "external_id": f"vp-worker-{w.id}-initial-wage",
                        "effective_from": (
                            w.created_at.date().isoformat()
                            if w.created_at
                            else date.today().isoformat()
                        ),
                        "hourly_rate": str(w.hourly_rate),
                        "reason": "Initial wage seeded from vita-performance",
                    })
                    if not wage_result.get("_matched"):
                        wages_created += 1
                except PspError as e:
                    wage_failures.append(
                        {
                            "worker_id": w.id,
                            "name": w.full_name,
                            "detail": str(e),
                        }
                    )

            # Push every reputation event this worker has, oldest
            # first so the decay projection walks forward in time.
            events = WorkerReputationEvent.objects.filter(
                worker=w
            ).order_by("created_at")
            for ev in events:
                try:
                    ev_result = client.create_reputation_event(psp_uuid, {
                        "external_id": f"vp-repevent-{ev.id}",
                        "event_type": ev.event_type,
                        "score_delta": ev.score_delta,
                        "reason": ev.reason or "",
                        "occurred_at": ev.created_at.isoformat(),
                    })
                    if not ev_result.get("_matched"):
                        reputation_events_created += 1
                except PspError as e:
                    reputation_failures.append(
                        {
                            "worker_id": w.id,
                            "reputation_event_id": ev.id,
                            "detail": str(e),
                        }
                    )

        return Response(
            {
                "ok": (
                    len(failed) == 0
                    and len(wage_failures) == 0
                    and len(reputation_failures) == 0
                ),
                "scanned": len(candidates),
                "created": created,
                "matched": matched,
                "wages_created": wages_created,
                "reputation_events_created": reputation_events_created,
                "skipped_already_linked": already_linked_before,
                "failed": failed,
                "wage_failures": wage_failures,
                "reputation_failures": reputation_failures,
            }
        )


class MyCompanyView(APIView):
    """One-shot self-serve Company creation for the current user.

    A user without a Company row can't wire the PSP integration, so
    this endpoint lets them create one in a single click. The Company
    is auto-attached as their ``owned_company`` via the OneToOne FK.

    * POST — create a Company (name required). Returns 409 if one
      is already attached.
    * GET  — returns the current user's Company (integration payload
      shape) or 404 so the FE can render the create form.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(
            CompanyIntegrationSerializer(_company_for(request.user)).data
        )

    def post(self, request):
        # Reject if the user is already an owner. Enforcing this in
        # code is friendlier than letting the OneToOne DB constraint
        # blow up with an IntegrityError.
        if Company.objects.filter(owner_user=request.user).exists():
            return Response(
                {"detail": "already_has_company"},
                status=status.HTTP_409_CONFLICT,
            )

        name = (request.data.get("name") or "").strip()
        if not name:
            raise ValidationError({"name": "Company name is required."})
        if len(name) > 200:
            raise ValidationError({"name": "Name must be 200 characters or fewer."})

        try:
            with transaction.atomic():
                company = Company.objects.create(
                    name=name, owner_user=request.user
                )
        except IntegrityError:
            # Race — another request created it in parallel. Return the
            # existing row so the FE just moves on.
            company = _company_for(request.user)

        return Response(
            CompanyIntegrationSerializer(company).data,
            status=status.HTTP_201_CREATED,
        )

"""Thin HTTP wrapper around requests.Session for talking to PSP.

The bearer token + base URL come from the tenant's Company row —
not global env — so a multi-tenant future doesn't require a
rewrite. All calls carry the X-Integration-Token header PSP's
RequireIntegrationAuth plug expects.

Failure semantics:

  * Network / 5xx  → raise PspTransientError (caller should retry
                     — the outbox catches these).
  * 4xx            → raise PspClientError with the parsed error
                     code + detail from PSP's Errors.payload shape.
  * 2xx            → return the parsed JSON.
"""
from __future__ import annotations

import json
import logging
from typing import Any

import requests

logger = logging.getLogger(__name__)


class PspError(Exception):
    """Base class."""


class PspTransientError(PspError):
    """Retryable — network glitch, 5xx, timeout."""


class PspClientError(PspError):
    """Non-retryable — 4xx, malformed request, misconfigured token."""

    def __init__(self, status_code: int, code: str | None, detail: str | None, body: Any = None):
        super().__init__(f"HTTP {status_code} {code or ''}: {detail or body}")
        self.status_code = status_code
        self.code = code
        self.detail = detail
        self.body = body


class PspClient:
    def __init__(self, base_url: str, token: str, timeout: float = 15.0):
        if not base_url:
            raise ValueError("PspClient requires a base_url (e.g. http://localhost:4000)")
        if not token:
            raise ValueError("PspClient requires a bearer token from PSP /settings/integrations")

        self.base_url = base_url.rstrip("/")
        self._session = requests.Session()
        self._session.headers.update({
            "X-Integration-Token": token,
            "Accept": "application/json",
            "User-Agent": "vita-performance/psp_sync 0.1",
        })
        self._timeout = timeout

    def _url(self, path: str) -> str:
        return f"{self.base_url}/api/integration{path}"

    def get(self, path: str, params: dict | None = None) -> dict:
        return self._request("GET", path, params=params)

    def post(self, path: str, body: dict | None = None) -> dict:
        return self._request("POST", path, body=body)

    def _request(self, method: str, path: str, params: dict | None = None, body: dict | None = None) -> dict:
        url = self._url(path)
        try:
            response = self._session.request(
                method=method,
                url=url,
                params=params,
                json=body,
                timeout=self._timeout,
            )
        except requests.RequestException as e:
            raise PspTransientError(f"network error talking to PSP {url}: {e}") from e

        if 500 <= response.status_code < 600:
            raise PspTransientError(
                f"PSP returned HTTP {response.status_code} for {method} {url}: "
                f"{response.text[:500]}"
            )

        if response.status_code >= 400:
            payload: Any = None
            code: str | None = None
            detail: str | None = None
            try:
                payload = response.json()
                if isinstance(payload, dict):
                    code = payload.get("error")
                    detail = payload.get("detail")
            except (json.JSONDecodeError, ValueError):
                payload = response.text
            raise PspClientError(response.status_code, code, detail, payload)

        if response.status_code == 204 or not response.content:
            return {}

        try:
            return response.json()
        except (json.JSONDecodeError, ValueError) as e:
            raise PspClientError(
                response.status_code,
                "non_json_response",
                f"PSP returned non-JSON: {response.text[:200]}",
                response.text,
            ) from e

    # ---- Named endpoints ------------------------------------------------

    def health(self) -> dict:
        return self.get("/health")

    def create_employee(self, payload: dict) -> dict:
        """One-shot seed: create a PSP HR Employee from a vp Worker.
        PSP is idempotent on ``external_id`` — repeated calls for the
        same vp Worker return the existing Employee. Returns a dict
        with the Employee payload plus a ``_matched`` flag so callers
        can distinguish first-create from re-seed. The payload may
        include ``kiosk_pin_hash`` (Django ``pbkdf2_sha256$...``
        format) — PSP stores it verbatim; cross-format kiosk auth
        verification is a deferred piece of work."""
        result = self.post("/hr/employees", body=payload)
        employee = result.get("employee", {})
        # PSP echoes `matched: true` when the row already existed —
        # surface it so the seed can tally created-vs-matched.
        employee["_matched"] = bool(result.get("matched"))
        return employee

    def create_wage(self, employee_uuid: str, payload: dict) -> dict:
        """Push an initial (or historical) wage row for a PSP Employee.
        Idempotent via ``external_id`` in the payload — PSP tags the
        wage row with the external_id so a re-seed returns the existing
        row rather than opening a new interval."""
        result = self.post(f"/hr/employees/{employee_uuid}/wages", body=payload)
        wage = result.get("wage", {})
        wage["_matched"] = bool(result.get("matched"))
        return wage

    def create_reputation_event(self, employee_uuid: str, payload: dict) -> dict:
        """Push a single reputation event for a PSP Employee, preserving
        the original ``occurred_at`` so the decay math projects the
        same cached score both sides. Idempotent via ``external_id``
        (stored on the PSP row as ``session_external_id``)."""
        result = self.post(
            f"/hr/employees/{employee_uuid}/reputation-events",
            body=payload,
        )
        event = result.get("event", {})
        event["_matched"] = bool(result.get("matched"))
        return event

    def list_manufacturing_orders(
        self,
        workstation_uuid: str | None = None,
        status: str | None = None,
    ) -> list[dict]:
        params: dict[str, str] = {}
        if workstation_uuid:
            params["workstation_uuid"] = workstation_uuid
        if status:
            params["status"] = status
        result = self.get("/manufacturing-orders", params=params or None)
        return result.get("items", [])

    def get_manufacturing_order(self, uuid: str) -> dict:
        result = self.get(f"/manufacturing-orders/{uuid}")
        return result.get("manufacturing_order", {})

    def list_workstations(self, source_of_truth_only: bool = True) -> list[dict]:
        params = {"source_of_truth_only": "true"} if source_of_truth_only else None
        result = self.get("/workstations", params=params)
        return result.get("items", [])

    def list_items(self, item_types: list[str] | None = None) -> list[dict]:
        params = {"item_types": ",".join(item_types)} if item_types else None
        result = self.get("/items", params=params)
        return result.get("items", [])

    def list_employees(self) -> list[dict]:
        result = self.get("/hr/employees")
        return result.get("items", [])

    def create_mo_session(self, mo_uuid: str, step_uuid: str, payload: dict) -> dict:
        return self.post(
            f"/manufacturing-orders/{mo_uuid}/steps/{step_uuid}/sessions",
            body=payload,
        )

    def create_workstation_session(self, workstation_uuid: str, payload: dict) -> dict:
        return self.post(
            f"/workstations/{workstation_uuid}/sessions",
            body=payload,
        )


def client_for_company(company) -> PspClient:
    """Build a PspClient from a Company row's stored credentials.

    Raises ``ValueError`` if the company isn't configured yet — the
    caller decides whether that's a hard failure or a silent skip.
    """
    if not company.psp_base_url or not company.psp_integration_token:
        raise ValueError(
            f"Company {company.id} ({company.name}) is not configured for PSP integration: "
            f"set psp_base_url and psp_integration_token on the company row."
        )
    return PspClient(base_url=company.psp_base_url, token=company.psp_integration_token)

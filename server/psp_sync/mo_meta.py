"""Batch resolver for PSP manufacturing-order stream metadata.

Every session-list surface (Jobs, worker stats, workstation stats,
realtime feed, QC list, shift sessions, kiosk views) needs to tell
operators whether the underlying MO is R&D (``trial`` / ``sample``)
or commercial ``production``. The PSP MO's ``project_type`` is the
source of truth, but we don't want a PSP round-trip per row on every
list refresh — that's N HTTP calls where N is up to a few hundred.

This module owns the batch lookup + Redis cache:

    from psp_sync.mo_meta import resolve_project_types_for_uuids
    lookup = resolve_project_types_for_uuids(company, mo_uuids)
    row["project_type"] = lookup.get(mo_uuid)

The lookup is:
  * **Cached** — 1 hour TTL per uuid. ``project_type`` is frozen for
    the life of the MO so a long TTL is safe; a wrong entry would
    only linger for 60 min after an MO's stream changed (which never
    actually happens — the field is set at MO create + never mutated).
  * **Best-effort** — PSP outages return ``{}`` so the caller falls
    back to "unknown" and the FE shows no badge, rather than
    blocking the list render.
  * **Deduplicated** — if the same uuid appears many times in the
    input list (common: 10 sessions all against the same MO), we
    fetch it once.
"""

from __future__ import annotations

import logging
from typing import Iterable, Optional

from django.core.cache import cache

logger = logging.getLogger(__name__)

# 1 hour. ``project_type`` is set at MO create time and never
# mutates thereafter (see PSP's Backend.Production.ManufacturingOrder
# — no code path flips ``trial`` <-> ``production`` on an existing
# row). A longer TTL would be safe but 1 h caps blast radius if the
# assumption is ever broken in a future PSP release.
_CACHE_TTL_SECONDS = 3600

# Cache-key prefix so entries can be inspected / purged as a group.
_CACHE_KEY_PREFIX = "psp_mo_project_type"

# Sentinel value cached for uuids that PSP couldn't resolve (deleted
# MOs, wrong tenant, etc.). Cached briefly so a mistake doesn't wedge
# a row forever, but long enough that a stampede of retry lookups
# doesn't hammer PSP.
_NOT_FOUND_SENTINEL = "__not_found__"
_NOT_FOUND_TTL_SECONDS = 300


def enrich_rows_with_project_type(
    rows: list[dict],
    company,
    mo_uuid_key: str = "mo_uuid",
    project_type_key: str = "project_type",
) -> list[dict]:
    """Mutate a list of row dicts in-place, adding ``project_type``
    to each entry by resolving its ``mo_uuid`` against the PSP MO
    metadata cache.

    Rows without a ``mo_uuid`` (or with a null one) get
    ``project_type = None`` set uniformly so the FE can iterate the
    result without null-checking each row. Safe to call with an
    empty list or a list of rows all lacking the uuid key — it
    silently no-ops.

    Convenience wrapper around :func:`resolve_project_types_for_uuids`
    so every list-emitting view can wire the enrichment in one line:

        rows = build_rows(...)
        enrich_rows_with_project_type(rows, company)
        return Response({"items": rows})
    """

    if not rows:
        return rows

    uuids = [row.get(mo_uuid_key) for row in rows]
    lookup = resolve_project_types_for_uuids(company, [u for u in uuids if u])

    for row in rows:
        uuid = row.get(mo_uuid_key)
        row[project_type_key] = lookup.get(uuid) if uuid else None

    return rows


def resolve_project_types_for_uuids(
    company,
    mo_uuids: Iterable[str],
) -> dict[str, Optional[str]]:
    """Return ``{mo_uuid: project_type}`` for every uuid the caller asked
    about. Missing / unresolved uuids are present in the result with
    value ``None`` so callers can iterate the input list uniformly.

    Safe to call from any list-rendering view. Silent-degrade on any
    PSP error — the returned dict simply won't populate uuids we
    couldn't resolve.
    """

    unique_uuids = _normalise_uuids(mo_uuids)
    if not unique_uuids:
        return {}

    # Bulk cache read — one round-trip to Redis regardless of input size.
    cache_keys = {uuid: f"{_CACHE_KEY_PREFIX}:{uuid}" for uuid in unique_uuids}
    cached = cache.get_many(list(cache_keys.values()))

    result: dict[str, Optional[str]] = {}
    to_fetch: list[str] = []
    for uuid, key in cache_keys.items():
        if key not in cached:
            to_fetch.append(uuid)
            continue

        value = cached[key]
        # Normalise the not-found sentinel back to ``None`` so callers
        # never see the sentinel string. They only care whether the
        # field is populated or not.
        result[uuid] = None if value == _NOT_FOUND_SENTINEL else value

    if not to_fetch:
        return result

    fetched = _fetch_from_psp(company, to_fetch)

    # Write-through: bulk cache write of everything we just fetched
    # (populated + not-found sentinel) so the same lookup within the
    # TTL never re-hits PSP.
    to_cache: dict[str, tuple[str, int]] = {}
    for uuid in to_fetch:
        value = fetched.get(uuid)
        cache_key = cache_keys[uuid]
        if value is None:
            to_cache[cache_key] = (_NOT_FOUND_SENTINEL, _NOT_FOUND_TTL_SECONDS)
            result[uuid] = None
        else:
            to_cache[cache_key] = (value, _CACHE_TTL_SECONDS)
            result[uuid] = value

    # ``set_many`` doesn't accept per-key TTLs, so bucket by TTL and
    # write the two buckets separately. Two round-trips total, but
    # both are pipelined and small.
    populated = {k: v for k, (v, ttl) in to_cache.items() if ttl == _CACHE_TTL_SECONDS}
    not_found = {k: v for k, (v, ttl) in to_cache.items() if ttl == _NOT_FOUND_TTL_SECONDS}
    if populated:
        cache.set_many(populated, timeout=_CACHE_TTL_SECONDS)
    if not_found:
        cache.set_many(not_found, timeout=_NOT_FOUND_TTL_SECONDS)

    return result


def _normalise_uuids(mo_uuids: Iterable[str]) -> list[str]:
    """Drop nils / empties + dedup, preserving first-seen order for a
    deterministic PSP fetch order. The FE cares about the mapping not
    the order, but stable ordering helps when eyeballing cache keys
    in dev."""

    seen: set[str] = set()
    out: list[str] = []
    for uuid in mo_uuids:
        if not uuid:
            continue
        uuid_str = str(uuid).strip()
        if not uuid_str or uuid_str in seen:
            continue
        seen.add(uuid_str)
        out.append(uuid_str)
    return out


def _fetch_from_psp(company, mo_uuids: list[str]) -> dict[str, Optional[str]]:
    """Fire the PSP MO lookups. Returns ``{uuid: project_type_or_None}``
    for every uuid asked about — an entry always exists so the
    caller's write-through cache logic can proceed uniformly.
    """

    # Deferred import to keep psp_sync out of the hot import path for
    # non-PSP tenants that never hit this helper.
    from psp_sync.client import PspError, client_for_company

    try:
        client = client_for_company(company)
    except (ValueError, PspError) as exc:
        # Tenant not integrated / credentials broken — everything
        # resolves to None and gets cached with the not-found TTL so
        # a follow-up in the same 5-min window doesn't retry.
        logger.debug("resolve_project_types_for_uuids: no client — %s", exc)
        return {uuid: None for uuid in mo_uuids}

    out: dict[str, Optional[str]] = {}
    for uuid in mo_uuids:
        try:
            payload = client.get_manufacturing_order(uuid)
        except PspError as exc:
            logger.info(
                "resolve_project_types_for_uuids: PSP fetch failed for %s — %s",
                uuid,
                exc,
            )
            out[uuid] = None
            continue

        project_type = payload.get("project_type") if isinstance(payload, dict) else None
        out[uuid] = project_type or None

    return out

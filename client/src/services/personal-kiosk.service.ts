import api from "@/lib/api";
import { API_CONFIG } from "@/config/api";
import {
    HistoryPayload,
    PersonalKioskAuthSessionPayload,
    QCFeedbackItem,
    QCRosterWorker,
    QCSessionsPayload,
    StationContextPayload,
    StationItem,
    StationMOsPayload,
    StationSession,
    Worker,
    WorkerLiveStatusPayload,
    WorkerPerformancePayload,
    WorkerReputationPayload,
    WorkerShift,
    WorkerStationsPayload,
    WorkerTodaySummary,
} from "@/types/worker";

const { personalKiosk } = API_CONFIG.endpoints;
const base = API_CONFIG.baseUrl;

/**
 * Personal-kiosk service — talks to the PUBLIC token-paired endpoints
 * (mirror of the workstation kiosk service). Uses `fetch` directly
 * instead of the shared `api` axios instance so we don't drag along
 * the JWT bearer / refresh interceptors that would fight us on an
 * un-authenticated tablet.
 */
async function unwrap<T>(res: Response): Promise<T> {
    if (res.status === 204) {
        // Semantically "clocked out" for the active-shift endpoint.
        return null as unknown as T;
    }
    if (!res.ok) {
        let detail = `${res.status}`;
        try {
            const body = await res.json();
            detail = body?.detail ?? detail;
        } catch {}
        const err = new Error(detail) as Error & { status?: number; body?: unknown };
        err.status = res.status;
        try {
            err.body = await res.clone().json();
        } catch {}
        throw err;
    }
    return res.json() as Promise<T>;
}

/**
 * Admin-facing service — uses the shared `api` axios instance so it
 * inherits the JWT interceptor. Mirrors `qcDashboardService`.
 */
export const personalKioskDashboardService = {
    getToken: async (): Promise<string> => {
        const { data } = await api.get(personalKiosk.token);
        return data.token;
    },

    regenerateToken: async (): Promise<string> => {
        const { data } = await api.post(personalKiosk.token);
        return data.token;
    },
};

export const personalKioskService = {
    // ---- public (token in URL, no auth) ----

    /**
     * Roster search. Empty / short queries return an empty list
     * (server enforces min-1-char); the FE debounces around 300ms
     * so the tablet doesn't flood the endpoint on every keystroke.
     * Returns up to 5 matches on `full_name`.
     */
    getRoster: async (token: string, q: string = ""): Promise<Worker[]> => {
        const qs = q ? `?q=${encodeURIComponent(q)}` : "";
        const res = await fetch(`${base}${personalKiosk.roster(token)}${qs}`);
        return unwrap(res);
    },

    getActiveShift: async (
        token: string,
        workerId: number,
    ): Promise<WorkerShift | null> => {
        const res = await fetch(
            `${base}${personalKiosk.activeShift(token, workerId)}`,
        );
        return unwrap(res);
    },

    startShift: async (
        token: string,
        workerId: number,
        opts: { sessionToken?: string; pin?: string; deviceId?: string },
    ): Promise<WorkerShift> => {
        // Prefer session_token over pin — the session was minted by
        // verify-pin so a session-authed call never has to re-prompt
        // the user, even after a page refresh.
        const body: Record<string, string | number | undefined> = {
            device_id: opts.deviceId,
        };
        if (opts.sessionToken) {
            body.session_token = opts.sessionToken;
        } else {
            body.worker_id = workerId;
            body.pin = opts.pin ?? "";
        }
        const res = await fetch(`${base}${personalKiosk.startShift(token)}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        return unwrap(res);
    },

    endShift: async (
        token: string,
        shiftId: number,
        notes?: string,
    ): Promise<WorkerShift> => {
        const res = await fetch(
            `${base}${personalKiosk.endShift(token, shiftId)}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ notes }),
            },
        );
        return unwrap(res);
    },

    getTodaySummary: async (
        token: string,
        workerId: number,
    ): Promise<WorkerTodaySummary> => {
        const res = await fetch(
            `${base}${personalKiosk.todaySummary(token, workerId)}`,
        );
        return unwrap(res);
    },

    getStations: async (
        token: string,
        workerId: number,
        q: string = "",
        page: number = 1,
    ): Promise<WorkerStationsPayload> => {
        const p = new URLSearchParams({ page: String(page) });
        if (q) p.set("q", q);
        const res = await fetch(
            `${base}${personalKiosk.stations(token, workerId)}?${p.toString()}`,
        );
        return unwrap(res);
    },

    getPerformance: async (
        token: string,
        workerId: number,
    ): Promise<WorkerPerformancePayload> => {
        const res = await fetch(
            `${base}${personalKiosk.performance(token, workerId)}`,
        );
        return unwrap(res);
    },

    getReputation: async (
        token: string,
        workerId: number,
    ): Promise<WorkerReputationPayload> => {
        const res = await fetch(
            `${base}${personalKiosk.reputation(token, workerId)}`,
        );
        return unwrap(res);
    },

    /**
     * Confirms the PIN AND mints a 24h auth session. Return payload is
     * cached in localStorage so a browser refresh doesn't re-prompt.
     * Throws on 401 (wrong PIN).
     */
    verifyPin: async (
        token: string,
        workerId: number,
        pin: string,
        deviceId?: string,
    ): Promise<PersonalKioskAuthSessionPayload> => {
        const res = await fetch(
            `${base}${personalKiosk.verifyPin(token, workerId)}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pin, device_id: deviceId ?? "" }),
            },
        );
        return unwrap(res);
    },

    /**
     * Rehydrate a session on page load. 401 means the session has
     * expired / been revoked — clear cache + go back to search.
     */
    getSession: async (
        token: string,
        sessionToken: string,
    ): Promise<PersonalKioskAuthSessionPayload> => {
        const res = await fetch(
            `${base}${personalKiosk.session(token, sessionToken)}`,
        );
        return unwrap(res);
    },

    /**
     * Revoke server-side. FE also clears its localStorage cache but
     * this ensures a stolen tablet URL + stolen session token can't
     * replay after the button click.
     */
    logoutSession: async (
        token: string,
        sessionToken: string,
    ): Promise<void> => {
        const res = await fetch(
            `${base}${personalKiosk.session(token, sessionToken)}`,
            { method: "DELETE" },
        );
        if (!res.ok && res.status !== 404) {
            // 404 = already gone, treat as success.
            throw new Error("Logout failed.");
        }
    },

    /**
     * "What is this worker on right now?" for the live-session card
     * on the hub. Polled every 15s.
     */
    getLiveStatus: async (
        token: string,
        workerId: number,
    ): Promise<WorkerLiveStatusPayload> => {
        const res = await fetch(
            `${base}${personalKiosk.liveStatus(token, workerId)}`,
        );
        return unwrap(res);
    },

    /* --------- embedded workstation panel --------- */

    getStationContext: async (
        token: string,
        wsId: number,
        sessionToken: string,
    ): Promise<StationContextPayload> => {
        const qs = `?session_token=${encodeURIComponent(sessionToken)}`;
        const res = await fetch(
            `${base}${personalKiosk.stationContext(token, wsId)}${qs}`,
        );
        return unwrap(res);
    },

    searchStationItems: async (
        token: string,
        wsId: number,
        sessionToken: string,
        q: string,
    ): Promise<StationItem[]> => {
        const qs = new URLSearchParams({
            session_token: sessionToken,
            q,
        }).toString();
        const res = await fetch(
            `${base}${personalKiosk.stationItems(token, wsId)}?${qs}`,
        );
        return unwrap(res);
    },

    startStationSession: async (
        token: string,
        wsId: number,
        sessionToken: string,
        opts: {
            itemId?: number | null;
            activityKind?: "mo" | "cleaning" | "maintenance" | "other";
            activityLabel?: string | null;
            moUuid?: string | null;
            moStepUuid?: string | null;
            itemName?: string | null;
            workstationGroupUuid?: string | null;
        } = {},
    ): Promise<StationSession> => {
        const body: Record<string, unknown> = {
            session_token: sessionToken,
            activity_kind: opts.activityKind ?? "other",
        };
        if (opts.itemId) body.item_id = opts.itemId;
        if (opts.activityLabel) body.activity_label = opts.activityLabel;
        if (opts.moUuid) body.mo_uuid = opts.moUuid;
        if (opts.moStepUuid) body.mo_step_uuid = opts.moStepUuid;
        if (opts.itemName) body.item_name = opts.itemName;
        if (opts.workstationGroupUuid)
            body.workstation_group_uuid = opts.workstationGroupUuid;
        const res = await fetch(
            `${base}${personalKiosk.startStationSession(token, wsId)}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            },
        );
        return unwrap(res);
    },

    /**
     * MOs currently in-progress that route to this station. Empty
     * when the station isn't PSP-linked (FE falls back to items).
     */
    getStationMOs: async (
        token: string,
        wsId: number,
        sessionToken: string,
    ): Promise<StationMOsPayload> => {
        const qs = `?session_token=${encodeURIComponent(sessionToken)}`;
        const res = await fetch(
            `${base}${personalKiosk.stationMOs(token, wsId)}${qs}`,
        );
        return unwrap(res);
    },

    /* --------- embedded QC --------- */

    getQCSessions: async (
        token: string,
        sessionToken: string,
        page: number = 1,
        search: string = "",
    ): Promise<QCSessionsPayload> => {
        const p = new URLSearchParams({
            session_token: sessionToken,
            page: String(page),
        });
        if (search) p.set("search", search);
        const res = await fetch(
            `${base}${personalKiosk.qcSessions(token)}?${p.toString()}`,
        );
        return unwrap(res);
    },

    getHistory: async (
        token: string,
        workerId: number,
        sessionToken: string,
        opts: {
            page?: number;
            workstation?: number | null;
            dateFrom?: string | null;
            dateTo?: string | null;
        } = {},
    ): Promise<HistoryPayload> => {
        const p = new URLSearchParams({
            session_token: sessionToken,
            page: String(opts.page ?? 1),
        });
        if (opts.workstation) p.set("workstation", String(opts.workstation));
        if (opts.dateFrom) p.set("date_from", opts.dateFrom);
        if (opts.dateTo) p.set("date_to", opts.dateTo);
        const res = await fetch(
            `${base}${personalKiosk.history(token, workerId)}?${p.toString()}`,
        );
        return unwrap(res);
    },

    searchQCWorkers: async (
        token: string,
        sessionToken: string,
        q: string,
    ): Promise<QCRosterWorker[]> => {
        const p = new URLSearchParams({
            session_token: sessionToken,
            q,
        });
        const res = await fetch(
            `${base}${personalKiosk.qcWorkers(token)}?${p.toString()}`,
        );
        return unwrap(res);
    },

    leaveGeneralFeedback: async (
        token: string,
        sessionToken: string,
        workerId: number,
        mark: "positive" | "negative",
        reason: string,
    ): Promise<{ detail: string; reputation_score: number }> => {
        const res = await fetch(`${base}${personalKiosk.qcFeedback(token)}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                session_token: sessionToken,
                worker_id: workerId,
                mark,
                reason,
            }),
        });
        return unwrap(res);
    },

    verifyQCSession: async (
        token: string,
        sessionId: number,
        sessionToken: string,
        opts: {
            quantityRejected?: number;
            feedback?: QCFeedbackItem[];
        } = {},
    ): Promise<void> => {
        const body: Record<string, unknown> = {
            session_token: sessionToken,
            quantity_rejected: opts.quantityRejected ?? 0,
            feedback: opts.feedback ?? [],
        };
        const res = await fetch(
            `${base}${personalKiosk.qcVerifySession(token, sessionId)}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            },
        );
        await unwrap<unknown>(res);
    },

    stopStationSession: async (
        token: string,
        sessId: number,
        sessionToken: string,
        opts: { quantityProduced?: number | null; notes?: string } = {},
    ): Promise<StationSession> => {
        const body: Record<string, unknown> = {
            session_token: sessionToken,
        };
        if (opts.quantityProduced != null)
            body.quantity_produced = opts.quantityProduced;
        if (opts.notes) body.notes = opts.notes;
        const res = await fetch(
            `${base}${personalKiosk.stopStationSession(token, sessId)}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            },
        );
        return unwrap(res);
    },
};

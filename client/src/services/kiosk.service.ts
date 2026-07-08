import axios from "axios";
import { API_CONFIG } from "@/config/api";
import { KioskState, KioskWorker, KioskActiveSession, KioskItem, KioskCompletedSession, KioskMOsResponse, KioskSelection } from "@/types/kiosk";

const kioskApi = axios.create({
    baseURL: API_CONFIG.baseUrl,
    headers: {
        "Content-Type": "application/json",
    },
});

const { kiosk } = API_CONFIG.endpoints;

export const kioskService = {
    getWorkstation: async (token: string): Promise<KioskState> => {
        const { data } = await kioskApi.get(kiosk.base(token));
        return data;
    },
    getWorkers: async (token: string): Promise<KioskWorker[]> => {
        const { data } = await kioskApi.get(kiosk.workers(token));
        return data;
    },
    verifyPin: async (token: string, worker_id: number, pin: string): Promise<{ id: number; name: string }> => {
        const { data } = await kioskApi.post(kiosk.verifyPin(token), { worker_id, pin });
        return data;
    },
    /** Kick off a session. The selection tells the backend how to
     *  attribute it: an ``item`` maps to legacy ``item_id``; an
     *  ``mo`` maps to ``mo_uuid`` + ``mo_step_uuid`` + activity_kind=mo,
     *  which is what PSP-source-of-truth workstations require. */
    startSession: async (
        token: string,
        worker_ids: number[],
        selection?: KioskSelection | null,
        requested_at?: string
    ): Promise<KioskActiveSession> => {
        const body: Record<string, unknown> = { worker_ids, requested_at };
        if (selection?.kind === "item") {
            body.item_id = selection.item.id;
        } else if (selection?.kind === "mo") {
            body.mo_uuid = selection.mo.mo_uuid;
            body.mo_step_uuid = selection.mo.step_uuid;
            body.activity_kind = "mo";
        }
        const { data } = await kioskApi.post(kiosk.start(token), body);
        return data;
    },
    getActiveSession: async (token: string, workerId?: number): Promise<KioskActiveSession | null> => {
        const { data } = await kioskApi.get(kiosk.active(token), {
            params: workerId ? { worker_id: workerId } : {},
        });
        return data;
    },
    stopSession: async (token: string, worker_id: number, pin: string, quantity_produced: number, notes?: string, requested_at?: string): Promise<KioskCompletedSession> => {
        const { data } = await kioskApi.post(kiosk.stop(token), { worker_id, pin, quantity_produced, notes, requested_at });
        return data.session;
    },

    searchItems: async (token: string, q: string): Promise<KioskItem[]> => {
        const { data } = await kioskApi.get(API_CONFIG.endpoints.kiosk.searchItems(token), { params: { q } });
        return data;
    },

    /** Scoped list — only MOs whose current routing step targets this
     *  workstation. Empty when psp_source_of_truth is false, in which
     *  case the caller falls back to searchItems. */
    listMOs: async (token: string): Promise<KioskMOsResponse> => {
        const { data } = await kioskApi.get<KioskMOsResponse>(
            API_CONFIG.endpoints.kiosk.mos(token)
        );
        return data;
    },

    getSOP: async (token: string): Promise<{ content: string; updated_at: string | null }> => {
        const { data } = await kioskApi.get(API_CONFIG.endpoints.kiosk.sop(token));
        return data;
    },

    getQCWorkers: async (token: string): Promise<KioskWorker[]> => {
        const { data } = await kioskApi.get(kiosk.qcWorkers(token));
        return data;
    },
};
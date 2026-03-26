import axios from "axios";
import { API_CONFIG } from "@/config/api";
import { KioskState, KioskWorker, KioskActiveSession, KioskItem } from "@/types/kiosk";

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
    startSession: async (token: string, worker_ids: number[], item_id?: number | null, requested_at?: string): Promise<KioskActiveSession> => {
        const { data } = await kioskApi.post(kiosk.start(token), { worker_ids, item_id, requested_at });
        return data;
    },
    getActiveSession: async (token: string, workerId?: number): Promise<KioskActiveSession | null> => {
        const { data } = await kioskApi.get(kiosk.active(token), {
            params: workerId ? { worker_id: workerId } : {},
        });
        return data;
    },
    stopSession: async (token: string, worker_id: number, pin: string, quantity_produced: number, notes?: string, requested_at?: string): Promise<void> => {
        await kioskApi.post(kiosk.stop(token), { worker_id, pin, quantity_produced, notes, requested_at });
    },

    searchItems: async (token: string, q: string): Promise<KioskItem[]> => {
        const { data } = await kioskApi.get(API_CONFIG.endpoints.kiosk.searchItems(token), { params: { q } });
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
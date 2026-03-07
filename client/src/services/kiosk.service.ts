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
    startSession: async (token: string, worker_ids: number[], item_id?: number | null): Promise<KioskActiveSession> => {
        const { data } = await kioskApi.post(kiosk.start(token), { worker_ids, item_id });
        return data;
    },
    getActiveSession: async (token: string): Promise<KioskActiveSession | null> => {
        const { data } = await kioskApi.get(kiosk.active(token));
        return data;
    },
    stopSession: async (token: string, worker_id: number, pin: string, quantity_produced: number, notes?: string): Promise<void> => {
        await kioskApi.post(kiosk.stop(token), { worker_id, pin, quantity_produced, notes });
    },

    searchItems: async (token: string, q: string): Promise<KioskItem[]> => {
        const { data } = await kioskApi.get(API_CONFIG.endpoints.kiosk.searchItems(token), { params: { q } });
        return data;
    },
};
import axios from "axios";
import { API_CONFIG } from "@/config/api";
import { QCWorker, QCWorkstation, QCSession } from "@/types/qc";
import api from "@/lib/api";

const qcApi = axios.create({
    baseURL: API_CONFIG.baseUrl,
    headers: {
        "Content-Type": "application/json",
    },
});

const { qc } = API_CONFIG.endpoints;

export const qcDashboardService = {
    getToken: async (): Promise<string> => {
        const { data } = await api.get(API_CONFIG.endpoints.qc.token);
        return data.token;
    },
    regenerateToken: async (): Promise<string> => {
        const { data } = await api.post(API_CONFIG.endpoints.qc.token);
        return data.token;
    },
};

export const qcService = {
    getToken: async (): Promise<string> => {
        const { data } = await qcApi.get(qc.token);
        return data.token;
    },

    regenerateToken: async (): Promise<string> => {
        const { data } = await qcApi.post(qc.token);
        return data.token;
    },

    getWorkers: async (token: string): Promise<QCWorker[]> => {
        const { data } = await qcApi.get(qc.workers(token));
        return data;
    },

    verifyPin: async (token: string, worker_id: number, pin: string): Promise<{ id: number; name: string }> => {
        const { data } = await qcApi.post(qc.verifyPin(token), { worker_id, pin });
        return data;
    },

    getWorkstations: async (token: string): Promise<QCWorkstation[]> => {
        const { data } = await qcApi.get(qc.workstations(token));
        return data;
    },

    getSessions: async (token: string, workstationId: number): Promise<QCSession[]> => {
        const { data } = await qcApi.get(qc.sessions(token, workstationId));
        return data;
    },

    verifySession: async (token: string, sessionId: number, quantity_rejected: number): Promise<void> => {
        await qcApi.post(qc.verifySession(token, sessionId), { quantity_rejected });
    },
};
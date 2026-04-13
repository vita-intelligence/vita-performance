import axios from "axios";
import { API_CONFIG } from "@/config/api";
import { QCWorker, QCWorkstation, QCSessionPage, QCSessionFilters, QCVerifyPayload } from "@/types/qc";
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

    getAllWorkers: async (token: string): Promise<QCWorker[]> => {
        const { data } = await qcApi.get(qc.allWorkers(token));
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

    getSessions: async (token: string, filters: QCSessionFilters = {}): Promise<QCSessionPage> => {
        const params: Record<string, string | number> = {};
        if (filters.search) params.search = filters.search;
        if (filters.workstation) params.workstation = filters.workstation;
        if (filters.date_from) params.date_from = filters.date_from;
        if (filters.date_to) params.date_to = filters.date_to;
        if (filters.page) params.page = filters.page;
        if (filters.page_size) params.page_size = filters.page_size;
        const { data } = await qcApi.get(qc.sessions(token), { params });
        return data;
    },

    verifySession: async (token: string, sessionId: number, payload: QCVerifyPayload): Promise<void> => {
        await qcApi.post(qc.verifySession(token, sessionId), payload);
    },

    leaveGeneralFeedback: async (
        token: string,
        payload: { worker_id: number; mark: 'positive' | 'negative'; reason: string; qc_inspector_id: number },
    ): Promise<void> => {
        await qcApi.post(qc.feedback(token), payload);
    },
};

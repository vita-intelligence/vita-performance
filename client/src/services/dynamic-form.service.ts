import api from "@/lib/api";
import axios from "axios";
import { API_CONFIG } from "@/config/api";
import { DynamicForm, KioskForm, FormResponse, CreateFormPayload, UpdateFormPayload } from "@/types/dynamic-form";

const { dynamicForms, kiosk } = API_CONFIG.endpoints;

const kioskApi = axios.create({
    baseURL: API_CONFIG.baseUrl,
    headers: { "Content-Type": "application/json" },
});

export const dynamicFormService = {
    getAll: async (): Promise<DynamicForm[]> => {
        const { data } = await api.get<DynamicForm[]>(dynamicForms.base);
        return data;
    },

    getOne: async (id: number): Promise<DynamicForm> => {
        const { data } = await api.get<DynamicForm>(dynamicForms.detail(id));
        return data;
    },

    create: async (payload: CreateFormPayload): Promise<DynamicForm> => {
        const { data } = await api.post<DynamicForm>(dynamicForms.base, payload);
        return data;
    },

    update: async (id: number, payload: UpdateFormPayload): Promise<DynamicForm> => {
        const { data } = await api.patch<DynamicForm>(dynamicForms.detail(id), payload);
        return data;
    },

    delete: async (id: number): Promise<void> => {
        await api.delete(dynamicForms.detail(id));
    },

    // Kiosk — public endpoints
    getKioskForms: async (token: string, trigger: string): Promise<KioskForm[]> => {
        const { data } = await kioskApi.get<KioskForm[]>(kiosk.forms(token, trigger));
        return data;
    },

    submitResponse: async (token: string, formId: number, sessionId: number, answers: Record<string, any>): Promise<FormResponse> => {
        const { data } = await kioskApi.post<FormResponse>(kiosk.formRespond(token, formId), {
            session_id: sessionId,
            answers,
        });
        return data;
    },

    getSessionResponses: async (sessionId: number): Promise<any[]> => {
        const { data } = await api.get(dynamicForms.sessionResponses(sessionId));
        return data;
    },
};
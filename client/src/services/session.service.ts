import api from "@/lib/api";
import { API_CONFIG } from "@/config/api";
import {
  WorkSession,
  StartSessionPayload,
  StopSessionPayload,
  CreateSessionPayload,
  UpdateSessionPayload,
} from "@/types/session";
import { PaginatedResponse } from "@/types/api";

const { sessions } = API_CONFIG.endpoints;

export const sessionService = {
  getAll: async (page: number = 1, search?: string, status?: string): Promise<PaginatedResponse<WorkSession>> => {
    const { data } = await api.get<PaginatedResponse<WorkSession>>(sessions.base, {
      params: { page, ...(search ? { search } : {}), ...(status ? { status } : {}) },
    });
    return data;
  },

  getOne: async (id: number): Promise<WorkSession> => {
    const { data } = await api.get<WorkSession>(sessions.detail(id));
    return data;
  },

  getActive: async (): Promise<WorkSession[]> => {
    const { data } = await api.get<WorkSession[]>(sessions.active);
    return data;
  },

  start: async (payload: StartSessionPayload): Promise<WorkSession> => {
    const { data } = await api.post<WorkSession>(sessions.start, payload);
    return data;
  },

  stop: async (id: number, payload: StopSessionPayload): Promise<WorkSession> => {
    const { data } = await api.post<WorkSession>(sessions.stop(id), payload);
    return data;
  },

  create: async (payload: CreateSessionPayload): Promise<WorkSession> => {
    const { data } = await api.post<WorkSession>(sessions.base, payload);
    return data;
  },

  update: async (id: number, payload: UpdateSessionPayload): Promise<WorkSession> => {
    const { data } = await api.patch<WorkSession>(sessions.detail(id), payload);
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(sessions.detail(id));
  },
};
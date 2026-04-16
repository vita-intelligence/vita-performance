import api from "@/lib/api";
import { API_CONFIG } from "@/config/api";
import { Workstation, CreateWorkstationPayload, UpdateWorkstationPayload, SOP, WorkstationStats } from "@/types/workstation";
import { PaginatedResponse } from "@/types/api";

const { workstations, dashboard } = API_CONFIG.endpoints;

export const workstationService = {
  getAll: async (): Promise<Workstation[]> => {
    const { data } = await api.get<Workstation[]>(workstations.base, {
      params: { all: 'true' },
    });
    return data;
  },

  getPaginated: async (page: number = 1): Promise<PaginatedResponse<Workstation>> => {
    const { data } = await api.get<PaginatedResponse<Workstation>>(workstations.base, {
      params: { page },
    });
    return data;
  },

  getOne: async (id: number): Promise<Workstation> => {
    const { data } = await api.get<Workstation>(workstations.detail(id));
    return data;
  },

  create: async (payload: CreateWorkstationPayload): Promise<Workstation> => {
    const { data } = await api.post<Workstation>(workstations.base, payload);
    return data;
  },

  update: async (id: number, payload: UpdateWorkstationPayload): Promise<Workstation> => {
    const { data } = await api.patch<Workstation>(workstations.detail(id), payload);
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(workstations.detail(id));
  },

  getSOP: async (id: number): Promise<SOP> => {
    const { data } = await api.get<SOP>(workstations.sop(id));
    return data;
  },
  
  updateSOP: async (id: number, content: string): Promise<SOP> => {
    const { data } = await api.put<SOP>(workstations.sop(id), { content });
    return data;
  },

  getStats: async (id: number, range: string): Promise<WorkstationStats> => {
    const { data } = await api.get<WorkstationStats>(dashboard.workstationStats(id), {
      params: { range },
    });
    return data;
  },
};
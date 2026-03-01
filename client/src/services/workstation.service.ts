import api from "@/lib/api";
import { API_CONFIG } from "@/config/api";
import { Workstation, CreateWorkstationPayload, UpdateWorkstationPayload } from "@/types/workstation";

const { workstations } = API_CONFIG.endpoints;

export const workstationService = {
  getAll: async (): Promise<Workstation[]> => {
    const { data } = await api.get<Workstation[]>(workstations.base);
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
};
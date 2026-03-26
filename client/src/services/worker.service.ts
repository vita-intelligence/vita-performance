import api from "@/lib/api";
import { API_CONFIG } from "@/config/api";
import {
  Worker,
  WorkerGroup,
  CreateWorkerPayload,
  UpdateWorkerPayload,
  CreateWorkerGroupPayload,
  UpdateWorkerGroupPayload,
  WorkerLeaderboard,
  WorkerStats,
} from "@/types/worker";
import { PaginatedResponse } from "@/types/api";

const { workers, dashboard } = API_CONFIG.endpoints;

export const workerService = {
  getAll: async (): Promise<Worker[]> => {
    const { data } = await api.get<Worker[]>(workers.base, {
      params: { all: 'true' },
    });
    return data;
  },

  getPaginated: async (page: number = 1): Promise<PaginatedResponse<Worker>> => {
    const { data } = await api.get<PaginatedResponse<Worker>>(workers.base, {
      params: { page },
    });
    return data;
  },

  getStats: async (id: number, range: string = 'month'): Promise<WorkerStats> => {
      const { data } = await api.get<WorkerStats>(dashboard.workerStats(id), {
          params: { range },
      });
      return data;
  },

  getLeaderboard: async (range: string = 'today'): Promise<WorkerLeaderboard> => {
    const { data } = await api.get<WorkerLeaderboard>(workers.leaderboard, {
        params: { range },
    });
    return data;
},

  getOne: async (id: number): Promise<Worker> => {
    const { data } = await api.get<Worker>(workers.detail(id));
    return data;
  },

  create: async (payload: CreateWorkerPayload): Promise<Worker> => {
    const { data } = await api.post<Worker>(workers.base, payload);
    return data;
  },

  update: async (id: number, payload: UpdateWorkerPayload): Promise<Worker> => {
    const { data } = await api.patch<Worker>(workers.detail(id), payload);
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(workers.detail(id));
  },

  getAllGroups: async (): Promise<WorkerGroup[]> => {
    const { data } = await api.get<WorkerGroup[]>(workers.groups, {
      params: { all: 'true' },
    });
    return data;
  },

  getPaginatedGroups: async (page: number = 1): Promise<PaginatedResponse<WorkerGroup>> => {
    const { data } = await api.get<PaginatedResponse<WorkerGroup>>(workers.groups, {
      params: { page },
    });
    return data;
  },

  createGroup: async (payload: CreateWorkerGroupPayload): Promise<WorkerGroup> => {
    const { data } = await api.post<WorkerGroup>(workers.groups, payload);
    return data;
  },

  updateGroup: async (id: number, payload: UpdateWorkerGroupPayload): Promise<WorkerGroup> => {
    const { data } = await api.patch<WorkerGroup>(workers.groupDetail(id), payload);
    return data;
  },

  deleteGroup: async (id: number): Promise<void> => {
    await api.delete(workers.groupDetail(id));
  },
};
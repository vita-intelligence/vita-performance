import api from "@/lib/api";
import { API_CONFIG } from "@/config/api";
import {
  Worker,
  WorkerDayOverview,
  WorkerGroup,
  WorkerShift,
  WorkerStationsPayload,
  WorkerTodaySummary,
  CreateWorkerPayload,
  UpdateWorkerPayload,
  CreateWorkerGroupPayload,
  UpdateWorkerGroupPayload,
  WorkerLeaderboard,
  WorkerStats,
  ReputationTimelinePage,
  ReputationTimelineFilters,
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

  // Personal-kiosk shift methods.
  getActiveShift: async (workerId: number): Promise<WorkerShift | null> => {
    const res = await api.get<WorkerShift>(workers.shiftActive, {
      params: { worker_id: workerId },
      // 204 means "clocked out" — swallow it here, don't treat as error.
      validateStatus: (s) => s === 200 || s === 204,
    });
    if (res.status === 204) return null;
    return res.data;
  },

  startShift: async (
    workerId: number,
    pin: string,
    deviceId?: string,
  ): Promise<WorkerShift> => {
    const { data } = await api.post<WorkerShift>(workers.shiftStart, {
      worker_id: workerId,
      pin,
      device_id: deviceId,
    });
    return data;
  },

  endShift: async (shiftId: number, notes?: string): Promise<WorkerShift> => {
    const { data } = await api.post<WorkerShift>(workers.shiftEnd(shiftId), {
      notes,
    });
    return data;
  },

  getTodaySummary: async (workerId: number): Promise<WorkerTodaySummary> => {
    const { data } = await api.get<WorkerTodaySummary>(
      workers.todaySummary(workerId),
    );
    return data;
  },

  getStations: async (workerId: number): Promise<WorkerStationsPayload> => {
    const { data } = await api.get<WorkerStationsPayload>(
      workers.stations(workerId),
    );
    return data;
  },

  getDayOverview: async (
    workerId: number,
    date: string,
  ): Promise<WorkerDayOverview> => {
    const { data } = await api.get<WorkerDayOverview>(
      workers.dayOverview(workerId, date),
    );
    return data;
  },

  getReputationEvents: async (
    page: number,
    filters: ReputationTimelineFilters = {},
  ): Promise<ReputationTimelinePage> => {
    const params: Record<string, string | number> = { page };
    if (filters.search) params.search = filters.search;
    if (filters.worker) params.worker = filters.worker;
    if (filters.category) params.category = filters.category;
    if (filters.sign) params.sign = filters.sign;
    if (filters.date_from) params.date_from = filters.date_from;
    if (filters.date_to) params.date_to = filters.date_to;
    if (filters.page_size) params.page_size = filters.page_size;
    const { data } = await api.get<ReputationTimelinePage>(workers.reputationEvents, { params });
    return data;
  },
};
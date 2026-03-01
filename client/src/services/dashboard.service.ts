import api from "@/lib/api";
import { API_CONFIG } from "@/config/api";
import { DashboardOverview } from "@/types/dashboard";

export const dashboardService = {
  getOverview: async (): Promise<DashboardOverview> => {
    const { data } = await api.get<DashboardOverview>(API_CONFIG.endpoints.dashboard.overview);
    return data;
  },
};
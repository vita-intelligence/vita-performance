import { useQuery } from "@tanstack/react-query";
import { dashboardService } from "@/services/dashboard.service";

const DASHBOARD_KEY = ["dashboard", "overview"];

export const useDashboard = () => {
  const { data: overview, isLoading } = useQuery({
    queryKey: DASHBOARD_KEY,
    queryFn: dashboardService.getOverview,
    retry: false,
    refetchInterval: 60000, // refetch every minute
  });

  return {
    overview,
    isLoading,
  };
};
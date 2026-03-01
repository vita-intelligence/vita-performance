export interface DashboardOverview {
  workers: {
    total: number;
    active: number;
  };
  workstations: {
    total: number;
    active: number;
  };
  active_sessions: number;
  today: {
    wage_cost: number;
    avg_performance: number | null;
    sessions_count: number;
    best_workstation: {
      name: string;
      avg_performance: number;
    } | null;
    best_worker: {
      name: string;
      avg_performance: number;
    } | null;
  };
  recent_sessions: {
    id: number;
    worker_name: string;
    workstation_name: string;
    duration_hours: number | null;
    performance_percentage: number | null;
    wage_cost: number | null;
    start_time: string;
  }[];
}
export interface WorkerGroup {
  id: number;
  name: string;
  description: string | null;
  workers_count: number;
  created_at: string;
  updated_at: string;
}

export interface WorkerStatsSummary {
    sessions_count: number;
    avg_performance: number | null;
    best_performance: number | null;
    total_quantity: number;
    total_hours: number;
    total_wage_cost: number;
}

export interface WorkerStatsChartPoint {
    date: string;
    avg_performance: number | null;
    sessions_count: number;
    total_quantity: number;
}

export interface WorkerStatsSession {
    id: number;
    workstation_name: string;
    date: string;
    duration_hours: number | null;
    quantity_produced: number | null;
    performance_percentage: number | null;
    item_name?: string | null;
    wage_cost: number | null;
    worker_count: number;
}

export interface WorkerStats {
    worker: {
        id: number;
        name: string;
        hourly_rate: number;
        is_active: boolean;
    };
    summary: WorkerStatsSummary;
    chart: WorkerStatsChartPoint[];
    sessions: WorkerStatsSession[];
    range: string;
    grouping: 'hour' | 'day' | 'week';
}

export interface WorkerLeaderboardEntry {
    id: number;
    name: string;
    hourly_rate: number;
    sessions_count: number;
    avg_performance: number | null;
    total_quantity: number | null;
}

export interface WorkerLeaderboard {
    range: string;
    results: WorkerLeaderboardEntry[];
}

export interface Worker {
  id: number;
  full_name: string;
  hourly_rate: number;
  is_active: boolean;
  group: number | null;
  group_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateWorkerPayload {
  full_name: string;
  hourly_rate: number;
  group?: number;
}

export interface UpdateWorkerPayload extends Partial<CreateWorkerPayload> {
  is_active?: boolean;
}

export interface CreateWorkerGroupPayload {
  name: string;
  description?: string;
}

export interface UpdateWorkerGroupPayload extends Partial<CreateWorkerGroupPayload> {}
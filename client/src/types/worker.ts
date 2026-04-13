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
    status: "completed" | "verified";
}

export type ReputationTier = 'poor' | 'fair' | 'good' | 'very_good' | 'excellent';

export type ReputationEventType =
    | 'auto_perf_excellent'
    | 'auto_perf_high'
    | 'auto_perf_low'
    | 'auto_perf_very_low'
    | 'manual_positive'
    | 'manual_negative';

export interface WorkerReputationEvent {
    id: number;
    event_type: ReputationEventType;
    score_delta: number;
    reason: string;
    session_id: number | null;
    session_workstation: string | null;
    created_by: string | null;
    created_at: string;
}

export interface ReputationTimelineEvent {
    id: number;
    worker_id: number;
    worker_name: string;
    event_type: ReputationEventType;
    score_delta: number;
    reason: string;
    session_id: number | null;
    session_workstation: string | null;
    created_by_id: number | null;
    created_by_name: string | null;
    created_at: string;
}

export interface ReputationTimelinePage {
    count: number;
    page: number;
    page_size: number;
    total_pages: number;
    has_more: boolean;
    results: ReputationTimelineEvent[];
}

export interface ReputationTimelineFilters {
    search?: string;
    worker?: number | null;
    category?: 'auto' | 'manual' | null;
    sign?: 'positive' | 'negative' | null;
    date_from?: string;
    date_to?: string;
    page_size?: number;
}

export interface WorkerStats {
    worker: {
        id: number;
        name: string;
        hourly_rate: number;
        is_active: boolean;
        reputation_score: number;
        reputation_tier: ReputationTier;
    };
    reputation_history: WorkerReputationEvent[];
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
  is_qa: boolean;
  has_pin: boolean;
  group: number | null;
  group_name: string | null;
  reputation_score: number;
  reputation_tier: ReputationTier;
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
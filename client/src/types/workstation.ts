export interface EffectiveSettings {
  working_hours_per_day: number;
  overtime_threshold: number;
  overtime_multiplier: number;
  week_starts_on: 'monday' | 'sunday';
}

export interface Workstation {
  id: number;
  name: string;
  description: string | null;
  kiosk_token: string;
  is_active: boolean;
  is_general: boolean;
  created_at: string;
  updated_at: string;
  target_quantity: number | null;
  target_duration: number | null;
  uom: string | null;
  performance_formula: string | null;
  working_hours_per_day: number | null;
  overtime_threshold: number | null;
  overtime_multiplier: number | null;
  week_starts_on: 'monday' | 'sunday' | null;
  effective_settings: EffectiveSettings;
}

export interface CreateWorkstationPayload {
  name: string;
  description?: string;
  is_general?: boolean;
  target_quantity?: number;
  target_duration?: number;
  uom?: string;
  performance_formula?: string;
  working_hours_per_day?: number;
  overtime_threshold?: number;
  overtime_multiplier?: number;
  week_starts_on?: 'monday' | 'sunday';
}

export interface UpdateWorkstationPayload extends Partial<CreateWorkstationPayload> {
  is_active?: boolean;
}

export interface SOP {
    id: number;
    content: string;
    created_at: string;
    updated_at: string;
}

export interface WorkstationStatsSummary {
    sessions_count: number;
    avg_performance: number | null;
    best_performance: number | null;
    worst_performance: number | null;
    total_quantity: number;
    total_rejected: number;
    total_hours: number;
    total_overtime_hours: number;
    total_wage_cost: number;
    avg_time_per_unit: number | null;
    unique_workers_count: number;
}

export interface WorkstationStatsChartPoint {
    date: string;
    avg_performance: number | null;
    sessions_count: number;
    total_quantity: number;
}

export interface WorkstationTopWorker {
    id: number;
    name: string;
    sessions_count: number;
    avg_performance: number | null;
    total_quantity: number;
    total_hours: number;
}

export interface WorkstationItemBreakdown {
    id: number | null;
    name: string;
    sessions_count: number;
    total_quantity: number;
    avg_performance: number | null;
}

export interface WorkstationStatsSession {
    id: number;
    worker_names: string[];
    date: string;
    duration_hours: number | null;
    quantity_produced: number | null;
    performance_percentage: number | null;
    wage_cost: number | null;
    item_name: string | null;
    worker_count: number;
    status: "completed" | "verified";
}

export interface WorkstationStatsInfo {
    id: number;
    name: string;
    description: string | null;
    is_active: boolean;
    is_general: boolean;
    target_quantity: number | null;
    target_duration: number | null;
    uom: string | null;
    performance_formula: string | null;
    effective_settings: EffectiveSettings;
}

export interface WorkstationStats {
    workstation: WorkstationStatsInfo;
    summary: WorkstationStatsSummary;
    chart: WorkstationStatsChartPoint[];
    top_workers: WorkstationTopWorker[];
    items_breakdown: WorkstationItemBreakdown[];
    sessions: WorkstationStatsSession[];
    range: string;
    grouping: 'hour' | 'day' | 'week';
}
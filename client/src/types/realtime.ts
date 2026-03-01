export interface RealtimeSession {
  id: number;
  worker_name: string;
  workstation_name: string;
  start_time: string;
  status: string;
}

export interface WorkstationStatus {
  id: number;
  name: string;
  is_active: boolean;
  has_active_session: boolean;
}

export interface LeaderboardEntry {
  worker_id: number;
  worker_name: string;
  sessions_count: number;
  avg_performance: number | null;
}

export interface RealtimeSummary {
  active_sessions_count: number;
  completed_today: number;
  avg_performance: number | null;
}

export interface RealtimeDashboardData {
  type: string;
  active_sessions: RealtimeSession[];
  workstation_statuses: WorkstationStatus[];
  leaderboard: LeaderboardEntry[];
  summary: RealtimeSummary;
  alerts: RealtimeAlert[];
}

export interface RealtimeAlert {
  id: string;
  type: "info" | "success" | "warning" | "milestone";
  code: string;
  data: Record<string, string | number>;
}

export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";
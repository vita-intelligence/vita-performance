import { Worker } from "@/types/worker";

export interface WorkSession {
  id: number;
  workstation: number;
  workstation_name: string;
  workers: Worker[];
  status: "active" | "completed";
  start_time: string;
  end_time: string | null;
  quantity_produced: number | null;
  notes: string | null;
  duration_hours: number | null;
  performance_percentage: number | null;
  overtime_hours: number | null;
  wage_cost: number | null;
  created_at: string;
  updated_at: string;
}

export interface StartSessionPayload {
  workstation: number;
  worker_ids: number[];
}

export interface StopSessionPayload {
  quantity_produced: number;
  notes?: string;
}

export interface CreateSessionPayload {
  workstation: number;
  worker_ids: number[];
  start_time: string;
  end_time: string;
  quantity_produced: number;
  notes?: string;
  status: "completed";
}

export interface UpdateSessionPayload {
  start_time?: string;
  end_time?: string;
  quantity_produced?: number;
  notes?: string;
}
export interface WorkerGroup {
  id: number;
  name: string;
  description: string | null;
  workers_count: number;
  created_at: string;
  updated_at: string;
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
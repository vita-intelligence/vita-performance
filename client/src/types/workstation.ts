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
  is_active: boolean;
  created_at: string;
  updated_at: string;
  working_hours_per_day: number | null;
  overtime_threshold: number | null;
  overtime_multiplier: number | null;
  week_starts_on: 'monday' | 'sunday' | null;
  effective_settings: EffectiveSettings;
}

export interface CreateWorkstationPayload {
  name: string;
  description?: string;
  working_hours_per_day?: number;
  overtime_threshold?: number;
  overtime_multiplier?: number;
  week_starts_on?: 'monday' | 'sunday';
}

export interface UpdateWorkstationPayload extends Partial<CreateWorkstationPayload> {
  is_active?: boolean;
}
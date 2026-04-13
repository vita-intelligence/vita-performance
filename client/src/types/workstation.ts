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
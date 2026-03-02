export interface UserSettings {
  id: number;
  currency: string;
  currency_symbol: string;
  date_format: string;
  time_format: '12h' | '24h';
  timezone: string;
  language: string;
  decimal_separator: '.' | ',';
  thousands_separator: ',' | '.' | ' ';
  working_hours_per_day: number;
  working_days_per_week: number;
  overtime_threshold: number;
  overtime_multiplier: number;
  week_starts_on: 'monday' | 'sunday';
  work_start_time: string;
}

export interface UpdateSettingsPayload extends Partial<Omit<UserSettings, 'id'>> {}
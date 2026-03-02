import { z } from "zod";

export const settingsSchema = z.object({
  language: z.string().min(1),
  timezone: z.string().min(1),
  date_format: z.string().min(1),
  time_format: z.enum(["12h", "24h"]),
  currency: z.string().min(1).max(3),
  currency_symbol: z.string().min(1).max(5),
  decimal_separator: z.enum([".", ","]),
  thousands_separator: z.enum([",", ".", " "]),
  working_hours_per_day: z.coerce.number().min(1).max(24),
  working_days_per_week: z.coerce.number().min(1).max(7),
  overtime_threshold: z.coerce.number().min(1).max(24),
  overtime_multiplier: z.coerce.number().min(1).max(5),
  week_starts_on: z.enum(["monday", "sunday"]),
  work_start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Must be in HH:MM format"),
});

export type SettingsFormData = z.infer<typeof settingsSchema>;
import { z } from "zod";

const optionalNumber = z.union([
  z.coerce.number().min(1),
  z.literal("").transform(() => undefined),
]).optional();

export const workstationSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
  is_general: z.boolean().optional(),
  uom: z.string().max(20).optional(),
  performance_formula: z.string().max(500).optional(),
  target_quantity: z.union([
    z.coerce.number().min(1, "Must be at least 1"),
    z.literal("").transform(() => undefined),
  ]).optional(),
  target_duration: z.union([
    z.coerce.number().min(0.1, "Must be at least 0.1"),
    z.literal("").transform(() => undefined),
  ]).optional(),
  working_hours_per_day: optionalNumber,
  overtime_threshold: optionalNumber,
  overtime_multiplier: optionalNumber,
  week_starts_on: z.enum(["monday", "sunday"]).optional(),
});

export type WorkstationFormData = z.infer<typeof workstationSchema>;
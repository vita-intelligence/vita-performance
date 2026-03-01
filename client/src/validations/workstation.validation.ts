import { z } from "zod";

const optionalNumber = z.union([
  z.coerce.number().min(1),
  z.literal("").transform(() => undefined),
]).optional();

export const workstationSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
  target_quantity: optionalNumber,
  target_duration: optionalNumber,
  working_hours_per_day: optionalNumber,
  overtime_threshold: optionalNumber,
  overtime_multiplier: optionalNumber,
  week_starts_on: z.enum(["monday", "sunday"]).optional(),
});

export type WorkstationFormData = z.infer<typeof workstationSchema>;
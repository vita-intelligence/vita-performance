import { z } from "zod";

export const workerSchema = z.object({
  full_name: z.string().min(1, "Full name is required").max(200),
  hourly_rate: z.coerce.number().min(0.01, "Hourly rate is required"),
  group: z.coerce.number().optional(),
  pin: z.string().length(4, "PIN must be exactly 4 digits").regex(/^\d{4}$/, "PIN must be 4 digits").optional().or(z.literal("")),
  is_qa: z.boolean().optional(),
});

export const groupSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
});

export type WorkerFormData = z.infer<typeof workerSchema>;
export type GroupFormData = z.infer<typeof groupSchema>;
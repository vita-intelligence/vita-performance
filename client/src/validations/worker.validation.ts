import { z } from "zod";

export const workerSchema = z.object({
  full_name: z.string().min(1, "Full name is required").max(200),
  hourly_rate: z.coerce.number().min(0.01, "Hourly rate is required"),
  group: z.coerce.number().optional(),
});

export const groupSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
});

export type WorkerFormData = z.infer<typeof workerSchema>;
export type GroupFormData = z.infer<typeof groupSchema>;
import { z } from "zod";

export const stopSessionSchema = z.object({
  quantity_produced: z.coerce.number({ required_error: "Quantity is required" }).min(0.01, "Must be greater than 0"),
  notes: z.string().max(500).optional(),
});

export const liveSessionSchema = z.object({
  workstation: z.coerce.number({ required_error: "Workstation is required" }),
  worker: z.coerce.number({ required_error: "Worker is required" }),
});

export const manualSessionSchema = z.object({
  workstation: z.coerce.number({ required_error: "Workstation is required" }),
  worker: z.coerce.number({ required_error: "Worker is required" }),
  start_time: z.string().min(1, "Start time is required"),
  end_time: z.string().min(1, "End time is required"),
  quantity_produced: z.coerce.number({ required_error: "Quantity is required" }).min(0.01, "Must be greater than 0"),
  notes: z.string().max(500).optional(),
});

export type StopSessionFormData = z.infer<typeof stopSessionSchema>;
export type LiveSessionFormData = z.infer<typeof liveSessionSchema>;
export type ManualSessionFormData = z.infer<typeof manualSessionSchema>;
import { z } from "zod";

export const itemSchema = z.object({
    name: z.string().min(1, "Name is required").max(255),
});

export type ItemFormData = z.infer<typeof itemSchema>;
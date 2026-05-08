import { z } from "zod";

export const slaPrioritySchema = z.enum([
  "LOW",
  "NORMAL",
  "HIGH",
  "URGENT",
]);

export const updateSlaPolicySchema = z.object({
  priority: slaPrioritySchema,
  firstResponseMinutes: z.number().int().positive().max(60 * 24 * 30),
  resolutionMinutes: z.number().int().positive().max(60 * 24 * 90),
  enabled: z.boolean(),
});

export type UpdateSlaPolicyInput = z.infer<typeof updateSlaPolicySchema>;

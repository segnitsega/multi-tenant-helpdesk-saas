import { z } from "zod";

export const analyticsQuerySchema = z.object({
  range: z.enum(["7d", "30d", "90d", "custom"]).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  agent: z.string().uuid().optional().or(z.literal("")),
});

export type AnalyticsQueryInput = z.infer<typeof analyticsQuerySchema>;

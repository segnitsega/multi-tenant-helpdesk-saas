import { z } from "zod";

export const widgetPrechatSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().email().max(320),
  message: z.string().trim().min(1).max(5_000),
  honeypot: z.string().optional().default(""),
});

export const widgetReplySchema = z.object({
  message: z.string().trim().min(1).max(5_000),
  ticketNumber: z.number().int().positive(),
  honeypot: z.string().optional().default(""),
});

export const updateWidgetSettingsSchema = z.object({
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  greeting: z.string().trim().min(1).max(200),
  allowedOrigins: z
    .array(z.union([z.string().url(), z.literal("*")]))
    .max(50),
  showPoweredBy: z.boolean(),
});

export type WidgetPrechatInput = z.infer<typeof widgetPrechatSchema>;
export type WidgetReplyInput = z.infer<typeof widgetReplySchema>;
export type UpdateWidgetSettingsInput = z.infer<typeof updateWidgetSettingsSchema>;

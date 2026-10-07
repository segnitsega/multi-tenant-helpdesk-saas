import { z } from "zod";

export const cannedReplyInputSchema = z.object({
  title: z.string().trim().min(1).max(120),
  shortcut: z.string().trim().max(40).nullable().optional(),
  bodyHtml: z.string().trim().min(1).max(50_000),
});

export type CannedReplyInput = z.infer<typeof cannedReplyInputSchema>;

export const cannedReplyIdSchema = z.object({
  id: z.string().uuid(),
});

export const updateCannedReplySchema = cannedReplyInputSchema
  .partial()
  .extend({ id: z.string().uuid() })
  .refine((value) => Object.keys(value).some((key) => key !== "id"), {
    message: "At least one field is required",
  });

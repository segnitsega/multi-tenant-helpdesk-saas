import { z } from "zod";

export const addReplySchema = z.object({
  ticketNumber: z.number().int().positive(),
  bodyHtml: z.string().trim().min(1).max(50_000),
  attachmentIds: z.array(z.string().uuid()).max(20).optional(),
  afterStatus: z.enum(["PENDING", "RESOLVED"]).optional(),
});

export type AddReplyInput = z.infer<typeof addReplySchema>;

export const addNoteSchema = z.object({
  ticketNumber: z.number().int().positive(),
  bodyHtml: z.string().trim().min(1).max(50_000),
  attachmentIds: z.array(z.string().uuid()).max(20).optional(),
});

export type AddNoteInput = z.infer<typeof addNoteSchema>;

export const listMessagesSchema = z.object({
  ticketNumber: z.number().int().positive(),
});

import { z } from "zod";

export const addReplySchema = z.object({
  ticketNumber: z.number().int().positive(),
  bodyHtml: z.string().trim().min(1).max(50_000),
});

export type AddReplyInput = z.infer<typeof addReplySchema>;

export const addNoteSchema = z.object({
  ticketNumber: z.number().int().positive(),
  bodyHtml: z.string().trim().min(1).max(50_000),
});

export type AddNoteInput = z.infer<typeof addNoteSchema>;

export const listMessagesSchema = z.object({
  ticketNumber: z.number().int().positive(),
});

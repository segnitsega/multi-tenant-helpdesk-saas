import { z } from "zod";

export const portalMagicLinkSchema = z.object({
  email: z.string().email().max(320),
});

export const portalReplySchema = z.object({
  bodyHtml: z.string().min(1).max(50_000),
  attachmentIds: z.array(z.string().uuid()).max(10).optional(),
});

export const portalNewRequestSchema = z.object({
  subject: z.string().trim().min(1).max(200),
  bodyHtml: z.string().min(1).max(50_000),
});

export type PortalMagicLinkInput = z.infer<typeof portalMagicLinkSchema>;
export type PortalReplyInput = z.infer<typeof portalReplySchema>;
export type PortalNewRequestInput = z.infer<typeof portalNewRequestSchema>;

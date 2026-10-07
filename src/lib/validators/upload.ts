import { z } from "zod";
import {
  ALLOWED_UPLOAD_MIME_TYPES,
  MAX_UPLOAD_BYTES,
} from "@/config/uploads";

export const presignUploadSchema = z.object({
  ticketNumber: z.number().int().positive(),
  filename: z.string().trim().min(1).max(255),
  contentType: z.enum(ALLOWED_UPLOAD_MIME_TYPES),
  sizeBytes: z.number().int().positive().max(MAX_UPLOAD_BYTES),
});

export type PresignUploadInput = z.infer<typeof presignUploadSchema>;

export const confirmUploadSchema = z.object({
  attachmentId: z.string().uuid(),
});

export type ConfirmUploadInput = z.infer<typeof confirmUploadSchema>;

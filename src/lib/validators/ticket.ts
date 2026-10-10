import { z } from "zod";

export const ticketStatusSchema = z.enum([
  "OPEN",
  "PENDING",
  "ON_HOLD",
  "RESOLVED",
  "CLOSED",
]);

export const prioritySchema = z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]);

export const channelSchema = z.enum(["EMAIL", "WIDGET", "PORTAL", "MANUAL"]);

export const createTicketSchema = z.object({
  subject: z.string().trim().min(1).max(300),
  bodyHtml: z.string().trim().min(1).max(50_000),
  customerEmail: z.string().trim().email().max(255),
  customerName: z.string().trim().max(120).optional(),
  priority: prioritySchema.default("NORMAL"),
  channel: channelSchema.default("MANUAL"),
  assigneeMembershipId: z.string().uuid().nullable().optional(),
  tagIds: z.array(z.string().uuid()).max(20).optional(),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;

export const updateTicketSchema = z
  .object({
    subject: z.string().trim().min(1).max(300).optional(),
    status: ticketStatusSchema.optional(),
    priority: prioritySchema.optional(),
    assigneeMembershipId: z.string().uuid().nullable().optional(),
    tagIds: z.array(z.string().uuid()).max(20).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;

export const ticketFiltersSchema = z.object({
  status: z.union([ticketStatusSchema, z.array(ticketStatusSchema)]).optional(),
  assigneeMembershipId: z
    .union([z.literal("me"), z.literal("unassigned"), z.string().uuid()])
    .optional(),
  priority: z.union([prioritySchema, z.array(prioritySchema)]).optional(),
  tagId: z.string().uuid().optional(),
  channel: z.union([channelSchema, z.array(channelSchema)]).optional(),
  createdFrom: z.coerce.date().optional(),
  createdTo: z.coerce.date().optional(),
  q: z.string().trim().max(200).optional(),
});

export type TicketFilters = z.infer<typeof ticketFiltersSchema>;

export const listTicketsSchema = z.object({
  filters: ticketFiltersSchema.default({}),
  cursor: z.string().min(1).optional(),
  limit: z.number().int().min(1).max(100).default(30),
});

export type ListTicketsInput = z.infer<typeof listTicketsSchema>;

export const ticketNumberSchema = z.object({
  number: z.number().int().positive(),
});

export const mergeTicketsSchema = z.object({
  sourceNumber: z.number().int().positive(),
  targetNumber: z.number().int().positive(),
});

export type MergeTicketsInput = z.infer<typeof mergeTicketsSchema>;

export const bulkUpdateTicketsSchema = z.object({
  numbers: z.array(z.number().int().positive()).min(1).max(100),
  patch: updateTicketSchema,
});

export type BulkUpdateTicketsInput = z.infer<typeof bulkUpdateTicketsSchema>;

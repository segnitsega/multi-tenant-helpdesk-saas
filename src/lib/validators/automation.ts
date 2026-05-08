import { z } from "zod";

export const automationOperatorSchema = z.enum([
  "equals",
  "contains",
  "startsWith",
  "endsWith",
  "in",
]);

export const automationConditionSchema = z.object({
  field: z.string().trim().min(1),
  op: automationOperatorSchema,
  value: z.union([z.string(), z.array(z.string()), z.number(), z.boolean(), z.null()]),
});

export const automationConditionsSchema = z.object({
  mode: z.enum(["all", "any"]),
  conditions: z.array(automationConditionSchema).max(20),
});

export const automationActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("set_priority"),
    value: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]),
  }),
  z.object({
    type: z.literal("set_status"),
    value: z.enum(["OPEN", "PENDING", "ON_HOLD", "RESOLVED", "CLOSED"]),
  }),
  z.object({
    type: z.literal("add_tag"),
    tagName: z.string().trim().min(1).max(40),
  }),
  z.object({
    type: z.literal("assign"),
    strategy: z.literal("round_robin"),
  }),
]);

export const automationTriggerSchema = z.enum([
  "ticket.created",
  "message.created",
]);

export const createAutomationRuleSchema = z.object({
  name: z.string().trim().min(1).max(120),
  trigger: automationTriggerSchema,
  conditions: automationConditionsSchema,
  actions: z.array(automationActionSchema).min(1).max(10),
  enabled: z.boolean().optional(),
});

export const updateAutomationRuleSchema = createAutomationRuleSchema
  .partial()
  .extend({ id: z.string().uuid() })
  .refine((value) => Object.keys(value).some((key) => key !== "id"), {
    message: "At least one field is required",
  });

export const automationRuleIdSchema = z.object({
  id: z.string().uuid(),
});

export const reorderAutomationRulesSchema = z.object({
  orderedIds: z.array(z.string().uuid()).min(1),
});

export const testAutomationRuleSchema = z.object({
  ticketNumber: z.number().int().positive(),
  conditions: automationConditionsSchema,
});

export type CreateAutomationRuleInput = z.infer<typeof createAutomationRuleSchema>;
export type UpdateAutomationRuleInput = z.infer<typeof updateAutomationRuleSchema>;

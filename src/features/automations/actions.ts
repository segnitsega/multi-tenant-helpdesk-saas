"use server";

import { tenantAction } from "@/server/tenancy/action";
import {
  createAutomationRule,
  deleteAutomationRule,
  reorderAutomationRules,
  testAutomationAgainstTicket,
  updateAutomationRule,
} from "@/server/services/automation.service";
import {
  automationRuleIdSchema,
  createAutomationRuleSchema,
  reorderAutomationRulesSchema,
  testAutomationRuleSchema,
  updateAutomationRuleSchema,
} from "@/lib/validators/automation";

export const createAutomationRuleAction = tenantAction(
  "settings.manage",
  createAutomationRuleSchema,
  async (ctx, input) => {
    const row = await createAutomationRule(ctx, input);
    return { id: row.id };
  },
);

export const updateAutomationRuleAction = tenantAction(
  "settings.manage",
  updateAutomationRuleSchema,
  async (ctx, input) => {
    const row = await updateAutomationRule(ctx, input);
    if (!row) throw new Error("Automation rule not found");
    return { id: row.id };
  },
);

export const deleteAutomationRuleAction = tenantAction(
  "settings.manage",
  automationRuleIdSchema,
  async (ctx, input) => {
    await deleteAutomationRule(ctx, input.id);
    return { deleted: true as const };
  },
);

export const reorderAutomationRulesAction = tenantAction(
  "settings.manage",
  reorderAutomationRulesSchema,
  async (ctx, input) => {
    await reorderAutomationRules(ctx, input.orderedIds);
    return { ok: true as const };
  },
);

export const testAutomationRuleAction = tenantAction(
  "settings.manage",
  testAutomationRuleSchema,
  async (ctx, input) => {
    return testAutomationAgainstTicket(ctx, input);
  },
);

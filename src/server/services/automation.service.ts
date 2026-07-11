import "server-only";
import { withTenantDb } from "@/server/db";
import { BadRequestError, NotFoundError } from "@/lib/api-error";
import {
  evaluateAutomation,
  type AutomationAction,
  type AutomationConditions,
  type AutomationTicketContext,
} from "@/lib/automation-evaluator";
import { pickRoundRobinAssignee } from "@/server/services/assignment.service";
import { addEventTx } from "@/server/services/message.service";
import { publishTicketUpdated } from "@/lib/realtime-publish";
import type {
  CreateAutomationRuleInput,
  UpdateAutomationRuleInput,
} from "@/lib/validators/automation";
import type { TenantContext } from "@/types/tenant";

async function loadTicketContext(
  ctx: Pick<TenantContext, "workspaceId">,
  ticketId: string,
) {
  return withTenantDb(ctx, async (tx) => {
    const ticket = await tx.orm.public.Ticket.where({
      id: ticketId,
      workspaceId: ctx.workspaceId,
    }).first();
    if (!ticket) return null;

    const customer = await tx.orm.public.Customer.where({
      id: ticket.customerId,
    }).first();
    const tagLinks = await tx.orm.public.TicketTag.where({
      ticketId: ticket.id,
    }).all();
    const tags: string[] = [];
    for (const link of tagLinks) {
      const tag = await tx.orm.public.Tag.where({ id: link.tagId }).first();
      if (tag) tags.push(tag.name);
    }

    return {
      ticket,
      context: {
        subject: ticket.subject,
        status: ticket.status,
        priority: ticket.priority,
        channel: ticket.channel,
        customerEmail: customer?.email ?? "",
        customerName: customer?.name ?? null,
        tags,
        assigneeMembershipId: ticket.assigneeMembershipId,
      } satisfies AutomationTicketContext,
    };
  });
}

export async function listAutomationRules(
  ctx: Pick<TenantContext, "workspaceId">,
) {
  return withTenantDb(ctx, async (tx) => {
    const rows = await tx.orm.public.AutomationRule.where({
      workspaceId: ctx.workspaceId,
    }).all();
    return rows.sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));
  });
}

export async function createAutomationRule(
  ctx: Pick<TenantContext, "workspaceId">,
  input: CreateAutomationRuleInput,
) {
  return withTenantDb(ctx, async (tx) => {
    const existing = await tx.orm.public.AutomationRule.where({
      workspaceId: ctx.workspaceId,
    }).all();
    const position =
      existing.reduce((max, row) => Math.max(max, row.position), -1) + 1;

    return tx.orm.public.AutomationRule.create({
      workspaceId: ctx.workspaceId,
      name: input.name.trim(),
      trigger: input.trigger,
      conditions: input.conditions,
      actions: input.actions,
      enabled: input.enabled ?? true,
      position,
    });
  });
}

export async function updateAutomationRule(
  ctx: Pick<TenantContext, "workspaceId">,
  input: UpdateAutomationRuleInput,
) {
  return withTenantDb(ctx, async (tx) => {
    const existing = await tx.orm.public.AutomationRule.where({
      id: input.id,
      workspaceId: ctx.workspaceId,
    }).first();
    if (!existing) throw new NotFoundError("Automation rule not found");

    const patch: Record<string, unknown> = {};
    if (input.name !== undefined) patch.name = input.name.trim();
    if (input.trigger !== undefined) patch.trigger = input.trigger;
    if (input.conditions !== undefined) patch.conditions = input.conditions;
    if (input.actions !== undefined) patch.actions = input.actions;
    if (input.enabled !== undefined) patch.enabled = input.enabled;

    return tx.orm.public.AutomationRule.where({ id: existing.id }).update(patch);
  });
}

export async function deleteAutomationRule(
  ctx: Pick<TenantContext, "workspaceId">,
  id: string,
) {
  return withTenantDb(ctx, async (tx) => {
    const existing = await tx.orm.public.AutomationRule.where({
      id,
      workspaceId: ctx.workspaceId,
    }).first();
    if (!existing) throw new NotFoundError("Automation rule not found");
    await tx.orm.public.AutomationRule.where({ id }).delete();
  });
}

export async function reorderAutomationRules(
  ctx: Pick<TenantContext, "workspaceId">,
  orderedIds: string[],
) {
  return withTenantDb(ctx, async (tx) => {
    for (let index = 0; index < orderedIds.length; index += 1) {
      const id = orderedIds[index]!;
      const existing = await tx.orm.public.AutomationRule.where({
        id,
        workspaceId: ctx.workspaceId,
      }).first();
      if (!existing) throw new BadRequestError("Unknown automation rule");
      await tx.orm.public.AutomationRule.where({ id }).update({ position: index });
    }
  });
}

export async function testAutomationAgainstTicket(
  ctx: Pick<TenantContext, "workspaceId">,
  input: { ticketNumber: number; conditions: AutomationConditions },
) {
  const ticket = await withTenantDb(ctx, async (tx) =>
    tx.orm.public.Ticket.where({
      workspaceId: ctx.workspaceId,
      number: input.ticketNumber,
    }).first(),
  );
  if (!ticket) throw new NotFoundError("Ticket not found");
  const loaded = await loadTicketContext(ctx, ticket.id);
  if (!loaded) throw new NotFoundError("Ticket not found");
  return {
    matches: evaluateAutomation(input.conditions, loaded.context),
    context: loaded.context,
  };
}

export async function runForEvent(
  ctx: { workspaceId: string; membershipId: string | null },
  input: {
    ticketId: string;
    trigger: string;
    origin?: "automation" | "user" | "system" | "email";
  },
) {
  if (input.origin === "automation") {
    return { applied: [] as string[], skipped: true as const };
  }

  const loaded = await loadTicketContext(ctx, input.ticketId);
  if (!loaded) throw new NotFoundError("Ticket not found");

  const rules = await withTenantDb(ctx, async (tx) => {
    const rows = await tx.orm.public.AutomationRule.where({
      workspaceId: ctx.workspaceId,
      enabled: true,
    }).all();
    return rows
      .filter((row) => row.trigger === input.trigger)
      .sort((a, b) => a.position - b.position);
  });

  const applied: string[] = [];
  let workingContext = loaded.context;
  let ticket = loaded.ticket;

  for (const rule of rules) {
    const conditions = rule.conditions as AutomationConditions;
    if (!evaluateAutomation(conditions, workingContext)) continue;

    const alreadyApplied = await withTenantDb(ctx, async (tx) => {
      const logs = await tx.orm.public.AuditLog.where({
        workspaceId: ctx.workspaceId,
        targetType: "ticket",
        targetId: input.ticketId,
        action: "automation.applied",
      }).all();
      return logs.some((log) => {
        const metadata = log.metadata as { ruleId?: string } | null;
        return metadata?.ruleId === rule.id;
      });
    });
    if (alreadyApplied) continue;

    const actions = (rule.actions as AutomationAction[]) ?? [];
    const patch: Record<string, unknown> = {};
    const events: string[] = [];

    for (const action of actions) {
      if (action.type === "set_priority" && action.value !== ticket.priority) {
        patch.priority = action.value;
        events.push(`Automation “${rule.name}” set priority to ${action.value}`);
      }
      if (action.type === "set_status" && action.value !== ticket.status) {
        patch.status = action.value;
        events.push(`Automation “${rule.name}” set status to ${action.value}`);
      }
      if (action.type === "assign" && action.strategy === "round_robin") {
        const assigneeId = await pickRoundRobinAssignee(ctx.workspaceId);
        if (assigneeId && assigneeId !== ticket.assigneeMembershipId) {
          patch.assigneeMembershipId = assigneeId;
          events.push(`Automation “${rule.name}” assigned via round robin`);
        }
      }
      if (action.type === "add_tag") {
        await withTenantDb(ctx, async (tx) => {
          let tag = await tx.orm.public.Tag.where({
            workspaceId: ctx.workspaceId,
            name: action.tagName,
          }).first();
          if (!tag) {
            tag = await tx.orm.public.Tag.create({
              workspaceId: ctx.workspaceId,
              name: action.tagName,
              color: "#64748b",
            });
          }
          const existing = await tx.orm.public.TicketTag.where({
            ticketId: ticket.id,
            tagId: tag.id,
          }).first();
          if (!existing) {
            await tx.orm.public.TicketTag.create({
              workspaceId: ctx.workspaceId,
              ticketId: ticket.id,
              tagId: tag.id,
            });
            events.push(`Automation “${rule.name}” added tag ${action.tagName}`);
          }
        });
        if (!workingContext.tags.includes(action.tagName)) {
          workingContext = {
            ...workingContext,
            tags: [...workingContext.tags, action.tagName],
          };
        }
      }
    }

    if (Object.keys(patch).length > 0) {
      const updated = await withTenantDb(ctx, async (tx) => {
        await tx.orm.public.Ticket.where({ id: ticket.id }).update(patch);
        for (const bodyText of events) {
          await addEventTx(tx, ctx, { ticketId: ticket.id, bodyText });
        }
        await tx.orm.public.AuditLog.create({
          workspaceId: ctx.workspaceId,
          actorMembershipId: ctx.membershipId,
          action: "automation.applied",
          targetType: "ticket",
          targetId: ticket.id,
          metadata: JSON.parse(
            JSON.stringify({
              ruleId: rule.id,
              ruleName: rule.name,
              patch,
            }),
          ),
        });
        return tx.orm.public.Ticket.where({ id: ticket.id }).first();
      });
      if (!updated) break;
      ticket = updated;

      workingContext = {
        ...workingContext,
        status: ticket.status,
        priority: ticket.priority,
        assigneeMembershipId: ticket.assigneeMembershipId,
      };

      await publishTicketUpdated(
        { workspaceId: ctx.workspaceId, membershipId: ctx.membershipId },
        { id: ticket.id, number: ticket.number },
        patch,
      );
    } else if (events.length > 0) {
      await withTenantDb(ctx, async (tx) => {
        for (const bodyText of events) {
          await addEventTx(tx, ctx, { ticketId: ticket.id, bodyText });
        }
        await tx.orm.public.AuditLog.create({
          workspaceId: ctx.workspaceId,
          actorMembershipId: ctx.membershipId,
          action: "automation.applied",
          targetType: "ticket",
          targetId: ticket.id,
          metadata: { ruleId: rule.id, ruleName: rule.name },
        });
      });
    }

    applied.push(rule.id);
  }

  return { applied, skipped: false as const };
}

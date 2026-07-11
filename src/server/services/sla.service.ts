import "server-only";
import { withTenantDb } from "@/server/db";
import { NotFoundError } from "@/lib/api-error";
import type { UpdateSlaPolicyInput } from "@/lib/validators/sla";
import type { TenantContext } from "@/types/tenant";

const PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;

export async function listSlaPolicies(
  ctx: Pick<TenantContext, "workspaceId">,
) {
  return withTenantDb(ctx, async (tx) => {
    const rows = await tx.orm.public.SlaPolicy.where({
      workspaceId: ctx.workspaceId,
    }).all();

    return PRIORITIES.map((priority) => {
      const existing = rows.find((row) => row.priority === priority);
      return (
        existing ?? {
          id: null,
          workspaceId: ctx.workspaceId,
          priority,
          firstResponseMinutes: priority === "URGENT" ? 30 : priority === "HIGH" ? 60 : 240,
          resolutionMinutes: priority === "URGENT" ? 240 : priority === "HIGH" ? 480 : 1440,
          enabled: false,
        }
      );
    });
  });
}

export async function upsertSlaPolicy(
  ctx: Pick<TenantContext, "workspaceId">,
  input: UpdateSlaPolicyInput,
) {
  return withTenantDb(ctx, async (tx) => {
    const existing = await tx.orm.public.SlaPolicy.where({
      workspaceId: ctx.workspaceId,
      priority: input.priority,
    }).first();

    if (existing) {
      return tx.orm.public.SlaPolicy.where({ id: existing.id }).update({
        firstResponseMinutes: input.firstResponseMinutes,
        resolutionMinutes: input.resolutionMinutes,
        enabled: input.enabled,
      });
    }

    return tx.orm.public.SlaPolicy.create({
      workspaceId: ctx.workspaceId,
      priority: input.priority,
      firstResponseMinutes: input.firstResponseMinutes,
      resolutionMinutes: input.resolutionMinutes,
      enabled: input.enabled,
    });
  });
}

export async function getEnabledSlaPolicy(
  ctx: Pick<TenantContext, "workspaceId">,
  priority: UpdateSlaPolicyInput["priority"],
) {
  return withTenantDb(ctx, async (tx) => {
    const row = await tx.orm.public.SlaPolicy.where({
      workspaceId: ctx.workspaceId,
      priority,
      enabled: true,
    }).first();
    if (!row) return null;
    return row;
  });
}

export async function requireSlaPolicy(
  ctx: Pick<TenantContext, "workspaceId">,
  priority: UpdateSlaPolicyInput["priority"],
) {
  const row = await getEnabledSlaPolicy(ctx, priority);
  if (!row) throw new NotFoundError("SLA policy not found");
  return row;
}

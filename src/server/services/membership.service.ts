import "server-only";
import { systemDb } from "@/server/db/system";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "@/lib/api-error";
import type { Role } from "@/config/permissions";
import type { TenantContext } from "@/types/tenant";

export async function listMembers(workspaceId: string) {
  const memberships = await systemDb.orm.public.Membership.where({
    workspaceId,
  }).all();

  const users = await Promise.all(
    memberships.map((m) =>
      systemDb.orm.public.User.where({ id: m.userId }).first(),
    ),
  );

  return memberships.map((m, i) => ({
    id: m.id,
    userId: m.userId,
    role: m.role as Role,
    readonly: m.readonly,
    email: users[i]?.email ?? "",
    name: users[i]?.name ?? null,
  }));
}

export async function updateMemberRole(
  ctx: TenantContext,
  input: { membershipId: string; role: Role },
) {
  const target = await systemDb.orm.public.Membership.where({
    id: input.membershipId,
    workspaceId: ctx.workspaceId,
  }).first();
  if (!target) throw new NotFoundError("Member not found");

  if (target.role === "OWNER" || input.role === "OWNER") {
    if (ctx.role !== "OWNER") {
      throw new ForbiddenError("Only an owner can change owner roles.");
    }
  }

  if (target.role === "OWNER" && input.role !== "OWNER") {
    const owners = (
      await systemDb.orm.public.Membership.where({
        workspaceId: ctx.workspaceId,
        role: "OWNER",
      }).all()
    ).length;
    if (owners <= 1) {
      throw new BadRequestError("The last owner cannot be demoted.");
    }
  }

  await systemDb.orm.public.Membership.where({ id: target.id }).update({
    role: input.role,
  });
}

export async function removeMember(
  ctx: TenantContext,
  membershipId: string,
) {
  const target = await systemDb.orm.public.Membership.where({
    id: membershipId,
    workspaceId: ctx.workspaceId,
  }).first();
  if (!target) throw new NotFoundError("Member not found");

  if (target.role === "OWNER") {
    if (ctx.role !== "OWNER") {
      throw new ForbiddenError("Only an owner can remove an owner.");
    }
    const owners = (
      await systemDb.orm.public.Membership.where({
        workspaceId: ctx.workspaceId,
        role: "OWNER",
      }).all()
    ).length;
    if (owners <= 1) {
      throw new BadRequestError("The last owner cannot be removed.");
    }
  }

  await systemDb.orm.public.Membership.where({ id: target.id }).delete();
}

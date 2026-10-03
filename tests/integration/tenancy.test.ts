import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { systemDb } from "@/server/db/system";
import { createWorkspace } from "@/server/services/workspace.service";
import {
  acceptInvitation,
  getInvitationByToken,
} from "@/server/services/invitation.service";
import { assertCan } from "@/server/tenancy/permissions";
import { ForbiddenError } from "@/lib/api-error";
import { generateToken } from "@/server/auth/tokens";
import { hashPassword } from "@/server/auth/password";
import type { TenantContext } from "@/types/tenant";

describe("tenancy and invitations", () => {
  let ownerId: string;
  let agentUserId: string;
  let outsiderId: string;
  let workspaceId: string;
  let workspaceSlug: string;
  let ownerMembershipId: string;
  let agentMembershipId: string;
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    const suffix = randomUUID().slice(0, 8);
    const passwordHash = await hashPassword("password123");

    const owner = await systemDb.orm.public.User.create({
      email: `owner-${suffix}@example.com`,
      name: "Owner",
      passwordHash,
    });
    ownerId = owner.id;
    createdUserIds.push(owner.id);

    const agentUser = await systemDb.orm.public.User.create({
      email: `agent-${suffix}@example.com`,
      name: "Agent",
      passwordHash,
    });
    agentUserId = agentUser.id;
    createdUserIds.push(agentUser.id);

    const outsider = await systemDb.orm.public.User.create({
      email: `out-${suffix}@example.com`,
      name: "Outsider",
      passwordHash,
    });
    outsiderId = outsider.id;
    createdUserIds.push(outsider.id);

    const created = await createWorkspace(ownerId, {
      name: `Acme ${suffix}`,
      slug: `acme-${suffix}`,
    });
    workspaceId = created.workspace.id;
    workspaceSlug = created.workspace.slug;
    ownerMembershipId = created.membership.id;

    const agentMembership = await systemDb.orm.public.Membership.create({
      workspaceId,
      userId: agentUserId,
      role: "AGENT",
      readonly: false,
    });
    agentMembershipId = agentMembership.id;
  });

  afterAll(async () => {
    try {
      if (workspaceId) {
        await systemDb.orm.public.Workspace.where({ id: workspaceId }).delete();
      }
      for (const id of createdUserIds) {
        await systemDb.orm.public.User.where({ id }).delete();
      }
    } finally {
      await systemDb.close();
    }
  });

  function ctxFor(
    partial: Pick<
      TenantContext,
      "userId" | "membershipId" | "role" | "readonly"
    >,
  ): TenantContext {
    return {
      ...partial,
      workspaceId,
      slug: workspaceSlug,
    };
  }

  it("forbids an agent from member.manage", () => {
    const agentCtx = ctxFor({
      userId: agentUserId,
      membershipId: agentMembershipId,
      role: "AGENT",
      readonly: false,
    });
    expect(() => assertCan(agentCtx, "member.manage")).toThrow(ForbiddenError);
  });

  it("allows an owner to member.manage", () => {
    const ownerCtx = ctxFor({
      userId: ownerId,
      membershipId: ownerMembershipId,
      role: "OWNER",
      readonly: false,
    });
    expect(() => assertCan(ownerCtx, "member.manage")).not.toThrow();
  });

  it("finds no membership for a non-member", async () => {
    const membership = await systemDb.orm.public.Membership.where({
      workspaceId,
      userId: outsiderId,
    }).first();
    expect(membership).toBeNull();
  });

  it("rejects expired invitations", async () => {
    const { token, tokenHash } = generateToken();
    await systemDb.orm.public.Invitation.create({
      workspaceId,
      email: `expired-${randomUUID().slice(0, 6)}@example.com`,
      role: "AGENT",
      tokenHash,
      expiresAt: new Date(Date.now() - 60_000),
      invitedById: ownerMembershipId,
    });

    const view = await getInvitationByToken(token);
    expect(view.status).toBe("expired");
  });

  it("rejects reused invitations", async () => {
    const inviteEmail = `join-${randomUUID().slice(0, 6)}@example.com`;
    const invitee = await systemDb.orm.public.User.create({
      email: inviteEmail,
      name: "Invitee",
      passwordHash: await hashPassword("password123"),
    });
    createdUserIds.push(invitee.id);

    const { token, tokenHash } = generateToken();
    await systemDb.orm.public.Invitation.create({
      workspaceId,
      email: inviteEmail,
      role: "AGENT",
      tokenHash,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      invitedById: ownerMembershipId,
    });

    await acceptInvitation({
      token,
      userId: invitee.id,
      userEmail: inviteEmail,
    });

    await expect(
      acceptInvitation({
        token,
        userId: invitee.id,
        userEmail: inviteEmail,
      }),
    ).rejects.toThrow(/already accepted/i);
  });
});

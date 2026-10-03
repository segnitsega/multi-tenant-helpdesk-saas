import "server-only";
import { systemDb } from "@/server/db/system";
import { generateToken, hashToken } from "@/server/auth/tokens";
import { getEmailProvider } from "@/server/email";
import { invitationEmail } from "@/server/email/templates/invitation";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "@/lib/api-error";
import type { Role } from "@/config/permissions";
import type { TenantContext } from "@/types/tenant";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

async function loadWorkspace(workspaceId: string) {
  const workspace = await systemDb.orm.public.Workspace.where({
    id: workspaceId,
  }).first();
  if (!workspace) throw new NotFoundError("Workspace not found");
  return workspace;
}

export async function createInvitation(
  ctx: TenantContext,
  input: { email: string; role: Exclude<Role, "OWNER"> },
) {
  const email = input.email.trim().toLowerCase();
  const workspace = await loadWorkspace(ctx.workspaceId);

  const user = await systemDb.orm.public.User.where({ email }).first();
  if (user) {
    const existingMember = await systemDb.orm.public.Membership.where({
      workspaceId: ctx.workspaceId,
      userId: user.id,
    }).first();
    if (existingMember) {
      throw new ConflictError("That person is already a member.");
    }
  }

  const pending = (
    await systemDb.orm.public.Invitation.where({
      workspaceId: ctx.workspaceId,
      email,
    }).all()
  ).find((row) => !row.acceptedAt && row.expiresAt.getTime() > Date.now());
  if (pending) {
    throw new ConflictError("An invitation is already pending for that email.");
  }

  const { token, tokenHash } = generateToken();
  const invitation = await systemDb.orm.public.Invitation.create({
    workspaceId: ctx.workspaceId,
    email,
    role: input.role,
    tokenHash,
    expiresAt: new Date(Date.now() + INVITE_TTL_MS),
    invitedById: ctx.membershipId,
  });

  const inviter = await systemDb.orm.public.User.where({
    id: ctx.userId,
  }).first();
  const content = invitationEmail({
    workspaceName: workspace.name,
    inviterName: inviter?.name ?? null,
    role: input.role,
    token,
  });
  await getEmailProvider().sendEmail({
    to: email,
    subject: content.subject,
    html: content.html,
    text: content.text,
  });

  return invitation;
}

export async function revokeInvitation(
  ctx: TenantContext,
  invitationId: string,
) {
  const invitation = await systemDb.orm.public.Invitation.where({
    id: invitationId,
    workspaceId: ctx.workspaceId,
  }).first();
  if (!invitation || invitation.acceptedAt) {
    throw new NotFoundError("Invitation not found");
  }
  await systemDb.orm.public.Invitation.where({ id: invitation.id }).delete();
}

export async function resendInvitation(
  ctx: TenantContext,
  invitationId: string,
) {
  const invitation = await systemDb.orm.public.Invitation.where({
    id: invitationId,
    workspaceId: ctx.workspaceId,
  }).first();
  if (!invitation || invitation.acceptedAt) {
    throw new NotFoundError("Invitation not found");
  }

  const workspace = await loadWorkspace(ctx.workspaceId);
  const { token, tokenHash } = generateToken();
  await systemDb.orm.public.Invitation.where({ id: invitation.id }).update({
    tokenHash,
    expiresAt: new Date(Date.now() + INVITE_TTL_MS),
  });

  const inviter = await systemDb.orm.public.User.where({
    id: ctx.userId,
  }).first();
  const content = invitationEmail({
    workspaceName: workspace.name,
    inviterName: inviter?.name ?? null,
    role: invitation.role,
    token,
  });
  await getEmailProvider().sendEmail({
    to: invitation.email,
    subject: content.subject,
    html: content.html,
    text: content.text,
  });
}

export type InvitationView =
  | { status: "not_found" }
  | { status: "expired"; email: string; workspaceName: string }
  | { status: "accepted"; email: string; workspaceName: string; slug: string }
  | {
      status: "pending";
      email: string;
      workspaceName: string;
      slug: string;
      role: Role;
      invitationId: string;
    };

export async function getInvitationByToken(
  rawToken: string,
): Promise<InvitationView> {
  const tokenHash = hashToken(rawToken);
  const invitation = await systemDb.orm.public.Invitation.where({
    tokenHash,
  }).first();
  if (!invitation) return { status: "not_found" };

  const workspace = await loadWorkspace(invitation.workspaceId);

  if (invitation.acceptedAt) {
    return {
      status: "accepted",
      email: invitation.email,
      workspaceName: workspace.name,
      slug: workspace.slug,
    };
  }

  if (invitation.expiresAt.getTime() < Date.now()) {
    return {
      status: "expired",
      email: invitation.email,
      workspaceName: workspace.name,
    };
  }

  return {
    status: "pending",
    email: invitation.email,
    workspaceName: workspace.name,
    slug: workspace.slug,
    role: invitation.role as Role,
    invitationId: invitation.id,
  };
}

export async function acceptInvitation(input: {
  token: string;
  userId: string;
  userEmail: string;
}) {
  const tokenHash = hashToken(input.token);
  const invitation = await systemDb.orm.public.Invitation.where({
    tokenHash,
  }).first();
  if (!invitation) throw new NotFoundError("Invitation not found");
  if (invitation.acceptedAt) {
    throw new BadRequestError("This invitation was already accepted.");
  }
  if (invitation.expiresAt.getTime() < Date.now()) {
    throw new BadRequestError("This invitation has expired.");
  }

  const email = input.userEmail.trim().toLowerCase();
  if (email !== invitation.email.toLowerCase()) {
    throw new ForbiddenError(
      `Sign in as ${invitation.email} to accept this invitation.`,
    );
  }

  const existing = await systemDb.orm.public.Membership.where({
    workspaceId: invitation.workspaceId,
    userId: input.userId,
  }).first();
  if (existing) {
    await systemDb.orm.public.Invitation.where({ id: invitation.id }).update({
      acceptedAt: new Date(),
    });
    const workspace = await loadWorkspace(invitation.workspaceId);
    return { workspace, membership: existing };
  }

  return systemDb.transaction(async (tx) => {
    const membership = await tx.orm.public.Membership.create({
      workspaceId: invitation.workspaceId,
      userId: input.userId,
      role: invitation.role,
      readonly: false,
    });
    await tx.orm.public.Invitation.where({ id: invitation.id }).update({
      acceptedAt: new Date(),
    });
    const workspace = await tx.orm.public.Workspace.where({
      id: invitation.workspaceId,
    }).first();
    if (!workspace) throw new NotFoundError("Workspace not found");
    return { workspace, membership };
  });
}

export async function listPendingInvitations(workspaceId: string) {
  const all = await systemDb.orm.public.Invitation.where({
    workspaceId,
  }).all();
  return all.filter(
    (row) => !row.acceptedAt && row.expiresAt.getTime() > Date.now(),
  );
}

"use server";

import { redirect } from "next/navigation";
import { auth } from "@/server/auth/auth";
import {
  createWorkspace,
  isSlugAvailable,
} from "@/server/services/workspace.service";
import {
  acceptInvitation,
  createInvitation,
  resendInvitation,
  revokeInvitation,
} from "@/server/services/invitation.service";
import {
  removeMember,
  updateMemberRole,
} from "@/server/services/membership.service";
import { tenantAction } from "@/server/tenancy/action";
import { toApiError, toFieldErrors } from "@/lib/api-error";
import {
  createWorkspaceSchema,
  invitationIdSchema,
  inviteMemberSchema,
  membershipIdSchema,
  slugSchema,
  updateMemberRoleSchema,
} from "@/lib/validators/workspace";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | {
      ok: false;
      error: {
        code: string;
        message: string;
        fieldErrors?: Record<string, string[]>;
      };
    };

export async function checkSlugAvailability(raw: unknown): Promise<{
  available: boolean;
  error?: string;
}> {
  const parsed = slugSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      available: false,
      error: parsed.error.issues[0]?.message ?? "Invalid slug",
    };
  }
  const available = await isSlugAvailable(parsed.data);
  return { available };
}

export async function createWorkspaceAction(
  raw: unknown,
): Promise<ActionResult<{ slug: string }>> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const parsed = createWorkspaceSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: "VALIDATION",
        message: "Check the form and try again.",
        fieldErrors: toFieldErrors(parsed.error),
      },
    };
  }

  try {
    const { workspace } = await createWorkspace(session.user.id, parsed.data);
    return { ok: true, data: { slug: workspace.slug } };
  } catch (e) {
    return { ok: false, error: toApiError(e) };
  }
}

export const inviteMemberAction = tenantAction(
  "member.invite",
  inviteMemberSchema,
  async (ctx, input) => {
    await createInvitation(ctx, input);
    return { invited: true as const };
  },
);

export const resendInvitationAction = tenantAction(
  "member.invite",
  invitationIdSchema,
  async (ctx, input) => {
    await resendInvitation(ctx, input.invitationId);
    return { resent: true as const };
  },
);

export const revokeInvitationAction = tenantAction(
  "member.manage",
  invitationIdSchema,
  async (ctx, input) => {
    await revokeInvitation(ctx, input.invitationId);
    return { revoked: true as const };
  },
);

export const updateMemberRoleAction = tenantAction(
  "member.manage",
  updateMemberRoleSchema,
  async (ctx, input) => {
    await updateMemberRole(ctx, input);
    return { updated: true as const };
  },
);

export const removeMemberAction = tenantAction(
  "member.manage",
  membershipIdSchema,
  async (ctx, input) => {
    await removeMember(ctx, input.membershipId);
    return { removed: true as const };
  },
);

export async function acceptInvitationAction(
  token: string,
): Promise<ActionResult<{ slug: string }>> {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    redirect(`/signup?invite=${encodeURIComponent(token)}`);
  }

  try {
    const { workspace } = await acceptInvitation({
      token,
      userId: session.user.id,
      userEmail: session.user.email,
    });
    return { ok: true, data: { slug: workspace.slug } };
  } catch (e) {
    return { ok: false, error: toApiError(e) };
  }
}

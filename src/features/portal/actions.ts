"use server";

import { redirect } from "next/navigation";
import { toApiError, toFieldErrors } from "@/lib/api-error";
import {
  portalMagicLinkSchema,
  portalNewRequestSchema,
  portalReplySchema,
} from "@/lib/validators/portal";
import {
  addPortalReply,
  assertPortalCustomer,
  createPortalRequest,
  requestPortalMagicLink,
} from "@/server/services/portal.service";
import {
  clearCustomerSession,
  getCustomerSession,
  setCustomerSession,
} from "@/server/auth/customer-session";
import { consumePortalMagicLink } from "@/server/services/portal.service";

export async function requestMagicLinkAction(slug: string, raw: unknown) {
  const parsed = portalMagicLinkSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: {
        code: "VALIDATION",
        message: "Enter a valid email.",
        fieldErrors: toFieldErrors(parsed.error),
      },
    };
  }
  try {
    await requestPortalMagicLink(slug, parsed.data.email);
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: toApiError(error) };
  }
}

export async function verifyMagicLinkAction(slug: string, token: string) {
  try {
    const result = await consumePortalMagicLink(token);
    if (result.slug !== slug) {
      return { ok: false as const, error: { code: "BAD_REQUEST", message: "Invalid link." } };
    }
    await setCustomerSession({
      customerId: result.customerId,
      workspaceId: result.workspaceId,
      kind: "portal",
    });
    redirect(`/portal/${slug}`);
  } catch (error) {
    return { ok: false as const, error: toApiError(error) };
  }
}

export async function portalSignOutAction(slug: string) {
  await clearCustomerSession("portal");
  redirect(`/portal/${slug}`);
}

export async function portalReplyAction(
  slug: string,
  number: number,
  raw: unknown,
) {
  const session = await getCustomerSession("portal");
  const parsed = portalReplySchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: {
        code: "VALIDATION",
        message: "Check your message.",
        fieldErrors: toFieldErrors(parsed.error),
      },
    };
  }
  try {
    const ctx = await assertPortalCustomer(slug, session);
    await addPortalReply(ctx, number, parsed.data);
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: toApiError(error) };
  }
}

export async function portalNewRequestAction(slug: string, raw: unknown) {
  const session = await getCustomerSession("portal");
  const parsed = portalNewRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: {
        code: "VALIDATION",
        message: "Check the form.",
        fieldErrors: toFieldErrors(parsed.error),
      },
    };
  }
  try {
    const ctx = await assertPortalCustomer(slug, session);
    const ticket = await createPortalRequest(ctx, parsed.data);
    redirect(`/portal/${slug}/tickets/${ticket.number}`);
  } catch (error) {
    return { ok: false as const, error: toApiError(error) };
  }
}

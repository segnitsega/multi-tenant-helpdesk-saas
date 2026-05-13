import { checkRateLimit } from "@/server/rate-limit";
import { env } from "@/server/env";
import { extractEmailAddress } from "@/lib/email-address";
import type { NormalizedInboundEmail } from "./parse";

export type InboundGuardResult =
  | { ok: true }
  | { ok: false; reason: string };

function headerValue(
  headers: Record<string, string>,
  name: string,
): string | null {
  const target = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === target) return value;
  }
  return null;
}

export function shouldIgnoreInbound(
  email: NormalizedInboundEmail,
): InboundGuardResult {
  const autoSubmitted = headerValue(email.headers, "Auto-Submitted");
  if (autoSubmitted && autoSubmitted.toLowerCase() !== "no") {
    return { ok: false, reason: `Auto-Submitted: ${autoSubmitted}` };
  }

  const precedence = headerValue(email.headers, "Precedence")?.toLowerCase();
  if (precedence && ["bulk", "junk", "list"].includes(precedence)) {
    return { ok: false, reason: `Precedence: ${precedence}` };
  }

  if (headerValue(email.headers, "X-Autoreply")) {
    return { ok: false, reason: "X-Autoreply present" };
  }

  const from = extractEmailAddress(email.from);
  if (from.endsWith(`@${env.MAIL_DOMAIN}`)) {
    return { ok: false, reason: "Mail from system domain" };
  }

  return { ok: true };
}

export async function assertInboundSenderRateLimit(from: string) {
  const sender = extractEmailAddress(from);
  await checkRateLimit(`inbound-sender:${sender}`, 60, 60 * 60);
}

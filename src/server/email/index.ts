import "server-only";
import { env } from "@/server/env";
import type { EmailProvider } from "./provider";
import { createSmtpProvider } from "./smtp.provider";

let provider: EmailProvider | undefined;

export function getEmailProvider(): EmailProvider {
  if (provider) return provider;

  if (env.SMTP_URL) {
    provider = createSmtpProvider();
    return provider;
  }

  throw new Error(
    "No email provider configured. Set SMTP_URL (dev) or Postmark (Phase 10).",
  );
}

export type { EmailProvider, SendEmailInput } from "./provider";

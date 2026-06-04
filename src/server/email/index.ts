import "server-only";
import { env } from "@/server/env";
import type { EmailProvider } from "./provider";
import { createPostmarkProvider } from "./postmark.provider";
import { createSmtpProvider } from "./smtp.provider";

let provider: EmailProvider | undefined;

export function getEmailProvider(): EmailProvider {
  if (provider) return provider;

  if (env.POSTMARK_SERVER_TOKEN) {
    provider = createPostmarkProvider();
    return provider;
  }

  if (env.SMTP_URL) {
    provider = createSmtpProvider();
    return provider;
  }

  throw new Error(
    "No email provider configured. Set SMTP_URL (dev) or POSTMARK_SERVER_TOKEN.",
  );
}

export type { EmailProvider, SendEmailInput, SendEmailResult } from "./provider";

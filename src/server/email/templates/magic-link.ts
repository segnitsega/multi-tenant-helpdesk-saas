import "server-only";
import { env } from "@/server/env";
import {
  emailButton,
  emailMuted,
  emailParagraph,
  renderEmailLayout,
} from "@/server/email/templates/layout";

export function magicLinkEmail(input: {
  workspaceName: string;
  slug: string;
  token: string;
}) {
  const url = `${env.APP_URL}/portal/${encodeURIComponent(input.slug)}/auth/verify?token=${encodeURIComponent(input.token)}`;

  const text = [
    `Sign in to ${input.workspaceName} support portal.`,
    "",
    `Open this link: ${url}`,
    "",
    "This link expires in 15 minutes and can only be used once.",
  ].join("\n");

  const bodyHtml = [
    emailParagraph(
      `Use the secure link below to open your tickets with <strong>${input.workspaceName}</strong>.`,
    ),
    emailButton(url, "Open your tickets"),
    emailMuted(
      "This link expires in 15 minutes and can only be used once.",
    ),
  ].join("");

  return {
    subject: `Your ${input.workspaceName} support link`,
    text,
    html: renderEmailLayout({
      title: `Sign in to ${input.workspaceName}`,
      preheader: `Your one-time support portal link`,
      bodyHtml,
      workspaceName: input.workspaceName,
      footerNote: "This magic link was requested from the customer portal.",
    }),
  };
}

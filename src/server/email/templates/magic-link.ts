import "server-only";
import { env } from "@/server/env";

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

  const html = `
    <p>Sign in to <strong>${input.workspaceName}</strong> support portal.</p>
    <p><a href="${url}">Open your tickets</a></p>
    <p>This link expires in 15 minutes and can only be used once.</p>
  `.trim();

  return {
    subject: `Your ${input.workspaceName} support link`,
    text,
    html,
  };
}

import "server-only";
import { env } from "@/server/env";

export function invitationEmail(input: {
  workspaceName: string;
  inviterName: string | null;
  role: string;
  token: string;
}) {
  const url = `${env.APP_URL}/invite/${encodeURIComponent(input.token)}`;
  const who = input.inviterName ?? "A teammate";

  const text = [
    `${who} invited you to join ${input.workspaceName} on Relay as ${input.role}.`,
    "",
    `Accept the invitation: ${url}`,
    "",
    "This link expires in 7 days.",
  ].join("\n");

  const html = `
    <p>${who} invited you to join <strong>${input.workspaceName}</strong> on Relay as <strong>${input.role}</strong>.</p>
    <p><a href="${url}">Accept the invitation</a></p>
    <p>This link expires in 7 days.</p>
  `.trim();

  return {
    subject: `Join ${input.workspaceName} on Relay`,
    text,
    html,
  };
}

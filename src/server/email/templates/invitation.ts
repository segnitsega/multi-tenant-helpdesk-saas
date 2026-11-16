import "server-only";
import { env } from "@/server/env";
import {
  emailButton,
  emailMuted,
  emailParagraph,
  renderEmailLayout,
} from "@/server/email/templates/layout";

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

  const bodyHtml = [
    emailParagraph(
      `${who} invited you to join <strong>${input.workspaceName}</strong> on Relay as <strong>${input.role}</strong>.`,
    ),
    emailParagraph(
      "Accept the invite to start triaging tickets with your team.",
    ),
    emailButton(url, "Accept invitation"),
    emailMuted("This link expires in 7 days. If you were not expecting this invite, you can ignore the email."),
  ].join("");

  return {
    subject: `Join ${input.workspaceName} on Relay`,
    text,
    html: renderEmailLayout({
      title: `You're invited to ${input.workspaceName}`,
      preheader: `${who} invited you to Relay`,
      bodyHtml,
      workspaceName: input.workspaceName,
      footerNote: "This invitation was sent from a Relay workspace.",
    }),
  };
}

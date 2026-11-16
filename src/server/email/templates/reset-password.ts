import "server-only";
import { env } from "@/server/env";
import {
  emailButton,
  emailMuted,
  emailParagraph,
  renderEmailLayout,
} from "@/server/email/templates/layout";

export function resetPasswordEmail(input: {
  name: string | null;
  token: string;
}) {
  const resetUrl = `${env.APP_URL}/reset-password?token=${encodeURIComponent(input.token)}`;
  const greeting = input.name ? `Hi ${input.name},` : "Hi,";

  const text = [
    greeting,
    "",
    "We received a request to reset your Relay password.",
    `Open this link to choose a new password (expires in 1 hour):`,
    resetUrl,
    "",
    "If you did not request this, you can ignore this email.",
  ].join("\n");

  const bodyHtml = [
    emailParagraph(greeting),
    emailParagraph("We received a request to reset your Relay password."),
    emailButton(resetUrl, "Choose a new password"),
    emailMuted(
      "This link expires in 1 hour. If you did not request a reset, you can safely ignore this email.",
    ),
  ].join("");

  return {
    subject: "Reset your Relay password",
    text,
    html: renderEmailLayout({
      title: "Reset your password",
      preheader: "Choose a new password for your Relay account",
      bodyHtml,
      footerNote: "Password resets are only valid for one hour.",
    }),
  };
}

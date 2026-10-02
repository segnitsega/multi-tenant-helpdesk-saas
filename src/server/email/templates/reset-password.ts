import "server-only";
import { env } from "@/server/env";

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

  const html = `
    <p>${greeting}</p>
    <p>We received a request to reset your Relay password.</p>
    <p><a href="${resetUrl}">Choose a new password</a> (expires in 1 hour).</p>
    <p>If you did not request this, you can ignore this email.</p>
  `.trim();

  return {
    subject: "Reset your Relay password",
    text,
    html,
  };
}

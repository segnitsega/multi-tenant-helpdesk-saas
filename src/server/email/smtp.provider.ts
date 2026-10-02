import "server-only";
import nodemailer from "nodemailer";
import { env } from "@/server/env";
import type { EmailProvider, SendEmailInput } from "./provider";

export function createSmtpProvider(): EmailProvider {
  if (!env.SMTP_URL) {
    throw new Error("SMTP_URL is required for the SMTP email provider");
  }

  const transporter = nodemailer.createTransport(env.SMTP_URL);

  return {
    async sendEmail(input: SendEmailInput) {
      const from =
        input.from ?? `${env.MAIL_FROM_NAME} <noreply@${env.MAIL_DOMAIN}>`;

      await transporter.sendMail({
        from,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
        replyTo: input.replyTo,
        headers: input.headers,
      });
    },
  };
}

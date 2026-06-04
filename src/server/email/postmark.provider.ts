import "server-only";
import { randomUUID } from "node:crypto";
import { ServerClient } from "postmark";
import { env } from "@/server/env";
import { normalizeMessageId } from "@/lib/email-address";
import type { EmailProvider, SendEmailInput } from "./provider";

export function createPostmarkProvider(): EmailProvider {
  if (!env.POSTMARK_SERVER_TOKEN) {
    throw new Error("POSTMARK_SERVER_TOKEN is required for Postmark");
  }

  const client = new ServerClient(env.POSTMARK_SERVER_TOKEN);

  return {
    async sendEmail(input: SendEmailInput) {
      const from =
        input.from ?? `${env.MAIL_FROM_NAME} <noreply@${env.MAIL_DOMAIN}>`;
      const messageId =
        normalizeMessageId(input.messageId) ??
        normalizeMessageId(`relay.${randomUUID()}@${env.MAIL_DOMAIN}`);

      const headers = Object.entries({
        ...input.headers,
        ...(messageId ? { "Message-ID": messageId } : {}),
      }).map(([Name, Value]) => ({ Name, Value }));

      const result = await client.sendEmail({
        From: from,
        To: input.to,
        Subject: input.subject,
        HtmlBody: input.html,
        TextBody: input.text,
        ReplyTo: input.replyTo,
        Headers: headers,
        MessageStream: "outbound",
      });

      return {
        messageId:
          normalizeMessageId(result.MessageID) ??
          messageId ??
          `<postmark.${result.MessageID}@${env.MAIL_DOMAIN}>`,
      };
    },
  };
}

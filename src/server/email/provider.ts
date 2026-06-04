import "server-only";

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
  headers?: Record<string, string>;
  replyTo?: string;
  from?: string;
  messageId?: string;
};

export type SendEmailResult = {
  messageId: string;
};

export type EmailProvider = {
  sendEmail: (input: SendEmailInput) => Promise<SendEmailResult>;
};

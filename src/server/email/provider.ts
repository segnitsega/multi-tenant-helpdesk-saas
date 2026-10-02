import "server-only";

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
  headers?: Record<string, string>;
  replyTo?: string;
  from?: string;
};

export type EmailProvider = {
  sendEmail: (input: SendEmailInput) => Promise<void>;
};

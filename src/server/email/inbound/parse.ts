export type NormalizedInboundAttachment = {
  filename: string;
  contentType: string;
  contentLength: number;
  contentBase64: string;
  contentId?: string;
};

export type NormalizedInboundEmail = {
  from: string;
  fromName: string | null;
  to: string;
  subject: string;
  textBody: string;
  htmlBody: string;
  strippedReply: string | null;
  messageId: string;
  providerMessageId: string;
  inReplyTo: string | null;
  references: string[];
  mailboxHash: string | null;
  attachments: NormalizedInboundAttachment[];
  headers: Record<string, string>;
};

type PostmarkHeader = { Name?: string; Value?: string };
type PostmarkAttachment = {
  Name?: string;
  Content?: string;
  ContentType?: string;
  ContentLength?: number;
  ContentID?: string;
};

function headerMap(headers: PostmarkHeader[] | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const header of headers ?? []) {
    if (!header.Name) continue;
    out[header.Name] = header.Value ?? "";
  }
  return out;
}

function findHeader(
  headers: Record<string, string>,
  name: string,
): string | null {
  const target = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === target) return value || null;
  }
  return null;
}

function splitReferences(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function parsePostmarkInbound(payload: unknown): NormalizedInboundEmail {
  const raw = (payload ?? {}) as Record<string, unknown>;
  const headers = headerMap(raw.Headers as PostmarkHeader[] | undefined);
  const messageIdHeader = findHeader(headers, "Message-ID");
  const inReplyTo = findHeader(headers, "In-Reply-To");
  const references = splitReferences(findHeader(headers, "References"));
  const attachmentsRaw = (raw.Attachments as PostmarkAttachment[] | undefined) ?? [];

  const providerMessageId = String(raw.MessageID ?? "").trim();
  if (!providerMessageId) {
    throw new Error("Postmark payload missing MessageID");
  }

  const from = String(raw.From ?? "").trim();
  const to = String(
    raw.OriginalRecipient ?? raw.To ?? "",
  ).trim();

  return {
    from,
    fromName: String(raw.FromName ?? "").trim() || null,
    to,
    subject: String(raw.Subject ?? "(no subject)").trim() || "(no subject)",
    textBody: String(raw.TextBody ?? ""),
    htmlBody: String(raw.HtmlBody ?? ""),
    strippedReply: String(raw.StrippedTextReply ?? "").trim() || null,
    messageId: messageIdHeader ?? `<postmark.${providerMessageId}@inbound>`,
    providerMessageId,
    inReplyTo,
    references,
    mailboxHash: String(raw.MailboxHash ?? "").trim() || null,
    attachments: attachmentsRaw.map((row) => ({
      filename: String(row.Name ?? "attachment").trim() || "attachment",
      contentType: String(row.ContentType ?? "application/octet-stream"),
      contentLength: Number(row.ContentLength ?? 0),
      contentBase64: String(row.Content ?? ""),
      contentId: row.ContentID ? String(row.ContentID) : undefined,
    })),
    headers,
  };
}

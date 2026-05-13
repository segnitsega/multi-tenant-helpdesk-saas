export function ticketMailboxToken(ticketNumber: number): string {
  return `t${ticketNumber}`;
}

export function parseTicketMailboxToken(
  mailboxHash: string | null | undefined,
): number | null {
  if (!mailboxHash) return null;
  const match = /^t(\d+)$/i.exec(mailboxHash.trim());
  if (!match?.[1]) return null;
  const number = Number(match[1]);
  return Number.isInteger(number) && number > 0 ? number : null;
}

export function buildReplyToAddress(
  slug: string,
  ticketNumber: number,
  mailDomain: string,
): string {
  return `${slug}+${ticketMailboxToken(ticketNumber)}@${mailDomain}`;
}

export function buildSupportFromAddress(
  fromName: string,
  slug: string,
  mailDomain: string,
): string {
  return `${fromName} <${slug}@${mailDomain}>`;
}

export function normalizeMessageId(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("<") && trimmed.endsWith(">")) return trimmed;
  return `<${trimmed}>`;
}

export function extractEmailAddress(value: string): string {
  const match = /<([^>]+)>/.exec(value);
  return (match?.[1] ?? value).trim().toLowerCase();
}

export type CannedReplyVars = {
  customerName?: string | null;
  agentName?: string | null;
  ticketNumber?: number | null;
};

export function renderCannedBody(
  bodyHtml: string,
  vars: CannedReplyVars,
): string {
  return bodyHtml
    .replaceAll("{{customer.name}}", vars.customerName ?? "")
    .replaceAll("{{agent.name}}", vars.agentName ?? "")
    .replaceAll(
      "{{ticket.number}}",
      vars.ticketNumber == null ? "" : String(vars.ticketNumber),
    );
}

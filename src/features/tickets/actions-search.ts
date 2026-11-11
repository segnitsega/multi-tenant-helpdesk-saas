"use server";

import { getTenantContext } from "@/server/tenancy/context";
import { listTickets } from "@/server/services/ticket.service";
import { assertCan } from "@/server/tenancy/permissions";

export async function searchTicketsAction(slug: string, query: string) {
  const ctx = await getTenantContext(slug);
  assertCan(ctx, "ticket.view");
  const q = query.trim().replace(/^#/, "");
  if (!q) return [];

  const result = await listTickets(ctx, {
    limit: 8,
    filters: { q },
  });

  return result.items.map((ticket) => ({
    number: ticket.number,
    subject: ticket.subject,
    status: ticket.status,
  }));
}

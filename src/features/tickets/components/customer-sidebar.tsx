"use client";

import Link from "next/link";
import type { TicketDetail } from "@/features/tickets/types";
import { StatusBadge, type TicketStatus } from "@/components/status-badge";

export function CustomerSidebar({
  slug,
  detail,
}: {
  slug: string;
  detail: TicketDetail;
}) {
  const { customer, recentTickets } = detail;

  return (
    <aside className="border-border hidden w-64 shrink-0 flex-col border-l xl:flex">
      <div className="border-border border-b px-4 py-3">
        <h3 className="text-sm font-semibold">Customer</h3>
      </div>
      <div className="space-y-3 px-4 py-3 text-sm">
        <div>
          <p className="text-foreground font-medium">
            {customer.name || "Unknown"}
          </p>
          <p className="text-muted-foreground">{customer.email}</p>
          {customer.phone ? (
            <p className="text-muted-foreground">{customer.phone}</p>
          ) : null}
        </div>
        <div>
          <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
            Recent tickets
          </p>
          <ul className="space-y-2">
            {recentTickets.map((ticket) => (
              <li key={ticket.number}>
                <Link
                  href={`/w/${slug}/inbox/${ticket.number}`}
                  className="hover:bg-muted block rounded-md px-2 py-1.5"
                >
                  <p className="truncate text-sm font-medium">
                    #{ticket.number} {ticket.subject}
                  </p>
                  <StatusBadge
                    status={ticket.status as TicketStatus}
                    className="mt-1"
                  />
                </Link>
              </li>
            ))}
            {recentTickets.length === 0 ? (
              <p className="text-muted-foreground text-xs">No other tickets</p>
            ) : null}
          </ul>
        </div>
      </div>
    </aside>
  );
}

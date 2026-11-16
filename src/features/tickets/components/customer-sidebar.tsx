"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PanelRight, PanelRightClose } from "lucide-react";
import type { TicketDetail } from "@/features/tickets/types";
import { StatusBadge, type TicketStatus } from "@/components/status-badge";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "relay:inbox:customer-collapsed";

export function CustomerSidebar({
  slug,
  detail,
}: {
  slug: string;
  detail: TicketDetail;
}) {
  const { customer, recentTickets } = detail;
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      setCollapsed(false);
    }
    setReady(true);
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        // ignore quota / private mode
      }
      return next;
    });
  }

  if (!ready) {
    return (
      <aside className="border-border hidden w-64 shrink-0 border-l xl:block" />
    );
  }

  if (collapsed) {
    return (
      <aside className="border-border bg-background hidden w-10 shrink-0 flex-col items-center border-l py-2 xl:flex">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={toggle}
          aria-label="Expand customer details"
          title="Show customer"
          className="text-muted-foreground"
        >
          <PanelRight className="size-4" />
        </Button>
      </aside>
    );
  }

  return (
    <aside className="border-border bg-background hidden w-64 shrink-0 flex-col border-l xl:flex">
      <div className="border-border flex items-center justify-between gap-1 border-b px-2 py-2.5">
        <h3 className="text-foreground px-2 text-sm font-semibold">Customer</h3>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={toggle}
          aria-label="Collapse customer details"
          title="Hide customer"
          className="text-muted-foreground"
        >
          <PanelRightClose className="size-4" />
        </Button>
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3 text-sm">
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

"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { InboxViewId, ViewCounts } from "@/features/tickets/types";
import { cn } from "@/lib/utils";

const VIEWS: { id: InboxViewId; label: string }[] = [
  { id: "open", label: "All open" },
  { id: "mine", label: "Mine" },
  { id: "unassigned", label: "Unassigned" },
  { id: "pending", label: "Pending" },
  { id: "resolved", label: "Resolved" },
  { id: "closed", label: "Closed" },
];

export function ViewsPane({
  slug,
  counts,
}: {
  slug: string;
  counts: ViewCounts;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = (searchParams.get("view") as InboxViewId | null) ?? "open";

  return (
    <aside className="border-border hidden w-48 shrink-0 flex-col border-r lg:flex">
      <div className="text-muted-foreground px-3 py-3 text-xs font-medium tracking-wide uppercase">
        Views
      </div>
      <nav className="flex flex-col gap-0.5 px-2 pb-3">
        {VIEWS.map((view) => {
          const params = new URLSearchParams(searchParams.toString());
          params.set("view", view.id);
          params.delete("status");
          const href = `${pathname.split("/inbox")[0]}/inbox?${params.toString()}`;
          const isActive = active === view.id;
          return (
            <Link
              key={view.id}
              href={href}
              className={cn(
                "flex items-center justify-between rounded-md px-2.5 py-1.5 text-sm transition-colors",
                isActive
                  ? "bg-muted text-foreground font-medium"
                  : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
              )}
            >
              <span>{view.label}</span>
              <span className="text-muted-foreground font-mono text-xs tabular-nums">
                {counts[view.id] ?? 0}
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

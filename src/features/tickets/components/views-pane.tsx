"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { PanelLeftClose, PanelLeft } from "lucide-react";
import type { InboxViewId, ViewCounts } from "@/features/tickets/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const VIEWS: { id: InboxViewId; label: string }[] = [
  { id: "open", label: "All open" },
  { id: "mine", label: "Mine" },
  { id: "unassigned", label: "Unassigned" },
  { id: "pending", label: "Pending" },
  { id: "resolved", label: "Resolved" },
  { id: "closed", label: "Closed" },
];

const STORAGE_KEY = "relay:inbox:views-collapsed";

export function ViewsPane({
  counts,
}: {
  counts: ViewCounts;
  slug?: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = (searchParams.get("view") as InboxViewId | null) ?? "open";
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
      <aside className="border-border hidden w-48 shrink-0 border-r lg:block" />
    );
  }

  if (collapsed) {
    return (
      <aside className="border-border bg-background hidden w-10 shrink-0 flex-col items-center border-r py-2 lg:flex">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={toggle}
          aria-label="Expand views"
          title="Show views"
          className="text-muted-foreground"
        >
          <PanelLeft className="size-4" />
        </Button>
      </aside>
    );
  }

  return (
    <aside className="border-border bg-background hidden w-48 shrink-0 flex-col border-r lg:flex">
      <div className="flex items-center justify-between gap-1 px-2 py-2.5">
        <div className="text-muted-foreground px-1 text-xs font-medium tracking-wide uppercase">
          Views
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={toggle}
          aria-label="Collapse views"
          title="Hide views"
          className="text-muted-foreground"
        >
          <PanelLeftClose className="size-4" />
        </Button>
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

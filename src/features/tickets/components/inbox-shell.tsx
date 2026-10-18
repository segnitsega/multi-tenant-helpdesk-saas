"use client";

import { Suspense, useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { ViewsPane } from "@/features/tickets/components/views-pane";
import { TicketList } from "@/features/tickets/components/ticket-list";
import { parseInboxSearchParams } from "@/features/tickets/url-state";
import type { TicketFilters } from "@/lib/validators/ticket";
import type { TicketListItem, ViewCounts } from "@/features/tickets/types";

export function InboxShell({
  slug,
  filters: initialFilters,
  counts,
  initialPage,
  children,
}: {
  slug: string;
  filters: TicketFilters;
  counts: ViewCounts;
  initialPage: { items: TicketListItem[]; nextCursor: string | null };
  children: React.ReactNode;
}) {
  const searchParams = useSearchParams();
  const params = useParams<{ number?: string }>();
  const parsed = useMemo(() => {
    const record: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      record[key] = value;
    });
    return parseInboxSearchParams(record);
  }, [searchParams]);

  const activeNumber = Number(params.number || 0) || undefined;
  const filtersMatchInitial =
    JSON.stringify(parsed.filters) === JSON.stringify(initialFilters);

  return (
    <div className="flex h-[calc(100dvh-3rem)] min-h-0 w-full overflow-hidden">
      <Suspense fallback={null}>
        <ViewsPane slug={slug} counts={counts} />
      </Suspense>
      <Suspense
        fallback={
          <div className="border-border w-full max-w-md border-r p-3 text-sm">
            Loading inbox…
          </div>
        }
      >
        <TicketList
          slug={slug}
          filters={parsed.filters}
          initialPage={filtersMatchInitial ? initialPage : undefined}
          activeNumber={activeNumber}
        />
      </Suspense>
      <div className="bg-background flex min-w-0 flex-1 flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}

import { Suspense } from "react";
import { getTenantContext } from "@/server/tenancy/context";
import {
  getViewCountsQuery,
  listTicketsQuery,
} from "@/server/queries/tickets";
import { viewToFilters } from "@/features/tickets/url-state";
import { InboxShell } from "@/features/tickets/components/inbox-shell";

export default async function InboxLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ctx = await getTenantContext(slug);
  const filters = viewToFilters("open");

  const [initialPage, counts] = await Promise.all([
    listTicketsQuery(ctx, { filters, limit: 30 }),
    getViewCountsQuery(ctx),
  ]);

  return (
    <Suspense
      fallback={
        <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
          Loading inbox…
        </div>
      }
    >
      <InboxShell
        slug={slug}
        filters={filters}
        counts={counts}
        initialPage={initialPage}
      >
        {children}
      </InboxShell>
    </Suspense>
  );
}

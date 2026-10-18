"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useVirtualizer } from "@tanstack/react-virtual";
import { toast } from "sonner";
import { TicketRow } from "@/features/tickets/components/ticket-row";
import { TicketFiltersBar } from "@/features/tickets/components/ticket-filters";
import { BulkActionBar } from "@/features/tickets/components/bulk-action-bar";
import { NewTicketDialog } from "@/features/tickets/components/new-ticket-dialog";
import { useTicketList } from "@/features/tickets/hooks/use-ticket-list";
import {
  bulkUpdateTicketsAction,
  mergeTicketsAction,
} from "@/features/tickets/actions";
import type { TicketFilters } from "@/lib/validators/ticket";
import type { TicketListItem } from "@/features/tickets/types";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Inbox } from "lucide-react";

export function TicketList({
  slug,
  filters,
  activeNumber,
  initialPage,
}: {
  slug: string;
  filters: TicketFilters;
  activeNumber?: number;
  initialPage?: { items: TicketListItem[]; nextCursor: string | null };
}) {
  const router = useRouter();
  const params = useParams<{ number?: string }>();
  const currentNumber =
    activeNumber ?? (Number(params.number || 0) || undefined);
  const query = useTicketList(slug, filters, initialPage);
  const [selected, setSelected] = useState<number[]>([]);
  const [newOpen, setNewOpen] = useState(false);
  const parentRef = useRef<HTMLDivElement>(null);

  const tickets = useMemo(
    () => query.data?.pages.flatMap((page) => page.items) ?? [],
    [query.data],
  );

  const virtualizer = useVirtualizer({
    count: tickets.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 92,
    overscan: 8,
  });

  useEffect(() => {
    const [last] = virtualizer.getVirtualItems().slice(-1);
    if (!last) return;
    if (last.index >= tickets.length - 5 && query.hasNextPage && !query.isFetchingNextPage) {
      void query.fetchNextPage();
    }
  });

  function toggle(number: number, checked: boolean) {
    setSelected((prev) =>
      checked ? [...new Set([...prev, number])] : prev.filter((n) => n !== number),
    );
  }

  async function applyStatus(status: string) {
    const result = await bulkUpdateTicketsAction(slug, {
      numbers: selected,
      patch: { status: status as "OPEN" },
    });
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    setSelected([]);
    toast.success("Tickets updated");
    router.refresh();
  }

  async function closeSelected() {
    await applyStatus("CLOSED");
  }

  async function mergeSelected() {
    if (selected.length !== 2) return;
    const [sourceNumber, targetNumber] = selected;
    const result = await mergeTicketsAction(slug, {
      sourceNumber: sourceNumber!,
      targetNumber: targetNumber!,
    });
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    setSelected([]);
    toast.success(`Merged #${sourceNumber} into #${targetNumber}`);
    router.push(`/w/${slug}/inbox/${targetNumber}`);
    router.refresh();
  }

  return (
    <section className="border-border flex w-full max-w-md min-w-[20rem] flex-col border-r">
      <TicketFiltersBar onOpenNew={() => setNewOpen(true)} />
      <BulkActionBar
        count={selected.length}
        onStatus={applyStatus}
        onClose={closeSelected}
        onMerge={mergeSelected}
        onClear={() => setSelected([])}
      />
      <div ref={parentRef} className="min-h-0 flex-1 overflow-y-auto">
        {query.isLoading ? (
          <div className="space-y-2 p-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : tickets.length === 0 ? (
          <EmptyState
            icon={<Inbox />}
            title="No tickets"
            description="Create a ticket or adjust filters to see conversations."
            className="py-16"
          />
        ) : (
          <div
            style={{ height: virtualizer.getTotalSize(), position: "relative" }}
          >
            {virtualizer.getVirtualItems().map((row) => {
              const ticket = tickets[row.index]!;
              return (
                <div
                  key={ticket.id}
                  data-index={row.index}
                  ref={virtualizer.measureElement}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${row.start}px)`,
                  }}
                >
                  <TicketRow
                    slug={slug}
                    ticket={ticket}
                    selected={selected.includes(ticket.number)}
                    active={currentNumber === ticket.number}
                    onToggle={toggle}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
      <NewTicketDialog
        slug={slug}
        open={newOpen}
        onOpenChange={setNewOpen}
      />
    </section>
  );
}

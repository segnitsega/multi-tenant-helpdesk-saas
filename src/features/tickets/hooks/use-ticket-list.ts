"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchTicketPageAction } from "@/features/tickets/actions";
import { ticketKeys } from "@/features/tickets/query-keys";
import type { TicketFilters } from "@/lib/validators/ticket";

export function useTicketList(
  slug: string,
  filters: TicketFilters,
  initialPage?: {
    items: import("@/features/tickets/types").TicketListItem[];
    nextCursor: string | null;
  },
) {
  return useInfiniteQuery({
    queryKey: ticketKeys.list(slug, filters),
    queryFn: async ({ pageParam }) => {
      const result = await fetchTicketPageAction(slug, {
        filters,
        cursor: pageParam,
        limit: 30,
      });
      if (!result.ok) {
        throw new Error(result.error.message);
      }
      return result.data!;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    initialData: initialPage
      ? {
          pages: [initialPage],
          pageParams: [undefined],
        }
      : undefined,
  });
}

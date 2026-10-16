import type { TicketFilters } from "@/lib/validators/ticket";

export const ticketKeys = {
  all: (slug: string) => ["tickets", slug] as const,
  lists: (slug: string) => [...ticketKeys.all(slug), "list"] as const,
  list: (slug: string, filters: TicketFilters) =>
    [...ticketKeys.lists(slug), filters] as const,
  details: (slug: string) => [...ticketKeys.all(slug), "detail"] as const,
  detail: (slug: string, number: number) =>
    [...ticketKeys.details(slug), number] as const,
  views: (slug: string) => [...ticketKeys.all(slug), "views"] as const,
};

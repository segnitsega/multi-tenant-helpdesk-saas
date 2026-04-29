import type { QueryClient } from "@tanstack/react-query";
import { ticketKeys } from "@/features/tickets/query-keys";
import type { TicketDetail, TicketListItem, TicketMessage } from "@/features/tickets/types";
import type { RealtimeEvent } from "@/types/events";

type ListPage = {
  items: TicketListItem[];
  nextCursor: string | null;
};

type InfiniteList = {
  pages: ListPage[];
  pageParams: unknown[];
};

type DetailCache = {
  ok: true;
  data: TicketDetail;
};

export function handleRealtimeEvent(
  queryClient: QueryClient,
  slug: string,
  event: RealtimeEvent,
  opts?: {
    onNewTicket?: (number: number) => void;
    onHighlightTicket?: (number: number) => void;
  },
) {
  switch (event.type) {
    case "resync":
      void queryClient.invalidateQueries({ queryKey: ticketKeys.all(slug) });
      break;
    case "ticket.created":
      void queryClient.invalidateQueries({ queryKey: ticketKeys.lists(slug) });
      void queryClient.invalidateQueries({ queryKey: ticketKeys.views(slug) });
      opts?.onNewTicket?.(event.payload.number);
      opts?.onHighlightTicket?.(event.payload.number);
      break;
    case "ticket.updated":
      patchTicketCaches(queryClient, slug, event.payload.number, event.payload.patch);
      opts?.onHighlightTicket?.(event.payload.number);
      break;
    case "message.created":
      appendMessage(queryClient, slug, event);
      bumpTicketInLists(queryClient, slug, event.payload.ticketNumber, {
        preview: event.payload.message.bodyText.slice(0, 140),
        lastMessageAt: event.payload.message.createdAt,
      });
      opts?.onHighlightTicket?.(event.payload.ticketNumber);
      break;
    case "sla.breached":
      void queryClient.invalidateQueries({
        queryKey: ticketKeys.detail(slug, event.payload.number),
      });
      void queryClient.invalidateQueries({ queryKey: ticketKeys.lists(slug) });
      break;
    default:
      break;
  }
}

function patchTicketCaches(
  queryClient: QueryClient,
  slug: string,
  number: number,
  patch: Record<string, unknown>,
) {
  const detailKey = ticketKeys.detail(slug, number);
  const detail = queryClient.getQueryData<DetailCache>(detailKey);
  if (detail?.data) {
    queryClient.setQueryData(detailKey, {
      ...detail,
      data: {
        ...detail.data,
        ticket: {
          ...detail.data.ticket,
          ...patch,
        },
      },
    });
  }

  const lists = queryClient.getQueriesData<InfiniteList>({
    queryKey: ticketKeys.lists(slug),
  });
  for (const [key, data] of lists) {
    if (!data?.pages) continue;
    queryClient.setQueryData(key, {
      ...data,
      pages: data.pages.map((page) => ({
        ...page,
        items: page.items.map((item) =>
          item.number === number ? { ...item, ...patch } : item,
        ),
      })),
    });
  }
}

function bumpTicketInLists(
  queryClient: QueryClient,
  slug: string,
  number: number,
  patch: Partial<TicketListItem>,
) {
  const lists = queryClient.getQueriesData<InfiniteList>({
    queryKey: ticketKeys.lists(slug),
  });
  for (const [key, data] of lists) {
    if (!data?.pages) continue;
    queryClient.setQueryData(key, {
      ...data,
      pages: data.pages.map((page, pageIndex) => {
        const items = [...page.items];
        const index = items.findIndex((item) => item.number === number);
        if (index === -1) {
          if (pageIndex === 0) {
            void queryClient.invalidateQueries({ queryKey: key });
          }
          return page;
        }
        const [ticket] = items.splice(index, 1);
        if (!ticket) return page;
        items.unshift({ ...ticket, ...patch });
        return { ...page, items };
      }),
    });
  }
}

function appendMessage(
  queryClient: QueryClient,
  slug: string,
  event: Extract<RealtimeEvent, { type: "message.created" }>,
) {
  const detailKey = ticketKeys.detail(slug, event.payload.ticketNumber);
  const detail = queryClient.getQueryData<DetailCache>(detailKey);
  if (!detail?.data) {
    void queryClient.invalidateQueries({ queryKey: detailKey });
    return;
  }

  const exists = detail.data.messages.some(
    (message) => message.id === event.payload.message.id,
  );
  if (exists) return;

  const message: TicketMessage = {
    ...event.payload.message,
    attachments: [],
  };

  queryClient.setQueryData(detailKey, {
    ...detail,
    data: {
      ...detail.data,
      messages: [...detail.data.messages, message],
      ticket: {
        ...detail.data.ticket,
        lastMessageAt: event.payload.message.createdAt,
        preview: event.payload.message.bodyText.slice(0, 140),
      },
    },
  });
}

"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { updateTicketAction } from "@/features/tickets/actions";
import { ticketKeys } from "@/features/tickets/query-keys";
import type { TicketDetail, TicketListItem } from "@/features/tickets/types";
import type { UpdateTicketInput } from "@/lib/validators/ticket";

type Page = {
  items: TicketListItem[];
  nextCursor: string | null;
};

export function useUpdateTicket(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateTicketInput & { number: number }) => {
      const result = await updateTicketAction(slug, input);
      if (!result.ok) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ticketKeys.all(slug) });

      const detailKey = ticketKeys.detail(slug, input.number);
      const previousDetail = queryClient.getQueryData<{
        ok: true;
        data: TicketDetail;
      }>(detailKey);

      if (previousDetail?.data) {
        queryClient.setQueryData(detailKey, {
          ...previousDetail,
          data: {
            ...previousDetail.data,
            ticket: {
              ...previousDetail.data.ticket,
              ...("subject" in input && input.subject
                ? { subject: input.subject }
                : {}),
              ...("status" in input && input.status
                ? { status: input.status }
                : {}),
              ...("priority" in input && input.priority
                ? { priority: input.priority }
                : {}),
              ...("assigneeMembershipId" in input
                ? { assigneeMembershipId: input.assigneeMembershipId ?? null }
                : {}),
            },
          },
        });
      }

      const listSnapshots = queryClient.getQueriesData<{
        pages: Page[];
        pageParams: unknown[];
      }>({ queryKey: ticketKeys.lists(slug) });

      for (const [key, data] of listSnapshots) {
        if (!data?.pages) continue;
        queryClient.setQueryData(key, {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            items: page.items.map((item) =>
              item.number === input.number
                ? {
                    ...item,
                    ...("subject" in input && input.subject
                      ? { subject: input.subject }
                      : {}),
                    ...("status" in input && input.status
                      ? { status: input.status }
                      : {}),
                    ...("priority" in input && input.priority
                      ? { priority: input.priority }
                      : {}),
                    ...("assigneeMembershipId" in input
                      ? {
                          assigneeMembershipId:
                            input.assigneeMembershipId ?? null,
                        }
                      : {}),
                  }
                : item,
            ),
          })),
        });
      }

      return { previousDetail, listSnapshots };
    },
    onError: (error, input, context) => {
      if (context?.previousDetail) {
        queryClient.setQueryData(
          ticketKeys.detail(slug, input.number),
          context.previousDetail,
        );
      }
      if (context?.listSnapshots) {
        for (const [key, data] of context.listSnapshots) {
          queryClient.setQueryData(key, data);
        }
      }
      toast.error(error.message || "Could not update ticket", {
        action: {
          label: "Retry",
          onClick: () => {
            void queryClient.invalidateQueries({
              queryKey: ticketKeys.all(slug),
            });
          },
        },
      });
    },
    onSettled: async (_data, _error, input) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ticketKeys.detail(slug, input.number),
        }),
        queryClient.invalidateQueries({ queryKey: ticketKeys.lists(slug) }),
        queryClient.invalidateQueries({ queryKey: ticketKeys.views(slug) }),
      ]);
    },
  });
}

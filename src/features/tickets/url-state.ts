import type { TicketFilters } from "@/lib/validators/ticket";
import type { InboxViewId } from "@/features/tickets/types";

export function viewToFilters(
  view: InboxViewId | string | null | undefined,
): TicketFilters {
  switch (view) {
    case "mine":
      return { assigneeMembershipId: "me", status: ["OPEN", "PENDING", "ON_HOLD"] };
    case "unassigned":
      return {
        assigneeMembershipId: "unassigned",
        status: ["OPEN", "PENDING", "ON_HOLD"],
      };
    case "pending":
      return { status: "PENDING" };
    case "resolved":
      return { status: "RESOLVED" };
    case "closed":
      return { status: "CLOSED" };
    case "open":
    default:
      return { status: ["OPEN", "PENDING", "ON_HOLD"] };
  }
}

export function parseInboxSearchParams(
  params: Record<string, string | string[] | undefined>,
): {
  view: InboxViewId;
  filters: TicketFilters;
  q: string;
} {
  const viewRaw = typeof params.view === "string" ? params.view : "open";
  const view = (
    ["open", "mine", "unassigned", "pending", "resolved", "closed"].includes(
      viewRaw,
    )
      ? viewRaw
      : "open"
  ) as InboxViewId;

  const base = viewToFilters(view);
  const q = typeof params.q === "string" ? params.q : "";
  const priority =
    typeof params.priority === "string" ? params.priority : undefined;
  const channel =
    typeof params.channel === "string" ? params.channel : undefined;
  const tagId = typeof params.tagId === "string" ? params.tagId : undefined;
  const status =
    typeof params.status === "string" ? params.status : undefined;

  return {
    view,
    q,
    filters: {
      ...base,
      ...(status
        ? {
            status: status as TicketFilters["status"],
          }
        : {}),
      ...(priority
        ? { priority: priority as TicketFilters["priority"] }
        : {}),
      ...(channel ? { channel: channel as TicketFilters["channel"] } : {}),
      ...(tagId ? { tagId } : {}),
      ...(q ? { q } : {}),
    },
  };
}

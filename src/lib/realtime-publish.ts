import "server-only";
import { publish } from "@/server/realtime/publisher";
type PublishCtx = {
  workspaceId: string;
  membershipId?: string | null;
};

export async function publishTicketCreated(
  ctx: PublishCtx,
  ticket: { id: string; number: number; subject: string; status: string; priority: string },
) {
  await publish({
    type: "ticket.created",
    workspaceId: ctx.workspaceId,
    ticketId: ticket.id,
    actorMembershipId: ctx.membershipId ?? null,
    payload: {
      ticketId: ticket.id,
      number: ticket.number,
      subject: ticket.subject,
      status: ticket.status,
      priority: ticket.priority,
    },
  });
}

export async function publishTicketUpdated(
  ctx: PublishCtx,
  ticket: { id: string; number: number },
  patch: Record<string, unknown>,
) {
  await publish({
    type: "ticket.updated",
    workspaceId: ctx.workspaceId,
    ticketId: ticket.id,
    actorMembershipId: ctx.membershipId ?? null,
    payload: {
      ticketId: ticket.id,
      number: ticket.number,
      patch,
    },
  });
}

export async function publishMessageCreated(
  ctx: PublishCtx,
  input: {
    ticketId: string;
    ticketNumber: number;
    message: {
      id: string;
      authorType: string;
      authorMembershipId: string | null;
      authorCustomerId: string | null;
      kind: string;
      bodyHtml: string;
      bodyText: string;
      deliveryStatus: string | null;
      createdAt: Date | string;
    };
  },
) {
  await publish({
    type: "message.created",
    workspaceId: ctx.workspaceId,
    ticketId: input.ticketId,
    actorMembershipId: ctx.membershipId ?? null,
    payload: {
      ticketId: input.ticketId,
      ticketNumber: input.ticketNumber,
      message: {
        id: input.message.id,
        authorType: input.message.authorType,
        authorMembershipId: input.message.authorMembershipId,
        authorCustomerId: input.message.authorCustomerId,
        kind: input.message.kind,
        bodyHtml: input.message.bodyHtml,
        bodyText: input.message.bodyText,
        deliveryStatus: input.message.deliveryStatus,
        createdAt:
          typeof input.message.createdAt === "string"
            ? input.message.createdAt
            : input.message.createdAt.toISOString(),
      },
    },
  });
}

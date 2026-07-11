import "server-only";
import { systemDb } from "@/server/db/system";
import { withTenantDb } from "@/server/db";
import { publish } from "@/server/realtime/publisher";
import type { SlaScanJob } from "@/server/jobs/queues";

export async function processSlaScan(job: SlaScanJob) {
  const now = new Date();
  const workspaces = job.workspaceId
    ? (
        await systemDb.orm.public.Workspace.where({
          id: job.workspaceId,
        }).all()
      )
    : await systemDb.orm.public.Workspace.all();

  let breached = 0;

  for (const workspace of workspaces) {
    const flagged = await withTenantDb(
      { workspaceId: workspace.id },
      async (tx) => {
        const tickets = await tx.orm.public.Ticket.where({
          workspaceId: workspace.id,
        }).all();
        const updates: {
          id: string;
          number: number;
          kind: "first_response" | "resolution";
        }[] = [];

        for (const ticket of tickets) {
          if (
            !ticket.firstResponseAt &&
            !ticket.slaFirstResponseBreached &&
            ticket.slaFirstResponseDueAt &&
            ticket.slaFirstResponseDueAt.getTime() <= now.getTime()
          ) {
            await tx.orm.public.Ticket.where({ id: ticket.id }).update({
              slaFirstResponseBreached: true,
            });
            updates.push({
              id: ticket.id,
              number: ticket.number,
              kind: "first_response",
            });
          }

          if (
            !ticket.resolvedAt &&
            !ticket.slaResolutionBreached &&
            ticket.slaResolutionDueAt &&
            ticket.slaResolutionDueAt.getTime() <= now.getTime() &&
            !["RESOLVED", "CLOSED"].includes(ticket.status)
          ) {
            await tx.orm.public.Ticket.where({ id: ticket.id }).update({
              slaResolutionBreached: true,
            });
            updates.push({
              id: ticket.id,
              number: ticket.number,
              kind: "resolution",
            });
          }
        }

        return updates;
      },
    );

    for (const row of flagged) {
      await publish({
        type: "sla.breached",
        workspaceId: workspace.id,
        ticketId: row.id,
        payload: {
          ticketId: row.id,
          number: row.number,
          kind: row.kind,
        },
      });
      breached += 1;
    }
  }

  return { scanned: workspaces.length, breached };
}

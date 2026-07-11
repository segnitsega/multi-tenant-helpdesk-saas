import "server-only";
import { systemDb } from "@/server/db/system";
import { withTenantDb } from "@/server/db";

const DEFAULT_OPEN_CAP = 50;

export async function pickRoundRobinAssignee(
  workspaceId: string,
  openTicketCap = DEFAULT_OPEN_CAP,
): Promise<string | null> {
  const memberships = await systemDb.orm.public.Membership.where({
    workspaceId,
  }).all();

  const agents = memberships
    .filter((row) => !row.readonly && ["OWNER", "ADMIN", "AGENT"].includes(row.role))
    .sort((a, b) => a.id.localeCompare(b.id));

  if (agents.length === 0) return null;

  const counter = await systemDb.orm.public.WorkspaceCounter.where({
    workspaceId,
  }).first();
  const lastId = counter?.lastAssignedMembershipId ?? null;

  const startIndex = lastId
    ? agents.findIndex((agent) => agent.id === lastId)
    : -1;

  const ordered = [
    ...agents.slice(startIndex + 1),
    ...agents.slice(0, startIndex + 1),
  ];

  const openCounts = await withTenantDb({ workspaceId }, async (tx) => {
    const tickets = await tx.orm.public.Ticket.where({ workspaceId }).all();
    const counts = new Map<string, number>();
    for (const ticket of tickets) {
      if (!ticket.assigneeMembershipId) continue;
      if (["RESOLVED", "CLOSED"].includes(ticket.status)) continue;
      counts.set(
        ticket.assigneeMembershipId,
        (counts.get(ticket.assigneeMembershipId) ?? 0) + 1,
      );
    }
    return counts;
  });

  const pick =
    ordered.find(
      (agent) => (openCounts.get(agent.id) ?? 0) < openTicketCap,
    ) ?? null;

  if (!pick) return null;

  await systemDb.orm.public.WorkspaceCounter.where({ workspaceId }).update({
    lastAssignedMembershipId: pick.id,
  });

  return pick.id;
}

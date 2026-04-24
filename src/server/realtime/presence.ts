import "server-only";
import { redis } from "@/server/redis";
import { publish } from "@/server/realtime/publisher";
import {
  presenceKey,
  presencePattern,
  type PresenceViewer,
} from "@/types/events";

const PRESENCE_TTL_SECONDS = 30;

async function ensureRedis() {
  if (redis.status === "wait") {
    await redis.connect();
  }
}

export async function heartbeatPresence(input: {
  workspaceId: string;
  ticketId: string;
  membershipId: string;
  name: string;
  drafting?: boolean;
}): Promise<PresenceViewer[]> {
  await ensureRedis();

  const key = presenceKey(input.ticketId, input.membershipId);
  const value = JSON.stringify({
    membershipId: input.membershipId,
    name: input.name,
    drafting: Boolean(input.drafting),
  } satisfies PresenceViewer);

  const before = await listPresence(input.ticketId);
  await redis.setex(key, PRESENCE_TTL_SECONDS, value);
  const after = await listPresence(input.ticketId);

  const changed =
    before.length !== after.length ||
    before.some(
      (viewer, index) =>
        viewer.membershipId !== after[index]?.membershipId ||
        viewer.drafting !== after[index]?.drafting ||
        viewer.name !== after[index]?.name,
    );

  if (changed) {
    await publish({
      type: "presence.updated",
      workspaceId: input.workspaceId,
      ticketId: input.ticketId,
      actorMembershipId: input.membershipId,
      payload: {
        ticketId: input.ticketId,
        viewers: after,
      },
    });
  }

  return after;
}

export async function listPresence(ticketId: string): Promise<PresenceViewer[]> {
  await ensureRedis();
  const keys = await redis.keys(presencePattern(ticketId));
  if (keys.length === 0) return [];

  const values = await redis.mget(...keys);
  const viewers: PresenceViewer[] = [];
  for (const value of values) {
    if (!value) continue;
    try {
      viewers.push(JSON.parse(value) as PresenceViewer);
    } catch {
      continue;
    }
  }
  return viewers.sort((a, b) => a.name.localeCompare(b.name));
}

export async function publishTyping(input: {
  workspaceId: string;
  ticketId: string;
  membershipId: string;
  name: string;
  isTyping: boolean;
}) {
  await publish({
    type: "typing.updated",
    workspaceId: input.workspaceId,
    ticketId: input.ticketId,
    actorMembershipId: input.membershipId,
    payload: {
      ticketId: input.ticketId,
      membershipId: input.membershipId,
      name: input.name,
      isTyping: input.isTyping,
    },
  });
}

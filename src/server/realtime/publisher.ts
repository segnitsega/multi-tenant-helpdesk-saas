import "server-only";
import { redis } from "@/server/redis";
import {
  channelForWorkspace,
  recentKeyForWorkspace,
  seqKeyForWorkspace,
  type RealtimeEvent,
  type RealtimeEventType,
} from "@/types/events";

const RECENT_LIMIT = 100;

export type PublishInput = {
  type: RealtimeEventType;
  workspaceId: string;
  ticketId?: string;
  actorMembershipId?: string | null;
  payload: RealtimeEvent["payload"];
};

async function ensureRedis() {
  if (redis.status === "wait") {
    await redis.connect();
  }
}

export async function publish(input: PublishInput): Promise<RealtimeEvent> {
  await ensureRedis();

  const id = String(await redis.incr(seqKeyForWorkspace(input.workspaceId)));
  const event = {
    id,
    type: input.type,
    workspaceId: input.workspaceId,
    ticketId: input.ticketId,
    actorMembershipId: input.actorMembershipId ?? null,
    payload: input.payload,
    ts: new Date().toISOString(),
  } as RealtimeEvent;

  const encoded = JSON.stringify(event);
  const channel = channelForWorkspace(input.workspaceId);
  const recentKey = recentKeyForWorkspace(input.workspaceId);

  const pipeline = redis.pipeline();
  pipeline.publish(channel, encoded);
  if (input.type !== "typing.updated" && input.type !== "presence.updated") {
    pipeline.lpush(recentKey, encoded);
    pipeline.ltrim(recentKey, 0, RECENT_LIMIT - 1);
  }
  await pipeline.exec();

  return event;
}

export async function listRecentEvents(
  workspaceId: string,
  afterId?: string,
): Promise<{ events: RealtimeEvent[]; needsResync: boolean }> {
  await ensureRedis();
  const rows = await redis.lrange(recentKeyForWorkspace(workspaceId), 0, RECENT_LIMIT - 1);
  const events = rows
    .map((row) => {
      try {
        return JSON.parse(row) as RealtimeEvent;
      } catch {
        return null;
      }
    })
    .filter((row): row is RealtimeEvent => Boolean(row))
    .reverse();

  if (!afterId) {
    return { events: [], needsResync: false };
  }

  const afterNum = Number(afterId);
  if (!Number.isFinite(afterNum)) {
    return { events: [], needsResync: true };
  }

  const newest = events.at(-1);
  const oldest = events[0];
  if (!newest || !oldest) {
    return { events: [], needsResync: true };
  }

  if (afterNum < Number(oldest.id)) {
    return { events: [], needsResync: true };
  }

  return {
    events: events.filter((event) => Number(event.id) > afterNum),
    needsResync: false,
  };
}

export { RECENT_LIMIT };

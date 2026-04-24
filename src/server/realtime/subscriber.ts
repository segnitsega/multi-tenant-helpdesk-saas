import "server-only";
import { createBullRedis } from "@/server/redis";
import {
  channelForWorkspace,
  type RealtimeEvent,
} from "@/types/events";

type Listener = (event: RealtimeEvent) => void;

const globalForSub = globalThis as unknown as {
  realtimeListeners?: Map<string, Set<Listener>>;
  realtimeSub?: ReturnType<typeof createBullRedis>;
  realtimeSubReady?: Promise<void>;
};

function listeners() {
  if (!globalForSub.realtimeListeners) {
    globalForSub.realtimeListeners = new Map();
  }
  return globalForSub.realtimeListeners;
}

async function ensureSubscriber() {
  if (globalForSub.realtimeSub && globalForSub.realtimeSubReady) {
    await globalForSub.realtimeSubReady;
    return globalForSub.realtimeSub;
  }

  const sub = createBullRedis();
  globalForSub.realtimeSub = sub;
  globalForSub.realtimeSubReady = new Promise<void>((resolve, reject) => {
    if (sub.status === "ready") {
      resolve();
      return;
    }
    sub.once("ready", () => resolve());
    sub.once("error", (error) => {
      console.error("[realtime] subscriber error", error);
      reject(error);
    });
  });

  sub.on("message", (channel, message) => {
    const workspaceId = channel.startsWith("ws:") ? channel.slice(3) : null;
    if (!workspaceId) return;
    let event: RealtimeEvent;
    try {
      event = JSON.parse(message) as RealtimeEvent;
    } catch {
      return;
    }
    const set = listeners().get(workspaceId);
    if (!set) return;
    for (const listener of set) {
      try {
        listener(event);
      } catch (error) {
        console.error("[realtime] listener failed", error);
      }
    }
  });

  await globalForSub.realtimeSubReady;
  return sub;
}

export async function subscribeWorkspace(
  workspaceId: string,
  listener: Listener,
): Promise<() => void> {
  const sub = await ensureSubscriber();
  const map = listeners();
  let set = map.get(workspaceId);
  if (!set) {
    set = new Set();
    map.set(workspaceId, set);
    await sub.subscribe(channelForWorkspace(workspaceId));
  }
  set.add(listener);

  return () => {
    const current = map.get(workspaceId);
    if (!current) return;
    current.delete(listener);
    if (current.size === 0) {
      map.delete(workspaceId);
      void sub.unsubscribe(channelForWorkspace(workspaceId));
    }
  };
}

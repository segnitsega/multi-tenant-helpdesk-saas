import "server-only";
import { redis } from "@/server/redis";
import { env } from "@/server/env";

export class RateLimitError extends Error {
  constructor(message = "Too many requests. Try again later.") {
    super(message);
    this.name = "RateLimitError";
  }
}

export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<void> {
  try {
    if (redis.status === "wait") {
      await redis.connect();
    }

    const redisKey = `rl:${key}`;
    const count = await redis.incr(redisKey);
    if (count === 1) {
      await redis.expire(redisKey, windowSeconds);
    }

    if (count > limit) {
      throw new RateLimitError();
    }
  } catch (error) {
    if (error instanceof RateLimitError) throw error;
    if (env.NODE_ENV !== "production") {
      console.warn("[rate-limit] Redis unavailable; skipping in development", error);
      return;
    }
    throw new RateLimitError(
      "Service temporarily unavailable. Try again in a moment.",
    );
  }
}

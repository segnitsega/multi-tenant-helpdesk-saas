import "server-only";
import { redis } from "@/server/redis";

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
}

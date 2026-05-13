import "server-only";
import Redis from "ioredis";
import { env } from "@/server/env";

const globalForRedis = globalThis as unknown as {
  redis?: Redis;
  bullRedis?: Redis;
};

export const redis =
  globalForRedis.redis ??
  new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });

export function createBullRedis(): Redis {
  return new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
  });
}

export const bullRedis =
  globalForRedis.bullRedis ?? createBullRedis();

if (env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
  globalForRedis.bullRedis = bullRedis;
}

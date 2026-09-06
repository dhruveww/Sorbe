import "server-only";
import Redis from "ioredis";

/**
 * Redis holds only EPHEMERAL state: OTP codes, rate-limit counters, and (from
 * M4) the checkout lock. Carts and orders live in Postgres — losing Redis must
 * never lose a customer's bag.
 *
 * One client for local and production: Upstash speaks the normal Redis
 * protocol, so REDIS_URL is `redis://localhost:6379` in dev and
 * `rediss://...upstash.io:6379` in production. No second client, no REST path.
 */

let client: Redis | null = null;

export function getRedis(): Redis {
  if (client) return client;

  const url = process.env.REDIS_URL;
  if (!url) throw new Error("REDIS_URL is not set. Run `pnpm db:up` for local Redis.");

  client = new Redis(url, {
    // Fail fast when Redis is genuinely down — checkout fails CLOSED rather
    // than risking a double-charge without its lock (docs/PLAN.md §15).
    maxRetriesPerRequest: 2,
    connectTimeout: 5000,
    // Queue commands issued while the socket is still opening. Disabling this
    // rejects the FIRST request after every restart, which looks exactly like
    // an outage but is just a cold start. Retries above still bound the wait.
    enableOfflineQueue: true,
    lazyConnect: false,
  });

  client.on("error", (error) => {
    console.error("[redis]", error.message);
  });

  return client;
}

/**
 * Fixed-window rate limit. Returns whether the action is allowed and how many
 * attempts remain.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<{ allowed: boolean; remaining: number }> {
  const redis = getRedis();
  const count = await redis.incr(key);
  // Only set the TTL on the first hit, so the window does not slide forever
  // under sustained abuse.
  if (count === 1) await redis.expire(key, windowSeconds);
  return { allowed: count <= limit, remaining: Math.max(0, limit - count) };
}

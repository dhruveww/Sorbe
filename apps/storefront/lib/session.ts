import "server-only";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { getRedis } from "./redis";

/**
 * Login session.
 *
 * The cookie holds an opaque id; the customer id lives in Redis behind it. The
 * browser never receives a Medusa token (docs/PLAN.md §6 step 3).
 *
 * The TTL is refreshed on read, so an active shopper is never logged out
 * mid-checkout, while an abandoned session expires on its own.
 */

const SESSION_COOKIE = "sorbe_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

export type Session = { customerId: string; phone: string };

function sessionKey(id: string): string {
  return `session:${id}`;
}

export async function createSession(session: Session): Promise<void> {
  const id = randomBytes(32).toString("base64url");
  await getRedis().set(sessionKey(id), JSON.stringify(session), "EX", SESSION_TTL_SECONDS);

  (await cookies()).set(SESSION_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function getSession(): Promise<Session | null> {
  const id = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!id) return null;

  try {
    const redis = getRedis();
    const raw = await redis.get(sessionKey(id));
    if (!raw) return null;
    // Sliding window: still shopping means still logged in.
    await redis.expire(sessionKey(id), SESSION_TTL_SECONDS);
    return JSON.parse(raw) as Session;
  } catch {
    // Redis down: treat as logged out rather than crashing the page. Guest
    // checkout still works, which is the point of not gating browsing on login.
    return null;
  }
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const id = jar.get(SESSION_COOKIE)?.value;
  if (id) {
    try {
      await getRedis().del(sessionKey(id));
    } catch {
      // Best effort — the cookie is cleared regardless.
    }
  }
  jar.delete(SESSION_COOKIE);
}

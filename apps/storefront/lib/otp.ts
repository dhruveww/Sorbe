import "server-only";
import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { getFlags } from "@sorbe/config";
import { getRedis, rateLimit } from "./redis";

/**
 * One-time-code login.
 *
 * The channel is swappable by env (docs/PLAN.md §1.7):
 *   mock     dev — the code is printed to the server log, nothing is sent
 *   email    free via Resend, no DLT registration needed
 *   whatsapp once WhatsApp is live; moves login back to the phone number
 *   sms      deliberately unimplemented — needs India DLT registration
 *
 * Codes are stored HASHED with a TTL, never in plaintext, so a Redis dump does
 * not hand someone a working login.
 */

const CODE_TTL_SECONDS = 300; // 5 minutes
const MAX_VERIFY_ATTEMPTS = 5;

export type OtpRequestResult =
  | { ok: true; channel: string; devCode?: string }
  | { ok: false; reason: "rate_limited" | "send_failed"; message: string };

export type OtpVerifyResult =
  | { ok: true }
  | { ok: false; reason: "expired" | "wrong_code" | "too_many_attempts"; message: string };

function codeKey(identifier: string): string {
  return `otp:code:${identifier.toLowerCase()}`;
}
function attemptsKey(identifier: string): string {
  return `otp:attempts:${identifier.toLowerCase()}`;
}

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

export async function requestOtp(
  identifier: string,
  clientIp: string,
): Promise<OtpRequestResult> {
  // Two limits: one stops someone hammering a single address, the other stops
  // one machine spraying many addresses.
  const perIdentifier = await rateLimit(`otp:rl:id:${identifier.toLowerCase()}`, 5, 3600);
  if (!perIdentifier.allowed) {
    return {
      ok: false,
      reason: "rate_limited",
      message: "Too many codes requested. Try again in an hour.",
    };
  }
  const perIp = await rateLimit(`otp:rl:ip:${clientIp}`, 20, 3600);
  if (!perIp.allowed) {
    return { ok: false, reason: "rate_limited", message: "Too many attempts. Try again later." };
  }

  // randomInt is cryptographically secure; Math.random is not, and a guessable
  // login code is a full account takeover.
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const channel = getFlags().otpChannel;
  const effectiveCode = channel === "mock" ? mockCode() : code;

  const redis = getRedis();
  await redis.set(codeKey(identifier), hashCode(effectiveCode), "EX", CODE_TTL_SECONDS);
  await redis.del(attemptsKey(identifier));

  const sent = await send(channel, identifier, effectiveCode);
  if (!sent) {
    return { ok: false, reason: "send_failed", message: "Could not send your code. Try again." };
  }

  return {
    ok: true,
    channel,
    // Returned ONLY in mock mode so a developer can log in without a mailbox.
    // Never returned when a real channel is configured.
    devCode: channel === "mock" ? effectiveCode : undefined,
  };
}

export async function verifyOtp(identifier: string, code: string): Promise<OtpVerifyResult> {
  const redis = getRedis();

  const attempts = await redis.incr(attemptsKey(identifier));
  if (attempts === 1) await redis.expire(attemptsKey(identifier), CODE_TTL_SECONDS);
  if (attempts > MAX_VERIFY_ATTEMPTS) {
    await redis.del(codeKey(identifier));
    return {
      ok: false,
      reason: "too_many_attempts",
      message: "Too many wrong codes. Request a new one.",
    };
  }

  const stored = await redis.get(codeKey(identifier));
  if (!stored) {
    return { ok: false, reason: "expired", message: "That code has expired. Request a new one." };
  }

  const provided = hashCode(code);
  // Constant-time compare so response timing cannot leak how much of the code
  // was right.
  const matches =
    provided.length === stored.length &&
    timingSafeEqual(Buffer.from(provided), Buffer.from(stored));

  if (!matches) {
    return { ok: false, reason: "wrong_code", message: "That code is not right." };
  }

  // Single use.
  await redis.del(codeKey(identifier), attemptsKey(identifier));
  return { ok: true };
}

function mockCode(): string {
  return (process.env.OTP_MOCK_STATIC_CODE || "000000").padStart(6, "0").slice(0, 6);
}

async function send(channel: string, identifier: string, code: string): Promise<boolean> {
  switch (channel) {
    case "mock":
      console.info(`[otp] mock code for ${identifier}: ${code}`);
      return true;

    case "email":
      return sendEmail(identifier, code);

    case "whatsapp":
      // Wired in M6 alongside the rest of the WhatsApp templates.
      console.warn("[otp] whatsapp channel not implemented yet");
      return false;

    default:
      return false;
  }
}

async function sendEmail(email: string, code: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.OTP_FROM_EMAIL;
  if (!apiKey || !from) return false;

  const brandName = process.env.NEXT_PUBLIC_BRAND_NAME || "SORBE";

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        from,
        to: email,
        subject: `${code} is your ${brandName} login code`,
        text: `Your ${brandName} login code is ${code}. It expires in 5 minutes.\n\nIf you didn't ask for this, you can ignore this email.`,
      }),
    });
    if (!response.ok) {
      console.error("[otp] resend failed", response.status, await response.text());
      return false;
    }
    return true;
  } catch (error) {
    console.error("[otp] resend error", error);
    return false;
  }
}

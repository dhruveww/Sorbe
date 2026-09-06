import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Razorpay, server-side only.
 *
 * The browser only ever receives the PUBLIC key id and an order id. The secret
 * signs and verifies here and is never sent anywhere (docs/PLAN.md §2).
 */

const API = "https://api.razorpay.com/v1";

export function razorpayConfigured(): boolean {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

function authHeader(): string {
  const id = process.env.RAZORPAY_KEY_ID!;
  const secret = process.env.RAZORPAY_KEY_SECRET!;
  return `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`;
}

export type RazorpayOrder = { id: string; amount: number; currency: string; status: string };

/**
 * Creates (or reuses) a Razorpay order for a cart.
 *
 * `receipt` is the cart id and `notes.cart_id` carries it into the webhook,
 * which is how an asynchronous payment notification finds its way back to the
 * right cart.
 */
export async function createRazorpayOrder(input: {
  cartId: string;
  amountPaise: number;
}): Promise<RazorpayOrder> {
  const response = await fetch(`${API}/orders`, {
    method: "POST",
    headers: { authorization: authHeader(), "content-type": "application/json" },
    body: JSON.stringify({
      amount: input.amountPaise,
      currency: "INR",
      receipt: input.cartId,
      notes: { cart_id: input.cartId },
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Razorpay order create failed: ${response.status} ${detail.slice(0, 300)}`);
  }
  return (await response.json()) as RazorpayOrder;
}

/**
 * Verifies the signature Checkout.js hands back to the browser.
 *
 * Without this a caller could POST any order/payment id pair and claim a
 * successful payment. Compared in constant time.
 */
export function verifyPaymentSignature(input: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  signature: string;
}): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;

  const expected = createHmac("sha256", secret)
    .update(`${input.razorpayOrderId}|${input.razorpayPaymentId}`)
    .digest("hex");

  return safeEqual(expected, input.signature);
}

/**
 * Verifies a webhook against the RAW body.
 *
 * It must be the raw bytes: re-serialising the parsed JSON changes key order
 * and whitespace, and the signature then never matches.
 */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqual(expected, signature);
}

function safeEqual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

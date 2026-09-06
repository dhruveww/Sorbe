import { NextResponse } from "next/server";
import { completeCartOnce } from "@/lib/complete-order";
import { storeFetch } from "@/lib/medusa-client";
import { verifyWebhookSignature } from "@/lib/razorpay";

export const dynamic = "force-dynamic";

/**
 * Razorpay webhook — the AUTHORITATIVE payment path.
 *
 * The browser callback is a convenience; this is what makes a payment count
 * when the customer closed the tab, lost signal, or the app was backgrounded
 * mid-UPI. Razorpay retries for up to 24 hours, so it must be idempotent.
 *
 * Always answers 200 for anything we understood, even a duplicate — a non-2xx
 * makes Razorpay retry, and retrying something we already handled is pure noise.
 */
export async function POST(request: Request) {
  // The RAW body, not the parsed object: re-serialising JSON changes key order
  // and whitespace, and the HMAC then never matches.
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";

  if (!verifyWebhookSignature(rawBody, signature)) {
    // 400, not 200: a bad signature is either misconfiguration or an attack,
    // and either way we want it visible rather than silently swallowed.
    console.error("[razorpay-webhook] signature verification failed");
    return NextResponse.json({ message: "Invalid signature" }, { status: 400 });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  // Razorpay's own event id. This is the idempotency key.
  const eventId: string =
    event?.id ?? request.headers.get("x-razorpay-event-id") ?? `${event?.event}:${Date.now()}`;
  const eventType: string = event?.event ?? "unknown";

  try {
    // Durable claim: returns false if this event was already processed, which
    // is what makes the 24-hour retry window safe.
    const { claimed } = await storeFetch<{ claimed: boolean }>("/store/internal/webhook-claim", {
      method: "POST",
      body: { event_id: eventId, event_type: eventType, payload: event },
      headers: { "x-internal-secret": process.env.MEDUSA_INTERNAL_AUTH_SECRET ?? "" },
    });

    if (!claimed) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    if (eventType === "payment.captured" || eventType === "order.paid") {
      const cartId: string | undefined =
        event?.payload?.payment?.entity?.notes?.cart_id ??
        event?.payload?.order?.entity?.notes?.cart_id;

      if (cartId) {
        const result = await completeCartOnce(cartId);
        console.info(
          `[razorpay-webhook] ${eventType} cart=${cartId} order=${result.orderId}` +
            (result.alreadyCompleted ? " (already completed)" : ""),
        );
      } else {
        console.warn(`[razorpay-webhook] ${eventType} with no cart_id in notes`);
      }
    }

    await markProcessed(eventId);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[razorpay-webhook] processing failed", error);
    await markProcessed(eventId, String(error)).catch(() => {});
    // 500 so Razorpay retries — this is a failure we genuinely want retried.
    return NextResponse.json({ message: "Processing failed" }, { status: 500 });
  }
}

async function markProcessed(eventId: string, error?: string): Promise<void> {
  await storeFetch("/store/internal/webhook-claim", {
    method: "PATCH",
    body: { event_id: eventId, error },
    headers: { "x-internal-secret": process.env.MEDUSA_INTERNAL_AUTH_SECRET ?? "" },
  });
}

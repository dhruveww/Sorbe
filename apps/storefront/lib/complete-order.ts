import "server-only";
import { getRedis } from "./redis";
import { storeFetch } from "./medusa-client";

/**
 * THE idempotent chokepoint (docs/PLAN.md §7 steps 6-7).
 *
 * Two paths can complete the same cart: the browser returning from Checkout.js,
 * and Razorpay's webhook. Both call this. Whichever arrives first wins and the
 * other is a no-op — which is what makes "customer closed the tab mid-payment"
 * and "Razorpay retried for 24 hours" both safe.
 *
 * Three layers, deliberately:
 *   1. Redis lock — stops two concurrent requests entering at once.
 *   2. completed_at check — stops a later request redoing finished work.
 *   3. Medusa itself refuses to complete a cart twice — the real backstop, and
 *      the only one that still holds if Redis is down.
 */

const LOCK_TTL_MS = 10_000;

export type CompletionResult = {
  orderId: string;
  displayId: number;
  alreadyCompleted: boolean;
};

export async function completeCartOnce(cartId: string): Promise<CompletionResult> {
  const lockKey = `lock:cart:${cartId}`;
  let holdsLock = false;

  try {
    const acquired = await getRedis().set(lockKey, "1", "PX", LOCK_TTL_MS, "NX");
    holdsLock = acquired === "OK";
  } catch {
    // Redis unreachable. Continue rather than fail: Medusa's own
    // single-completion guarantee still prevents a duplicate order, and
    // refusing here would strand a customer who has genuinely paid.
    console.error("[complete-order] redis lock unavailable, relying on Medusa");
  }

  try {
    const existing = await findExistingOrder(cartId);
    if (existing) return { ...existing, alreadyCompleted: true };

    // The webhook can arrive without the browser ever finishing its steps — a
    // closed tab, a dropped connection. Medusa refuses to complete a cart with
    // no shipping method or payment collection, so make sure both exist here
    // rather than assuming the client got that far.
    await ensureReadyToComplete(cartId);

    const result = await storeFetch<
      | { type: "order"; order: { id: string; display_id: number } }
      | { type: "cart"; error?: { message?: string } }
    >(`/store/carts/${cartId}/complete`, { method: "POST" });

    if (result.type !== "order") {
      // The other path may have completed it between our check and this call.
      const raced = await findExistingOrder(cartId);
      if (raced) return { ...raced, alreadyCompleted: true };
      throw new Error(result.error?.message ?? "Could not complete the order");
    }

    return {
      orderId: result.order.id,
      displayId: result.order.display_id,
      alreadyCompleted: false,
    };
  } finally {
    if (holdsLock) {
      try {
        await getRedis().del(lockKey);
      } catch {
        // The TTL clears it anyway.
      }
    }
  }
}

/**
 * Idempotently attaches a shipping method and a payment collection.
 *
 * Every step tolerates already being done, because this runs on a cart that may
 * have gone most of the way through checkout already.
 */
async function ensureReadyToComplete(cartId: string): Promise<void> {
  const { cart } = await storeFetch<{
    cart: { shipping_methods?: unknown[]; payment_collection?: { id: string } | null };
  }>(`/store/carts/${cartId}?fields=id,*shipping_methods,*payment_collection`);

  if (!cart.shipping_methods || cart.shipping_methods.length === 0) {
    const { shipping_options } = await storeFetch<{ shipping_options: { id: string }[] }>(
      `/store/shipping-options?cart_id=${cartId}`,
    );
    const option = shipping_options[0];
    if (!option) throw new Error("No shipping option available for this address");

    await storeFetch(`/store/carts/${cartId}/shipping-methods`, {
      method: "POST",
      body: { option_id: option.id },
    });
  }

  if (!cart.payment_collection) {
    const { payment_collection } = await storeFetch<{ payment_collection: { id: string } }>(
      "/store/payment-collections",
      { method: "POST", body: { cart_id: cartId } },
    );
    await storeFetch(`/store/payment-collections/${payment_collection.id}/payment-sessions`, {
      method: "POST",
      body: { provider_id: "pp_system_default" },
    });
  }
}

/** A completed cart carries its order id; that is how we detect "already done". */
async function findExistingOrder(
  cartId: string,
): Promise<{ orderId: string; displayId: number } | null> {
  try {
    const { cart } = await storeFetch<{
      cart: { completed_at: string | null; order_id?: string | null };
    }>(`/store/carts/${cartId}?fields=id,completed_at,order_id`);

    if (!cart.completed_at || !cart.order_id) return null;

    const { order } = await storeFetch<{ order: { id: string; display_id: number } }>(
      `/store/orders/${cart.order_id}?fields=id,display_id`,
    );
    return { orderId: order.id, displayId: order.display_id };
  } catch {
    return null;
  }
}

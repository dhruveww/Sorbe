import "server-only";
import type { Address } from "@sorbe/validation";
import { toE164 } from "@sorbe/validation";
import { getCartId, type Cart } from "./cart";
import { storeFetch } from "./medusa-client";

/**
 * Checkout steps against Medusa.
 *
 * Order matters: address must be set before shipping options are listed,
 * because the fee is CALCULATED from the pincode on that address.
 */

export type ShippingOption = {
  id: string;
  name: string;
  amount?: number;
  calculated_price?: { calculated_amount: number };
};

const CART_FIELDS = [
  "id",
  "email",
  "customer_id",
  "completed_at",
  "item_subtotal",
  "shipping_total",
  "tax_total",
  "total",
  "*items",
  "*items.variant",
  "*items.variant.product",
  "*shipping_address",
  "*shipping_methods",
].join(",");

export async function setCheckoutAddress(input: {
  address: Address;
  email: string;
  giftNote?: string;
}): Promise<Cart> {
  const cartId = await getCartId();
  if (!cartId) throw new Error("No cart");

  const shippingAddress = {
    first_name: input.address.name.split(/\s+/)[0] ?? input.address.name,
    last_name: input.address.name.split(/\s+/).slice(1).join(" ") || "",
    address_1: input.address.line1,
    address_2: input.address.line2 ?? "",
    city: input.address.city,
    province: input.address.state,
    postal_code: input.address.pincode,
    country_code: "in",
    phone: toE164(input.address.phone),
  };

  const { cart } = await storeFetch<{ cart: Cart }>(
    `/store/carts/${cartId}?fields=${encodeURIComponent(CART_FIELDS)}`,
    {
      method: "POST",
      body: {
        email: input.email,
        shipping_address: shippingAddress,
        // Same address for billing: a separate billing address is a question
        // nobody buying a Rs 1,299 charm wants to answer.
        billing_address: shippingAddress,
        metadata: input.giftNote ? { gift_note: input.giftNote } : undefined,
      },
    },
  );
  return cart;
}

/** Options with prices calculated from the address already on the cart. */
export async function listShippingOptions(): Promise<ShippingOption[]> {
  const cartId = await getCartId();
  if (!cartId) return [];

  const { shipping_options } = await storeFetch<{ shipping_options: ShippingOption[] }>(
    `/store/shipping-options?cart_id=${cartId}&fields=*calculated_price`,
  );
  return shipping_options;
}

export async function selectShippingOption(optionId: string): Promise<Cart> {
  const cartId = await getCartId();
  if (!cartId) throw new Error("No cart");

  const { cart } = await storeFetch<{ cart: Cart }>(
    `/store/carts/${cartId}/shipping-methods?fields=${encodeURIComponent(CART_FIELDS)}`,
    { method: "POST", body: { option_id: optionId } },
  );
  return cart;
}

/**
 * Creates a payment session. In mock mode this is Medusa's built-in system
 * provider, which authorises without contacting anyone — no Razorpay account
 * needed to walk the whole flow.
 */
export async function initPayment(): Promise<void> {
  const cartId = await getCartId();
  if (!cartId) throw new Error("No cart");

  const { payment_collection } = await storeFetch<{ payment_collection: { id: string } }>(
    "/store/payment-collections",
    { method: "POST", body: { cart_id: cartId } },
  );

  await storeFetch(`/store/payment-collections/${payment_collection.id}/payment-sessions`, {
    method: "POST",
    body: { provider_id: "pp_system_default" },
  });
}

export type CompletedOrder = {
  id: string;
  display_id: number;
  email: string;
  total: number;
  currency_code: string;
};

/**
 * Turns the cart into an order.
 *
 * Idempotent by construction: Medusa refuses to complete a cart twice, so a
 * double-tap or a retried request returns the same order rather than creating a
 * second one. The Redis lock and webhook ledger in M4 extend this to the
 * asynchronous Razorpay paths.
 */
export async function completeCart(): Promise<CompletedOrder> {
  const cartId = await getCartId();
  if (!cartId) throw new Error("No cart");

  const result = await storeFetch<
    { type: "order"; order: CompletedOrder } | { type: "cart"; error?: { message?: string } }
  >(`/store/carts/${cartId}/complete`, { method: "POST" });

  if (result.type !== "order") {
    throw new Error(result.error?.message ?? "Could not place the order");
  }
  return result.order;
}

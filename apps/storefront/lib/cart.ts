import "server-only";
import { cookies } from "next/headers";
import { getRegionId } from "./catalog";
import { storeFetch } from "./medusa-client";

/**
 * Cart session.
 *
 * The cart id lives in an httpOnly cookie and the cart itself lives in Medusa's
 * database — Redis is only ever used for ephemeral things (OTP, rate limits,
 * locks). That is what makes a cart survive a refresh, a closed tab, and a
 * return to the tab a day later (docs/PLAN.md §6).
 *
 * The cart is created LAZILY on first mutation, not on page view, so crawlers
 * do not generate thousands of empty carts.
 */

const CART_COOKIE = "sorbe_cart_id";
const THIRTY_DAYS_SECONDS = 60 * 60 * 24 * 30;

export type LineItem = {
  id: string;
  title: string;
  subtitle: string | null;
  thumbnail: string | null;
  quantity: number;
  unit_price: number;
  variant_id: string;
  product_handle?: string;
  variant?: { id: string; title: string; product?: { handle: string; title: string } };
};

export type Cart = {
  id: string;
  items: LineItem[];
  region_id: string;
  currency_code: string;
  item_subtotal: number;
  shipping_total: number;
  tax_total: number;
  total: number;
  email: string | null;
  customer_id: string | null;
  completed_at: string | null;
  shipping_address?: {
    address_1: string;
    city: string;
    province: string;
    postal_code: string;
  } | null;
};

const CART_FIELDS = [
  "id",
  "region_id",
  "currency_code",
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
].join(",");

export async function getCartId(): Promise<string | null> {
  return (await cookies()).get(CART_COOKIE)?.value ?? null;
}

async function setCartId(cartId: string): Promise<void> {
  (await cookies()).set(CART_COOKIE, cartId, {
    httpOnly: true,
    // Lax lets the cookie survive a return from the payment provider's redirect.
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: THIRTY_DAYS_SECONDS,
  });
}

export async function clearCartCookie(): Promise<void> {
  (await cookies()).delete(CART_COOKIE);
}

/** Reads the current cart, or null. Never creates one. Safe on any page. */
export async function getCart(): Promise<Cart | null> {
  const cartId = await getCartId();
  if (!cartId) return null;

  try {
    const { cart } = await storeFetch<{ cart: Cart }>(
      `/store/carts/${cartId}?fields=${encodeURIComponent(CART_FIELDS)}`,
    );
    // A completed cart is an order now; treat it as no cart so the next add
    // starts a fresh one instead of failing.
    return cart.completed_at ? null : cart;
  } catch {
    // Stale or deleted cart id (e.g. after a database reset). Fall back to no
    // cart rather than 500-ing the whole page.
    return null;
  }
}

/** Reads the cart, creating one if needed. Only call from mutations. */
export async function getOrCreateCart(): Promise<Cart> {
  const existing = await getCart();
  if (existing) return existing;

  const regionId = await getRegionId();
  const { cart } = await storeFetch<{ cart: Cart }>("/store/carts", {
    method: "POST",
    body: { region_id: regionId },
  });
  await setCartId(cart.id);
  return cart;
}

export async function addLineItem(variantId: string, quantity: number): Promise<Cart> {
  const cart = await getOrCreateCart();
  const { cart: updated } = await storeFetch<{ cart: Cart }>(
    `/store/carts/${cart.id}/line-items?fields=${encodeURIComponent(CART_FIELDS)}`,
    { method: "POST", body: { variant_id: variantId, quantity } },
  );
  return updated;
}

export async function updateLineItem(lineId: string, quantity: number): Promise<Cart> {
  const cartId = await getCartId();
  if (!cartId) throw new Error("No cart");

  if (quantity <= 0) return removeLineItem(lineId);

  const { cart } = await storeFetch<{ cart: Cart }>(
    `/store/carts/${cartId}/line-items/${lineId}?fields=${encodeURIComponent(CART_FIELDS)}`,
    { method: "POST", body: { quantity } },
  );
  return cart;
}

export async function removeLineItem(lineId: string): Promise<Cart> {
  const cartId = await getCartId();
  if (!cartId) throw new Error("No cart");

  await storeFetch(`/store/carts/${cartId}/line-items/${lineId}`, { method: "DELETE" });
  const cart = await getCart();
  if (!cart) throw new Error("Cart disappeared after removing an item");
  return cart;
}

/** Total units in the bag — what the header badge shows. */
export function cartItemCount(cart: Cart | null): number {
  return cart?.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
}

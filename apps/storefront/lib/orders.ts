import "server-only";
import { storeFetch } from "./medusa-client";

export type Order = {
  id: string;
  display_id: number;
  email: string | null;
  currency_code: string;
  item_subtotal: number;
  shipping_total: number;
  total: number;
  created_at: string;
  status: string;
  payment_status?: string;
  fulfillment_status?: string;
  items: { id: string; title: string; quantity: number; unit_price: number; thumbnail: string | null }[];
  shipping_address?: {
    first_name?: string;
    address_1: string;
    city: string;
    province: string;
    postal_code: string;
    phone?: string;
  } | null;
};

const ORDER_FIELDS = [
  "id",
  "display_id",
  "email",
  "currency_code",
  "item_subtotal",
  "shipping_total",
  "total",
  "created_at",
  "status",
  "payment_status",
  "fulfillment_status",
  "*items",
  "*shipping_address",
].join(",");

export async function getOrder(orderId: string): Promise<Order | null> {
  try {
    const { order } = await storeFetch<{ order: Order }>(
      `/store/orders/${orderId}?fields=${encodeURIComponent(ORDER_FIELDS)}`,
    );
    return order;
  } catch {
    return null;
  }
}

/**
 * Guest order lookup: order number plus the phone it was placed with.
 *
 * Requiring BOTH is the point — an order id alone is guessable enough that it
 * should not expose someone's address, and the phone is the thing the buyer
 * actually remembers.
 */
export async function findOrderForGuest(
  displayId: number,
  phoneTenDigit: string,
): Promise<Order | null> {
  try {
    const { orders } = await storeFetch<{ orders: Order[] }>(
      `/store/orders?fields=${encodeURIComponent(ORDER_FIELDS)}&limit=50`,
    );
    const match = orders.find((order) => order.display_id === displayId);
    if (!match) return null;

    const phoneOnOrder = (match.shipping_address?.phone ?? "").replace(/\D/g, "").slice(-10);
    return phoneOnOrder && phoneOnOrder === phoneTenDigit ? match : null;
  } catch {
    return null;
  }
}

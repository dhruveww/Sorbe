/**
 * Customer-visible order lifecycle.
 *
 * Medusa's native status fields are coarser than what an Indian D2C store needs
 * to show (they have no notion of "COD pending" or "RTO"). Every transition is
 * appended to `store_order_state_log`, and BOTH the customer Track Order page
 * and the admin timeline read only that table — so the two can never disagree.
 */
export const ORDER_STATES = [
  "pending_payment",
  "paid",
  "cod_pending",
  "confirmed",
  "packed",
  "shipped",
  "delivered",
  "rto",
  "returned",
  "refunded",
] as const;

export type OrderState = (typeof ORDER_STATES)[number];

/**
 * Which states may follow which. Enforced when appending to the state log so a
 * mis-click in admin cannot move a delivered order back to "packed".
 */
export const ORDER_STATE_TRANSITIONS: Record<OrderState, readonly OrderState[]> = {
  pending_payment: ["paid", "cod_pending"],
  paid: ["confirmed", "refunded"],
  // COD is not confirmed until the customer says yes (WhatsApp) or an owner calls.
  cod_pending: ["confirmed", "refunded"],
  confirmed: ["packed", "refunded"],
  packed: ["shipped", "refunded"],
  shipped: ["delivered", "rto"],
  delivered: ["returned"],
  // Return to origin: courier could not deliver and sent it back.
  rto: ["refunded"],
  returned: ["refunded"],
  refunded: [],
};

export function canTransition(from: OrderState, to: OrderState): boolean {
  return ORDER_STATE_TRANSITIONS[from].includes(to);
}

/** States where the customer still owes us money. */
export const UNPAID_STATES: readonly OrderState[] = ["pending_payment", "cod_pending"];

/** States an owner should act on, surfaced on the admin Overview screen. */
export const NEEDS_ACTION_STATES: readonly OrderState[] = ["cod_pending", "confirmed", "packed"];

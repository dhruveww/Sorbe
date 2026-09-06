import { MedusaService } from "@medusajs/framework/utils";
import { Invoice, OrderStateLog, WebhookEvent } from "./models/order-ops";
import { gstStateCode, isIntraState } from "./gst-states";

/** Order lifecycle states. Mirrors ORDER_STATES in @sorbe/types. */
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

const TRANSITIONS: Record<OrderState, readonly OrderState[]> = {
  pending_payment: ["paid", "cod_pending"],
  paid: ["confirmed", "refunded"],
  cod_pending: ["confirmed", "refunded"],
  confirmed: ["packed", "refunded"],
  packed: ["shipped", "refunded"],
  shipped: ["delivered", "rto"],
  delivered: ["returned"],
  rto: ["refunded"],
  returned: ["refunded"],
  refunded: [],
};

class CommerceOpsModuleService extends MedusaService({
  OrderStateLog,
  WebhookEvent,
  Invoice,
}) {
  /** Latest state for an order, or null if nothing has been recorded. */
  async currentState(orderId: string): Promise<OrderState | null> {
    const entries = await this.listOrderStateLogs(
      { order_id: orderId },
      { order: { created_at: "DESC" }, take: 1 },
    );
    return (entries[0]?.state as OrderState) ?? null;
  }

  /**
   * Append a state change.
   *
   * Illegal transitions are rejected rather than recorded, so a mis-click in
   * admin cannot move a delivered order back to "packed". Recording the same
   * state twice is a no-op, which keeps event subscribers idempotent.
   */
  async recordState(input: {
    orderId: string;
    state: OrderState;
    changedBy?: string;
    note?: string;
  }): Promise<{ recorded: boolean; reason?: string }> {
    const current = await this.currentState(input.orderId);

    if (current === input.state) return { recorded: false, reason: "unchanged" };

    if (current && !TRANSITIONS[current].includes(input.state)) {
      return { recorded: false, reason: `cannot go from ${current} to ${input.state}` };
    }

    await this.createOrderStateLogs({
      order_id: input.orderId,
      state: input.state,
      changed_by: input.changedBy ?? "system",
      note: input.note ?? null,
    });
    return { recorded: true };
  }

  /**
   * Claims a webhook event for processing. False means "already done, skip".
   *
   * Only a SUCCESSFULLY processed event blocks a retry. An event that errored
   * is deliberately re-claimable: Razorpay retries for 24 hours, and if a
   * transient failure permanently poisoned the event id, a paid order would
   * never complete. Idempotency has to protect against duplicate work, not
   * against ever trying again.
   *
   * The unique constraint on event_id settles the concurrent case — two
   * simultaneous deliveries race on the insert and exactly one wins.
   */
  async claimWebhookEvent(input: {
    eventId: string;
    eventType?: string;
    payload?: unknown;
  }): Promise<boolean> {
    const [existing] = await this.listWebhookEvents({ event_id: input.eventId });

    if (existing) {
      if (existing.status === "processed") return false;

      // A previous attempt failed or never finished — let this delivery retry.
      await this.updateWebhookEvents({
        id: existing.id,
        status: "received",
        error: null,
      });
      return true;
    }

    try {
      await this.createWebhookEvents({
        provider: "razorpay",
        event_id: input.eventId,
        event_type: input.eventType ?? null,
        payload: (input.payload ?? null) as any,
        status: "received",
      });
      return true;
    } catch {
      // Unique violation: another delivery of the same event won the race.
      return false;
    }
  }

  async markWebhookProcessed(eventId: string, error?: string): Promise<void> {
    const [event] = await this.listWebhookEvents({ event_id: eventId });
    if (!event) return;
    await this.updateWebhookEvents({
      id: event.id,
      status: error ? "error" : "processed",
      error: error ?? null,
      processed_at: new Date(),
    });
  }

  /**
   * Next invoice number in the Indian financial-year series,
   * e.g. SORBE/25-26/00001. Resets each 1 April.
   */
  async nextInvoiceNumber(): Promise<{ number: string; series: string }> {
    const prefix = process.env.INVOICE_SERIES_PREFIX || "SORBE";
    const fy = process.env.INVOICE_SERIES_FY || currentFinancialYear();
    const series = `${prefix}/${fy}`;

    const existing = await this.listInvoices({ series });
    const highest = existing.reduce((max, invoice) => {
      const tail = Number.parseInt(invoice.invoice_number.split("/").pop() ?? "0", 10);
      return Number.isInteger(tail) && tail > max ? tail : max;
    }, 0);

    return { number: `${series}/${String(highest + 1).padStart(5, "0")}`, series };
  }

  /**
   * Creates the GST invoice for an order.
   *
   * Idempotent: order_id is unique, so a retried webhook cannot mint a second
   * invoice number for the same sale — which would be a real accounting problem.
   */
  async createInvoiceForOrder(input: {
    orderId: string;
    subtotalPaise: number;
    shippingPaise: number;
    discountPaise?: number;
    totalPaise: number;
    gstRatePercent: number;
    buyerStateName?: string | null;
    buyerGstin?: string | null;
    hsnSummary?: unknown;
  }) {
    const existing = await this.listInvoices({ order_id: input.orderId });
    if (existing[0]) return existing[0];

    const { number, series } = await this.nextInvoiceNumber();

    // Medusa returns money as high-precision decimals ("129900.00000000000000"),
    // which an integer column rejects outright. Coerce at the boundary — every
    // amount below this line is a plain integer number of paise.
    const totalPaise = toPaise(input.totalPaise);
    const subtotalPaise = toPaise(input.subtotalPaise);
    const shippingPaise = toPaise(input.shippingPaise);
    const discountPaise = toPaise(input.discountPaise ?? 0);

    // Prices are GST-INCLUSIVE, so the taxable value is derived backwards and
    // tax is the remainder — base + tax always equals the total exactly.
    const taxable = Math.round(totalPaise / (1 + input.gstRatePercent / 100));
    const taxPaise = totalPaise - taxable;

    const sellerState = gstStateCode(process.env.BRAND_STATE || "Maharashtra");
    const buyerState = gstStateCode(input.buyerStateName);
    const intra = isIntraState(sellerState, buyerState);

    const cgst = intra ? Math.floor(taxPaise / 2) : 0;
    const sgst = intra ? taxPaise - cgst : 0;
    const igst = intra ? 0 : taxPaise;

    return this.createInvoices({
      order_id: input.orderId,
      invoice_number: number,
      series,
      seller_gstin: process.env.BRAND_GSTIN || null,
      buyer_gstin: input.buyerGstin ?? null,
      place_of_supply_state_code: buyerState,
      subtotal_paise: subtotalPaise,
      discount_paise: discountPaise,
      shipping_paise: shippingPaise,
      taxable_value_paise: taxable,
      cgst_paise: cgst,
      sgst_paise: sgst,
      igst_paise: igst,
      total_paise: totalPaise,
      hsn_summary: (input.hsnSummary ?? null) as any,
    });
  }
}

/**
 * Money to an integer number of paise.
 *
 * Medusa's amounts arrive as BigNumber-backed decimals, which stringify with a
 * long fractional tail. Paise is the smallest unit we bill in, so rounding here
 * loses nothing real — but skipping it fails the insert outright.
 */
function toPaise(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Math.round(parsed) : 0;
}

/** Indian FY runs 1 April to 31 March, written like "25-26". */
function currentFinancialYear(now = new Date()): string {
  const year = now.getFullYear();
  const startYear = now.getMonth() >= 3 ? year : year - 1;
  return `${String(startYear).slice(2)}-${String(startYear + 1).slice(2)}`;
}

export default CommerceOpsModuleService;

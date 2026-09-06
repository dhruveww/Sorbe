import { model } from "@medusajs/framework/utils";

/**
 * Customer-visible order lifecycle, finer-grained than Medusa's native status
 * fields (which have no notion of "COD pending" or "RTO").
 *
 * BOTH the customer Track Order page and the admin timeline read only this
 * table, so the two can never tell different stories about the same order.
 */
export const OrderStateLog = model.define("store_order_state_log", {
  id: model.id().primaryKey(),
  order_id: model.text(),
  state: model.text(),
  /** "system" or an admin user id — who moved it. */
  changed_by: model.text().default("system"),
  note: model.text().nullable(),
});

/**
 * Durable webhook ledger.
 *
 * Razorpay retries a failed webhook for up to 24 hours. Without a record of
 * what we already processed, a retry would create a second order for one
 * payment. Redis holds the fast lock; this is the audit trail that survives a
 * Redis flush.
 */
export const WebhookEvent = model.define("store_webhook_event", {
  id: model.id().primaryKey(),
  provider: model.text().default("razorpay"),
  /** The provider's own event id. Unique — this is the idempotency key. */
  event_id: model.text().unique(),
  event_type: model.text().nullable(),
  payload: model.json().nullable(),
  status: model.text().default("received"),
  error: model.text().nullable(),
  processed_at: model.dateTime().nullable(),
});

/**
 * GST invoice. Money in integer paise; the tax split is derived backwards from
 * the GST-inclusive total by splitGstInclusive, so base + tax always re-adds to
 * the amount the customer actually paid.
 */
export const Invoice = model.define("store_invoice", {
  id: model.id().primaryKey(),
  order_id: model.text().unique(),
  invoice_number: model.text().unique(),
  series: model.text(),
  seller_gstin: model.text().nullable(),
  buyer_gstin: model.text().nullable(),
  /** Two-digit GST state code, derived from the delivery pincode. */
  place_of_supply_state_code: model.text().nullable(),
  subtotal_paise: model.number(),
  discount_paise: model.number().default(0),
  shipping_paise: model.number().default(0),
  taxable_value_paise: model.number(),
  cgst_paise: model.number().default(0),
  sgst_paise: model.number().default(0),
  igst_paise: model.number().default(0),
  total_paise: model.number(),
  hsn_summary: model.json().nullable(),
  pdf_url: model.text().nullable(),
});

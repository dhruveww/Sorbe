/**
 * WhatsApp template keys.
 *
 * `utility` templates relate to an order the customer already placed and are
 * what Meta prefers. `authentication` is the OTP login template. `marketing`
 * needs explicit opt-in and is rate-capped hard — see the frequency caps in
 * docs/PLAN.md §10.
 */
export const WA_TEMPLATE_KEYS = [
  "order_confirmed",
  "shipped",
  "delivered",
  "cod_confirm",
  "payment_failed_retry",
  "restock_alert",
  "low_stock_nudge",
  "otp_login",
] as const;

export type WaTemplateKey = (typeof WA_TEMPLATE_KEYS)[number];

export type WaTemplateCategory = "utility" | "authentication" | "marketing";

export const WA_TEMPLATE_CATEGORY: Record<WaTemplateKey, WaTemplateCategory> = {
  order_confirmed: "utility",
  shipped: "utility",
  delivered: "utility",
  cod_confirm: "utility",
  payment_failed_retry: "utility",
  restock_alert: "utility",
  // The only unsolicited message we ever send. Capped to 1/SKU/week.
  low_stock_nudge: "marketing",
  otp_login: "authentication",
};

/**
 * Send outcomes. `would_send` is what every trigger records while
 * FEATURE_WHATSAPP_LIVE=false — the dashboard is fully populated and testable
 * before a single rupee is spent on WhatsApp.
 */
export const WA_LOG_STATUSES = [
  "would_send",
  "queued",
  "sent",
  "delivered",
  "read",
  "failed",
] as const;

export type WaLogStatus = (typeof WA_LOG_STATUSES)[number];

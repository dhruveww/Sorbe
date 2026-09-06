/**
 * Feature flags and integration modes, read once from env.
 *
 * THE GOVERNING RULE (docs/PLAN.md §4): absence of a key IS the flag.
 * If Razorpay has no key, payments are mocked — regardless of what
 * PAYMENTS_MOCK_MODE says. Nobody has to remember to flip anything, and it is
 * impossible to deploy a half-configured integration that fails at runtime
 * instead of falling back cleanly.
 */

export type OtpChannel = "mock" | "email" | "whatsapp" | "sms";
export type WaProvider = "mock" | "meta_cloud_api" | "gupshup" | "interakt";
export type ShippingProviderName = "manual" | "shiprocket";

export interface Flags {
  /** No real charge is possible. Checkout shows simulate success/failure. */
  paymentsMockMode: boolean;
  /** Real WhatsApp sends. When false, triggers log "would_send" and stop. */
  whatsappLive: boolean;
  otpChannel: OtpChannel;
  waProvider: WaProvider;
  shippingProvider: ShippingProviderName;
  codEnabled: boolean;
  /** COD is refused above this cart total. In paise. */
  codMaxOrderPaise: number;
  wishlist: boolean;
  restockAlerts: boolean;
  popups: boolean;
  reels: boolean;
  manualRecs: boolean;
  /** When false the page still exists and stays in the nav — it shows the
   *  coming-soon blurb from the CMS. These routes must never 404. */
  eventsPageLive: boolean;
  influencerPageLive: boolean;
  myocPageLive: boolean;
}

export function getFlags(env: NodeJS.ProcessEnv = process.env): Flags {
  // Absence of the key forces mock mode, whatever the flag claims.
  const hasRazorpayKeys = Boolean(env.RAZORPAY_KEY_ID?.trim() && env.RAZORPAY_KEY_SECRET?.trim());
  const hasWaKeys = Boolean(env.WA_ACCESS_TOKEN?.trim() && env.WA_PHONE_NUMBER_ID?.trim());
  const hasShiprocketKeys = Boolean(env.SHIPROCKET_EMAIL?.trim() && env.SHIPROCKET_PASSWORD?.trim());

  return {
    paymentsMockMode: !hasRazorpayKeys || boolEnv(env.PAYMENTS_MOCK_MODE, true),
    whatsappLive: hasWaKeys && boolEnv(env.FEATURE_WHATSAPP_LIVE, false),
    otpChannel: resolveOtpChannel(env),
    waProvider: hasWaKeys ? enumEnv(env.WA_PROVIDER, WA_PROVIDERS, "mock") : "mock",
    shippingProvider: hasShiprocketKeys
      ? enumEnv(env.SHIPPING_PROVIDER, SHIPPING_PROVIDERS, "manual")
      : "manual",

    codEnabled: boolEnv(env.FEATURE_COD_ENABLED, true),
    codMaxOrderPaise: intEnv(env.COD_MAX_ORDER_PAISE, 500_000),

    wishlist: boolEnv(env.FEATURE_WISHLIST, true),
    restockAlerts: boolEnv(env.FEATURE_RESTOCK_ALERTS, true),
    popups: boolEnv(env.FEATURE_POPUPS, true),
    reels: boolEnv(env.FEATURE_REELS, true),
    manualRecs: boolEnv(env.FEATURE_MANUAL_RECS, true),

    eventsPageLive: boolEnv(env.FEATURE_EVENTS_PAGE_LIVE, false),
    influencerPageLive: boolEnv(env.FEATURE_INFLUENCER_PAGE_LIVE, false),
    myocPageLive: boolEnv(env.FEATURE_MYOC_PAGE_LIVE, false),
  };
}

const WA_PROVIDERS = ["mock", "meta_cloud_api", "gupshup", "interakt"] as const;
const SHIPPING_PROVIDERS = ["manual", "shiprocket"] as const;
const OTP_CHANNELS = ["mock", "email", "whatsapp", "sms"] as const;

/**
 * OTP delivery falls back rather than failing:
 *   email    needs RESEND_API_KEY
 *   whatsapp needs WhatsApp to actually be live
 *   sms      is deliberately unsupported — it requires India DLT registration
 *            (~Rs 5,000, carrier-enforced). WhatsApp OTP is the upgrade path.
 */
function resolveOtpChannel(env: NodeJS.ProcessEnv): OtpChannel {
  const requested = enumEnv(env.OTP_CHANNEL, OTP_CHANNELS, "mock");

  if (requested === "email" && !env.RESEND_API_KEY?.trim()) return "mock";
  if (requested === "whatsapp") {
    const waLive =
      Boolean(env.WA_ACCESS_TOKEN?.trim() && env.WA_PHONE_NUMBER_ID?.trim()) &&
      boolEnv(env.FEATURE_WHATSAPP_LIVE, false);
    return waLive ? "whatsapp" : "mock";
  }
  return requested;
}

function boolEnv(raw: string | undefined, fallback: boolean): boolean {
  if (raw === undefined || raw.trim() === "") return fallback;
  return ["true", "1", "yes", "on"].includes(raw.trim().toLowerCase());
}

function intEnv(raw: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(raw ?? "", 10);
  return Number.isInteger(parsed) ? parsed : fallback;
}

function enumEnv<T extends string>(
  raw: string | undefined,
  allowed: readonly T[],
  fallback: T,
): T {
  const value = raw?.trim() as T | undefined;
  return value && allowed.includes(value) ? value : fallback;
}

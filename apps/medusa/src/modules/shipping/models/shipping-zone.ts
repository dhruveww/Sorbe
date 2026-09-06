import { model } from "@medusajs/framework/utils";

/**
 * A delivery zone, matched by pincode prefix.
 *
 * Indian pincodes are hierarchical: the first digit is the region, the first
 * two the circle, the first three the sorting district. So prefix matching is
 * genuinely meaningful here — "400" is Mumbai, "110" is Delhi — and a longer
 * prefix always wins over a shorter one.
 */
export const ShippingZone = model.define("store_shipping_zone", {
  id: model.id().primaryKey(),
  name: model.text(),
  /** Pincode prefixes, e.g. ["400", "411"]. Longest match wins. */
  pincode_prefixes: model.json(),
  eta_days_min: model.number(),
  eta_days_max: model.number(),
  cod_available: model.boolean().default(true),
  is_active: model.boolean().default(true),
});

/**
 * What a zone costs. Money in integer paise, never rupees.
 * Multiple rates per zone allow "free over Rs 999" style thresholds.
 */
export const ShippingRate = model.define("store_shipping_rate", {
  id: model.id().primaryKey(),
  zone_id: model.text(),
  /** Rate applies when the cart subtotal is at or above this. */
  min_cart_value_paise: model.number().default(0),
  fee_paise: model.number(),
  /** Above this subtotal shipping is free. Null = never free. */
  free_above_paise: model.number().nullable(),
});

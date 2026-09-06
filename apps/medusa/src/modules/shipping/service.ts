import { MedusaService } from "@medusajs/framework/utils";
import { ShippingRate, ShippingZone } from "./models/shipping-zone";

export type ShippingQuote = {
  zoneName: string;
  feePaise: number;
  etaDaysMin: number;
  etaDaysMax: number;
  codAvailable: boolean;
  isFree: boolean;
};

/**
 * The `manual` shipping provider: quotes come from our own zone/rate tables and
 * the owners enter AWBs by hand. Shiprocket implements the same shape later —
 * see the ShippingProvider interface in docs/PLAN.md §1.6 — so switching is a
 * config change, not a checkout rewrite.
 */
class ShippingModuleService extends MedusaService({ ShippingZone, ShippingRate }) {
  /**
   * Quote for a pincode and cart value. Returns null when we do not deliver
   * there, which the UI must show BEFORE payment rather than after.
   */
  async quote(pincode: string, cartValuePaise: number): Promise<ShippingQuote | null> {
    if (!/^[1-9]\d{5}$/.test(pincode)) return null;

    const zones = await this.listShippingZones({ is_active: true });

    // Longest matching prefix wins, so a specific "400" beats a catch-all "4".
    let best: { zone: (typeof zones)[number]; length: number } | null = null;
    for (const zone of zones) {
      const prefixes = Array.isArray(zone.pincode_prefixes)
        ? (zone.pincode_prefixes as string[])
        : [];
      for (const prefix of prefixes) {
        if (pincode.startsWith(prefix) && (!best || prefix.length > best.length)) {
          best = { zone, length: prefix.length };
        }
      }
    }
    if (!best) return null;

    const rates = await this.listShippingRates({ zone_id: best.zone.id });
    // The most specific applicable rate: highest threshold the cart clears.
    const applicable = rates
      .filter((rate) => cartValuePaise >= rate.min_cart_value_paise)
      .sort((a, b) => b.min_cart_value_paise - a.min_cart_value_paise)[0];

    if (!applicable) return null;

    const isFree =
      applicable.free_above_paise !== null &&
      applicable.free_above_paise !== undefined &&
      cartValuePaise >= applicable.free_above_paise;

    return {
      zoneName: best.zone.name,
      feePaise: isFree ? 0 : applicable.fee_paise,
      etaDaysMin: best.zone.eta_days_min,
      etaDaysMax: best.zone.eta_days_max,
      codAvailable: best.zone.cod_available,
      isFree,
    };
  }
}

export default ShippingModuleService;

import type { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { SHIPPING_MODULE } from "../modules/shipping";

/**
 * Delivery zones, by real Indian pincode prefix.
 *
 * Prefixes are the first 2–3 digits of a pincode, which map to actual postal
 * circles. "Rest of India" is the catch-all and must stay a single digit so any
 * more specific zone outranks it (longest prefix wins).
 *
 * Rates are placeholders until the owners have courier quotes — the numbers are
 * plausible, not negotiated. Editable in admin later.
 *
 * Run with:  pnpm --filter @sorbe/medusa seed:shipping
 */

const ZONES = [
  {
    name: "Metro",
    // Mumbai/Pune 40-41, Delhi 11, Bengaluru 56, Hyderabad 50,
    // Chennai 60, Kolkata 70, Ahmedabad 38.
    pincode_prefixes: ["40", "41", "11", "56", "50", "60", "70", "38"],
    eta_days_min: 2,
    eta_days_max: 4,
    cod_available: true,
    rates: [{ min_cart_value_paise: 0, fee_paise: 6900, free_above_paise: 99900 }],
  },
  {
    name: "Rest of India",
    // Single digits: the catch-all. Any longer prefix above wins over these.
    pincode_prefixes: ["1", "2", "3", "4", "5", "6", "7", "8", "9"],
    eta_days_min: 4,
    eta_days_max: 8,
    cod_available: true,
    rates: [{ min_cart_value_paise: 0, fee_paise: 9900, free_above_paise: 149900 }],
  },
  {
    name: "Northeast, J&K and islands",
    // Assam/NE 78-79, J&K/Ladakh 18-19, Andaman 744, Lakshadweep 682.
    pincode_prefixes: ["78", "79", "18", "19", "744", "682"],
    eta_days_min: 7,
    eta_days_max: 14,
    // Couriers are unreliable on COD here, so prepaid only.
    cod_available: false,
    rates: [{ min_cart_value_paise: 0, fee_paise: 14900, free_above_paise: null }],
  },
];

export default async function seedShipping({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const shipping: any = container.resolve(SHIPPING_MODULE);

  const existing = await shipping.listShippingZones({});
  const existingNames = new Set(existing.map((zone: any) => zone.name));

  const toCreate = ZONES.filter((zone) => !existingNames.has(zone.name));
  if (toCreate.length === 0) {
    logger.info("Shipping zones already seeded.");
    return;
  }

  for (const zone of toCreate) {
    const created = await shipping.createShippingZones({
      name: zone.name,
      pincode_prefixes: zone.pincode_prefixes,
      eta_days_min: zone.eta_days_min,
      eta_days_max: zone.eta_days_max,
      cod_available: zone.cod_available,
      is_active: true,
    });
    const zoneId = Array.isArray(created) ? created[0].id : created.id;

    for (const rate of zone.rates) {
      await shipping.createShippingRates({ zone_id: zoneId, ...rate });
    }
    logger.info(`  created zone '${zone.name}' with ${zone.rates.length} rate(s)`);
  }

  logger.info("Shipping seed complete.");
}

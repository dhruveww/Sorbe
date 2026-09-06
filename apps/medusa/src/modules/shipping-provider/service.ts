import { AbstractFulfillmentProviderService, MedusaError } from "@medusajs/framework/utils";
import type { CreateFulfillmentResult, FulfillmentOption } from "@medusajs/framework/types";
import { Pool } from "pg";

/**
 * The `manual` shipping provider.
 *
 * Prices are CALCULATED, not flat: the fee comes from the store_shipping_zone /
 * store_shipping_rate tables keyed on the delivery pincode, so what Medusa
 * charges is exactly what the pincode checker quoted. A flat option would let
 * the two drift and charge a customer something they were never shown.
 *
 * It reads those tables over its own pg pool rather than through the shipping
 * module's service, because a fulfillment provider runs in an isolated
 * container and cannot resolve another module ("Could not resolve
 * 'shipping_zones'"). Same database, read-only, one query per quote.
 *
 * Shiprocket replaces this class later (docs/PLAN.md §1.6) — checkout does not
 * change, only which provider is registered.
 */
class ManualShippingProviderService extends AbstractFulfillmentProviderService {
  static identifier = "manual-shipping";

  private pool: Pool;

  constructor() {
    super();
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 2,
      idleTimeoutMillis: 30_000,
    });
  }

  async getFulfillmentOptions(): Promise<FulfillmentOption[]> {
    return [{ id: "standard", name: "Standard delivery" }];
  }

  async validateFulfillmentData(
    _optionData: Record<string, unknown>,
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return data;
  }

  async validateOption(): Promise<boolean> {
    return true;
  }

  /** Tells Medusa to ask us for a price rather than use a stored one. */
  async canCalculate(): Promise<boolean> {
    return true;
  }

  async calculatePrice(
    _optionData: Record<string, unknown>,
    _data: Record<string, unknown>,
    context: any,
  ): Promise<{ calculated_amount: number; is_calculated_price_tax_inclusive: boolean }> {
    const pincode: string | undefined =
      context?.shipping_address?.postal_code ?? context?.context?.shipping_address?.postal_code;

    if (!pincode || !/^[1-9]\d{5}$/.test(pincode)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Enter a valid delivery pincode before choosing delivery.",
      );
    }

    const quote = await this.quote(pincode, cartSubtotalPaise(context));

    if (!quote) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "We don't deliver to this pincode yet.",
      );
    }

    return {
      calculated_amount: quote.feePaise,
      // Everything is priced GST-inclusive, shipping included.
      is_calculated_price_tax_inclusive: true,
    };
  }

  /**
   * Longest matching pincode prefix wins, so a specific "744" (Andaman) beats
   * the "7" catch-all. Mirrors ShippingModuleService.quote exactly.
   */
  private async quote(
    pincode: string,
    cartValuePaise: number,
  ): Promise<{ feePaise: number } | null> {
    const { rows } = await this.pool.query<{
      id: string;
      pincode_prefixes: string[] | string;
      fee_paise: string | number;
      min_cart_value_paise: string | number;
      free_above_paise: string | number | null;
    }>(
      `select z.id, z.pincode_prefixes, r.fee_paise, r.min_cart_value_paise, r.free_above_paise
         from store_shipping_zone z
         join store_shipping_rate r on r.zone_id = z.id
        where z.is_active = true
          and z.deleted_at is null
          and r.deleted_at is null`,
    );

    let best: { prefixLength: number; row: (typeof rows)[number] } | null = null;

    for (const row of rows) {
      const prefixes: string[] = Array.isArray(row.pincode_prefixes)
        ? row.pincode_prefixes
        : JSON.parse(String(row.pincode_prefixes ?? "[]"));

      for (const prefix of prefixes) {
        if (!pincode.startsWith(prefix)) continue;
        if (cartValuePaise < Number(row.min_cart_value_paise)) continue;
        if (!best || prefix.length > best.prefixLength) {
          best = { prefixLength: prefix.length, row };
        }
      }
    }

    if (!best) return null;

    const freeAbove = best.row.free_above_paise;
    const isFree = freeAbove !== null && cartValuePaise >= Number(freeAbove);
    return { feePaise: isFree ? 0 : Number(best.row.fee_paise) };
  }

  /**
   * No courier API in manual mode: an owner packs the order and types the AWB
   * into admin, so there is nothing to call here.
   */
  async createFulfillment(): Promise<CreateFulfillmentResult> {
    return { data: {}, labels: [] };
  }

  async cancelFulfillment(): Promise<Record<string, unknown>> {
    return {};
  }

  async createReturnFulfillment(): Promise<CreateFulfillmentResult> {
    return { data: {}, labels: [] };
  }
}

/**
 * Cart subtotal in paise, summed from the line items.
 *
 * Deliberately NOT read from a computed total field: `item_subtotal` is absent
 * from the context Medusa hands a fulfillment provider, and silently reading
 * undefined made every cart look like zero — so free shipping never triggered
 * and customers were quoted "Free" then charged Rs 69. Summing the items is the
 * one thing guaranteed to be present, since the pricing comes from them.
 */
function cartSubtotalPaise(context: any): number {
  const items = context?.items ?? context?.context?.items;
  if (Array.isArray(items) && items.length > 0) {
    return items.reduce((sum: number, item: any) => {
      const unit = Number(item?.unit_price ?? item?.subtotal ?? 0) || 0;
      const quantity = Number(item?.quantity ?? 1) || 1;
      // `subtotal` is already line-level; `unit_price` needs multiplying.
      return sum + (item?.unit_price !== undefined ? unit * quantity : unit);
    }, 0);
  }
  return Number(context?.item_subtotal ?? context?.subtotal ?? 0) || 0;
}

export default ManualShippingProviderService;

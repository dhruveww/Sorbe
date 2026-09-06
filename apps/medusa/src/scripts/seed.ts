import {
  createApiKeysWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createShippingProfilesWorkflow,
  createStockLocationsWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows";
import type { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

/**
 * Seeds the minimum a single-market Indian store needs to boot.
 *
 * India only, INR only, and exactly ONE stock location — Dhruvi and Vanshika
 * pack everything from home, so there is no warehouse and no second location
 * (docs/PLAN.md §18.1). Multi-location is a config change later, not a migration.
 *
 * Idempotent: safe to re-run. It reuses anything that already exists rather
 * than creating duplicates, so `pnpm seed` after a schema change won't leave
 * you with three "Home / HQ" locations.
 *
 * Run with:  pnpm --filter @sorbe/medusa seed
 */
export default async function seedSorbe({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const link = container.resolve(ContainerRegistrationKeys.LINK);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const storeModule = container.resolve(Modules.STORE);
  const salesChannelModule = container.resolve(Modules.SALES_CHANNEL);
  const stockLocationModule = container.resolve(Modules.STOCK_LOCATION);
  const regionModule = container.resolve(Modules.REGION);
  const apiKeyModule = container.resolve(Modules.API_KEY);
  const fulfillmentModule = container.resolve(Modules.FULFILLMENT);

  logger.info("Seeding SORBE (India / INR)…");

  // --- Sales channel ---------------------------------------------------------
  // Medusa creates a "Default Sales Channel" on first boot; reuse it if present.
  let [salesChannel] = await salesChannelModule.listSalesChannels({
    name: "Default Sales Channel",
  });
  if (!salesChannel) {
    const { result } = await createSalesChannelsWorkflow(container).run({
      input: { salesChannelsData: [{ name: "Default Sales Channel" }] },
    });
    salesChannel = result[0]!;
    logger.info("  created sales channel");
  }

  // --- Store: INR is the only currency --------------------------------------
  const [store] = await storeModule.listStores();
  if (!store) throw new Error("No store found — Medusa did not initialise correctly.");

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        supported_currencies: [{ currency_code: "inr", is_default: true }],
        default_sales_channel_id: salesChannel.id,
      },
    },
  });
  logger.info("  store currency set to INR");

  // --- Region: India ---------------------------------------------------------
  let [region] = await regionModule.listRegions({ name: "India" });
  if (!region) {
    const { result } = await createRegionsWorkflow(container).run({
      input: {
        regions: [
          {
            name: "India",
            currency_code: "inr",
            countries: ["in"],
            // OFF deliberately. Prices are stored GST-INCLUSIVE — the customer
            // sees one number and pays exactly that — and the invoice derives
            // the tax split backwards with splitGstInclusive(). Turning this on
            // makes Medusa look for a tax provider we do not have, and cart
            // line-item adds fail with "Could not resolve 'null'".
            automatic_taxes: false,
            payment_providers: ["pp_system_default"],
          },
        ],
      },
    });
    region = result[0]!;
    logger.info("  created India region");
  } else if (region.automatic_taxes) {
    // Correct a region seeded before automatic_taxes was turned off.
    await regionModule.updateRegions(region.id, { automatic_taxes: false });
    logger.info("  disabled automatic taxes on India region");
  }

  // --- Tax region ------------------------------------------------------------
  // GST rates live per-product (store_product_extra.gst_rate_percent, default
  // 18% / HSN 7117). This just registers India as a taxable country.
  const existingTaxRegions = await query.graph({
    entity: "tax_region",
    fields: ["id", "country_code"],
    filters: { country_code: "in" },
  });
  if (existingTaxRegions.data.length === 0) {
    await createTaxRegionsWorkflow(container).run({
      input: [{ country_code: "in" }],
    });
    logger.info("  created India tax region");
  }

  // --- Stock location: the owners' home --------------------------------------
  let [stockLocation] = await stockLocationModule.listStockLocations({
    name: "Home / HQ",
  });
  if (!stockLocation) {
    const { result } = await createStockLocationsWorkflow(container).run({
      input: {
        locations: [
          {
            name: "Home / HQ",
            // Placeholder — the owners edit the real pickup address in admin.
            // It appears on courier pickup requests, not on the storefront.
            address: { address_1: "To be filled", city: "Mumbai", country_code: "in" },
          },
        ],
      },
    });
    stockLocation = result[0]!;
    logger.info("  created stock location 'Home / HQ'");
  }

  await linkSalesChannelsToStockLocationWorkflow(container).run({
    input: { id: stockLocation.id, add: [salesChannel.id] },
  });

  // --- Fulfillment: manual provider + default shipping profile ---------------
  // SHIPPING_PROVIDER=manual means we quote from our own zone/rate tables and
  // type AWBs in by hand. Shiprocket swaps in behind the same interface later.
  const [shippingProfile] = await fulfillmentModule.listShippingProfiles({
    type: "default",
  });
  if (!shippingProfile) {
    await createShippingProfilesWorkflow(container).run({
      input: { data: [{ name: "Default Shipping Profile", type: "default" }] },
    });
    logger.info("  created default shipping profile");
  }

  await link.create({
    [Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
    [Modules.FULFILLMENT]: { fulfillment_provider_id: "manual-shipping_manual-shipping" },
  });

  // --- Fulfillment set + calculated shipping option ---------------------------
  // Medusa refuses to complete a cart without a shipping method, so there has
  // to be an option here. Its price is CALCULATED by our provider from the
  // pincode, which is what keeps the charge equal to the quote.
  const [existingSet] = await fulfillmentModule.listFulfillmentSets({ name: "India delivery" });
  let fulfillmentSet = existingSet;

  if (!fulfillmentSet) {
    fulfillmentSet = await fulfillmentModule.createFulfillmentSets({
      name: "India delivery",
      type: "shipping",
      service_zones: [
        {
          name: "India",
          geo_zones: [{ country_code: "in", type: "country" }],
        },
      ],
    });
    logger.info("  created fulfillment set");
  }

  await link.create({
    [Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
    [Modules.FULFILLMENT]: { fulfillment_set_id: fulfillmentSet.id },
  });

  const serviceZone = (fulfillmentSet as any).service_zones?.[0];
  const [existingOption] = await fulfillmentModule.listShippingOptions({
    name: "Standard delivery",
  });

  if (!existingOption && serviceZone) {
    const [profile] = await fulfillmentModule.listShippingProfiles({ type: "default" });
    await fulfillmentModule.createShippingOptions({
      name: "Standard delivery",
      service_zone_id: serviceZone.id,
      shipping_profile_id: profile!.id,
      provider_id: "manual-shipping_manual-shipping",
      // "calculated" is the point: the amount comes from the provider per
      // request, not from a stored flat price.
      price_type: "calculated",
      type: { label: "Standard", description: "Delivered by courier", code: "standard" },
    });
    logger.info("  created calculated shipping option");
  }

  // --- Publishable API key ---------------------------------------------------
  // The storefront sends this on every Store API request. It is read by the
  // Next.js SERVER only — the browser never talks to Medusa directly.
  //
  // Medusa creates a default publishable key during migration. Reuse it rather
  // than adding a second: two publishable keys for one sales channel is a trap,
  // because the unlinked one returns an empty catalog with no error.
  let [publishableKey] = await apiKeyModule.listApiKeys({ type: "publishable" });
  if (!publishableKey) {
    const { result } = await createApiKeysWorkflow(container).run({
      input: {
        api_keys: [{ title: "Storefront", type: "publishable", created_by: "seed" }],
      },
    });
    publishableKey = result[0]!;
    logger.info("  created publishable API key");
  }

  await linkSalesChannelsToApiKeyWorkflow(container).run({
    input: { id: publishableKey.id, add: [salesChannel.id] },
  });

  logger.info("Seed complete.");
  logger.info("");
  logger.info("  Add this to apps/storefront/.env.local:");
  logger.info(`  MEDUSA_PUBLISHABLE_KEY=${publishableKey.token}`);
  logger.info("");
}

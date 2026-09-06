import {
  createInventoryLevelsWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
} from "@medusajs/medusa/core-flows";
import type { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules, ProductStatus } from "@medusajs/framework/utils";
import { CATALOG_MODULE } from "../modules/catalog";

/**
 * Sample bag-charm catalogue, so the storefront has real data to render.
 *
 * Grouping uses Medusa CATEGORIES rather than collections, even though the
 * public URL stays /collections/<handle> as planned. Reason: a product has at
 * most one collection, but a charm is genuinely both "tote" and "handmade" at
 * the same time. Categories are many-to-many and model that without a special
 * case for the handmade page.
 *
 * Idempotent — re-running updates nothing and creates nothing if the handles
 * already exist.
 *
 * Run with:  pnpm --filter @sorbe/medusa seed:catalog
 */

const CATEGORIES = [
  { name: "Tote Charms", handle: "tote" },
  { name: "Laptop Bag Charms", handle: "laptop" },
  { name: "Keychains", handle: "keychain" },
  { name: "Handmade", handle: "handmade" },
];

type SeedProduct = {
  title: string;
  handle: string;
  description: string;
  image: string;
  categories: string[];
  isHandmade: boolean;
  leadTimeDays?: number;
  finishes: string[];
  useModes: string[];
  /** Base price in PAISE. Never rupees, never a float. */
  pricePaise: number;
  stockPerVariant: number;
  metaDescription: string;
};

const PRODUCTS: SeedProduct[] = [
  {
    title: "Pearl Drop Charm",
    handle: "pearl-drop-charm",
    description:
      "A freshwater pearl on a hand-finished brass drop. Made to order in small batches, so every piece sits slightly differently on the strap.",
    image: "/placeholder/charm-1.svg",
    categories: ["tote", "handmade"],
    isHandmade: true,
    leadTimeDays: 5,
    finishes: ["Gold", "Silver"],
    useModes: ["Bag charm", "Both"],
    pricePaise: 129900,
    stockPerVariant: 6,
    metaDescription:
      "Handmade freshwater pearl bag charm on a brass drop. Made to order in India.",
  },
  {
    title: "Woven Tassel Charm",
    handle: "woven-tassel-charm",
    description:
      "A soft cotton tassel wound onto a lobster clasp. Light enough for a canvas tote, sturdy enough for a laptop bag.",
    image: "/placeholder/charm-2.svg",
    categories: ["tote", "laptop"],
    isHandmade: false,
    finishes: ["Gold", "Antique Brass"],
    useModes: ["Bag charm", "Both"],
    pricePaise: 79900,
    stockPerVariant: 20,
    metaDescription: "Cotton tassel bag charm with a lobster clasp. Ready to ship.",
  },
  {
    title: "Enamel Daisy Charm",
    handle: "enamel-daisy-charm",
    description:
      "Hard enamel daisy with a polished rim. Holds colour without chipping, which cheaper soft enamel does not.",
    image: "/placeholder/charm-3.svg",
    categories: ["tote", "keychain"],
    isHandmade: false,
    finishes: ["Gold", "Silver"],
    useModes: ["Bag charm", "Keychain", "Both"],
    pricePaise: 64900,
    stockPerVariant: 25,
    metaDescription: "Hard enamel daisy charm for bags and keys. Chip-resistant finish.",
  },
  {
    title: "Mini Teddy Charm",
    handle: "mini-teddy-charm",
    description:
      "A small plush teddy on a spring-ring clasp. The one people actually reach for when buying a gift.",
    image: "/placeholder/charm-4.svg",
    categories: ["tote", "keychain"],
    isHandmade: false,
    finishes: ["Cream", "Caramel"],
    useModes: ["Bag charm", "Keychain"],
    pricePaise: 89900,
    stockPerVariant: 15,
    metaDescription: "Mini plush teddy bag charm and keychain. A ready-to-gift piece.",
  },
  {
    title: "Chain Link Charm",
    handle: "chain-link-charm",
    description:
      "A short weighted chain that hangs flat against a laptop bag instead of swinging. Solid brass, not plated zinc.",
    image: "/placeholder/charm-5.svg",
    categories: ["laptop"],
    isHandmade: false,
    finishes: ["Gold", "Silver", "Antique Brass"],
    useModes: ["Bag charm"],
    pricePaise: 99900,
    stockPerVariant: 12,
    metaDescription: "Solid brass chain charm for laptop bags. Hangs flat, does not swing.",
  },
  {
    title: "Beaded Rainbow Charm",
    handle: "beaded-rainbow-charm",
    description:
      "Glass beads strung by hand in a graded rainbow. Each run is slightly different because the beads are sorted by eye.",
    image: "/placeholder/charm-6.svg",
    categories: ["keychain", "handmade"],
    isHandmade: true,
    leadTimeDays: 7,
    finishes: ["Bright", "Pastel"],
    useModes: ["Keychain", "Both"],
    pricePaise: 74900,
    stockPerVariant: 4,
    metaDescription: "Hand-strung glass bead rainbow keychain charm. Made to order in India.",
  },
];

export default async function seedCatalog({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const productModule = container.resolve(Modules.PRODUCT);
  const salesChannelModule = container.resolve(Modules.SALES_CHANNEL);
  const stockLocationModule = container.resolve(Modules.STOCK_LOCATION);
  const fulfillmentModule = container.resolve(Modules.FULFILLMENT);
  const catalogModule: any = container.resolve(CATALOG_MODULE);

  logger.info("Seeding catalogue…");

  const [salesChannel] = await salesChannelModule.listSalesChannels({});
  const [stockLocation] = await stockLocationModule.listStockLocations({});
  const [shippingProfile] = await fulfillmentModule.listShippingProfiles({ type: "default" });
  if (!salesChannel || !stockLocation || !shippingProfile) {
    throw new Error("Run `pnpm --filter @sorbe/medusa seed` first — base seed is missing.");
  }

  // --- Categories ------------------------------------------------------------
  const existingCategories = await productModule.listProductCategories({});
  const categoryByHandle = new Map(existingCategories.map((c) => [c.handle, c]));

  const missingCategories = CATEGORIES.filter((c) => !categoryByHandle.has(c.handle));
  if (missingCategories.length > 0) {
    const { result } = await createProductCategoriesWorkflow(container).run({
      input: {
        product_categories: missingCategories.map((c) => ({
          name: c.name,
          handle: c.handle,
          is_active: true,
          is_internal: false,
        })),
      },
    });
    for (const created of result) categoryByHandle.set(created.handle, created);
    logger.info(`  created ${result.length} categories`);
  }

  // --- Products --------------------------------------------------------------
  const existingProducts = await productModule.listProducts({});
  const existingHandles = new Set(existingProducts.map((p) => p.handle));
  const toCreate = PRODUCTS.filter((p) => !existingHandles.has(p.handle));

  if (toCreate.length === 0) {
    logger.info("  products already seeded, nothing to do");
    return;
  }

  const { result: createdProducts } = await createProductsWorkflow(container).run({
    input: {
      products: toCreate.map((p) => ({
        title: p.title,
        handle: p.handle,
        description: p.description,
        status: ProductStatus.PUBLISHED,
        shipping_profile_id: shippingProfile.id,
        images: [{ url: p.image }],
        thumbnail: p.image,
        category_ids: p.categories
          .map((h) => categoryByHandle.get(h)?.id)
          .filter((id): id is string => Boolean(id)),
        sales_channels: [{ id: salesChannel.id }],
        options: [
          { title: "Finish", values: p.finishes },
          { title: "Use mode", values: p.useModes },
        ],
        // Every finish x use-mode combination is a real, separately stocked SKU.
        variants: p.finishes.flatMap((finish) =>
          p.useModes.map((useMode) => ({
            title: `${finish} / ${useMode}`,
            sku: `${p.handle}-${slug(finish)}-${slug(useMode)}`.toUpperCase(),
            manage_inventory: true,
            options: { Finish: finish, "Use mode": useMode },
            prices: [{ amount: p.pricePaise, currency_code: "inr" }],
          })),
        ),
      })),
    },
  });
  logger.info(`  created ${createdProducts.length} products`);

  // --- Stock -----------------------------------------------------------------
  // createProductsWorkflow makes an inventory item per variant but no LEVEL, so
  // without this every variant reads as out of stock.
  const { data: variants } = await query.graph({
    entity: "variant",
    fields: ["id", "sku", "inventory_items.inventory_item_id"],
    filters: { product_id: createdProducts.map((p) => p.id) },
  });

  const stockBySku = new Map(
    toCreate.flatMap((p) =>
      p.finishes.flatMap((finish) =>
        p.useModes.map((useMode) => [
          `${p.handle}-${slug(finish)}-${slug(useMode)}`.toUpperCase(),
          p.stockPerVariant,
        ]),
      ),
    ) as [string, number][],
  );

  const levels = variants.flatMap((variant: any) =>
    (variant.inventory_items ?? []).map((item: any) => ({
      inventory_item_id: item.inventory_item_id,
      location_id: stockLocation.id,
      stocked_quantity: stockBySku.get(variant.sku) ?? 10,
    })),
  );

  if (levels.length > 0) {
    await createInventoryLevelsWorkflow(container).run({ input: { inventory_levels: levels } });
    logger.info(`  stocked ${levels.length} variants at '${stockLocation.name}'`);
  }

  // --- Catalog metadata (handmade flag, GST, SEO) -----------------------------
  const gstRate = Number(process.env.DEFAULT_GST_RATE_PERCENT ?? 18);
  const hsnCode = process.env.DEFAULT_HSN_CODE ?? "7117";

  for (const created of createdProducts) {
    const source = toCreate.find((p) => p.handle === created.handle);
    if (!source) continue;

    await catalogModule.createProductExtras({
      product_id: created.id,
      is_handmade: source.isHandmade,
      handmade_lead_time_days: source.leadTimeDays ?? null,
      country_of_origin: "India",
      hsn_code: hsnCode,
      gst_rate_percent: gstRate,
    });

    await catalogModule.createProductSeos({
      product_id: created.id,
      meta_title: source.title,
      meta_description: source.metaDescription,
      canonical_url: `/products/${source.handle}`,
    });
  }
  logger.info(`  wrote metadata for ${createdProducts.length} products`);

  logger.info("Catalogue seed complete.");
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

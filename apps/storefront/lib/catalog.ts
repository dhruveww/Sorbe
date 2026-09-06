import "server-only";
import { cache } from "react";
import { storeFetch } from "./medusa-client";

/**
 * Catalog reads. All of this runs on the server; the browser never sees a
 * Medusa key.
 *
 * Prices are integer paise throughout — `calculated_amount` comes straight from
 * Medusa's price module in the currency's minor unit. Do not divide until the
 * moment of display, and do it with formatPaise from @sorbe/types.
 */

export type Variant = {
  id: string;
  title: string;
  sku: string | null;
  options: { option_id: string; value: string }[];
  calculated_price?: { calculated_amount: number; currency_code: string } | null;
  inventory_quantity?: number;
  manage_inventory?: boolean;
};

export type Product = {
  id: string;
  title: string;
  handle: string;
  description: string | null;
  thumbnail: string | null;
  images: { id: string; url: string }[];
  options: { id: string; title: string; values: { id: string; value: string }[] }[];
  variants: Variant[];
  categories?: { id: string; handle: string; name: string }[];
};

export type Category = { id: string; name: string; handle: string };

export type ProductExtra = {
  product_id: string;
  is_handmade: boolean;
  handmade_lead_time_days: number | null;
  country_of_origin: string | null;
  hsn_code: string | null;
  gst_rate_percent: number | null;
};

export type ProductSeo = {
  product_id: string;
  meta_title: string | null;
  meta_description: string | null;
  canonical_url: string | null;
  og_image_url: string | null;
};

const PRODUCT_FIELDS = [
  "id",
  "title",
  "handle",
  "description",
  "thumbnail",
  "*images",
  "*options",
  "*options.values",
  "*categories",
  "*variants",
  "*variants.options",
  "*variants.calculated_price",
  "variants.inventory_quantity",
  "variants.manage_inventory",
].join(",");

/**
 * The India region. Required on every price-bearing request — without it
 * Medusa returns products with no calculated_price and the whole grid shows
 * "price unavailable".
 *
 * `cache` dedupes this across a single render pass; the 1h revalidate keeps it
 * out of the hot path entirely.
 */
export const getRegionId = cache(async (): Promise<string> => {
  const { regions } = await storeFetch<{ regions: { id: string; name: string }[] }>(
    "/store/regions",
    { revalidate: 3600, tags: ["regions"] },
  );
  const region = regions[0];
  if (!region) throw new Error("No region configured. Run: pnpm --filter @sorbe/medusa seed");
  return region.id;
});

export async function listProducts(options: { categoryHandle?: string; limit?: number } = {}) {
  const regionId = await getRegionId();
  const params = new URLSearchParams({
    region_id: regionId,
    fields: PRODUCT_FIELDS,
    limit: String(options.limit ?? 50),
  });

  if (options.categoryHandle) {
    const category = await getCategory(options.categoryHandle);
    if (!category) return { products: [] as Product[], count: 0 };
    params.set("category_id", category.id);
  }

  return storeFetch<{ products: Product[]; count: number }>(`/store/products?${params}`, {
    revalidate: 60,
    tags: ["products"],
  });
}

export async function getProduct(handle: string): Promise<Product | null> {
  const regionId = await getRegionId();
  const params = new URLSearchParams({
    handle,
    region_id: regionId,
    fields: PRODUCT_FIELDS,
    limit: "1",
  });
  const { products } = await storeFetch<{ products: Product[] }>(`/store/products?${params}`, {
    revalidate: 60,
    tags: ["products", `product:${handle}`],
  });
  return products[0] ?? null;
}

export const listCategories = cache(async (): Promise<Category[]> => {
  const { product_categories } = await storeFetch<{ product_categories: Category[] }>(
    "/store/product-categories?limit=50",
    { revalidate: 3600, tags: ["categories"] },
  );
  return product_categories;
});

export async function getCategory(handle: string): Promise<Category | null> {
  const categories = await listCategories();
  return categories.find((c) => c.handle === handle) ?? null;
}

/** Bulk metadata lookup — two requests for a whole grid, never N+1. */
export async function getCatalogMeta(productIds: string[]) {
  if (productIds.length === 0) {
    return { extras: new Map<string, ProductExtra>(), seos: new Map<string, ProductSeo>() };
  }
  const params = new URLSearchParams({ product_ids: productIds.join(",") });
  const { extras, seos } = await storeFetch<{ extras: ProductExtra[]; seos: ProductSeo[] }>(
    `/store/catalog-meta?${params}`,
    { revalidate: 60, tags: ["catalog-meta"] },
  );
  return {
    extras: new Map(extras.map((e) => [e.product_id, e])),
    seos: new Map(seos.map((s) => [s.product_id, s])),
  };
}

/** Cheapest variant price in paise — what a grid card shows as "from". */
export function lowestPricePaise(product: Product): number | null {
  const amounts = product.variants
    .map((v) => v.calculated_price?.calculated_amount)
    .filter((a): a is number => typeof a === "number");
  return amounts.length > 0 ? Math.min(...amounts) : null;
}

/** True when every variant is out of stock, so the card can say so up front. */
export function isSoldOut(product: Product): boolean {
  return product.variants.every(
    (v) => v.manage_inventory !== false && (v.inventory_quantity ?? 0) <= 0,
  );
}

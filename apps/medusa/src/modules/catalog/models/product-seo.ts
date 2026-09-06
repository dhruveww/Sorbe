import { model } from "@medusajs/framework/utils";

/**
 * SEO overrides for a product. Every field is optional — when absent the
 * storefront falls back to the product's own title/description, so a product
 * is never un-indexable just because nobody filled these in.
 */
export const ProductSeo = model.define("store_product_seo", {
  id: model.id().primaryKey(),
  product_id: model.text().unique(),
  meta_title: model.text().nullable(),
  meta_description: model.text().nullable(),
  // Always the single canonical PDP url, regardless of which collection linked
  // here. This is what stops collections creating duplicate PDPs.
  canonical_url: model.text().nullable(),
  og_image_url: model.text().nullable(),
});

/** Same shape, for collection landing pages (/collections/tote etc). */
export const CollectionSeo = model.define("store_collection_seo", {
  id: model.id().primaryKey(),
  collection_id: model.text().unique(),
  meta_title: model.text().nullable(),
  meta_description: model.text().nullable(),
  canonical_url: model.text().nullable(),
  og_image_url: model.text().nullable(),
});

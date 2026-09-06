import { model } from "@medusajs/framework/utils";

/**
 * Per-product fields Medusa's core schema has no column for.
 *
 * Keyed by product_id rather than joined through a Medusa module link: this is
 * strictly 1:1 metadata, and a link table would add a join for no benefit at
 * this catalogue size (docs/PLAN.md §5.2).
 */
export const ProductExtra = model.define("store_product_extra", {
  id: model.id().primaryKey(),
  product_id: model.text().unique(),

  // Handmade pieces are made to order. Never oversell them: the PDP shows the
  // lead time instead of implying same-day dispatch.
  is_handmade: model.boolean().default(false),
  handmade_lead_time_days: model.number().nullable(),

  // Legal metrology requires origin and manufacturer on pre-packaged goods.
  country_of_origin: model.text().default("India"),
  manufacturer_name: model.text().nullable(),
  manufacturer_address: model.text().nullable(),

  // GST. Defaults come from env (18% / HSN 7117 for imitation jewellery) but
  // are editable per product — confirm with a CA before taking real money.
  hsn_code: model.text().nullable(),
  gst_rate_percent: model.number().nullable(),
});

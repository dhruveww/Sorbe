import { model } from "@medusajs/framework/utils";

/** Offer modal. Never blocks the shop — dismissible, and the page works behind it. */
export const Popup = model.define("store_popup", {
  id: model.id().primaryKey(),
  title: model.text(),
  image_url: model.text().nullable(),
  body_text: model.text().nullable(),
  cta_label: model.text().nullable(),
  cta_url: model.text().nullable(),
  is_active: model.boolean().default(false),
  starts_at: model.dateTime().nullable(),
  ends_at: model.dateTime().nullable(),
  /** once_per_session | once_per_device | every_visit */
  display_mode: model.text().default("once_per_session"),
  priority: model.number().default(0),
  created_by: model.text().nullable(),
});

/**
 * An Instagram Reel attached to a product.
 *
 * `rights_status` exists so a Reel can be catalogued long before it is legally
 * clear to publish. The PDP renders only granted AND published rows — the two
 * flags are separate on purpose.
 */
export const Reel = model.define("store_reel", {
  id: model.id().primaryKey(),
  product_id: model.text(),
  instagram_url: model.text(),
  cover_image_url: model.text().nullable(),
  caption: model.text().nullable(),
  /** pending | granted | denied */
  rights_status: model.text().default("pending"),
  sort_order: model.number().default(0),
  is_published: model.boolean().default(false),
});

/** Hand-picked "More like this" / "Complete the look". No ML in v1. */
export const ManualRecommendation = model.define("store_manual_recommendation", {
  id: model.id().primaryKey(),
  source_product_id: model.text(),
  related_product_id: model.text(),
  /** more_like_this | complete_the_look */
  relation_type: model.text().default("more_like_this"),
  sort_order: model.number().default(0),
});

/** Editable page copy: coming-soon blurbs, legal pages, offer text. */
export const CmsContent = model.define("store_cms_content", {
  id: model.id().primaryKey(),
  section: model.text().unique(),
  title: model.text().nullable(),
  body_html: model.text(),
  locale: model.text().default("en"),
  is_published: model.boolean().default(true),
});

/** Grouped Q&A, rendered with FAQ JSON-LD. */
export const FaqItem = model.define("store_faq_item", {
  id: model.id().primaryKey(),
  category: model.text().default("orders"),
  question: model.text(),
  answer_html: model.text(),
  sort_order: model.number().default(0),
  is_published: model.boolean().default(true),
});

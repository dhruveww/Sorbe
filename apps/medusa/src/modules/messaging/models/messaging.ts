import { model } from "@medusajs/framework/utils";

/**
 * Customer preferences that Medusa's Customer entity has no column for.
 * Consent is recorded here AND appended to store_consent_log, because DPDP
 * wants an auditable trail, not just a current value.
 */
export const CustomerProfile = model.define("store_customer_profile", {
  id: model.id().primaryKey(),
  customer_id: model.text().unique(),
  whatsapp_opt_in: model.boolean().default(false),
  whatsapp_opt_in_at: model.dateTime().nullable(),
  whatsapp_opt_in_source: model.text().nullable(),
  marketing_opt_in: model.boolean().default(false),
  preferred_language: model.text().default("en"),
  /** The buyer's own GSTIN, if they want a GST invoice. */
  gstin: model.text().nullable(),
});

/** Editable message copy. `bsp_template_name` is the Meta-approved name. */
export const WaTemplate = model.define("store_wa_template", {
  id: model.id().primaryKey(),
  key: model.text().unique(),
  language: model.text().default("en"),
  /** utility | authentication | marketing — Meta prices these differently. */
  category: model.text().default("utility"),
  body_text: model.text(),
  bsp_template_name: model.text().nullable(),
  is_active: model.boolean().default(true),
  updated_by: model.text().nullable(),
});

/**
 * Every send attempt, including the ones we chose not to make.
 *
 * While FEATURE_WHATSAPP_LIVE is false every trigger still lands here as
 * "would_send", so the dashboard is fully populated and the frequency caps are
 * testable before a single rupee is spent on a BSP.
 */
export const WaLog = model.define("store_wa_log", {
  id: model.id().primaryKey(),
  customer_id: model.text().nullable(),
  phone: model.text(),
  template_key: model.text(),
  variables: model.json().nullable(),
  /** would_send | queued | sent | delivered | read | failed */
  status: model.text().default("would_send"),
  provider_message_id: model.text().nullable(),
  error: model.text().nullable(),
  order_id: model.text().nullable(),
  /** SKU or variant, so per-product frequency caps can be enforced. */
  subject_ref: model.text().nullable(),
  triggered_by: model.text().default("system"),
});

/** DPDP audit trail: who consented to what, when, and from where. */
export const ConsentLog = model.define("store_consent_log", {
  id: model.id().primaryKey(),
  customer_id: model.text().nullable(),
  phone: model.text().nullable(),
  consent_type: model.text(),
  granted: model.boolean(),
  source: model.text().nullable(),
  ip: model.text().nullable(),
  user_agent: model.text().nullable(),
});

/** "Notify me" on an out-of-stock variant. */
export const RestockAlert = model.define("store_restock_alert", {
  id: model.id().primaryKey(),
  phone: model.text(),
  variant_id: model.text(),
  product_id: model.text().nullable(),
  /** pending | notified | cancelled */
  status: model.text().default("pending"),
  notified_at: model.dateTime().nullable(),
});

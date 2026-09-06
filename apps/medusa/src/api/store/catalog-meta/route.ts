import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { CATALOG_MODULE } from "../../../modules/catalog";

/**
 * Catalog metadata for the storefront: handmade flag, lead time, GST/HSN, SEO.
 *
 * These live in our own module, so the core Store API knows nothing about them.
 * Exposed as a bulk lookup rather than per-product to keep a product grid at
 * two requests instead of N+1.
 *
 * Read-only and non-sensitive — GST rate and lead time are shown on the PDP.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const catalog: any = req.scope.resolve(CATALOG_MODULE);

  const raw = typeof req.query.product_ids === "string" ? req.query.product_ids : "";
  const productIds = raw.split(",").map((id) => id.trim()).filter(Boolean);
  const filter = productIds.length > 0 ? { product_id: productIds } : {};

  const [extras, seos] = await Promise.all([
    catalog.listProductExtras(filter),
    catalog.listProductSeos(filter),
  ]);

  res.json({ extras, seos });
};

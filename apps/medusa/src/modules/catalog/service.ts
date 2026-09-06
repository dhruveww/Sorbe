import { MedusaService } from "@medusajs/framework/utils";
import { ProductExtra } from "./models/product-extra";
import { CollectionSeo, ProductSeo } from "./models/product-seo";

/**
 * Catalog metadata: the product/collection fields Medusa core has no home for.
 *
 * Packaged as ONE module rather than the separate `product-extra` and `seo`
 * modules sketched in docs/PLAN.md §3. The table names and columns are exactly
 * as planned — only the module boundary differs, because three 1:1 metadata
 * tables did not justify three sets of module boilerplate and three migration
 * chains.
 *
 * MedusaService generates list/retrieve/create/update/delete for each model,
 * e.g. listProductExtras, createProductSeos, updateCollectionSeos.
 */
class CatalogModuleService extends MedusaService({
  ProductExtra,
  ProductSeo,
  CollectionSeo,
}) {}

export default CatalogModuleService;

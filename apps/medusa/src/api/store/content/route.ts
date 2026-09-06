import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { CONTENT_MODULE } from "../../../modules/content";

/**
 * Public content for the storefront: the active popup, a product's Reels and
 * recommendations, a CMS section, or the FAQ list.
 *
 * One endpoint with a `type` rather than five, because these are all small
 * reads and the storefront caches them the same way.
 *
 * Reels are filtered inside the service (published AND rights granted), so
 * nothing unlicensed can leak out through a forgotten check here.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const content: any = req.scope.resolve(CONTENT_MODULE);
  const type = String(req.query.type ?? "");
  const productId = typeof req.query.product_id === "string" ? req.query.product_id : "";

  switch (type) {
    case "popup":
      res.json({ popup: await content.activePopup() });
      return;

    case "reels":
      if (!productId) {
        res.status(400).json({ message: "product_id required" });
        return;
      }
      res.json({ reels: await content.publishedReels(productId) });
      return;

    case "recommendations": {
      if (!productId) {
        res.status(400).json({ message: "product_id required" });
        return;
      }
      const [moreLikeThis, completeTheLook] = await Promise.all([
        content.recommendationsFor(productId, "more_like_this"),
        content.recommendationsFor(productId, "complete_the_look"),
      ]);
      res.json({ more_like_this: moreLikeThis, complete_the_look: completeTheLook });
      return;
    }

    case "section": {
      const section = typeof req.query.section === "string" ? req.query.section : "";
      res.json({ content: section ? await content.section(section) : null });
      return;
    }

    case "faqs":
      res.json({ faqs: await content.publishedFaqs() });
      return;

    default:
      res.status(400).json({ message: "Unknown content type" });
  }
};

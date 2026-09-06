import { MedusaService } from "@medusajs/framework/utils";
import {
  CmsContent,
  FaqItem,
  ManualRecommendation,
  Popup,
  Reel,
} from "./models/content";

class ContentModuleService extends MedusaService({
  Popup,
  Reel,
  ManualRecommendation,
  CmsContent,
  FaqItem,
}) {
  /**
   * The one popup to show right now: active, inside its schedule window,
   * highest priority. Returns null when nothing qualifies.
   */
  async activePopup() {
    const now = new Date();
    const candidates = await this.listPopups({ is_active: true });

    const live = candidates.filter((popup) => {
      const started = !popup.starts_at || new Date(popup.starts_at) <= now;
      const notEnded = !popup.ends_at || new Date(popup.ends_at) >= now;
      return started && notEnded;
    });

    return live.sort((a, b) => b.priority - a.priority)[0] ?? null;
  }

  /**
   * Reels for a PDP.
   *
   * Requires BOTH published and rights granted. Publishing something we do not
   * have permission to use is a legal problem, so the check is an AND and lives
   * here rather than in a page that someone might forget to guard.
   */
  async publishedReels(productId: string) {
    const reels = await this.listReels({
      product_id: productId,
      is_published: true,
      rights_status: "granted",
    });
    return reels.sort((a, b) => a.sort_order - b.sort_order);
  }

  async recommendationsFor(productId: string, relationType: string) {
    const rows = await this.listManualRecommendations({
      source_product_id: productId,
      relation_type: relationType,
    });
    return rows.sort((a, b) => a.sort_order - b.sort_order);
  }

  /** Page copy by section, or null so the caller can fall back to its default. */
  async section(section: string) {
    const [row] = await this.listCmsContents({ section, is_published: true });
    return row ?? null;
  }

  async publishedFaqs() {
    const rows = await this.listFaqItems({ is_published: true });
    return rows.sort((a, b) => a.sort_order - b.sort_order);
  }
}

export default ContentModuleService;

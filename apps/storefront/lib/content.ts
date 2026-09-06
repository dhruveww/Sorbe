import "server-only";
import { storeFetch } from "./medusa-client";

export type Popup = {
  id: string;
  title: string;
  image_url: string | null;
  body_text: string | null;
  cta_label: string | null;
  cta_url: string | null;
  display_mode: string;
};

export type Reel = {
  id: string;
  instagram_url: string;
  cover_image_url: string | null;
  caption: string | null;
};

export type Recommendation = { related_product_id: string; sort_order: number };

export type CmsSection = { section: string; title: string | null; body_html: string };

export type Faq = { id: string; category: string; question: string; answer_html: string };

/** Content is editable but rarely changes; a short cache keeps pages fast. */
const CACHE = { revalidate: 60, tags: ["content"] };

export async function getActivePopup(): Promise<Popup | null> {
  try {
    const { popup } = await storeFetch<{ popup: Popup | null }>(
      "/store/content?type=popup",
      CACHE,
    );
    return popup;
  } catch {
    // A popup is decoration — never let it break the page it sits on.
    return null;
  }
}

export async function getReels(productId: string): Promise<Reel[]> {
  try {
    const { reels } = await storeFetch<{ reels: Reel[] }>(
      `/store/content?type=reels&product_id=${productId}`,
      CACHE,
    );
    return reels;
  } catch {
    return [];
  }
}

export async function getRecommendations(productId: string): Promise<{
  moreLikeThis: string[];
  completeTheLook: string[];
}> {
  try {
    const data = await storeFetch<{
      more_like_this: Recommendation[];
      complete_the_look: Recommendation[];
    }>(`/store/content?type=recommendations&product_id=${productId}`, CACHE);

    return {
      moreLikeThis: data.more_like_this.map((row) => row.related_product_id),
      completeTheLook: data.complete_the_look.map((row) => row.related_product_id),
    };
  } catch {
    return { moreLikeThis: [], completeTheLook: [] };
  }
}

/** Returns null so callers fall back to their built-in copy. */
export async function getSection(section: string): Promise<CmsSection | null> {
  try {
    const { content } = await storeFetch<{ content: CmsSection | null }>(
      `/store/content?type=section&section=${section}`,
      CACHE,
    );
    return content;
  } catch {
    return null;
  }
}

export async function getFaqs(): Promise<Faq[]> {
  try {
    const { faqs } = await storeFetch<{ faqs: Faq[] }>("/store/content?type=faqs", CACHE);
    return faqs;
  } catch {
    return [];
  }
}

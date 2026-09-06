import type { MetadataRoute } from "next";
import { listCategories, listProducts } from "@/lib/catalog";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

/** Static routes worth indexing. Cart, checkout and account are excluded — see robots.ts. */
const STATIC_PATHS = [
  { path: "/", priority: 1.0 },
  { path: "/shop", priority: 0.9 },
  { path: "/events", priority: 0.4 },
  { path: "/influencer", priority: 0.4 },
  { path: "/make-your-own", priority: 0.4 },
  { path: "/faq", priority: 0.5 },
  { path: "/shipping", priority: 0.5 },
  { path: "/returns", priority: 0.5 },
  { path: "/terms", priority: 0.3 },
  { path: "/privacy", priority: 0.3 },
  { path: "/contact", priority: 0.4 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [{ products }, categories] = await Promise.all([
    listProducts({ limit: 500 }),
    listCategories(),
  ]);

  const now = new Date();

  return [
    ...STATIC_PATHS.map((entry) => ({
      url: `${SITE_URL}${entry.path}`,
      lastModified: now,
      priority: entry.priority,
    })),
    ...categories.map((category) => ({
      url: `${SITE_URL}/collections/${category.handle}`,
      lastModified: now,
      priority: 0.8,
    })),
    // One entry per product, at its canonical URL only — a product listed under
    // several collections still appears exactly once.
    ...products.map((product) => ({
      url: `${SITE_URL}/products/${product.handle}`,
      lastModified: now,
      priority: 0.7,
    })),
  ];
}

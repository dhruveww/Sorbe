import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Nothing personal or transactional should ever reach an index.
      disallow: ["/api/", "/cart", "/checkout", "/account", "/track-order"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}

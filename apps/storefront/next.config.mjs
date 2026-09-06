/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  images: {
    // Product photos are served from Supabase Storage's transform CDN, which
    // hands back AVIF/WebP at the requested width. See docs/PLAN.md §1.5.
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/**" },
    ],
  },

  // Fail the production build if a secret would be shipped to the browser.
  // Only NEXT_PUBLIC_* may be inlined client-side.
  env: {},

  experimental: {
    // Shared workspace packages are plain compiled ESM; no transpile needed.
  },
};

export default nextConfig;

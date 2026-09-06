import { defineConfig, loadEnv } from "@medusajs/framework/utils";

loadEnv(process.env.NODE_ENV || "development", process.cwd());

/**
 * Medusa backend configuration.
 *
 * DATABASE_URL must be the POOLER url in production (Supabase port 6543 with
 * ?pgbouncer=true). The direct 5432 url is for migrations only — pointing the
 * running app at it exhausts Supabase's connection limit under load.
 * See docs/PLAN.md §1.3.
 */
export default defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    http: {
      storeCors: process.env.STORE_CORS || "http://localhost:3000",
      adminCors: process.env.ADMIN_CORS || "http://localhost:9000",
      authCors: process.env.AUTH_CORS || "http://localhost:3000,http://localhost:9000",
      // Dev fallbacks only. Both are required in production — see .env.example.
      jwtSecret: process.env.JWT_SECRET || "dev-only-jwt-secret",
      cookieSecret: process.env.COOKIE_SECRET || "dev-only-cookie-secret",
    },
  },
  admin: {
    // The owner dashboard. Custom screens (Popups, Reels, WhatsApp, CMS) are
    // injected into this same app via src/admin — one dashboard, not two.
    disable: process.env.DISABLE_MEDUSA_ADMIN === "true",
  },
  modules: [
    {
      resolve: "./src/modules/catalog",
    },
    {
      resolve: "./src/modules/shipping",
    },
  ],
});

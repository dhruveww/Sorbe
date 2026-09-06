# SORBE — India Bag-Charm Storefront: v1 Implementation Plan

> Save to `docs/PLAN.md` as the first commit of Milestone 0.
>
> **Pricing note:** estimates as of early 2026. Verify at signup — vendors change tiers.

---

## Context

`spec.md` asks for an end-to-end ecommerce site for an India-based bag-charm store, brand placeholder **SORBE**. The repo is empty — greenfield.

**The problem:** two non-technical owners need a storefront correct about Indian commerce reality — UPI-first, COD, GST-inclusive pricing, pincode shipping, WhatsApp notifications — without Shopify lock-in, and without a rewrite when paid integrations are eventually purchased.

**Cost constraint (governing decision for this plan):** the entire project must be **buildable and fully testable at ₹0**. Nothing is purchased until launch. Every paid service has a free tier used during development, and every integration ships with a working mock so the app runs end-to-end with zero keys. **No DLT registration** — see §1.2.

**v1 outcome:** complete backend + basic-but-polished mobile UI, clickable end-to-end on a phone. Visual identity redesigned later; architecture and data model must not be throwaway.

---

## 0. Cost model — read this first

The build splits into two phases. **Phase A costs nothing.**

### Phase A — build & test (₹0/month, what you're doing now)

| Service | Free tier used | Limit that matters |
|---|---|---|
| **Medusa v2** | **Free forever** — MIT open-source, self-hosted. No license, no SaaS fee, ever | None |
| **Postgres + Storage** | Supabase Free | 500MB DB, 1GB storage, 5GB egress. **Pauses after 7 days idle** (just click resume) |
| **Redis** | Upstash Free | 10K commands/day — plenty for dev |
| **Storefront hosting** | Local (`pnpm dev`) | — |
| **Medusa hosting** | Local Docker | — |
| **Auth / OTP** | Supabase Auth Free | 50,000 monthly active users |
| **Email delivery (OTP)** | Resend Free | 3,000/month, **100/day** |
| **Payments** | `PAYMENTS_MOCK_MODE=true` | Simulate success/failure button. No Razorpay account needed |
| **WhatsApp** | `FEATURE_WHATSAPP_LIVE=false` | Logs "would send" rows; dashboard fully populated |
| **Shipping** | `SHIPPING_PROVIDER=manual` | Quotes from your own zone/rate tables |
| **Error tracking** | Sentry Free | 5,000 errors/month |
| **Total** | | **₹0** |

You can build every milestone, click through the entire purchase flow on your phone, and demo the whole store without spending anything or entering a single API key.

### Phase B — go live (only when you're ready to take real money)

| Service | Cost | Required at launch? |
|---|---|---|
| **Vercel Pro** | **$20/mo** | **Yes** — Hobby tier forbids commercial use |
| **Supabase Pro** | **$25/mo** | **Yes** — Free tier pauses after 7 days idle; a live store cannot pause |
| **Medusa hosting** | **$6–12/mo** | **Yes** — see §1.4 |
| **Razorpay** | **₹0/mo** + ~2% per card/netbanking txn. **UPI is ~0% MDR** | Yes, to take payment |
| **Upstash Redis** | **$0–5/mo** | Free tier may still suffice at launch |
| **Sentry** | **$0** | Free tier fine |
| **Resend** | **$0** | Free tier fine under 100 logins/day |
| **Launch total** | **≈ $51–62/mo (₹4,300–5,200)** | |

**Optional, add whenever you want:**

| Service | Cost | Note |
|---|---|---|
| **WhatsApp** — Meta Cloud API **direct** | **₹0/mo platform fee** + ~₹0.11–0.15/conversation | Going direct avoids BSP monthly fees (Interakt ≈ ₹2,499/mo). ~₹150/mo at 1,000 messages |
| **Shiprocket** | Free plan available; per-shipment charges | Until then, manual AWB entry works fine |

**Never needed:** Cloudinary (**saves $89/mo** — Supabase Storage does the job), any BSP monthly plan, DLT registration, paid SMS.

---

## 1. Decisions (locked)

### 1.1 Commerce engine: **Medusa v2** — free, self-hosted

MIT-licensed open-source. You host it; there is **no license fee, no per-order fee, no SaaS subscription — ever**. Your only Medusa cost is the server it runs on (§1.4), which is ₹0 during development because it runs in local Docker.

Used as a headless commerce API, with its bundled Admin UI extended via the Admin Extension SDK rather than replaced.

**Why Medusa over Vendure:** ships modules for exactly what's needed (Product, Pricing, Promotion, Cart, Order, Customer, Inventory, Fulfillment, Payment, Region, Tax, Auth); `AbstractPaymentProvider` / `AbstractFulfillmentProviderService` map directly onto "Razorpay may not exist yet, Shiprocket may not exist yet"; the Admin SDK lets custom screens (WhatsApp, Popups, Reels, CMS) live inside the *same* admin that manages Products and Orders — one dashboard, not two; and its Price module already stores amounts as **integer minor units (paise)**, matching the hard money requirement with no conversion layer.

**Not Shopify** (hard constraint 1) — and Shopify would also cost $29+/mo plus transaction fees, which is the opposite of the goal here.

### 1.2 Authentication: OTP via **Supabase Auth**, delivered by **email** in v1 — no DLT, no SMS cost

**The DLT problem, stated plainly:** TRAI requires every sender of transactional SMS in India to complete DLT registration (entity + sender ID + template) on a telecom operator's portal — roughly ₹5,000–6,000 and 3–10 business days. This is enforced by the **carriers**, so it applies to Twilio, MSG91, and every other SMS provider equally. There is no SMS provider that avoids it. **You said no DLT, so v1 sends no SMS.**

**Two DLT-free OTP channels exist. The plan uses both, in sequence:**

| Channel | Cost | DLT? | When |
|---|---|---|---|
| **Email OTP** (Supabase Auth + Resend) | **Free** — 50K MAU, 3K emails/mo | No | **v1, now** |
| **WhatsApp OTP** (Meta Cloud API authentication template) | ~₹0.11–0.15 each, no monthly fee | **No** — WhatsApp is not SMS, DLT does not apply | When you enable WhatsApp |
| ~~SMS OTP~~ | ₹0.20/SMS + ₹5–6K DLT | Yes | Deferred indefinitely — you may never need it |

**Decision: Supabase Auth handles OTP generation, expiry, rate limiting, and lockout.** It is free to 50,000 monthly active users and this is exactly the code you don't want to own or maintain.

**How identity is kept clean (this matters):** Supabase Auth is used **only as a credential verifier** — it answers "does this person control this email/phone?" and nothing more. It is never a customer database. On successful verification:
1. Next.js server takes the verified identifier.
2. Looks up (or creates) the **Medusa `customer`** — the single source of truth for name, phone, addresses, orders, wishlist.
3. Issues its own httpOnly session cookie.

We never read profile data from Supabase, so there is no dual-identity sync problem — the Supabase row is a credential record, nothing else. **Zero maintenance, zero cost, and swappable**: the OTP channel sits behind one interface (`OtpChannel`), so switching email → WhatsApp → SMS later is a config change.

**Deviation from spec hard constraint 3, flagged explicitly:** the spec says phone is the login identifier. With no DLT there is no free way to send a code to a phone in v1, so **the v1 login code goes to email**. Phone remains **mandatory** and remains the *operational* identity — required at checkout, validated as `+91`/10-digit, used for order lookup, guest order tracking, COD confirmation, and all WhatsApp messaging. The moment WhatsApp goes live, flip `OTP_CHANNEL=whatsapp` and login returns to the phone number, fully honouring the original intent. No code change — the interface is already there.

**Also worth knowing:** guest checkout requires no login at all (hard constraint 4), so a customer can buy without ever receiving an OTP. Login is a convenience for order history and saved addresses, not a gate.

**Free-tier limit to watch:** Resend free is **100 emails/day**. That caps you at ~100 logins/day, which is generous early on. Raising it is $20/mo — or just enable WhatsApp OTP instead, which is cheaper.

### 1.3 Postgres + Storage: **Supabase**, region `ap-south-1` (Mumbai)

**Free tier during development** (500MB DB, 1GB storage, 5GB egress). It pauses after ~7 days of inactivity — harmless in dev, click resume. **Upgrade to Pro ($25/mo) at launch**, because a live store cannot pause and the free tier's connection cap is too low.

Accessed **only via the Supavisor pooler URL** (`...pooler.supabase.com:6543/postgres?pgbouncer=true`), never the direct `5432` port. Exactly one thing uses the direct URL: the Medusa migration CLI.

**Media: Supabase Storage — free tier now, $0 marginal cost later.** Its image-transform endpoint (`/render/image/public/...?width=&quality=`) does on-the-fly resizing, which is all that's needed for `srcset` + WebP/AVIF. At launch, Storage is already included in the Pro plan you're paying for the database — so product photos cost **nothing extra**.

**Cloudinary is explicitly rejected.** Free tier is ~25GB, then a hard jump to **$89/mo** — for video capability v1 doesn't need, since Reels are Instagram embeds, not self-hosted clips. **Saves $89/mo.** All media URLs are stored as plain `text` columns and never assumed same-origin, so if you ever self-host video, migrating is a data migration, not a schema change.

**1GB free storage in dev** is roughly 300–800 optimized product photos — plenty to build with. Upload originals at sensible sizes; the transform endpoint handles the rest.

### 1.4 Medusa hosting: **local Docker now (free)**, Fly.io Mumbai at launch (~$6–12/mo)

**During development you host nothing.** `docker compose up` runs Postgres and Redis locally, and Medusa runs with `pnpm dev`. Cost: ₹0. You can test the entire store on your phone over your local network.

**At launch**, Medusa is a long-running Node server — Vercel cannot host it. Medusa is chatty with Postgres (many queries per request), so co-locating with Supabase in Mumbai matters more than deployment polish:

| Host | Region | Latency to Supabase Mumbai | Cost |
|---|---|---|---|
| **Fly.io** | **Mumbai (`bom`)** | **~1–3ms** | **~$6–12/mo** — 1 machine minimum, 2 if you split the worker |
| DigitalOcean | Bangalore | ~25–30ms | $6/mo droplet |
| Railway / Render | Singapore only | ~50–60ms | $5–14/mo |
| Render **Free** | Singapore | ~50–60ms | **$0 — but spins down after 15 min idle, ~50s cold start** |

**Chosen: Fly.io Mumbai.** Only low-cost host with true Mumbai co-location. Start with a **single machine (~$6/mo)** running server+worker in one process; split into two only if background jobs start competing with request handling.

Render's free tier is listed because it's genuinely useful for a **staging/demo URL** you can share before launch — the 50s cold start is unacceptable for real customers but fine for showing someone the site.

### 1.5 Payments: **Razorpay** — no monthly fee

**₹0/month.** Razorpay charges per transaction only: **UPI is effectively zero-MDR** under Indian regulation (which is why the spec is UPI-first — it's also the cheapest for you), cards/netbanking ≈ 2% + GST. You need a Razorpay account with KYC before going live; until then `PAYMENTS_MOCK_MODE=true` gives a full simulated checkout.

### 1.6 Shipping provider interface

One interface, implemented as a Medusa Fulfillment Module provider:

```ts
// apps/medusa/src/modules/shipping/types.ts
export interface ShippingProvider {
  getQuote(input: { pincode: string; weightGrams: number; cartValuePaise: number }):
    Promise<{ feePaise: number; etaDaysMin: number; etaDaysMax: number; zoneName: string } | null>;
  createShipment(input: { orderId: string; pincode: string; weightGrams: number; codAmountPaise: number | null }):
    Promise<{ awb: string | null; courierName: string | null; trackingUrl: string | null }>;
  trackShipment(awb: string): Promise<{ status: string; history: { status: string; at: string }[] }>;
  cancelShipment(awb: string): Promise<{ cancelled: boolean }>;
}
```

- `SHIPPING_PROVIDER=manual` (**v1 default, free**): quotes come from your own `store_shipping_zone`/`store_shipping_rate` tables; Admin Orders has a free-text AWB/tracking field you fill after booking a courier by hand.
- `SHIPPING_PROVIDER=shiprocket` (later): same interface, real API. **Zero storefront or checkout changes.**

### 1.7 OTP channel interface

Same pattern, so the DLT decision stays reversible:

```ts
// apps/storefront/lib/otp/types.ts
export interface OtpChannel {
  send(identifier: string, code: string): Promise<{ ok: boolean; providerId?: string }>;
}
```
`OTP_CHANNEL=mock` (dev, static code, free) → `email` (v1 launch, free) → `whatsapp` (when BSP is on, ~₹0.12) → `sms` (only if you ever do DLT).

---

## 2. Architecture

```
                              ┌────────────────────────────┐
                              │   Customer / Admin Browser  │
                              └──────────────┬─────────────┘
                                             │ HTTPS (same-origin)
              ┌──────────────────────────────▼──────────────────────────────┐
              │        Next.js App Router — Vercel (apps/storefront)         │
              │  • RSC pages   • /api/* route handlers (ALL secrets here)    │
              │  • Server Actions  • middleware: cart-id + session cookies   │
              └───┬──────────────┬──────────────┬─────────────┬─────────────┘
                  │ Store+Admin  │ REST         │ REST        │ REST
                  ▼              ▼              ▼             ▼
        ┌──────────────────┐ ┌──────────┐ ┌───────────┐ ┌──────────────┐
        │  Medusa v2       │ │ Upstash  │ │ Razorpay  │ │ Supabase Auth│
        │  local → Fly bom │◄┤ Redis    │ │ (Phase B) │ │ (OTP verify) │
        │  • server        │ │ sessions │ └───────────┘ └──────────────┘
        │  • worker        │ │ OTP meta │ ┌───────────┐ ┌──────────────┐
        │  • Admin UI      │ │ locks    │ │ WhatsApp  │ │ Resend       │
        │  • workflows     │ │ ratelimit│ │ Cloud API │ │ (OTP email)  │
        │  • subscribers   │ │ pincode  │ │ (optional)│ └──────────────┘
        └────────┬─────────┘ └──────────┘ └───────────┘
                 │ pooler URL
                 ▼
    ┌────────────────────────┐        ┌──────────────────────────┐
    │ Supabase Postgres      │        │ Supabase Storage + CDN   │
    │ ap-south-1 (Mumbai)    │◄───────┤ product images, popups   │
    │ • Medusa core tables   │        │ (free tier → Pro)        │
    │ • store_* custom tables│        └──────────────────────────┘
    │ • (future) inv_* tables│
    └────────────────────────┘
```

**The browser may call directly — and only these:**
1. Same-origin Next.js pages and `/api/*` routes.
2. **Razorpay Checkout.js**, which receives only the **public** `key_id`. This is Razorpay's required PCI-scope-reducing pattern and is the single sanctioned third-party browser call.
3. Instagram's public oEmbed/iframe endpoint for Reels.

**Never reaches the browser** (hard constraint 5): Medusa admin token and publishable key, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, WhatsApp token, Shiprocket token, `SUPABASE_SERVICE_ROLE_KEY`, Upstash token, any Postgres URL, `RESEND_API_KEY`, `MEDUSA_INTERNAL_AUTH_SECRET`.

---

## 3. Repo layout

pnpm workspaces + Turborepo, single repo.

```
BagCharm/
├── apps/
│   ├── storefront/                       # Next.js App Router (local → Vercel)
│   │   ├── app/
│   │   │   ├── (shop)/
│   │   │   │   ├── page.tsx                        # Home
│   │   │   │   ├── shop/page.tsx
│   │   │   │   ├── collections/[handle]/page.tsx
│   │   │   │   ├── products/[handle]/page.tsx      # PDP
│   │   │   │   ├── cart/page.tsx
│   │   │   │   ├── checkout/{address,payment}/page.tsx
│   │   │   │   ├── checkout/confirmation/[orderId]/page.tsx
│   │   │   │   ├── account/{orders,addresses,wishlist}/page.tsx
│   │   │   │   ├── track-order/page.tsx
│   │   │   │   ├── wishlist/page.tsx
│   │   │   │   ├── events|influencer|make-your-own/page.tsx   # coming soon, REAL routes
│   │   │   │   └── terms|returns|faq|privacy|shipping|contact/page.tsx
│   │   │   ├── api/
│   │   │   │   ├── cart/route.ts   cart/items/route.ts
│   │   │   │   ├── auth/otp/{request,verify}/route.ts
│   │   │   │   ├── checkout/verify/route.ts
│   │   │   │   ├── webhooks/razorpay/route.ts
│   │   │   │   ├── shipping/quote/route.ts
│   │   │   │   ├── restock-alert/route.ts
│   │   │   │   ├── popups/active/route.ts
│   │   │   │   └── health/route.ts
│   │   │   ├── sitemap.ts   robots.ts
│   │   ├── lib/
│   │   │   ├── medusa-client.ts        # server-only, holds the keys
│   │   │   ├── otp/{types,mock,email,whatsapp}.ts
│   │   │   ├── razorpay.ts  redis.ts  session.ts  validation.ts
│   │   └── middleware.ts
│   │
│   └── medusa/                           # Medusa v2 + customized Admin
│       ├── medusa-config.ts   fly.toml
│       └── src/
│           ├── modules/
│           │   ├── razorpay-payment/   manual-shipping/   shiprocket-shipping/
│           │   ├── customer-profile/   popup/   reel/   manual-recommendation/
│           │   ├── whatsapp/  restock-alert/  cms/  seo/  product-extra/
│           │   ├── invoice/  consent/
│           ├── workflows/
│           │   ├── complete-cart-if-not-already.ts   # THE idempotent chokepoint
│           │   ├── merge-guest-cart.ts
│           │   ├── publish-product.ts
│           │   └── release-stale-reservations.ts
│           ├── subscribers/{order-placed,payment-captured,fulfillment-shipped}.ts
│           ├── jobs/release-stale-reservations.ts
│           ├── api/{admin,store}/
│           └── admin/
│               ├── widgets/                    # injected into Product/Order/Customer
│               └── routes/{popups,reels,whatsapp,cms}/page.tsx
│
├── packages/
│   ├── config/          # brand strings + feature flags — ONLY place "SORBE" lives
│   ├── types/           # shared enums (OrderState, WATemplateKey…)
│   └── validation/      # shared zod: phone (+91/10-digit), pincode, email
│
├── infra/docker-compose.yml   # local Postgres + Redis — free offline dev
├── docs/PLAN.md               # this document
├── .env.example
└── turbo.json  pnpm-workspace.yaml  package.json
```

**Migration ownership:** only `apps/medusa` runs migrations. Medusa core tables unprefixed; this project's tables `store_`-prefixed; a future inventory app reserved `inv_`.

---

## 4. Env vars + feature flags

Secrets live only in `.env` files locally, and in Vercel/Fly encrypted env at launch. Only `NEXT_PUBLIC_*` reaches the browser.

**Brand (non-secret, fill immediately):** `NEXT_PUBLIC_BRAND_NAME` (=`SORBE`), `BRAND_LEGAL_NAME`, `BRAND_SUPPORT_EMAIL`, `BRAND_SUPPORT_PHONE`, `BRAND_GSTIN`, `BRAND_REGISTERED_ADDRESS`, `BRAND_GRIEVANCE_OFFICER_NAME`, `BRAND_GRIEVANCE_OFFICER_EMAIL`.

**Database:** `DATABASE_URL` (**pooler**, `?pgbouncer=true`), `DATABASE_URL_DIRECT` (migrations only), `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Reserved/unused in v1: `INVENTORY_RO_DATABASE_URL`.

**Redis:** `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.

**Medusa ↔ Next:** `MEDUSA_BACKEND_URL`, `MEDUSA_PUBLISHABLE_KEY`, `MEDUSA_ADMIN_API_TOKEN`, `MEDUSA_INTERNAL_AUTH_SECRET`.

**Auth / OTP:** `OTP_CHANNEL` (`mock|email|whatsapp|sms`), `OTP_MOCK_STATIC_CODE` (e.g. `000000`, non-prod only), `RESEND_API_KEY`, `OTP_FROM_EMAIL`.

**Razorpay:** `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `NEXT_PUBLIC_RAZORPAY_KEY_ID`, `PAYMENTS_MOCK_MODE`.

**WhatsApp:** `WA_PROVIDER` (`mock|meta_cloud_api|gupshup|interakt`), `WA_ACCESS_TOKEN`, `WA_PHONE_NUMBER_ID`, `FEATURE_WHATSAPP_LIVE`, `WA_FREQUENCY_CAP_LOW_STOCK_PER_SKU_PER_WEEK` (default `1`), `WA_FREQUENCY_CAP_PER_USER_PER_WEEK` (default `3`).

**Shipping:** `SHIPPING_PROVIDER` (`manual|shiprocket`), `SHIPROCKET_EMAIL`, `SHIPROCKET_PASSWORD`, `COD_MAX_ORDER_PAISE` (e.g. `500000` = ₹5,000), `FEATURE_COD_ENABLED`.

**Observability:** `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`.

**Feature flags** (one `packages/config` reader so both apps agree): `PAYMENTS_MOCK_MODE` (dev `true`), `FEATURE_WHATSAPP_LIVE` (`false`), `FEATURE_COD_ENABLED` (`true`), `FEATURE_WISHLIST`, `FEATURE_RESTOCK_ALERTS`, `FEATURE_POPUPS`, `FEATURE_REELS`, `FEATURE_MANUAL_RECS` (all `true`), `FEATURE_EVENTS_PAGE_LIVE`, `FEATURE_INFLUENCER_PAGE_LIVE`, `FEATURE_MYOC_PAGE_LIVE` (all `false` → coming-soon copy).

**The "keys not bought yet" rule, applied everywhere:** every third-party integration is an interface with a `mock` implementation that (a) makes no network call, (b) writes a row describing what *would* have happened, and (c) **is selected automatically when its env var is absent**. Absence of the key *is* the flag — nobody has to remember to toggle anything. Adding the real key and restarting is the entire cutover.

---

## 5. Data model

Money is **always `integer` paise**. Never float, never rupees.

### 5.1 Medusa built-ins used as-is
`region` (single India region, `inr`), `sales_channel`, `product`, `product_variant`, `product_option`/`product_option_value` (Finish, Clasp, Use-mode: Bag/Keychain/Both), `product_collection`, `product_category`, `product_image`, `price_set`/`price` (integer paise), `promotion`/`promotion_rule` (coupons), `customer`, `customer_address` (`metadata.label` = the user-given address name), `cart`, `cart_line_item` (`metadata.gift_note`), `order`, `order_line_item`, `fulfillment`, `payment_collection`, `payment`, `stock_location`, `inventory_item`, `inventory_level`, `reservation_item`, `tax_region`/`tax_rate`, `api_key`, `user` (`metadata.role = 'owner'|'packer'`).

### 5.2 Custom tables (all `store_`-prefixed)

**`store_customer_profile`** (1:1 `customer`) — `customer_id text unique`, **`supabase_user_id text unique`** (the credential link from §1.2), `whatsapp_opt_in bool default false`, `whatsapp_opt_in_at`, `whatsapp_opt_in_source`, `marketing_opt_in bool`, `preferred_language text default 'en'`, `gstin text` (buyer's, for GST invoices), timestamps.

**`store_popup`** — `title`, `image_url`, `body_text`, `cta_label`, `cta_url`, `is_active bool`, `starts_at`/`ends_at`, `display_mode text default 'once_per_session'` (`once_per_session|once_per_device|every_visit`), `priority int`, `created_by`, timestamps.

**`store_reel`** — `product_id`, `instagram_url`, `cover_image_url`, `caption`, `rights_status text default 'pending'` (`pending|granted|denied`), `sort_order`, `is_published bool default false`.

**`store_manual_recommendation`** — `source_product_id`, `related_product_id`, `relation_type` (`more_like_this|complete_the_look`), `sort_order`, `unique(source, related, relation_type)`.

**`store_wa_template`** — `key unique` (`order_confirmed|shipped|delivered|cod_confirm|payment_failed_retry|restock_alert|low_stock_nudge|otp_login`), `language`, `category` (`utility|authentication|marketing`), `body_text` (with `{{vars}}`), `bsp_template_name`, `is_active`, `updated_by`.

**`store_wa_log`** — `customer_id`, `phone not null`, `template_key`, `variables jsonb`, `status` (`would_send|queued|sent|delivered|read|failed`), `provider_message_id`, `error`, `order_id`, `triggered_by`, `created_at`. **Index `(phone, template_key, created_at)`** — the frequency-cap queries hit this.

**`store_restock_alert`** — `phone`, `variant_id`, `product_id`, `status default 'pending'` (`pending|notified|cancelled`), `created_at`, `notified_at`, `unique(phone, variant_id) where status='pending'`.

**`store_cms_content`** — `section` (`coming_soon_events|coming_soon_influencer|coming_soon_myoc|legal_tnc|legal_privacy|legal_returns|legal_shipping|contact_info|offer_copy`), `title`, `body_html`, `locale default 'en'`, `is_published`, `unique(section, locale)`.

**`store_faq_item`** — `category` (`orders|shipping|charm_care|events`), `question`, `answer_html`, `sort_order`, `is_published`.

**`store_product_extra`** (1:1 `product`) — `product_id pk`, `is_handmade bool`, `handmade_lead_time_days int`, `country_of_origin text default 'India'`, `manufacturer_name`, `manufacturer_address`, `hsn_code`, `gst_rate_percent numeric(4,2)` (a rate, not money).

**`store_product_seo`** (1:1 `product`) / **`store_collection_seo`** (1:1 `product_collection`) — `meta_title`, `meta_description`, `canonical_url`, `og_image_url`.

**`store_product_image_alt`** — `product_id`, `image_url`, `alt_text`, `sort_order`.

**`store_shipping_zone`** — `name` ("Metro", "Rest of India", "Northeast/J&K"), `pincode_prefixes text[]`, `eta_days_min`, `eta_days_max`.
**`store_shipping_rate`** — `zone_id fk`, `min_cart_value_paise integer`, `fee_paise integer`, `free_above_paise integer null`.

**`store_invoice`** — `order_id unique`, `invoice_number unique`, `series`, `issued_at`, `seller_gstin`, `buyer_gstin`, `place_of_supply_state_code`, `subtotal_paise`, `discount_paise`, `shipping_paise`, `cgst_paise`, `sgst_paise`, `igst_paise`, `total_paise`, `hsn_summary jsonb`, `pdf_url`.

**`store_order_state_log`** — `order_id`, `state` (`pending_payment|paid|cod_pending|confirmed|packed|shipped|delivered|rto|returned|refunded`), `changed_by`, `note`, `created_at`. A subscriber writes here on every native Medusa event plus COD-confirm and admin actions. **Both the customer Track-Order page and the Admin timeline read only this table**, so they can never disagree.

**`store_webhook_event`** — `provider`, `event_id unique`, `payload jsonb`, `status default 'received'`, `processed_at`. Durable idempotency ledger (Redis holds the fast lock; this is the audit trail).

**`store_consent_log`** (DPDP) — `customer_id`, `phone`, `consent_type` (`whatsapp_marketing|whatsapp_utility_implied|cookies`), `granted bool`, `source`, `ip`, `user_agent`, `created_at`.

### 5.3 Boundary for the future inventory app (hard constraint 7)
- Medusa is the **only writer** of `product`, `product_variant`, `inventory_item`, `inventory_level`, `reservation_item`, `stock_location`.
- The future inventory app gets a Postgres role `inventory_ro`: `SELECT` only on those, plus full rights on its own `inv_*` tables (`inv_purchase_order`, `inv_supplier`, `inv_warehouse_bin`).
- Any stock **mutation** goes through **Medusa's Admin API**, never direct SQL. This guarantees reservation/oversell logic is never bypassed by a second writer — **the single most important rule in this document**.
- `store_*` tables are not exposed to it at all.

---

## 6. Auth + session + guest cart merge

**Step 0 — first visit.** Middleware checks for `sorbe_cart_id`; if absent, does nothing. Cart is created lazily on first mutation, so crawlers don't generate junk carts.

**Step 1 — guest adds to cart.** `POST /api/cart/items`. If no cookie, server creates a Medusa cart and sets `sorbe_cart_id` — `httpOnly, Secure, SameSite=Lax, Max-Age=30d`. **Medusa Postgres is the cart's source of truth**; Redis holds only ephemeral data (OTP metadata, rate limits, pincode cache, locks).

**Step 2 — guest reaches checkout.** `/checkout/address` shows an inline "Have an account? Log in" link — never a blocking modal (hard constraint 4). **The guest can complete the entire purchase without logging in.**

**Step 3 — login (optional, free).**
1. `POST /api/auth/otp/request { identifier }` — email in v1.
2. Redis rate limits: `INCR otp_req:{identifier}` TTL 1h cap 5; `INCR otp_req_ip:{ip}` TTL 1h cap 20. (Belt-and-braces on top of Supabase's own limits.)
3. Server calls Supabase Auth to send the OTP via the configured `OtpChannel`.
4. `POST /api/auth/otp/verify { identifier, code }` → Supabase verifies. On success:
   - Look up `store_customer_profile.supabase_user_id`; if absent, look up the Medusa `customer` by email/phone and create if needed, then write the link row.
   - Store `SETEX session:{sid} 2592000 { customer_id }`; set `sorbe_session` httpOnly cookie. **No Supabase or Medusa token ever reaches the browser.**

**Step 4 — cart merge (the critical bit).**
1. Does this `customer_id` have a prior open cart (`completed_at IS NULL`) other than the current guest cart?
2. **No:** attach the guest cart to the customer. Same cart id, same URL, same step. Done.
3. **Yes** (they added items on another device): run `merge-guest-cart` — add each old line item to the guest cart (incrementing quantity where the variant already exists), then mark the old cart `metadata.merged_into`. **Never deleted** — audit trail.
4. Because **the cart id never changes through login**, and the checkout step is a **URL segment** (`/checkout/address`, `/checkout/payment`) rather than client state, the page just re-renders with merged totals on the same route. No redirect, no restarting checkout. That is exactly "the user stays on the same step."

**Step 5 — session survival.** Both cookies are httpOnly, 30-day, with matching Redis TTL refreshed on each authenticated request (sliding window). Because the step lives in the URL, a refresh, a closed tab reopened from history, or a return-to-tab lands exactly where the user left off.

---

## 7. Checkout + pay + webhook

1. **`/checkout/address` — pincode first.** `GET /api/shipping/quote?pincode=` (Redis cache `ship_quote:{pincode}` TTL 1h) → `ShippingProvider.getQuote()` → fee + ETA shown before any further address detail. GPS "use my location" only pre-fills city/state as an *assist*; **pincode is the source of truth** for the quote and the GST `place_of_supply`.
2. Address saved to `customer_address` (guests: `cart.shipping_address`); gift note to `cart.metadata.gift_note`.
3. **`/checkout/payment`** — server creates the `payment_collection`, then `razorpay-payment.initiatePayment`, which:
   - **Reserves inventory FIRST** — `createReservationItems` inside a transaction checking `stocked_quantity - reserved_quantity >= requested` under a row lock. If any line fails, checkout stops. **The customer never pays for something we can't ship, and this atomic check is exactly how the last-piece race is decided** — first request wins, the loser sees "just sold out" and is never charged.
   - **Only then** calls Razorpay `orders.create({ amount: total_paise, currency: 'INR', receipt: cart_id, notes: { cart_id } })`, storing `razorpay_order_id` on `cart.metadata`.
4. Browser opens Checkout.js with the **public** `key_id` + `razorpay_order_id`.
5. **Double-click protection** — the button disables on click, but the real guard is server-side: `initiatePayment` reuses an existing unexpired `razorpay_order_id`, so a duplicate request can never create two Razorpay orders for one cart.
6. **Verify** — browser POSTs the signature triple to `/api/checkout/verify`. Server: acquire `SET lock:cart:{cart_id} 1 NX PX 10000` → verify HMAC with `RAZORPAY_KEY_SECRET` → call `complete-cart-if-not-already`, which checks `cart.completed_at`: if set (webhook won the race) it returns the existing order id; otherwise it captures payment and completes the cart, converting reservations into stock deductions.
7. **Webhook (authoritative — handles closed tabs and dropped networks).** `POST /api/webhooks/razorpay` verifies `X-Razorpay-Signature` over the **raw body**, looks up `store_webhook_event` by event id; if already `processed`, returns `200` immediately — this is what makes Razorpay's 24-hour retries safe. Otherwise inserts, calls **the same** `complete-cart-if-not-already`, marks processed. Both paths funnel through one idempotent workflow guarded by `cart.completed_at` + Redis lock — whichever arrives first wins, the other is a no-op. **No duplicate orders, in any arrival order.**
8. **Failed-payment retry on the same order.** Razorpay allows multiple attempts against one `order_id` until success or expiry (~15 min). On failure the cart is **not** discarded: same `cart_id`, same `razorpay_order_id` if unexpired, UI shows "Payment didn't go through — retry." If the Razorpay order expired, a fresh `orders.create` runs but **the cart is untouched** — the customer never re-enters address or items. A `payment_failed_retry` WhatsApp message (or its `would_send` log row) links back to `/checkout/payment?cart=<id>`.
9. **COD** — offered only when `FEATURE_COD_ENABLED` and total ≤ `COD_MAX_ORDER_PAISE`. Completes the cart with `payment_collection.status='not_paid'` and state `cod_pending`. With WhatsApp live, a `cod_confirm` Yes/No template flips it to `confirmed`; otherwise it sits in the Admin "Pending COD" queue until an owner calls and clicks "Mark COD Confirmed." **Packing cannot start before `confirmed`.**
10. **Lifecycle** — `pending_payment → paid | cod_pending → confirmed → packed → shipped → delivered → rto | returned | refunded`, all recorded in `store_order_state_log`.

**Stale reservations:** a cron job frees reservations for carts that reserved stock but never paid within ~30 minutes, so an abandoned checkout doesn't permanently lock the last piece.

---

## 8. Customer sitemap

| Route | Purpose |
|---|---|
| `/` | Hero, featured collections, active popup slot, trust badges (UPI/COD/returns) |
| `/shop` | All products; filters (finish, clasp, use-mode, handmade vs ready-made), sort |
| `/collections/[handle]` | Indexable collection pages — tote / laptop / keychain / handmade. SEO-critical |
| `/products/[handle]` | PDP: variant picker, **sticky ATC**, Reels, manual rec rails, stock/lead-time messaging, JSON-LD Product |
| `/cart` | Line items, gift note, coupon, proceed — guest or logged in |
| `/checkout/address`, `/checkout/payment`, `/checkout/confirmation/[orderId]` | §7 |
| `/account/orders`, `/account/addresses`, `/account/wishlist` | Logged-in |
| `/track-order` | Logged-in (auto) **and** guest (phone + order id) |
| `/wishlist` | Guest (anon id) and logged-in (persisted) |
| `/events`, `/influencer`, `/make-your-own` | **Real routes**, coming-soon copy from CMS; flip via `FEATURE_*_PAGE_LIVE`. Never 404 |
| `/terms`, `/returns`, `/faq`, `/privacy`, `/shipping`, `/contact` | CMS-backed; `/faq` emits JSON-LD FAQ |

**Home and Shop are both top-level primary nav items**, not nested in a menu.

---

## 9. Admin sitemap + single product publish flow

Everything in **one** app — Medusa Admin (free, self-hosted), native screens where the entity exists, custom Admin Extension routes for `store_*` domains.

| Screen | Backing data | Role |
|---|---|---|
| Overview | today's sales, open orders, pending COD, low stock | owner + packer |
| Products | native + widgets for SEO, Reels, manual recs, handmade/origin/HSN/GST | owner full; packer stock only |
| Orders | native + widgets for AWB/tracking, refund, state timeline | owner full; **packer: pack + ship only, no refund** |
| Customers | native + `store_customer_profile` widget (opt-in, addresses). No extra PII | owner + packer read; owner edits opt-in |
| Discounts | native Promotions | owner only |
| Popups | custom route → `store_popup` CRUD | owner only |
| WhatsApp | custom route → triggers, `store_wa_log`, template editor, bubble preview | owner edits; packer views log |
| CMS | custom route → `store_cms_content`, `store_faq_item` | owner only |
| Admins | native Users + `metadata.role` select | owner only |

**Role gating:** Admin API middleware reads `req.auth_context.actor_id` → `user.metadata.role`; `ownerOnly` actions (refund, template edit, discount create, popup/CMS/admin edits) return `403` for packers. The UI also hides those buttons — defense in depth, not the boundary.

**Single publish flow (no triple entry).** One form, one submit, one `publishProductWorkflow` transaction:
1. Admin fills title, description, images (uploaded to Supabase Storage via a signed URL), collection, options + variant combinations with **price entered in ₹, converted ×100 to paise on save**, per-variant stock, handmade flag + lead time, HSN/GST%, country of origin, SEO fields, Reel URLs, manual recs.
2. Workflow: `createProducts` (+variants/options/images) → `createPrices` → `createInventoryItems` + `createInventoryLevels` → upsert `store_product_extra`, `store_product_seo`, `store_reel`, `store_manual_recommendation`.
3. Any failure rolls back via compensating steps — you can never end up with a product live on the storefront but with no stock row.

---

## 10. WhatsApp, popups, Reels, manual recs

### WhatsApp (optional purchase, ~₹0/mo platform fee via Meta Cloud API direct)
- **Admin:** template editor with `{{variable}}` validation, live WhatsApp-bubble preview, send log filterable by template/status/date, frequency-cap display.
- **Customer:** opt-in checkbox at checkout → `whatsapp_opt_in=true` + a `store_consent_log` row. "Notify me" on out-of-stock → `store_restock_alert`. **No message ever sends without opt-in.**
- **Frequency caps, enforced server-side before every send:** for `low_stock_nudge`, check `store_wa_log` for that `(phone, sku)` in the trailing 7 days, and total sends to that phone that week. A capped send is **logged as `would_send` with `error='frequency_capped'`**, never silently dropped — it stays auditable.
- **Mock mode (`FEATURE_WHATSAPP_LIVE=false`, the default):** every trigger renders its template, runs cap logic, writes `store_wa_log` with `status='would_send'`, then stops. **The dashboard is fully populated and testable before you spend one rupee.**
- **Going live:** register templates with Meta, set `WA_ACCESS_TOKEN` + `WA_PHONE_NUMBER_ID`, flip the flag, restart. **No code changes.** This also unlocks WhatsApp OTP login (§1.2), returning login to the phone number.

### Offers popup (free)
Admin CRUD over `store_popup`. `/api/popups/active` returns the highest-priority active, in-window popup; client honours `display_mode` via cookies. **Never blocks browsing or add-to-cart underneath**, dismissible via Esc and backdrop (hard constraint 4).

### Instagram Reels on PDP (free)
Admin attaches Reel URL + optional cover, sets `rights_status`. PDP renders **only** rows where `is_published=true` **AND** `rights_status='granted'` — a Reel can be entered long before it's legally clear and simply won't appear.

### Manual recommendations (free)
Two pickers on product edit ("More like this", "Complete the look"). PDP renders each rail if present, **omits it entirely when empty** — no ML fallback, per the hard no-ML rule.

---

## 11. SEO + legal fields

- **Per product:** `product.handle` (unique slug) + `store_product_seo` (meta title/description, canonical, OG image) + `store_product_image_alt` + `store_product_extra` (origin, manufacturer, HSN, GST%). **Per collection:** `handle` + `store_collection_seo`.
- **JSON-LD**, server-rendered, `JSON.stringify`-escaped: `Product` on PDP (price from paise ÷ 100, `priceCurrency: INR`, availability from `inventory_level`); `FAQ` on `/faq`; `Organization` in the root layout; `BreadcrumbList` on PDP and collections.
- **No duplicate PDPs:** one canonical `handle` per product. Collection pages link to that same URL, and `canonical_url` always points to it. Canonical categories are real paths, not query-string filters.
- **Sitemap/robots:** `app/sitemap.ts` enumerates published products, collections, static routes; `app/robots.ts` disallows `/admin`, `/api`, `/checkout`, `/account`.
- **Brand from config:** every title is `` `${title} | ${NEXT_PUBLIC_BRAND_NAME}` ``. A rebrand is one env var + redeploy.
- **India legal:** `/privacy` enumerates what's collected (name, phone, email, address, WhatsApp opt-in), why, and retention, auditable via `store_consent_log`; `BRAND_GSTIN` in footer and on every invoice; grievance officer on `/privacy` and `/contact` (DPDP); country of origin + manufacturer on PDP; cookie notice is a small dismissible bar for strictly-necessary cookies — **no cookie wall**.

---

## 12. Performance budget

- **LCP < 2.0s** on mid-range Android + throttled 4G. Hero via `next/image` `priority` with `sizes` matched to rendered width; AVIF → WebP → JPEG through the Supabase transform endpoint; `srcset` at 360/414/768/1024/1440. No client fetch blocks the hero.
- **INP < 200ms.** Add-to-cart is optimistic (instant local update, background reconcile, rollback + toast on failure). Checkout transitions prefetch rather than block.
- **CLS < 0.1.** Every skeleton matches its real content's final dimensions. Cart → checkout swaps only the content region via Suspense — header/nav/summary stay mounted. That's what "no full-page wipe" means concretely.
- **Images:** explicit `width`/`height` or `aspect-ratio` everywhere; `loading="lazy"` below the fold.
- **Motion:** every transition checks `prefers-reduced-motion`. Animations stay off the LCP element and are interruptible — rapid ATC taps must never queue motion.
- **Observability:** Sentry free tier on both apps. Structured JSON logs on every webhook/payment/OTP route with the idempotency key, so an incident traces from "webhook received" → "workflow ran" → "order created" by one correlation id.

---

## 13. Phased build order

Milestones **M0–M3 and M6–M7 cost ₹0**. Only M4 needs a real account.

- **M0 — Skeleton (free).** Monorepo (pnpm + Turborepo); `docker compose up` for local Postgres + Redis; Medusa boots with India region/currency/sales-channel seeded; storefront reaches Medusa through the server-only client; complete `.env.example`; Sentry wired. *No cloud accounts needed yet.*
- **M1 — Catalog (free).** Product/variant/option/collection modeling; `product-extra` + `seo` modules and Admin widgets; `publishProductWorkflow`; Home/Shop/Collection/PDP; image pipeline; sitemap/robots; JSON-LD.
- **M2 — Cart (free).** Guest cart cookie + session; cart page; address book; pincode → manual shipping quote; gift note; coupons; wishlist; restock-alert capture with `would_send` logging.
- **M3 — Pay, mocked (free).** Supabase Auth OTP with `OTP_CHANNEL=mock`; full checkout including login-at-checkout and cart merge; Razorpay stubbed with Simulate Success/Failure; order creation; confirmation; COD with manual admin confirm; `store_order_state_log`; Track Order. **At the end of M3 the entire store is demoable on your phone, having spent nothing.**
- **M4 — Pay, live (first spend).** Razorpay account + KYC; Checkout.js; `/api/checkout/verify` + `/api/webhooks/razorpay` with signature verification; `store_webhook_event` ledger; Redis lock; stock reservation + stale-release cron; failed-payment retry; GST invoice generation.
- **M5 — Admin (free).** Overview, Orders (owner/packer split), Customers, Discounts; role-gating middleware; refund flow; verify the publish flow is genuinely single-entry.
- **M6 — WhatsApp dashboard (free, still mocked).** All triggers end-to-end in mock; Admin WhatsApp screen with preview, log, caps; `store_consent_log` wired at checkout.
- **M7 — Polish + launch (Phase B spend).** Popups; Reels with rights gating; manual rec rails; CMS-backed FAQ/legal/coming-soon pages; Lighthouse pass; `prefers-reduced-motion` audit; hardcoded-brand grep; **then** provision Supabase Pro, Vercel Pro, Fly.io and deploy.

---

## 14. Test plan

1. **Phone guest buy (no login at all).** Fresh profile → browse → add to cart → checkout as guest → COD or mock payment → confirmation, order in Admin with guest phone/email and `customer_id=null`. *Proves hard constraint 4.*
2. **Login + cart merge, same step.** Two items as guest on `/checkout/payment` with address filled → log in via mock OTP → assert: still on `/checkout/payment`; items intact plus any pre-seeded logged-in cart items; `cart.customer_id` set; old cart `merged_into`.
3. **Last-piece stock race.** Seed `stocked_quantity=1`. Fire two concurrent reservation attempts. Assert exactly one succeeds, the loser gets a clean "sold out" **without ever reaching Razorpay's `orders.create`**, no charge for the loser. *Script it — concurrency test, not UI.*
4. **Failed payment retry.** Simulate failure → cart not completed, `razorpay_order_id` reused, `payment_failed_retry` logged as `would_send`; then simulate success → **exactly one** order.
5. **Return-to-tab survival.** Add items, fill address, fully close the tab, reopen from history with cookies preserved → cart and checkout step identical, no address re-entry.
6. **Webhook idempotency.** Post the same webhook payload twice → exactly one order; second returns 200 fast without reprocessing.

Playwright covers 1, 2, 4, 5; a load script covers 3; 6 is an integration test. **All run against local Docker — free.**

---

## 15. Risks — graceful degradation

| Missing / broken | What breaks | What still works |
|---|---|---|
| Razorpay keys (Phase A) | `PAYMENTS_MOCK_MODE` auto-on; no real charge | COD works fully; online payment shows a labelled test-mode simulate button, so the flow stays demoable |
| WhatsApp not purchased | No real message sends; **OTP login stays on email** | Every trigger fires, caps enforce, `store_wa_log` fills with `would_send`. COD confirm falls back to the manual admin queue; customers use Track Order |
| Shiprocket not purchased | No live AWB or carrier tracking | Pincode → fee/ETA works from your zone/rate tables; Admin has a free-text AWB field for manually-booked couriers |
| **Supabase Free tier pauses** (7 days idle) | Dev database unreachable until resumed | One click in the dashboard. **This is exactly why Pro is required at launch** — a live store cannot pause |
| Resend 100/day cap hit | New logins can't receive a code that day | Guest checkout is unaffected — customers can still buy. Fix: enable WhatsApp OTP (cheaper than paid email) or upgrade Resend |
| **Upstash Redis unreachable** | OTP metadata, rate limits, pincode cache, **and the checkout lock** lose their store | **Deliberately fail-closed for checkout.** Better to show "try again in a moment" than risk double-charging or double-selling without the lock. `/api/health` surfaces it |
| Supabase 1GB storage full (dev) | New image uploads fail | Fails loudly at the publish step, not silently. Pro raises it to 100GB |

**Governing principle:** a missing *paid* integration degrades the **richness** of the experience (no live tracking, no push, mock payments) but never its **safety** (stock, money, idempotency). Redis is the one deliberate fail-closed exception, because it backs the checkout lock.

---

## 16. Out of scope for v1

Native mobile app · AR try-on · live Instagram Shop sync (Reels are manual links) · multi-vendor marketplace · ML recommendations · multi-currency or multi-region (India/INR only, GST-inclusive) · **live WhatsApp sending** until you choose to enable it (everything up to the `would_send` log and full dashboard *is* in scope) · **SMS OTP and DLT registration** (removed entirely; WhatsApp OTP is the upgrade path) · deep inventory tooling — POs, suppliers, warehouse bins (separate app on the same DB; §5.3 draws the boundary now) · PDF invoice **design** polish (GST-ready *fields* are in scope; a printable HTML invoice suffices) · popup audience targeting beyond schedule/active · any public or partner-facing API.

**Explicitly IN scope:** `/events`, `/influencer`, `/make-your-own` are real, navigable, CMS-backed routes with real nav entries. They must never 404.

---

## 17. Procurement guide — what to buy, what's free, what to fill in

### 17.1 Sign up now (all free, needed to build)

| # | Service | Plan | What you get | Env vars to fill |
|---|---|---|---|---|
| 1 | **Supabase** — supabase.com | **Free**. Create project, region **South Asia (Mumbai) `ap-south-1`** | Postgres + Storage + Auth | `DATABASE_URL` (Settings → Database → **Connection pooling**, port **6543**, add `?pgbouncer=true`), `DATABASE_URL_DIRECT` (direct, port 5432), `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (Settings → API) |
| 2 | **Upstash** — upstash.com | **Free** | Redis | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` (database → REST API) |
| 3 | **Resend** — resend.com | **Free** (3K/mo, 100/day) | OTP emails | `RESEND_API_KEY`, `OTP_FROM_EMAIL`. Verify a domain, or use their test sender while developing |
| 4 | **Sentry** — sentry.io | **Free** | Error tracking | `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN` |
| 5 | **GitHub** | Free | Code hosting | — |

> **⚠️ Region matters and cannot be changed later.** When creating the Supabase project, pick **South Asia (Mumbai)**. Changing region afterwards means creating a new project and migrating.

**Generated by you, not bought** — invent long random strings: `MEDUSA_INTERNAL_AUTH_SECRET`, Medusa's own `JWT_SECRET` / `COOKIE_SECRET`. Fill in by hand: all `BRAND_*` values (legal name, GSTIN, address, support phone/email, grievance officer).

**Not needed yet:** `RAZORPAY_*` (mock mode), `WA_*` (mock mode), `SHIPROCKET_*` (manual mode). Leave them blank — the app auto-selects mocks.

### 17.2 Buy at launch (when you're ready to take real money)

| # | Service | Cost | Why | Env vars |
|---|---|---|---|---|
| 6 | **Razorpay** — razorpay.com | **₹0/mo**, ~2% per card txn, **UPI ~0%** | Take payments. Needs business KYC — **PAN, GSTIN, bank account, address proof. Start this ~1 week early; approval takes days** | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` (Settings → API Keys), `RAZORPAY_WEBHOOK_SECRET` (Settings → Webhooks; point it at `https://yourdomain/api/webhooks/razorpay`), `NEXT_PUBLIC_RAZORPAY_KEY_ID` |
| 7 | **Supabase Pro** | **$25/mo** | Free tier pauses after 7 days idle; live store can't | Same vars — just upgrade the existing project |
| 8 | **Vercel Pro** | **$20/mo** | Hobby forbids commercial use | Paste all storefront env vars into Vercel → Settings → Environment Variables |
| 9 | **Fly.io** | **~$6–12/mo** | Hosts Medusa in Mumbai | `flyctl secrets set` for all Medusa env vars; set `MEDUSA_BACKEND_URL` in Vercel to the Fly URL |
| 10 | **Domain** | ~₹800–1,200/yr | sorbe.in or similar | Point DNS at Vercel |

**Launch total: ≈ $51–62/mo (₹4,300–5,200) + domain.**

### 17.3 Optional, whenever you want

| # | Service | Cost | Unlocks | Env vars |
|---|---|---|---|---|
| 11 | **WhatsApp — Meta Cloud API direct** (developers.facebook.com) | **₹0/mo** + ~₹0.11–0.15/conversation | Order/shipping notifications, COD confirm, restock alerts, **and WhatsApp OTP login (moves login back to phone)**. Needs Meta Business verification + template approval | `WA_PROVIDER=meta_cloud_api`, `WA_ACCESS_TOKEN`, `WA_PHONE_NUMBER_ID`, `FEATURE_WHATSAPP_LIVE=true` |
| 12 | **Shiprocket** — shiprocket.in | Free plan + per-shipment | Auto AWB + live tracking | `SHIPPING_PROVIDER=shiprocket`, `SHIPROCKET_EMAIL`, `SHIPROCKET_PASSWORD` |

> **Prefer Meta Cloud API direct over a BSP** (Interakt, Gupshup, etc.) unless you want their inbox UI. BSPs charge **₹2,000–2,500/mo** on top of Meta's per-message cost, and this project already builds you an admin WhatsApp dashboard.

### 17.4 Explicitly NOT buying

| Not buying | Would have cost | Instead |
|---|---|---|
| **DLT registration** | ₹5,000–6,000 one-time | Email OTP now (free), WhatsApp OTP later (no DLT) |
| **SMS provider** | ~₹0.20/SMS + DLT | Same as above |
| **Cloudinary** | **$89/mo** past free tier | Supabase Storage + transform CDN, $0 marginal |
| **WhatsApp BSP plan** | ₹2,000–2,500/mo | Meta Cloud API direct |
| **Shopify** | $29+/mo + txn fees | Medusa, free forever |
| **Medusa Cloud** | SaaS pricing | Self-host on Fly, ~$6–12/mo |

---

## Verification

**Per milestone:** `pnpm turbo run typecheck lint test` clean; `pnpm --filter medusa test:integration` for workflow tests.

**End-to-end on a real phone (the actual bar from the spec):**
1. `docker compose up` + both apps locally with all mocks on. Open the storefront on a real Android phone over your LAN.
2. Walk test-plan scenarios 1, 2, 4, 5 by hand on that phone. **No milestone is done until its slice passes there.**
3. `pnpm --filter storefront exec playwright test`.
4. Lighthouse mobile (throttled) on Home, Shop, PDP; assert §12 budgets before M7 closes.
5. **Secret-leak check:** build the storefront and grep the client bundle for `RAZORPAY_KEY_SECRET`, `MEDUSA_ADMIN_API_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`, `UPSTASH_REDIS_REST_TOKEN`, `RESEND_API_KEY` — must be **zero** hits.
6. Grep the repo for hardcoded `SORBE` outside `packages/config` — must be zero hits.

---

## 18. Owner decisions (answered — these are the v1 defaults)

Answered by the product owners. Each is implemented as an **editable default**, not a hardcoded value, so changing your mind later is an admin edit or an env change — never a migration.

1. **Stock location — settled.** Dhruvi and Vanshika hold and pack all stock **from home**. No physical stores, no warehouses.
   → Seed **exactly one** Medusa `stock_location` named `Home / HQ`. Both owners get the `owner` role; the `packer` role exists in the schema but stays unused until you hire. Multi-location remains a Medusa config change later, not a schema change.

2. **GST / HSN — placeholder, flagged.** Not yet decided.
   → Default `gst_rate_percent = 18.00` and `hsn_code = '7117'` (imitation jewellery — the usual classification for bag charms). Both are **per-product editable fields in the admin**, so nothing is hardcoded.
   → **⚠️ Confirm both with your CA before M4 (taking real money).** Wrong GST on real invoices is a compliance problem, not a code problem — but because prices are stored GST-inclusive and the split is computed backward, correcting the rate later is a field edit, not a re-pricing exercise.

3. **Invoice series — chosen for you.** Format `SORBE/25-26/00001` — brand, Indian financial year, zero-padded 5-digit counter, resetting each FY on 1 April. This is the standard Indian convention and is what a CA will expect. Stored in `store_invoice.series`, so changing the format later affects only new invoices.

4. **Returns policy — sensible India default, editable copy.** Written into `store_cms_content['legal_returns']` and mirrored in the admin refund rules:
   - **7-day** return window from delivery.
   - **Handmade and custom pieces are non-returnable** (protects you on made-to-order work).
   - Ready-made items returnable **unused, with original packaging**.
   - **Customer pays return shipping**, except when the item arrived **damaged, defective, or wrong** — then you pay.
   - COD orders refund to a **bank transfer / UPI**, not a card reversal.
   → All of this is CMS text you can rewrite in the admin without a deploy. Revisit before launch.

5. **Login channel — confirmed sequence.** Email OTP now for building and testing (free), then move to **phone via WhatsApp** once WhatsApp is enabled. This is exactly the `OTP_CHANNEL` progression in §1.7 — `mock` → `email` → `whatsapp`. One env var, no code change.

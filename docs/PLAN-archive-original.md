# ARCHIVE — Original Plan (superseded)

> **⚠️ This plan is SUPERSEDED. The authoritative plan is [`PLAN.md`](./PLAN.md).**
>
> Kept for reference: it records the first architecture proposed for SORBE, before the
> cost-efficiency constraint was applied. Read it to understand *why* the current plan
> makes the choices it does — every difference below was a deliberate change, not an oversight.
>
> **Sections 2–16 of this original plan (architecture, repo layout, data model, auth flow,
> checkout/webhook, sitemaps, SEO, performance, phases, tests, risks, scope) survived the
> revision essentially unchanged and live in `PLAN.md`.** Only the decisions and cost model
> below were replaced — those are reproduced here in full.

---

## What changed, and why

| Area | Original plan (this doc) | Current plan (`PLAN.md`) | Reason for change |
|---|---|---|---|
| **OTP delivery** | SMS via MSG91, requiring **DLT registration (₹5,000–6,000, 3–10 days)** | **Email OTP** (free) now → **WhatsApp OTP** (no DLT) later | Owner declined DLT. SMS to Indian numbers is impossible without it — carrier-enforced, not vendor-specific |
| **Identity owner** | Medusa owns identity via a **custom `phone-otp` auth provider** (~3–4 dev-days of bespoke OTP code) | **Supabase Auth** as a credential verifier; Medusa still owns the `customer` record | Free to 50K MAU and removes ~300 lines of OTP/rate-limit/lockout code to maintain. The dual-identity risk is avoided by never reading profile data from Supabase |
| **Login identifier** | Phone (spec hard constraint 3) | Email in v1, **phone once WhatsApp is on** | Forced by the no-DLT decision. Phone remains mandatory and remains the *operational* ID (order lookup, tracking, COD, WhatsApp) |
| **Cost framing** | Single ~$60–65/mo running cost from day one | **Two phases: build at ₹0, pay only at launch** | Owner is building v1 now and will test entirely on free tiers |
| **Hosting during dev** | Fly.io Mumbai from the start (~$12/mo) | **Local Docker (free)**; Fly.io only at launch (~$6–12/mo) | Nothing needs to be hosted until real customers exist |
| **Supabase tier** | Pro ($25/mo) assumed from the start | **Free tier during development**, Pro at launch | Free tier pauses after 7 days idle — irrelevant in dev, unacceptable live |
| **Medusa machines** | 2 machines (server + worker), ~$12/mo | **1 machine to start (~$6/mo)**, split only if jobs compete with requests | Cheaper; splitting is a config change |
| **Procurement guide** | Not included | **§17 added** — numbered signup list, which env var each key fills, where to find it in each dashboard | Owner asked what to buy, what's free, and what to fill in |
| **Owner decisions** | 5 open assumptions | **§18 — all answered** as editable defaults | Owners answered during review |

**Unchanged across both plans:** Medusa v2 (free, self-hosted, not Shopify) · Razorpay · Supabase Postgres in `ap-south-1` · Supabase Storage over Cloudinary · Upstash Redis · integer-paise money · the `store_*` / `inv_*` table-ownership boundary · guest-cart-merge-without-changing-cart-id · the single idempotent `complete-cart-if-not-already` chokepoint · reserve-stock-before-calling-Razorpay · mock-by-default integrations.

---

## Original §1 — Decisions (as first written)

### 1.1 Commerce engine: Medusa v2

Headless commerce API, bundled Admin UI extended via the Admin Extension SDK rather than replaced.

Chosen over Vendure because: it ships modules for exactly the needed primitives (Product, Pricing, Promotion, Cart, Order, Customer, Inventory, Fulfillment, Payment, Region, Tax, Auth); `AbstractPaymentProvider` and `AbstractFulfillmentProviderService` map directly onto "Razorpay may not exist yet, Shiprocket may not exist yet"; the Admin SDK lets custom screens live inside the same admin that manages Products and Orders — one dashboard, not two; its Price module stores amounts as integer minor units (paise); and REST + generated OpenAPI is less bespoke plumbing for a 2-person team than Vendure's GraphQL-only surface.

Not Shopify per hard constraint 1.

*(Retained unchanged in the current plan, with the addition that Medusa is free forever — MIT, self-hosted, no license or per-order fee.)*

### 1.2 Identity: Medusa owns the customer — Supabase is Postgres + Storage only

**Original decision (later reversed):** Medusa as the single source of truth for `customer`. Phone OTP delivered by a swappable provider (MSG91 primary, Twilio Verify fallback) called from a **custom Medusa Auth Module provider** (`phone-otp`). Supabase Auth **not** used.

Reasoning at the time: phone is the real customer ID (hard constraint 3), and `cart`, `order`, `wishlist`, `customer_address` all hang off `customer_id`. Running Supabase Auth alongside Medusa's Customer entity creates two identity systems kept in sync by webhooks — with two non-technical operators, drift becomes a support problem (a customer who can log in but has no orders attached).

**Stated cost of that choice:**

| Cost | Amount |
|---|---|
| Extra engineering, one-time | **~3–4 dev-days** vs ~0.5 day with Supabase Auth: custom Medusa auth provider (~1.5d), OTP routes with Redis rate-limiting + lockout (~1d), session bridging (~0.5d), tests (~0.5d) |
| Code owned forever | OTP generation, hashing, TTL, attempt-lockout, rate limits — ~250–350 lines |
| SMS delivery | MSG91 transactional ≈ ₹0.18–0.25/SMS ⇒ ~₹100–125/mo at 500 logins. Twilio Verify ≈ ₹4 each, ~20× worse for India |
| **India DLT registration** | **₹5,000–6,000, one-time, 3–10 business days.** TRAI requires entity + sender-ID + template registration before any transactional SMS. On the critical path for go-live |

**Why it was reversed:** the owner declined DLT registration. Since DLT is enforced by Indian carriers rather than by any one vendor, no SMS provider can deliver to an Indian number without it — so the entire SMS-OTP branch became unavailable, taking the custom `phone-otp` provider's main justification with it. The current plan uses Supabase Auth as a free credential verifier over email, then WhatsApp.

### 1.3 Postgres: Supabase, `ap-south-1` (Mumbai)

Accessed only via the Supavisor pooler URL (`?pgbouncer=true`), never direct `5432`; the direct URL is used solely by the Medusa migration CLI. Neon considered (nicer branching) and rejected as primary: no built-in Storage/CDN, forcing a third vendor for images from day one.

**Original cost line:** Supabase Pro **$25/mo** assumed from the start, because the free tier pauses after ~1 week idle and caps connections.
*(Current plan: free tier during development, Pro only at launch.)*

### 1.4 Medusa hosting: Fly.io, Mumbai (`bom`)

Not specified in `spec.md`. Next.js is fixed on Vercel, but Medusa is a long-running Node server Vercel cannot host. Medusa is chatty with Postgres — a single storefront request issues many queries — so co-locating with Supabase in Mumbai outweighs deployment-DX polish.

| Host | Nearest region | RTT to Supabase `ap-south-1` | Cost | Verdict |
|---|---|---|---|---|
| **Fly.io** | **Mumbai (`bom`)** | **~1–3ms** | ~$12/mo (2× shared-cpu-1x 1GB) | **Chosen** — only low-cost host with true Mumbai co-location |
| Railway | Singapore | ~50–60ms | ~$10–25/mo | Best DX, but every query pays 50ms. Rejected on latency |
| Render | Singapore | ~50–60ms | ~$14/mo | Same latency problem |
| DigitalOcean App Platform | Bangalore | ~25–30ms | ~$10/mo | Solid runner-up |
| AWS ECS/Fargate | Mumbai | ~1–3ms | ~$35–50/mo + real ops | Correct but overkill for two owners |

Medusa v2 runs two processes — `server` (HTTP) and `worker` (background jobs, subscribers, cron) — hence 2 machines.

**Trade-off accepted:** `fly.toml` + `flyctl deploy` instead of Railway's git-push simplicity (~half a day of setup). DigitalOcean Bangalore was the documented fallback.

*(Current plan keeps Fly.io Mumbai but starts with **one** machine at ~$6/mo, and hosts nothing at all during development.)*

### 1.5 Media: Supabase Storage + image-transform CDN

Reels in v1 are Instagram links embedded via oEmbed, **not** self-hosted video — which removes the strongest argument for Cloudinary. What's actually needed is product-photo resizing for `srcset` + WebP/AVIF, and Supabase's transform endpoint does exactly that.

| Option | Marginal monthly cost | Notes |
|---|---|---|
| **Supabase Storage** | **$0** | 100GB storage + 250GB egress already in the Pro plan bought for the DB |
| Cloudinary | $0 → **$89/mo** | Free tier ~25 credits (≈25GB); next tier is a hard $89/mo jump |

Saves ~$89/mo at the point a growing store outgrows Cloudinary's free tier, for capability v1 does not need. Upgrade path documented: media URLs are plain `text` columns, never assumed same-origin, so switching backends is a data migration, not a schema change.

*(Unchanged in the current plan, except that the free Supabase tier — 1GB, roughly 300–800 optimized photos — is used during development.)*

### 1.6 Shipping provider interface

```ts
export interface ShippingProvider {
  getQuote(input: { pincode: string; weightGrams: number; cartValuePaise: number }):
    Promise<{ feePaise: number; etaDaysMin: number; etaDaysMax: number; zoneName: string } | null>;
  createShipment(input: { orderId: string; pincode: string; weightGrams: number; codAmountPaise: number | null }):
    Promise<{ awb: string | null; courierName: string | null; trackingUrl: string | null }>;
  trackShipment(awb: string): Promise<{ status: string; history: { status: string; at: string }[] }>;
  cancelShipment(awb: string): Promise<{ cancelled: boolean }>;
}
```

`SHIPPING_PROVIDER=manual` (v1 default) quotes from `store_shipping_zone`/`store_shipping_rate` and exposes a free-text AWB field in Admin; `SHIPPING_PROVIDER=shiprocket` implements the same interface against the real API with zero storefront or checkout changes.

*(Unchanged.)*

---

## Original §1.7 — Running-cost summary (as first written)

**v1 at launch, before any paid integration:**

| Line item | Monthly |
|---|---|
| Vercel Pro | $20 — Hobby forbids commercial use |
| Supabase Pro (DB + Storage + CDN) | $25 |
| Fly.io Medusa, 2 machines, Mumbai | ~$12 |
| Upstash Redis | $0–5 |
| Sentry | $0 (free tier) |
| MSG91 OTP SMS | ~₹100–125 (~$1.50) at ~500 logins/mo |
| **Total** | **≈ $60–65/mo (≈ ₹5,000–5,500/mo)** |

**One-time:** DLT registration ₹5,000–6,000.

**Added later, when purchased:** Razorpay (₹0/mo + ~2% cards, UPI ~0% MDR) · WhatsApp BSP (Interakt ≈ ₹2,499/mo **+** Meta per-conversation ≈ ₹0.11–0.15) · Shiprocket (free plan + per-shipment).

**How the current plan improved on this:**
- Development cost dropped from ~$60/mo to **₹0** (local Docker + free tiers, mocks for every paid integration).
- Launch cost dropped to **≈$51–62/mo** — one Medusa machine instead of two, no SMS line item.
- **₹5,000–6,000 DLT registration eliminated entirely.**
- WhatsApp routed **direct to Meta Cloud API** instead of through a BSP, removing a **₹2,000–2,500/mo** platform fee.

---

## Original open assumptions

These were listed as unresolved and have since been **answered by the owners — see §18 of `PLAN.md`** for the decisions actually adopted.

1. Single stock location in v1. *(Answered: yes — Dhruvi and Vanshika pack from home, no stores.)*
2. GST rate per product, prices GST-inclusive with the split computed backward. *(Answered: placeholder 18% / HSN 7117, editable, confirm with a CA before taking real money.)*
3. Invoice number series format. *(Answered: `SORBE/25-26/00001`, Indian FY convention.)*
4. Return window and who pays return shipping for handmade vs ready-made. *(Answered: 7 days, handmade non-returnable, customer pays unless damaged/wrong.)*
5. *(Added during revision)* Login channel at launch. *(Answered: email OTP for testing, then WhatsApp/phone.)*

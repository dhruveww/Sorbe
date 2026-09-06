# SORBE — Handoff

State of the build as of the end of the M0–M7 session. Read this before
picking the project up.

- **Plan:** [`docs/PLAN.md`](docs/PLAN.md) — the approved architecture and build order.
- **Repo:** https://github.com/dhruveww/Sorbe (`main`)
- **Cost so far:** ₹0. Nothing has been purchased and no API key exists.

---

## Run it locally

**Prerequisites:** Node ≥ 20.19 (Node 24 works; Medusa officially supports 20/22),
Docker Desktop running, pnpm via `corepack enable`.

```bash
cd ~/Desktop/BagCharm
pnpm install

pnpm db:up                                   # Postgres + Redis in Docker

cp .env.example apps/medusa/.env             # first time only
cp .env.example apps/storefront/.env.local   # first time only

pnpm --filter @sorbe/medusa db:migrate       # schema
pnpm --filter @sorbe/medusa seed             # India region, INR, Home/HQ location
pnpm --filter @sorbe/medusa seed:shipping    # 3 delivery zones
pnpm --filter @sorbe/medusa seed:catalog     # 6 charms, 25 variants
pnpm --filter @sorbe/medusa seed:content     # WhatsApp templates, CMS, FAQs

# admin login (first time only)
pnpm --filter @sorbe/medusa user -- --email you@example.com --password changeme

pnpm dev                                     # both apps
```

The seed prints a `MEDUSA_PUBLISHABLE_KEY` — paste it into
`apps/storefront/.env.local`. Generate the three secrets it asks for with
`openssl rand -base64 32`, and make sure `MEDUSA_INTERNAL_AUTH_SECRET` is
**identical in both env files** or login and webhooks will 401.

| What | Where |
|---|---|
| Shop | http://localhost:3000 |
| Admin | http://localhost:9000/app |
| Health + integration modes | http://localhost:3000/api/health |

**Run only one Medusa process.** Several dev servers at once will exhaust
memory and get killed — that happened during this build.

---

## Test it by hand

**Buy something as a guest (no login):**
Shop → a charm → Add to bag → Cart → check a pincode (try `400001` Mumbai,
`781001` Guwahati, `560001` Bengaluru) → Checkout → fill the address →
**Simulate successful payment**. You land on a confirmation with an order number.

**Then track it:** `/track-order` with that order number and the phone you
typed. A wrong phone must be rejected.

**Log in:** `/login` — the code in test mode is shown on screen (`000000`).
Add something to the bag first and confirm the bag survives login.

**Failed payment:** at the payment step choose **Simulate failed payment** —
the cart must be untouched and retryable.

**Admin:** http://localhost:9000/app → Overview, WhatsApp, Content in the
sidebar. The WhatsApp send log fills up as you place orders, all as
`would_send`.

**On your phone** (same Wi-Fi): `ipconfig getifaddr en0`, then open
`http://<that-ip>:3000`. Add that origin to `STORE_CORS` in
`apps/medusa/.env` first or the Store API blocks it.

### Automated

```bash
pnpm test        # 36 unit tests — money/paise, GST splits, phone/pincode, flags
pnpm typecheck   # all packages
pnpm build       # production build
```

---

## What is done

| Milestone | State |
|---|---|
| **M0** Skeleton | Monorepo, 3 shared packages, local Postgres + Redis, 36 tests |
| **M1** Catalog | 6 products / 25 variants / 4 categories, Home, Shop, collections, PDP, sitemap, robots, Product+Organization+Breadcrumb+FAQ JSON-LD |
| **M2** Cart | Guest cart with optimistic quantity edits, pincode → fee + ETA across 3 zones, free shipping over ₹999 |
| **M3** Pay (mock) | OTP login, cross-device cart merge, 2-step checkout, mock payment, orders, guest tracking, order history |
| **M4** Pay (live-ready) | Razorpay order creation + signature verification + idempotent webhook, Redis checkout lock, GST invoices, order state log |
| **M5** Admin | Overview screen, order state timeline + transitions, owner/packer gating enforced server-side |
| **M6** WhatsApp | Templates, send log, frequency caps, consent model, admin console with live preview — all in mock mode |
| **M7** Content | Popups, Reels (rights-gated), manual recommendations, CMS page copy, FAQs, admin content screen |

**Invariants worth not breaking:**

- Money is an **integer number of paise**, everywhere. Use the helpers in
  `@sorbe/types`.
- The browser never talks to Medusa. `lib/medusa-client.ts` imports
  `server-only` so importing it from a client component fails the build.
- **Absence of a key is the flag.** No Razorpay key means payments are mocked
  regardless of `PAYMENTS_MOCK_MODE`. 15 tests cover these fallbacks.
- `completeCartOnce` is the single path that turns a cart into an order.
  Both the browser callback and the webhook go through it.
- Reels render only when published **AND** rights-granted.
- `automatic_taxes` is **off** on the India region on purpose — prices are
  GST-inclusive and the invoice derives the split backwards. Turning it on
  breaks add-to-cart.

---

## What is NOT done

Ordered by what would hurt most in production.

### Blocking a real launch

1. **Stale stock reservations are never released.** A customer who reaches the
   payment step and abandons holds that stock **forever**. With 6 units of a
   variant this empties the shop fast — it already happened during testing.
   Needs a scheduled job in `apps/medusa/src/jobs/` releasing reservations for
   carts older than ~30 minutes that never completed. *(docs/PLAN.md §7)*

2. **Live WhatsApp sending is stubbed.** `MessagingModuleService.sendWhatsApp`
   logs `would_send` with `live_send_not_implemented` **even when
   `FEATURE_WHATSAPP_LIVE=true` and keys are set.** Everything around it —
   templates, caps, consent, logging, dashboard — is real; only the Meta Cloud
   API call is missing. Do not assume flipping the flag starts sending.

3. **No address book.** Addresses are re-typed at every checkout. The plan
   wants save / reuse / name-your-address. *(§8, §18)*

4. **GST rate and HSN are unconfirmed.** Defaults are 18% and HSN 7117
   (imitation jewellery), editable per product. **Confirm with a CA before
   taking real money.** Invoice numbering and the CGST/SGST vs IGST split are
   implemented and tested.

5. **Legal pages are hardcoded and unreviewed.** `/terms`, `/privacy`,
   `/returns`, `/shipping`, `/contact` have real, plausible copy but have not
   been through a lawyer, and unlike the FAQ they are not CMS-editable yet.

### Storefront gaps

- **Wishlist** — not built at all. `/wishlist` and `/account/wishlist` 404.
  The footer does not link them, so nothing is visibly broken.
- **Restock alerts / "Notify me"** — `store_restock_alert` table exists;
  no API, no button, no trigger when stock returns.
- **`/account/addresses`** — not built. `/account/orders` works.
- **Coupon entry at checkout** — Medusa Promotions work; there is no UI.
- **Shop filters** (finish / clasp / use-mode / handmade) — the plan calls for
  them; the Shop page currently lists everything.
- **WhatsApp opt-in checkbox at checkout** — `setWhatsAppOptIn` and the consent
  log are ready; nothing collects the consent. Marketing messages are therefore
  correctly refused for every customer today.
- **Search.**

### Admin gaps

- **Single-form product publish** — the plan's "no triple entry" flow is not
  built. Products are created on Medusa's native screens, and
  `store_product_extra` / SEO / Reels / recommendations have **no per-product
  widgets**, so they can only be edited via the Content screen or SQL.
- **AWB / tracking entry** — the state API accepts `tracking_url`; there is no
  field in the UI.
- **"Mark COD confirmed" button** — COD orders sit in `cod_pending` with no way
  to advance them from the UI.
- **Refund flow** — no UI, and no Razorpay refund call.
- **Role assignment** — `metadata.role = "packer"` must be set by hand; the
  gating itself works and is enforced server-side.

### Backend / ops gaps

- **Sentry** — env vars exist, nothing is initialised.
- **Playwright E2E** — the plan's test scenarios were verified by hand and
  curl, not automated. `pnpm test` covers unit tests only.
- **Invoice PDF** — fields are stored; there is no rendered document.
- **`payment_failed_retry` WhatsApp trigger** — template exists, nothing fires it.
- **Deployment** — nothing is deployed. Vercel + Fly.io + Supabase are chosen
  in the plan (§1.3, §1.4) but not provisioned.

---

## Known issues in the current database

- **Early test orders carry the wrong ₹69 shipping.** They pre-date the
  free-shipping fix. Harmless test data; `pnpm db:reset` clears everything.
- **~9 test orders and one popup** ("Free delivery over ₹999" — accurate, kept
  deliberately) are seeded from testing.
- **`PEARL-DROP-CHARM-GOLD-BAG-CHARM` shows 6 stocked / 6 reserved**, i.e. sold
  out. That is issue #1 above, not a bug in the stock logic — the reservations
  are correct, nothing releases them.

---

## Buying things

**Only Razorpay is needed, and only to take real money.** Test Mode is free and
behaves like production.

1. razorpay.com → **Settings → API Keys → Generate Test Key**
2. **Settings → Webhooks → Add New Webhook** → URL
   `http://localhost:3000/api/webhooks/razorpay`, events `payment.captured`
   and `payment.failed`, plus a secret you invent
3. Into `apps/storefront/.env.local`:
   ```
   RAZORPAY_KEY_ID=rzp_test_xxxxx
   RAZORPAY_KEY_SECRET=xxxxx
   RAZORPAY_WEBHOOK_SECRET=your-invented-secret
   NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxxx
   PAYMENTS_MOCK_MODE=false
   ```
   Restart. The real widget replaces the simulate buttons — no code change.

Live keys need business KYC (PAN, GSTIN, bank account) and take a few days.

**At launch** (docs/PLAN.md §17): Vercel Pro $20/mo, Supabase Pro $25/mo,
Fly.io ~$6–12/mo ≈ **$51–62/mo**. Optional: WhatsApp via Meta Cloud API
direct (₹0/mo + ~₹0.12/message — avoid BSPs at ₹2,000–2,500/mo), Shiprocket.

**Deliberately not buying:** DLT registration, SMS, Cloudinary, Shopify.

---

## Suggested order for the next session

1. Stale reservation release job — the shop empties itself without it.
2. Live WhatsApp send, or a clear note in admin that it is not wired.
3. Address book, then WhatsApp opt-in at checkout.
4. Per-product admin widgets (SEO, handmade, Reels, recommendations).
5. Playwright for the five scenarios in docs/PLAN.md §14.

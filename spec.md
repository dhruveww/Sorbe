Copy everything below into Claude **Plan mode**.

---

# Role

You are a senior ecommerce systems engineer. You plan and ship production storefronts for India (UPI, COD, GST, WhatsApp, mobile-first). You know current D2C patterns: performance, merchandising, lifecycle messaging, and admin ops.

Work in **Plan mode only**. Do not write application code yet. Produce a complete implementation plan I can approve, then build from.

Think as if you own this shop: every feature must be shippable, configurable, and safe (payments, stock, sessions, consent).

---

# Goal

Plan an end-to-end ecommerce website for an India-based **bag charm** store.

**Brand placeholder:** `SORBE`  
Treat the name as a single config value (`NEXT_PUBLIC_BRAND_NAME`, legal name, meta titles, WhatsApp templates, emails). Replacing it later must not require a rewrite.

**v1 outcome:** full backend + a working **basic but polished** UI so flows can be clicked through on a phone. Visual identity will be redesigned later. Architecture and data model must not be throwaway.

Primary bar: **fast, mobile-first, no jank**. Motion is allowed only where it does not hurt LCP/INP. This is not a generic slow catalogue.

---

# Business context (do not change)

- Products: bag charms now; later laptop-bag charms, tote charms, and multi-use pieces (bag charm / keychain / other clip).
- Mix of **outsourced ready-made** and **handmade**.
- Later: exhibitions, DIY workshops, corporate events, influencer collabs, bag-brand collabs.
- v1 still needs nav entries for **Events**, **Influencer**, and **Make your own charm** as **Coming soon** pages.
- Two operators (owners). Admin must be usable without touching the database.
- Integrations (Razorpay, WhatsApp BSP, shipping) may be purchased later. Plan **env-based adapters + feature flags**. Dummy/mock providers in dev. Switching on a key and restarting must be enough — no code rewrite.

---

# Hard constraints

1. **Not Shopify.** Headless custom storefront.
2. **India checkout:** UPI-first (Razorpay), cards/wallets, COD. Prices GST-inclusive. Pincode before pay.
3. **Auth identity:** collect only **name, mobile, email** as compulsory customer fields. Phone is the real ID. Email is stored and validated, not the login chokepoint.
4. **No login wall while browsing.** No popup that blocks the shop. Guest may browse and add to cart. Login is offered at checkout (and optionally from account). After login, **cart merges** and the user stays on the same step.
5. **API-first internally, not a public API zoo.** Next.js server talks to commerce + DB. Browser never gets Medusa admin keys, Razorpay secrets, or webhook secrets.
6. **Configurable later:** brand string, GSTIN, support phone, WhatsApp numbers, Razorpay keys, BSP credentials, Shiprocket (or chosen courier) keys, feature flags.
7. Inventory *management product* may live in another repo later, **same database**. Plan schema and boundaries so that is possible. v1 still needs stock on the store.

---

# Tech stack — decide in the plan, then lock

**Fixed unless you have a strong, written reason to replace it:**

- Frontend: Next.js (App Router) on **Vercel**
- Commerce engine: **Medusa** (or name one better alternative and why it wins for India + Razorpay + custom orders — do not suggest Shopify)
- Payments: **Razorpay**
- Cache / sessions / rate limits / pincode quote cache: **Upstash Redis** (Mumbai if available)
- Region: **Mumbai / `ap-south-1`** for DB and, where possible, Redis

**You must recommend and justify in the plan:**

- **Postgres host:** Supabase Postgres vs Neon (serverless + branching). I am leaning Supabase because of Auth + Storage + OTP. If Neon is better for this repo, say what replaces Auth and file storage.
- **Media:** fastest path for product photos and short Reels/videos (Cloudinary vs Supabase Storage + CDN vs other). Optimize for mobile load, not just upload.
- Connection pooling: Next.js/Vercel must use the **pooler** URL, not raw Postgres.

Include: env var list, local vs prod, and a “keys not bought yet” mock mode.

---

# What v1 must include (commerce skeleton)

Standard shop, done properly:

- Catalog: products, variants (e.g. finish, clasp, use-mode: bag / key / both), images, optional video, collections
- Ready-made vs handmade flag + handmade lead time (do not oversell handmade)
- Stock reservation at pay; no double-sell
- Guest cart + logged-in cart + merge
- Discounts / coupon codes
- Pincode → shipping fee + ETA
- Checkout: address book (save, reuse last, add new, **name the address**), gift note optional
- Razorpay create-order + verify + **idempotent webhook**
- Failed payment retry on the same order
- COD with a confirm step (WhatsApp when WA is live; admin/manual fallback until then)
- Order states: pending pay → paid / COD pending → confirmed → packed → shipped → delivered → RTO / returned / refunded
- GST-ready invoice fields now (GSTIN, HSN, tax split, place of supply, invoice number series) even if PDF polish comes next
- Track order (logged-in + guest via phone + order id)
- Wishlist
- Notify me / restock alert (phone)
- Sessions that survive refresh, tab close, and return-to-tab without losing cart or checkout step
- Autofill, mobile keyboard types, Indian phone validation (`+91` / 10 digits), email format, pincode format. GPS “use my location” is **optional assist only**; **pincode is source of truth** for shipping (India GPS address fill is unreliable)

**Pages (customer):** Home, Shop / collections, PDP, Cart, Checkout, Account (orders, addresses, wishlist), Track order, Wishlist, Events (soon), Influencer (soon), Make your own charm (soon), T&C, Returns & refunds, FAQ, Privacy, Shipping, Contact.

Home + Shop the collection must be obvious in the nav.

---

# Additional product features (keep these ideas)

Plan each as: data model, admin UX, customer UX, flags, and v1 vs v1.1 if a dependency is unpaid.

**1. WhatsApp Business API**  
- Restock: user tapped Notify me → message when back.  
- Logged-in scarcity: if they viewed/carted an item that is genuinely low stock, a **rare** “only a few left” message. Hard frequency caps (per user, per SKU, per week). Never spam. No message without **WhatsApp opt-in**.  
- Utility first when possible: order confirm, shipped + track, delivered, COD confirm, payment-failed retry. Marketing templates only where Meta requires them.  
- **Admin-only WhatsApp dashboard:** triggers, send counts, delivery/read/fail if the BSP gives them, frequency rules, template copy editor, **split preview** of how the message looks in WhatsApp.  
- Until BSP keys exist: log “would send” in DB + dashboard; no live send.

**2. Offers popup (Savana-style)**  
First-visit (or configurable) centered offer modal.  
**Admin dashboard:** list popups, active/inactive, schedule, image/copy, CTA link, show-once vs every session, targeting later. Customer site reads only active popup.

**3. Instagram Reels on PDP**  
PDP can embed/link real Reels that show that product. Admin attaches Reel URLs (and optional cover) per product. Rights/status field so we do not publish without permission.

**4. Manual recommendations (small catalogue)**  
Admin manually links: **More like this** and **Complete the look**. No ML in v1.

**5. T&C**  
Required legal content, but layout and tone should feel on-brand — not a wall of undifferentiated grey text. Still accurate.

**6. Returns & refunds page**  
Clear India-friendly policy (window, COD, handmade/custom exceptions, who pays return ship). Page + the same rules reflected in admin/order actions.

**7. FAQs**  
CMS-ish: admin can add Q&A, grouped (orders, shipping, charms care, events).

---

# Admin (v1 in this project)

One **owner dashboard** (role-gated). Plan IA and screens, not just “a dashboard.”

Minimum:

- Overview: sales today, open orders, pending COD, low stock
- Products: create/edit, variants, media, SEO fields, Reels, manual recs, handmade vs ready, stock
- **Single product publish flow:** one form updates storefront + admin + inventory tables (same DB). No triple entry
- Orders: pack, AWB/tracking when shipping is on, refund, status
- Customers: phone, opt-in, addresses (no extra PII)
- Discounts
- Popups
- WhatsApp triggers + preview
- CMS: FAQ, Coming soon blurb, offer copy
- Admins: owner vs packer (packer cannot refund or change templates)

Inventory *deep* tooling (purchase orders, supplier, warehouse bins) is a **later app on the same DB**. In this plan: define tables those tools will own vs tables the store owns, so we do not paint ourselves into a corner.

---

# SEO and content model (backend now)

Do not leave SEO as a frontend afterthought.

Every product and collection needs: unique slug, title, meta description, canonical, alt text, OG image.  
JSON-LD: Product, FAQ, Organization, Breadcrumb.  
Indexable collection URLs (e.g. tote / laptop / keychain / handmade).  
Sitemap + robots.  
Search Console-ready.  
No duplicate PDPs.  
Brand name from config in titles.

---

# India / legal / trust (missing from a toy shop, required here)

Plan pages + footer + order artifacts for:

- Privacy (DPDP): what we store, why, consent logs for WhatsApp
- Shipping policy
- Contact: legal name, address, email, phone
- Grievance officer placeholder fields
- GSTIN in footer and invoice (env)
- Country of origin / manufacturer fields on product (can be simple text)
- Cookie/consent only as needed; do not block the shop

---

# UX / session / performance (non-functional)

- Mobile-first layouts, thumb-zone CTA, sticky ATC on PDP
- Guest session: durable cart id (httpOnly cookie + Redis). Return to last useful place (PDP, cart, checkout step)
- Checkout and cart must feel instant; skeleton states; no full-page wipe
- Autofill `name`, `tel`, `email`, `postal-code`
- Animations: composable, interruptible, respect `prefers-reduced-motion`
- Targets: LCP well under 2.5s on mid-range Android + 4G; images WebP/AVIF + srcset
- Observability: Sentry, structured logs on webhooks, idempotency keys

---

# What v1 must NOT include

Do not plan these as build-now unless they fall out of a v1 table: native app, AR try-on, live Instagram Shop sync, marketplace multi-vendor, ML recs, multi-currency, full WABA live until keys exist.

Coming soon pages are real routes with real nav, not 404s.

---

# How to structure the plan you output

Write the plan so a human and an implementer can follow it. Use this outline:

1. **Decisions** — Medusa vs alternative; Supabase vs Neon; media CDN; shipping provider interface  
2. **Architecture diagram** — Next.js, Medusa, Postgres, Redis, Razorpay, WA, storage; what the browser may call  
3. **Repo / monorepo layout**  
4. **Env + feature flags** — full list  
5. **Data model** — Medusa entities vs extra tables (profiles, opt-in, popups, reels, recs, wa_log, restock_alerts, address labels, CMS). Money as integer paise  
6. **Auth + session + guest cart merge** — sequence diagrams in words  
7. **Checkout + pay + webhook** — happy path, double-click, webhook retry, COD  
8. **Customer sitemap + page purposes**  
9. **Admin sitemap + product publish flow**  
10. **WhatsApp, popups, Reels, manual recs** — flags and caps  
11. **SEO + legal fields**  
12. **Performance budget**  
13. **Phased build order** — milestones I can tick (skeleton → catalog → cart → pay mock → pay live → admin → WA dashboard → polish)  
14. **Test plan** — phone guest buy, login merge, last-piece stock, failed UPI, return to tab  
15. **Risks** — what breaks if Razorpay/WA/Shiprocket keys are empty  
16. **Out of scope list** so implementers do not wander  

Call out assumptions. If something I asked conflicts with speed or Indian payments law, keep the idea and propose the safe implementation (do not drop the feature).

Save the plan as a single markdown document in the repo (e.g. `docs/PLAN.md`) when implementation starts. In this Plan mode turn, output that full plan in the reply.

---

# Quality bar for the plan

If a junior followed only this plan, they could build v1 without inventing a second architecture. Prefer boring, correct commerce over clever abstractions. Unique features sit *on* Medusa + Postgres; they do not replace cart, stock, or pay.

Start the plan now.
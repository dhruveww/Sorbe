# SORBE

Headless ecommerce storefront for an India-based bag-charm store.
Next.js (App Router) + Medusa v2 + Postgres + Redis.

**Everything in this repo runs locally for free.** No account, no API key, and no
card is needed to build or test the whole shop — every paid integration ships
with a working mock. See [`docs/PLAN.md`](docs/PLAN.md) for the full plan and
[§17](docs/PLAN.md) for what to buy and when.

---

## Quickstart

**Prerequisites:** Node ≥ 20.19, Docker Desktop running, and pnpm
(`corepack enable && corepack prepare pnpm@9.15.4 --activate`).

```bash
pnpm install

# 1. Start local Postgres + Redis (free, offline)
pnpm db:up

# 2. Set up env files
cp .env.example apps/medusa/.env
cp .env.example apps/storefront/.env.local

# 3. Create the schema and seed India/INR/Home-HQ
pnpm --filter @sorbe/medusa db:setup

# 4. Create an admin login
pnpm --filter @sorbe/medusa user -- --email you@example.com --password changeme

# 5. Run both apps
pnpm dev
```

| What | Where |
|---|---|
| Storefront | http://localhost:3000 |
| Health / integration modes | http://localhost:3000/api/health |
| Admin dashboard | http://localhost:9000/app |

The seed prints a `MEDUSA_PUBLISHABLE_KEY` — paste it into
`apps/storefront/.env.local` so the storefront can read the catalog.

### Testing on your phone

Both apps bind to your machine, so on the same Wi-Fi:

```bash
ipconfig getifaddr en0     # e.g. 192.168.1.5
```

Open `http://192.168.1.5:3000`. Add that origin to `STORE_CORS` in
`apps/medusa/.env` first, or Store API calls will be blocked.

---

## Commands

| Command | Does |
|---|---|
| `pnpm dev` | Run storefront + Medusa together |
| `pnpm build` | Build everything |
| `pnpm test` | Run all tests |
| `pnpm typecheck` | Type-check every package |
| `pnpm db:up` / `db:down` | Start / stop Postgres + Redis |
| `pnpm db:reset` | **Wipes all local data** and restarts clean |
| `pnpm --filter @sorbe/medusa seed` | Re-seed (idempotent — safe to re-run) |

Target one workspace with `--filter`: `@sorbe/storefront`, `@sorbe/medusa`,
`@sorbe/config`, `@sorbe/types`, `@sorbe/validation`.

---

## Layout

```
apps/storefront   Next.js — the shop. All secrets live in its /api routes.
apps/medusa       Medusa v2 — catalog, cart, orders, stock, admin dashboard.
packages/config   Brand name + feature flags. The ONLY place "SORBE" appears.
packages/types    Order states, WhatsApp keys, money helpers (integer paise).
packages/validation  Indian phone / pincode / email schemas, shared by both apps.
infra             Local Docker Postgres + Redis.
docs/PLAN.md      The build plan. Start here.
```

---

## Rules that are easy to break

- **Money is an integer number of paise.** Never a float, never rupees. Use the
  helpers in `@sorbe/types` — `rupeesToPaise`, `formatPaise`, `splitGstInclusive`.
- **The browser never talks to Medusa.** It calls our own `/api/*` routes, which
  call Medusa server-side. `lib/medusa-client.ts` imports `server-only` so
  importing it from a client component fails the build on purpose.
- **Only `NEXT_PUBLIC_*` may reach the browser.** Everything else is server-only.
- **Absence of a key is the flag.** No Razorpay key means payments are mocked,
  whatever `PAYMENTS_MOCK_MODE` says. Adding the key and restarting is the whole
  cutover — never a code change.
- **Coming-soon pages are real routes.** `/events`, `/influencer`,
  `/make-your-own` must never 404.

## Gotchas

- **Don't run `next build` while `next dev` is running.** They share `.next/`,
  and the build overwrites the dev server's module manifest — the site starts
  500ing with `__webpack_modules__[moduleId] is not a function`. Fix: stop dev,
  `rm -rf apps/storefront/.next`, start dev again.
- **All `@mikro-orm/*` packages must be the exact same version** as each other
  (currently 6.6.14, matching Medusa's own tree). A mismatch fails migrations
  with a confusing "regenerate your lock file" message.
- **Supabase's free tier pauses after ~7 days idle.** Harmless locally; it is
  why Pro is required at launch.

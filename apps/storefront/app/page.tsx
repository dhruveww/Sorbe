import { getBrand, getFlags } from "@sorbe/config";
import { medusaHealth } from "@/lib/medusa-client";

export const dynamic = "force-dynamic";

/**
 * M0 placeholder. The real storefront home lands in M1 — this exists to prove
 * the wiring works end-to-end (brand config -> page, Next -> Medusa) and to give
 * the owners a readable status screen while the shop is being built.
 */
export default async function HomePage() {
  const brand = getBrand();
  const flags = getFlags();
  const medusaUp = await medusaHealth();

  const integrations = [
    { name: "Payments", value: flags.paymentsMockMode ? "Mock" : "Razorpay live", mocked: flags.paymentsMockMode },
    { name: "WhatsApp", value: flags.whatsappLive ? "Live" : "Mock (logs only)", mocked: !flags.whatsappLive },
    { name: "OTP login", value: flags.otpChannel, mocked: flags.otpChannel === "mock" },
    { name: "Shipping", value: flags.shippingProvider, mocked: flags.shippingProvider === "manual" },
  ];

  return (
    <main
      style={{
        maxWidth: "var(--max-width)",
        margin: "0 auto",
        padding: "48px var(--space) 80px",
      }}
    >
      <p style={{ color: "var(--text-muted)", margin: 0, letterSpacing: "0.08em", fontSize: 13 }}>
        MILESTONE 0 — SKELETON
      </p>
      <h1 style={{ fontSize: "clamp(32px, 7vw, 52px)", margin: "8px 0 4px", letterSpacing: "-0.02em" }}>
        {brand.name}
      </h1>
      <p style={{ color: "var(--text-muted)", marginTop: 0, fontSize: 18 }}>
        Bag charms, made and curated in India.
      </p>

      <section
        style={{
          marginTop: 40,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: 20,
        }}
      >
        <h2 style={{ fontSize: 15, margin: "0 0 14px", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)" }}>
          System status
        </h2>

        <Row
          label="Commerce backend"
          value={medusaUp ? "Connected" : "Not reachable — run: pnpm --filter @sorbe/medusa dev"}
          tone={medusaUp ? "ok" : "warn"}
        />
        {integrations.map((item) => (
          <Row
            key={item.name}
            label={item.name}
            value={item.value}
            tone={item.mocked ? "muted" : "ok"}
          />
        ))}
      </section>

      <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 24 }}>
        Everything above runs on free tiers and mocks. Nothing here can charge a card or send a
        message. See <code>docs/PLAN.md</code> for the build order.
      </p>
    </main>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone: "ok" | "warn" | "muted" }) {
  const color = tone === "ok" ? "var(--ok)" : tone === "warn" ? "var(--warn)" : "var(--text-muted)";
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        justifyContent: "space-between",
        padding: "10px 0",
        borderTop: "1px solid var(--border)",
      }}
    >
      <span>{label}</span>
      <span style={{ color, fontWeight: 500 }}>{value}</span>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatPaise } from "@sorbe/types";

/**
 * Payment step.
 *
 * With no Razorpay keys the real widget is replaced by clearly-labelled
 * simulate buttons rather than hiding online payment entirely — the whole flow
 * stays demoable, and it is obvious nothing is being charged.
 */
export function PaymentPanel({
  mockMode,
  codEnabled,
  codMaxPaise,
  totalPaise,
}: {
  mockMode: boolean;
  codEnabled: boolean;
  codMaxPaise: number;
  totalPaise: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const codAllowed = codEnabled && totalPaise <= codMaxPaise;

  async function place(method: "prepaid" | "cod", simulate: "success" | "failure" = "success") {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/checkout/complete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ method, simulate }),
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        // A failed payment must not cost the customer their cart.
        setError(body.message ?? "Could not place your order");
        setBusy(false);
        return;
      }
      router.push(`/checkout/confirmation/${body.order_id}`);
    } catch {
      setError("Could not place your order. Your bag is safe — try again.");
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      {mockMode ? (
        <div className="notice">
          <strong>Test mode</strong>
          <p className="muted small" style={{ margin: "6px 0 0" }}>
            No payment gateway is connected, so nothing can be charged. Use the buttons below
            to simulate what a customer would experience.
          </p>
        </div>
      ) : null}

      <button type="button" className="btn" disabled={busy} onClick={() => place("prepaid")}>
        {busy ? "Placing…" : mockMode ? `Simulate successful payment · ${formatPaise(totalPaise)}` : `Pay ${formatPaise(totalPaise)}`}
      </button>

      {mockMode ? (
        <button
          type="button"
          className="btn btn--secondary"
          disabled={busy}
          onClick={() => place("prepaid", "failure")}
        >
          Simulate failed payment
        </button>
      ) : null}

      {codAllowed ? (
        <button
          type="button"
          className="btn btn--secondary"
          disabled={busy}
          onClick={() => place("cod")}
        >
          Cash on delivery
        </button>
      ) : codEnabled ? (
        <p className="small muted">
          Cash on delivery is not available above {formatPaise(codMaxPaise)}.
        </p>
      ) : null}

      {error ? (
        <div className="notice" style={{ borderColor: "var(--warn)" }}>
          <p className="small" style={{ margin: 0, color: "var(--warn)" }}>
            {error}
          </p>
          <p className="small muted" style={{ margin: "6px 0 0" }}>
            Nothing was charged and your bag is unchanged. You can try again.
          </p>
        </div>
      ) : null}

      <p className="small muted">UPI, cards and netbanking · Prices include GST</p>
    </div>
  );
}

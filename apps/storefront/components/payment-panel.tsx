"use client";

import { useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { formatPaise } from "@sorbe/types";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

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
  brandName,
}: {
  mockMode: boolean;
  codEnabled: boolean;
  codMaxPaise: number;
  totalPaise: number;
  brandName: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const codAllowed = codEnabled && totalPaise <= codMaxPaise;

  /**
   * Live Razorpay. Checkout.js is the one third-party script the browser loads,
   * and it only ever receives the PUBLIC key id — the secret signs and verifies
   * on the server.
   */
  async function payWithRazorpay() {
    setBusy(true);
    setError(null);
    try {
      const start = await fetch("/api/checkout/razorpay", { method: "POST" });
      const startBody = await start.json().catch(() => ({}));
      if (!start.ok) {
        setError(startBody.message ?? "Could not start payment");
        setBusy(false);
        return;
      }

      if (!window.Razorpay) {
        setError("Payment could not load. Check your connection and try again.");
        setBusy(false);
        return;
      }

      const checkout = new window.Razorpay({
        key: startBody.key_id,
        order_id: startBody.razorpay_order_id,
        amount: startBody.amount_paise,
        currency: "INR",
        name: brandName,
        handler: async (response: any) => {
          // Verified server-side; the browser is never trusted to say "paid".
          const verify = await fetch("/api/checkout/verify", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(response),
          });
          const body = await verify.json().catch(() => ({}));

          if (verify.ok) {
            router.push(`/checkout/confirmation/${body.order_id}`);
            return;
          }
          if (verify.status === 202) {
            // Paid, but not yet stitched together. Never say "failed" here.
            setError(body.message);
            setBusy(false);
            return;
          }
          setError(body.message ?? "We could not verify that payment.");
          setBusy(false);
        },
        modal: {
          // Dismissing is not a failure — the cart is untouched and they retry.
          ondismiss: () => {
            setError("Payment cancelled. Your bag is unchanged.");
            setBusy(false);
          },
        },
        theme: { color: "#b8624a" },
      });

      checkout.open();
    } catch {
      setError("Could not start payment. Your bag is safe — try again.");
      setBusy(false);
    }
  }

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

      {!mockMode ? (
        <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      ) : null}

      <button
        type="button"
        className="btn"
        disabled={busy}
        onClick={() => (mockMode ? place("prepaid") : payWithRazorpay())}
      >
        {busy
          ? "Placing…"
          : mockMode
            ? `Simulate successful payment · ${formatPaise(totalPaise)}`
            : `Pay ${formatPaise(totalPaise)}`}
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

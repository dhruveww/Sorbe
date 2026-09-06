"use client";

import { useState } from "react";
import { formatPaise } from "@sorbe/types";

type TrackedOrder = {
  display_id: number;
  status: string;
  // Not always returned — see describe().
  payment_status?: string;
  fulfillment_status?: string;
  created_at: string;
  total: number;
  city: string | null;
  items: { title: string; quantity: number }[];
};

const field: React.CSSProperties = {
  width: "100%",
  minHeight: 48,
  padding: "0 12px",
  borderRadius: "var(--radius)",
  border: "1px solid var(--border)",
  background: "var(--surface)",
  color: "var(--text)",
  fontSize: 16,
};

/**
 * Plain-language status — "fulfillment_status: not_fulfilled" means nothing to
 * a customer.
 *
 * The payment and fulfillment fields are not always populated (Medusa computes
 * them outside the graph query), so an unknown state falls back to the neutral
 * "Order received" rather than claiming the order is confirmed. Telling someone
 * their COD order is confirmed when nobody has called them yet is worse than
 * saying less.
 */
function describe(order: TrackedOrder): string {
  if (order.fulfillment_status === "delivered") return "Delivered";
  if (order.fulfillment_status === "shipped") return "On its way";
  if (order.fulfillment_status === "fulfilled") return "Packed and ready to ship";
  if (order.payment_status === "not_paid") return "Awaiting confirmation";
  if (order.payment_status === "captured") return "Confirmed — being prepared";
  return "Order received";
}

export function TrackOrderForm() {
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setOrder(null);

    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/track-order", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          display_id: data.get("display_id"),
          phone: data.get("phone"),
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(body.message ?? "We couldn't find that order.");
        return;
      }
      setOrder(body.order);
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <form onSubmit={submit} className="stack" style={{ maxWidth: 380 }}>
        <div>
          <label htmlFor="display_id" className="small muted">
            Order number
          </label>
          <input
            id="display_id"
            name="display_id"
            inputMode="numeric"
            placeholder="1"
            required
            style={field}
          />
        </div>
        <div>
          <label htmlFor="phone" className="small muted">
            Mobile number
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            placeholder="9876543210"
            required
            style={field}
          />
        </div>
        <button type="submit" className="btn" disabled={busy}>
          {busy ? "Looking…" : "Find my order"}
        </button>
      </form>

      {error ? (
        <p className="small" style={{ color: "var(--warn)", marginTop: 16 }}>
          {error}
        </p>
      ) : null}

      {order ? (
        <div className="notice" style={{ marginTop: 24 }}>
          <p className="small muted" style={{ margin: 0 }}>
            Order #{order.display_id} ·{" "}
            {new Date(order.created_at).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
          <p style={{ fontSize: 20, fontWeight: 600, margin: "6px 0 0" }}>{describe(order)}</p>
          {order.city ? (
            <p className="small muted" style={{ margin: "4px 0 0" }}>
              Delivering to {order.city}
            </p>
          ) : null}

          <ul style={{ margin: "14px 0 0", paddingLeft: 18 }}>
            {order.items.map((item) => (
              <li key={item.title} className="small">
                {item.title} × {item.quantity}
              </li>
            ))}
          </ul>
          <p style={{ margin: "10px 0 0", fontWeight: 600 }}>{formatPaise(order.total)}</p>
        </div>
      ) : null}
    </div>
  );
}

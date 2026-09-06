"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const field: React.CSSProperties = {
  width: "100%",
  minHeight: 48,
  padding: "0 12px",
  borderRadius: "var(--radius)",
  border: "1px solid var(--border)",
  background: "var(--surface)",
  color: "var(--text)",
  fontSize: 16, // 16px stops iOS zooming the page on focus
};

/**
 * Checkout address.
 *
 * Every input carries the right autocomplete token and input mode, because on a
 * phone the difference between a numeric keypad and a full keyboard is most of
 * the checkout experience. No account is required to fill this in.
 */
export function AddressForm({ defaultEmail }: { defaultEmail?: string }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const data = new FormData(event.currentTarget);
    const payload = {
      email: String(data.get("email") ?? ""),
      gift_note: String(data.get("gift_note") ?? "") || undefined,
      address: {
        name: String(data.get("name") ?? ""),
        phone: String(data.get("phone") ?? ""),
        line1: String(data.get("line1") ?? ""),
        line2: String(data.get("line2") ?? "") || undefined,
        city: String(data.get("city") ?? ""),
        state: String(data.get("state") ?? ""),
        pincode: String(data.get("pincode") ?? ""),
      },
    };

    try {
      const response = await fetch("/api/checkout/address", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message ?? "Could not save your address");
      }
      // The step lives in the URL, so this is what makes a refresh or a
      // back-button return land in the right place.
      router.push("/checkout/payment");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="stack">
      <div>
        <label htmlFor="name" className="small muted">
          Full name
        </label>
        <input id="name" name="name" autoComplete="name" required style={field} />
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
        <p className="small muted" style={{ margin: "4px 0 0" }}>
          We use this for delivery updates and to find your order later.
        </p>
      </div>

      <div>
        <label htmlFor="email" className="small muted">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          defaultValue={defaultEmail}
          required
          style={field}
        />
      </div>

      <div>
        <label htmlFor="line1" className="small muted">
          Address
        </label>
        <input
          id="line1"
          name="line1"
          autoComplete="address-line1"
          placeholder="Flat, building, street"
          required
          style={field}
        />
      </div>

      <div>
        <label htmlFor="line2" className="small muted">
          Landmark (optional)
        </label>
        <input id="line2" name="line2" autoComplete="address-line2" style={field} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label htmlFor="city" className="small muted">
            City
          </label>
          <input id="city" name="city" autoComplete="address-level2" required style={field} />
        </div>
        <div>
          <label htmlFor="state" className="small muted">
            State
          </label>
          <input id="state" name="state" autoComplete="address-level1" required style={field} />
        </div>
      </div>

      <div>
        <label htmlFor="pincode" className="small muted">
          Pincode
        </label>
        <input
          id="pincode"
          name="pincode"
          inputMode="numeric"
          autoComplete="postal-code"
          pattern="[1-9][0-9]{5}"
          maxLength={6}
          placeholder="400001"
          required
          style={field}
        />
        <p className="small muted" style={{ margin: "4px 0 0" }}>
          Your pincode decides the delivery fee and date.
        </p>
      </div>

      <div>
        <label htmlFor="gift_note" className="small muted">
          Gift note (optional)
        </label>
        <textarea id="gift_note" name="gift_note" rows={2} style={{ ...field, minHeight: 72, padding: 12 }} />
      </div>

      {error ? (
        <p className="small" style={{ color: "var(--warn)" }}>
          {error}
        </p>
      ) : null}

      <button type="submit" className="btn" disabled={saving}>
        {saving ? "Saving…" : "Continue to payment"}
      </button>
    </form>
  );
}

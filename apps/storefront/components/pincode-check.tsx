"use client";

import { useState } from "react";
import { formatPaise } from "@sorbe/types";

type Quote = {
  zoneName: string;
  feePaise: number;
  etaDaysMin: number;
  etaDaysMax: number;
  codAvailable: boolean;
  isFree: boolean;
};

/**
 * Pincode is the source of truth for shipping — not a GPS guess, which is
 * unreliable for Indian addresses. The customer sees the fee and ETA here,
 * before checkout, so nothing about the cost appears late.
 */
export function PincodeCheck({ onQuote }: { onQuote?: (quote: Quote | null) => void }) {
  const [pincode, setPincode] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  async function check(event: React.FormEvent) {
    event.preventDefault();
    setChecking(true);
    setMessage(null);
    setQuote(null);

    try {
      const response = await fetch(`/api/shipping/quote?pincode=${encodeURIComponent(pincode)}`);
      const body = await response.json();
      if (!response.ok || !body.quote) {
        setMessage(body.message ?? "Could not check that pincode");
        onQuote?.(null);
        return;
      }
      setQuote(body.quote);
      onQuote?.(body.quote);
    } catch {
      setMessage("Could not check that pincode. Try again.");
      onQuote?.(null);
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="notice">
      <form onSubmit={check} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <label htmlFor="pincode" className="small muted" style={{ width: "100%" }}>
          Delivery pincode
        </label>
        <input
          id="pincode"
          name="postal-code"
          value={pincode}
          onChange={(event) => setPincode(event.target.value.replace(/\D/g, "").slice(0, 6))}
          // numeric keypad on phones; autoComplete lets the browser fill it
          inputMode="numeric"
          autoComplete="postal-code"
          pattern="[1-9][0-9]{5}"
          placeholder="400001"
          required
          style={{
            flex: "1 1 140px",
            minHeight: 46,
            padding: "0 12px",
            borderRadius: "var(--radius)",
            border: "1px solid var(--border)",
            background: "var(--surface)",
            color: "var(--text)",
            fontSize: 16,
          }}
        />
        <button
          type="submit"
          className="btn btn--secondary"
          style={{ width: "auto", minHeight: 46 }}
          disabled={checking || pincode.length !== 6}
        >
          {checking ? "Checking…" : "Check"}
        </button>
      </form>

      {quote ? (
        <div className="small" style={{ marginTop: 12 }}>
          <p style={{ margin: 0 }}>
            <strong>{quote.isFree ? "Free delivery" : formatPaise(quote.feePaise)}</strong> to{" "}
            {quote.zoneName}
          </p>
          <p className="muted" style={{ margin: "2px 0 0" }}>
            Arrives in {quote.etaDaysMin}–{quote.etaDaysMax} working days
            {quote.codAvailable ? " · Cash on delivery available" : " · Prepaid only"}
          </p>
        </div>
      ) : null}

      {message ? (
        <p className="small" style={{ color: "var(--warn)", margin: "12px 0 0" }}>
          {message}
        </p>
      ) : null}
    </div>
  );
}

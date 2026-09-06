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
  fontSize: 16,
};

/**
 * Two-step OTP login.
 *
 * `next` is where to return afterwards — the checkout step the customer was on.
 * Because the cart id does not change through login, they land back exactly
 * where they were with the same bag.
 */
export function LoginForm({ next = "/account/orders" }: { next?: string }) {
  const router = useRouter();
  const [step, setStep] = useState<"details" | "code">("details");
  const [details, setDetails] = useState({ phone: "", email: "", name: "" });
  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function requestCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const data = new FormData(event.currentTarget);
    const next = {
      phone: String(data.get("phone") ?? ""),
      email: String(data.get("email") ?? ""),
      name: String(data.get("name") ?? ""),
    };
    setDetails(next);

    try {
      const response = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone: next.phone, email: next.email }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(body.message ?? "Could not send your code");
        return;
      }
      setDevCode(body.dev_code ?? null);
      setStep("code");
    } catch {
      setError("Could not send your code. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function verify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const code = String(new FormData(event.currentTarget).get("code") ?? "");
    try {
      const response = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...details, code }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(body.message ?? "That code is not right");
        return;
      }
      router.push(next);
      router.refresh();
    } catch {
      setError("Could not sign you in. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (step === "code") {
    return (
      <form onSubmit={verify} className="stack" style={{ maxWidth: 380 }}>
        <p className="muted">We sent a 6-digit code. Enter it below.</p>
        {devCode ? (
          <div className="notice">
            <p className="small" style={{ margin: 0 }}>
              <strong>Test mode:</strong> your code is <code>{devCode}</code>
            </p>
          </div>
        ) : null}
        <div>
          <label htmlFor="code" className="small muted">
            Code
          </label>
          <input
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            pattern="[0-9]{6}"
            required
            style={field}
          />
        </div>
        {error ? (
          <p className="small" style={{ color: "var(--warn)" }}>
            {error}
          </p>
        ) : null}
        <button type="submit" className="btn" disabled={busy}>
          {busy ? "Checking…" : "Sign in"}
        </button>
        <button
          type="button"
          className="btn btn--secondary"
          onClick={() => {
            setStep("details");
            setError(null);
          }}
        >
          Use different details
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={requestCode} className="stack" style={{ maxWidth: 380 }}>
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
          required
          style={field}
        />
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
          required
          style={field}
        />
        <p className="small muted" style={{ margin: "4px 0 0" }}>
          We send your login code here for now. Once WhatsApp is live it goes to your phone.
        </p>
      </div>
      {error ? (
        <p className="small" style={{ color: "var(--warn)" }}>
          {error}
        </p>
      ) : null}
      <button type="submit" className="btn" disabled={busy}>
        {busy ? "Sending…" : "Send code"}
      </button>
    </form>
  );
}

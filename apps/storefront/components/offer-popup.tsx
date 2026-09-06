"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Props = {
  id: string;
  title: string;
  bodyText: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  displayMode: string;
};

/**
 * Offer modal.
 *
 * Never blocks the shop (spec hard constraint 4): the page behind it stays
 * usable, Escape and the backdrop both dismiss it, and it appears AFTER first
 * paint so it can never be the LCP element or delay it.
 */
export function OfferPopup({ id, title, bodyText, ctaLabel, ctaUrl, displayMode }: Props) {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  const storageKey = `sorbe_popup_seen:${id}`;

  useEffect(() => {
    // "Seen" is per-viewer convenience only, so a failure to read storage
    // (private mode, blocked cookies) just means it shows again.
    try {
      const store = displayMode === "once_per_device" ? window.localStorage : window.sessionStorage;
      if (displayMode !== "every_visit" && store.getItem(storageKey)) return;
    } catch {
      // ignore
    }

    // A beat after paint: the shop should be visible and usable first.
    const timer = window.setTimeout(() => setOpen(true), 1200);
    return () => window.clearTimeout(timer);
  }, [displayMode, storageKey]);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") dismiss();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function dismiss() {
    setOpen(false);
    try {
      const store = displayMode === "once_per_device" ? window.localStorage : window.sessionStorage;
      store.setItem(storageKey, "1");
    } catch {
      // ignore
    }
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={dismiss}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        display: "grid",
        placeItems: "center",
        padding: 16,
        background: "rgba(0,0,0,0.45)",
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          padding: 24,
          maxWidth: 420,
          width: "100%",
          position: "relative",
        }}
      >
        <button
          ref={closeRef}
          type="button"
          onClick={dismiss}
          aria-label="Close"
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            minWidth: 40,
            minHeight: 40,
            border: 0,
            background: "none",
            color: "var(--text-muted)",
            fontSize: 20,
            cursor: "pointer",
          }}
        >
          ×
        </button>

        <h2 style={{ fontSize: 22, marginRight: 32 }}>{title}</h2>
        {bodyText ? (
          <p className="muted" style={{ marginTop: 8 }}>
            {bodyText}
          </p>
        ) : null}

        {ctaLabel && ctaUrl ? (
          <Link href={ctaUrl} className="btn" style={{ marginTop: 16 }} onClick={dismiss}>
            {ctaLabel}
          </Link>
        ) : null}

        <button
          type="button"
          onClick={dismiss}
          className="small muted"
          style={{
            display: "block",
            margin: "12px auto 0",
            background: "none",
            border: 0,
            cursor: "pointer",
            textDecoration: "underline",
          }}
        >
          No thanks
        </button>
      </div>
    </div>
  );
}

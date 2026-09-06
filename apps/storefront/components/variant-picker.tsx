"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatPaise } from "@sorbe/types";

export type PickerVariant = {
  id: string;
  sku: string | null;
  pricePaise: number | null;
  inventory: number;
  /** option title -> chosen value, e.g. { Finish: "Gold" } */
  optionValues: Record<string, string>;
};

export type PickerOption = { title: string; values: string[] };

/**
 * Variant selection + add to cart.
 *
 * Combinations that do not exist, or are out of stock, are disabled rather than
 * hidden — a customer who sees "Silver" vanish when they pick "Keychain"
 * assumes the site is broken. Disabled tells them the truth.
 */
export function VariantPicker({
  options,
  variants,
  leadTimeDays,
}: {
  options: PickerOption[];
  variants: PickerVariant[];
  leadTimeDays: number | null;
}) {
  const router = useRouter();
  const [selection, setSelection] = useState<Record<string, string>>(() =>
    // Start on the first in-stock variant so the price shown is buyable.
    variants.find((v) => v.inventory > 0)?.optionValues ?? variants[0]?.optionValues ?? {},
  );
  const [status, setStatus] = useState<"idle" | "adding" | "added" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(
    () =>
      variants.find((variant) =>
        options.every((option) => variant.optionValues[option.title] === selection[option.title]),
      ) ?? null,
    [variants, options, selection],
  );

  /** Is there any variant with this value, given the other current choices? */
  function isAvailable(optionTitle: string, value: string): boolean {
    return variants.some(
      (variant) =>
        variant.optionValues[optionTitle] === value &&
        options.every(
          (other) =>
            other.title === optionTitle ||
            variant.optionValues[other.title] === selection[other.title],
        ),
    );
  }

  async function addToCart() {
    if (!selected) return;
    setStatus("adding");
    setError(null);
    try {
      const response = await fetch("/api/cart/items", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ variant_id: selected.id, quantity: 1 }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message ?? "Could not add to cart");
      }
      setStatus("added");
      // Refresh so the header cart count and any stock display catch up.
      router.refresh();
      setTimeout(() => setStatus("idle"), 2500);
    } catch (caught) {
      setStatus("error");
      setError(caught instanceof Error ? caught.message : "Something went wrong");
    }
  }

  const soldOut = !selected || selected.inventory <= 0;

  return (
    <div className="stack">
      <p style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>
        {selected?.pricePaise != null ? formatPaise(selected.pricePaise) : "—"}
      </p>
      <p className="small muted" style={{ marginTop: 0 }}>
        Inclusive of all taxes
      </p>

      {options.map((option) => (
        <fieldset key={option.title} style={{ border: 0, padding: 0, margin: "12px 0 0" }}>
          <legend className="small muted" style={{ padding: 0, marginBottom: 8 }}>
            {option.title}
          </legend>
          <div className="options">
            {option.values.map((value) => {
              const available = isAvailable(option.title, value);
              return (
                <button
                  key={value}
                  type="button"
                  className="option"
                  aria-pressed={selection[option.title] === value}
                  disabled={!available}
                  onClick={() => setSelection((prev) => ({ ...prev, [option.title]: value }))}
                >
                  {value}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}

      {selected && selected.inventory > 0 && selected.inventory <= 3 ? (
        <p className="small" style={{ color: "var(--warn)" }}>
          Only {selected.inventory} left
        </p>
      ) : null}

      {leadTimeDays ? (
        <p className="small muted">
          Handmade to order — ships in about {leadTimeDays} days.
        </p>
      ) : null}

      <div className="pdp__buy">
        <button
          type="button"
          className="btn"
          onClick={addToCart}
          disabled={soldOut || status === "adding"}
        >
          {soldOut
            ? "Sold out"
            : status === "adding"
              ? "Adding…"
              : status === "added"
                ? "Added to bag ✓"
                : "Add to bag"}
        </button>
        {error ? (
          <p className="small" style={{ color: "var(--warn)", margin: "8px 0 0" }}>
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}

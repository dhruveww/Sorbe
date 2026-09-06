"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatPaise } from "@sorbe/types";

export type CartLine = {
  id: string;
  title: string;
  variantTitle: string | null;
  productHandle: string | null;
  thumbnail: string | null;
  quantity: number;
  unitPricePaise: number;
};

/**
 * Quantity controls update optimistically — the number changes instantly and
 * the server call reconciles behind it. A cart that lags half a second on every
 * tap feels broken even when it is correct.
 */
export function CartLines({ lines }: { lines: CartLine[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);

  function quantityOf(line: CartLine): number {
    return optimistic[line.id] ?? line.quantity;
  }

  async function change(line: CartLine, nextQuantity: number) {
    setOptimistic((prev) => ({ ...prev, [line.id]: nextQuantity }));
    setError(null);

    const isRemoval = nextQuantity <= 0;
    try {
      const response = await fetch("/api/cart/items", {
        method: isRemoval ? "DELETE" : "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          isRemoval ? { line_id: line.id } : { line_id: line.id, quantity: nextQuantity },
        ),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message ?? "Could not update your bag");
      }
      startTransition(() => router.refresh());
    } catch (caught) {
      // Roll the optimistic value back so the UI never lies about what is saved.
      setOptimistic((prev) => {
        const next = { ...prev };
        delete next[line.id];
        return next;
      });
      setError(caught instanceof Error ? caught.message : "Something went wrong");
    }
  }

  return (
    <div>
      {error ? (
        <p className="small" style={{ color: "var(--warn)" }}>
          {error}
        </p>
      ) : null}

      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {lines.map((line) => {
          const quantity = quantityOf(line);
          if (quantity <= 0) return null;

          return (
            <li
              key={line.id}
              style={{
                display: "grid",
                gridTemplateColumns: "88px 1fr auto",
                gap: 14,
                padding: "16px 0",
                borderBottom: "1px solid var(--border)",
                opacity: pending ? 0.7 : 1,
              }}
            >
              <div className="card__media" style={{ width: 88 }}>
                {line.thumbnail ? (
                  <Image src={line.thumbnail} alt={line.title} width={176} height={176} sizes="88px" />
                ) : null}
              </div>

              <div>
                {line.productHandle ? (
                  <Link href={`/products/${line.productHandle}`} style={{ fontWeight: 500 }}>
                    {line.title}
                  </Link>
                ) : (
                  <span style={{ fontWeight: 500 }}>{line.title}</span>
                )}
                {line.variantTitle ? (
                  <p className="small muted" style={{ margin: "2px 0 8px" }}>
                    {line.variantTitle}
                  </p>
                ) : null}

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button
                    type="button"
                    className="option"
                    style={{ minWidth: 42, minHeight: 38, padding: 0 }}
                    aria-label={`Decrease quantity of ${line.title}`}
                    onClick={() => change(line, quantity - 1)}
                  >
                    −
                  </button>
                  <span style={{ minWidth: 24, textAlign: "center" }}>{quantity}</span>
                  <button
                    type="button"
                    className="option"
                    style={{ minWidth: 42, minHeight: 38, padding: 0 }}
                    aria-label={`Increase quantity of ${line.title}`}
                    onClick={() => change(line, quantity + 1)}
                  >
                    +
                  </button>
                  <button
                    type="button"
                    className="small muted"
                    style={{
                      background: "none",
                      border: 0,
                      cursor: "pointer",
                      marginLeft: 6,
                      textDecoration: "underline",
                    }}
                    onClick={() => change(line, 0)}
                  >
                    Remove
                  </button>
                </div>
              </div>

              <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                {formatPaise(line.unitPricePaise * quantity)}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

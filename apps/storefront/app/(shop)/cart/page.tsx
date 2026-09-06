import type { Metadata } from "next";
import Link from "next/link";
import { formatPaise } from "@sorbe/types";
import { getCart } from "@/lib/cart";
import { CartLines, type CartLine } from "@/components/cart-lines";
import { PincodeCheck } from "@/components/pincode-check";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your bag",
  robots: { index: false },
};

export default async function CartPage() {
  const cart = await getCart();
  const items = cart?.items ?? [];

  if (items.length === 0) {
    return (
      <div className="wrap" style={{ padding: "40px 0 64px", maxWidth: 640 }}>
        <h1 style={{ fontSize: "clamp(28px, 6vw, 40px)" }}>Your bag</h1>
        <p className="muted" style={{ marginTop: 10 }}>
          Nothing in here yet.
        </p>
        <p style={{ marginTop: 24, maxWidth: 240 }}>
          <Link href="/shop" className="btn">
            Shop charms
          </Link>
        </p>
      </div>
    );
  }

  const lines: CartLine[] = items.map((item) => ({
    id: item.id,
    title: item.variant?.product?.title ?? item.title,
    variantTitle: item.variant?.title ?? item.subtitle,
    productHandle: item.variant?.product?.handle ?? null,
    thumbnail: item.thumbnail,
    quantity: item.quantity,
    unitPricePaise: item.unit_price,
  }));

  return (
    <div className="wrap" style={{ padding: "32px 0 64px", maxWidth: 720 }}>
      <h1 style={{ fontSize: "clamp(28px, 6vw, 40px)" }}>Your bag</h1>

      <div style={{ marginTop: 20 }}>
        <CartLines lines={lines} />
      </div>

      <div style={{ marginTop: 24 }}>
        <PincodeCheck />
      </div>

      <dl style={{ marginTop: 24 }}>
        <Row label="Subtotal" value={formatPaise(cart!.item_subtotal)} />
        <Row
          label="Shipping"
          value={
            cart!.shipping_total > 0 ? formatPaise(cart!.shipping_total) : "Calculated at checkout"
          }
        />
        <Row label="Total" value={formatPaise(cart!.total)} strong />
      </dl>

      <p className="small muted">Inclusive of GST.</p>

      <div style={{ marginTop: 20, maxWidth: 320 }}>
        <Link href="/checkout/address" className="btn">
          Checkout
        </Link>
      </div>
      <p className="small muted" style={{ marginTop: 12 }}>
        No account needed — you can check out as a guest.
      </p>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        padding: "8px 0",
        borderTop: "1px solid var(--border)",
        fontWeight: strong ? 600 : 400,
        fontSize: strong ? 18 : 16,
      }}
    >
      <dt>{label}</dt>
      <dd style={{ margin: 0 }}>{value}</dd>
    </div>
  );
}

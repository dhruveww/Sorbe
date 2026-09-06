import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatPaise } from "@sorbe/types";
import { getOrder } from "@/lib/orders";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Order confirmed", robots: { index: false } };

export default async function ConfirmationPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const order = await getOrder(orderId);
  if (!order) notFound();

  const isCod = order.payment_status === "not_paid";

  return (
    <div className="wrap" style={{ padding: "48px 0 64px", maxWidth: 560 }}>
      <h1 style={{ fontSize: "clamp(28px, 6vw, 40px)" }}>Thank you.</h1>
      <p className="muted" style={{ marginTop: 8 }}>
        Order <strong>#{order.display_id}</strong> is placed. We have emailed the details to{" "}
        {order.email}.
      </p>

      {isCod ? (
        <div className="notice" style={{ marginTop: 20 }}>
          <strong>We will confirm your order first</strong>
          <p className="muted small" style={{ margin: "6px 0 0" }}>
            Cash-on-delivery orders are confirmed before we pack them. Keep your phone
            reachable — we will not dispatch until you have confirmed.
          </p>
        </div>
      ) : null}

      <ul style={{ listStyle: "none", padding: 0, marginTop: 24 }}>
        {order.items.map((item) => (
          <li
            key={item.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              padding: "10px 0",
              borderTop: "1px solid var(--border)",
            }}
          >
            <span>
              {item.title} × {item.quantity}
            </span>
            <span>{formatPaise(item.unit_price * item.quantity)}</span>
          </li>
        ))}
      </ul>

      <dl>
        <Row label="Delivery" value={order.shipping_total === 0 ? "Free" : formatPaise(order.shipping_total)} />
        <Row label="Total" value={formatPaise(order.total)} strong />
      </dl>
      <p className="small muted">Inclusive of GST.</p>

      {order.shipping_address ? (
        <p className="small muted" style={{ marginTop: 16 }}>
          Delivering to {order.shipping_address.address_1}, {order.shipping_address.city}{" "}
          {order.shipping_address.postal_code}
        </p>
      ) : null}

      <div style={{ display: "flex", gap: 10, marginTop: 28, flexWrap: "wrap" }}>
        <Link href="/track-order" className="btn btn--secondary" style={{ width: "auto" }}>
          Track this order
        </Link>
        <Link href="/shop" className="btn btn--secondary" style={{ width: "auto" }}>
          Keep shopping
        </Link>
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
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

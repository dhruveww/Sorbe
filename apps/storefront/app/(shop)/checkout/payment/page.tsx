import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getBrand, getFlags } from "@sorbe/config";
import { formatPaise } from "@sorbe/types";
import { getCart } from "@/lib/cart";
import { listShippingOptions } from "@/lib/checkout";
import { PaymentPanel } from "@/components/payment-panel";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Payment", robots: { index: false } };

export default async function CheckoutPaymentPage() {
  const cart = await getCart();
  if (!cart || cart.items.length === 0) redirect("/cart");
  // No address means no pincode, and without a pincode there is no fee to show.
  if (!cart.shipping_address?.postal_code) redirect("/checkout/address");

  const flags = getFlags();

  // Priced from the pincode on the cart, so what is shown is what is charged.
  const options = await listShippingOptions().catch(() => []);
  const shippingPaise =
    options[0]?.calculated_price?.calculated_amount ?? options[0]?.amount ?? 0;
  const totalPaise = cart.item_subtotal + shippingPaise;

  return (
    <div className="wrap" style={{ padding: "32px 0 64px", maxWidth: 560 }}>
      <p className="small muted">Step 2 of 2</p>
      <h1 style={{ fontSize: "clamp(26px, 5vw, 36px)", marginTop: 4 }}>Payment</h1>

      <section className="notice" style={{ marginTop: 20 }}>
        <p className="small muted" style={{ margin: 0 }}>
          Delivering to
        </p>
        <p style={{ margin: "4px 0 0" }}>
          {cart.shipping_address.address_1}, {cart.shipping_address.city}{" "}
          {cart.shipping_address.postal_code}
        </p>
        <Link href="/checkout/address" className="small">
          Change
        </Link>
      </section>

      <dl style={{ marginTop: 20 }}>
        <Row label={`Bag (${cart.items.length})`} value={formatPaise(cart.item_subtotal)} />
        <Row
          label="Delivery"
          value={shippingPaise === 0 ? "Free" : formatPaise(shippingPaise)}
        />
        <Row label="Total" value={formatPaise(totalPaise)} strong />
      </dl>

      <div style={{ marginTop: 20 }}>
        <PaymentPanel
          mockMode={flags.paymentsMockMode}
          codEnabled={flags.codEnabled}
          codMaxPaise={flags.codMaxOrderPaise}
          totalPaise={totalPaise}
          brandName={getBrand().name}
        />
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

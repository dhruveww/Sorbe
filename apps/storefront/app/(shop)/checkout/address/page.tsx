import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCart } from "@/lib/cart";
import { getSession } from "@/lib/session";
import { AddressForm } from "@/components/address-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Delivery details", robots: { index: false } };

export default async function CheckoutAddressPage() {
  const cart = await getCart();
  if (!cart || cart.items.length === 0) redirect("/cart");

  const session = await getSession();

  return (
    <div className="wrap" style={{ padding: "32px 0 64px", maxWidth: 560 }}>
      <p className="small muted">Step 1 of 2</p>
      <h1 style={{ fontSize: "clamp(26px, 5vw, 36px)", marginTop: 4 }}>Delivery details</h1>

      {/* Inline, never a modal — browsing and checkout are never gated on login. */}
      {!session ? (
        <p className="small muted" style={{ marginTop: 8 }}>
          Checking out as a guest. <Link href="/login">Log in</Link> to use a saved address —
          your bag comes with you.
        </p>
      ) : null}

      <div style={{ marginTop: 24 }}>
        <AddressForm />
      </div>
    </div>
  );
}

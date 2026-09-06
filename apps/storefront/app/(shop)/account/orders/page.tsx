import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { formatPaise } from "@sorbe/types";
import { storeFetch } from "@/lib/medusa-client";
import { getSession } from "@/lib/session";
import { StaticPage } from "@/components/static-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Your orders", robots: { index: false } };

type Order = {
  id: string;
  display_id: number;
  total: number;
  created_at: string;
  items: { title: string; quantity: number }[];
  shipping_address?: { city: string } | null;
};

export default async function AccountOrdersPage() {
  const session = await getSession();
  // Not logged in: send them to login and bring them back here afterwards.
  if (!session) redirect("/login?next=/account/orders");

  let orders: Order[] = [];
  try {
    const result = await storeFetch<{ orders: Order[] }>(
      `/store/internal/customer-orders?customer_id=${session.customerId}`,
      { headers: { "x-internal-secret": process.env.MEDUSA_INTERNAL_AUTH_SECRET ?? "" } },
    );
    orders = result.orders;
  } catch {
    // An empty history is better than an error page; Track order still works.
    orders = [];
  }

  return (
    <StaticPage title="Your orders" lead={`Signed in as ${session.phone}.`}>
      {orders.length === 0 ? (
        <div>
          <p className="muted">No orders yet.</p>
          <p style={{ marginTop: 20, maxWidth: 240 }}>
            <Link href="/shop" className="btn">
              Shop charms
            </Link>
          </p>
        </div>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {orders.map((order) => (
            <li
              key={order.id}
              style={{ borderTop: "1px solid var(--border)", padding: "14px 0" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <span style={{ fontWeight: 500 }}>Order #{order.display_id}</span>
                <span>{formatPaise(order.total)}</span>
              </div>
              <p className="small muted" style={{ margin: "4px 0 0" }}>
                {new Date(order.created_at).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
                {order.shipping_address?.city ? ` · ${order.shipping_address.city}` : ""}
              </p>
              <p className="small muted" style={{ margin: "4px 0 0" }}>
                {order.items.map((item) => `${item.title} × ${item.quantity}`).join(", ")}
              </p>
            </li>
          ))}
        </ul>
      )}

      <p className="small muted" style={{ marginTop: 28 }}>
        Saved addresses and a wishlist are not built yet — see HANDOFF.md.
      </p>
    </StaticPage>
  );
}

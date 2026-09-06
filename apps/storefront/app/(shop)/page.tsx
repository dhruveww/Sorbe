import Link from "next/link";
import type { Metadata } from "next";
import { getBrand } from "@sorbe/config";
import { listCategories, listProducts } from "@/lib/catalog";
import { ProductGrid } from "@/components/product-grid";

export const metadata: Metadata = {
  description:
    "Handmade and curated bag charms, made in India. UPI, cards and cash on delivery.",
};

export default async function HomePage() {
  const brand = getBrand();
  const [{ products }, categories] = await Promise.all([
    listProducts({ limit: 8 }),
    listCategories(),
  ]);

  return (
    <div className="wrap">
      <section style={{ padding: "56px 0 40px", maxWidth: 620 }}>
        <h1 style={{ fontSize: "clamp(34px, 8vw, 56px)" }}>Charms that finish the bag.</h1>
        <p className="muted" style={{ fontSize: 18, marginTop: 12 }}>
          Handmade and curated pieces for totes, laptop bags and keys. Made in India,
          shipped across India.
        </p>
        <div style={{ display: "flex", gap: 10, marginTop: 24, maxWidth: 320 }}>
          <Link href="/shop" className="btn">
            Shop all
          </Link>
        </div>
        <p className="small muted" style={{ marginTop: 16 }}>
          UPI · Cards · Cash on delivery · Prices include GST
        </p>
      </section>

      <section>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <h2 style={{ fontSize: 22 }}>New in</h2>
          <Link href="/shop" className="small muted">
            View all →
          </Link>
        </div>
        <ProductGrid products={products} />
      </section>

      <section style={{ marginTop: 56 }}>
        <h2 style={{ fontSize: 22, marginBottom: 16 }}>Shop by type</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/collections/${category.handle}`}
              className="btn btn--secondary"
              style={{ width: "auto" }}
            >
              {category.name}
            </Link>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 56 }}>
        <div className="notice">
          <strong>{brand.name} is being built.</strong>
          <p className="muted small" style={{ margin: "6px 0 0" }}>
            Payments are in test mode — nothing can be charged yet.
          </p>
        </div>
      </section>
    </div>
  );
}

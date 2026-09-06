import type { Metadata } from "next";
import { listProducts } from "@/lib/catalog";
import { ProductGrid } from "@/components/product-grid";

export const metadata: Metadata = {
  title: "Shop",
  description: "Every bag charm we make and stock. Handmade and ready-to-ship pieces.",
};

export default async function ShopPage() {
  const { products, count } = await listProducts({ limit: 50 });

  return (
    <div className="wrap" style={{ padding: "32px 0 40px" }}>
      <h1 style={{ fontSize: "clamp(28px, 6vw, 40px)" }}>Shop</h1>
      <p className="muted" style={{ marginTop: 6, marginBottom: 24 }}>
        {count} {count === 1 ? "piece" : "pieces"}
      </p>
      <ProductGrid products={products} />
    </div>
  );
}

import { getCatalogMeta, type Product } from "@/lib/catalog";
import { ProductCard } from "./product-card";

/**
 * Fetches handmade/GST metadata for the whole grid in one request rather than
 * per card, so a 24-product page is 2 requests, not 25.
 */
export async function ProductGrid({ products }: { products: Product[] }) {
  if (products.length === 0) {
    return <p className="muted">Nothing here yet.</p>;
  }

  const { extras } = await getCatalogMeta(products.map((p) => p.id));

  return (
    <div className="grid">
      {products.map((product, index) => (
        <ProductCard
          key={product.id}
          product={product}
          extra={extras.get(product.id)}
          // First row only: these are the LCP candidates on a phone.
          priority={index < 2}
        />
      ))}
    </div>
  );
}

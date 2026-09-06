import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCategory, listCategories, listProducts } from "@/lib/catalog";
import { ProductGrid } from "@/components/product-grid";
import { JsonLd, breadcrumbSchema } from "@/components/json-ld";

type Params = { params: Promise<{ handle: string }> };

/** Pre-render every collection — they are the main SEO landing pages. */
export async function generateStaticParams() {
  const categories = await listCategories();
  return categories.map((category) => ({ handle: category.handle }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { handle } = await params;
  const category = await getCategory(handle);
  if (!category) return {};

  return {
    title: category.name,
    description: `${category.name} — handmade and curated bag charms, made in India.`,
    alternates: { canonical: `/collections/${category.handle}` },
  };
}

export default async function CollectionPage({ params }: Params) {
  const { handle } = await params;
  const category = await getCategory(handle);
  if (!category) notFound();

  const { products, count } = await listProducts({ categoryHandle: handle, limit: 50 });

  return (
    <div className="wrap" style={{ padding: "32px 0 40px" }}>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Shop", url: "/shop" },
          { name: category.name, url: `/collections/${category.handle}` },
        ])}
      />
      <h1 style={{ fontSize: "clamp(28px, 6vw, 40px)" }}>{category.name}</h1>
      <p className="muted" style={{ marginTop: 6, marginBottom: 24 }}>
        {count} {count === 1 ? "piece" : "pieces"}
      </p>
      <ProductGrid products={products} />
    </div>
  );
}

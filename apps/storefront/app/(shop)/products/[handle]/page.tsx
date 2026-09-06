import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCatalogMeta, getProduct, listProducts, lowestPricePaise } from "@/lib/catalog";
import { JsonLd, breadcrumbSchema, productSchema } from "@/components/json-ld";
import {
  VariantPicker,
  type PickerOption,
  type PickerVariant,
} from "@/components/variant-picker";

type Params = { params: Promise<{ handle: string }> };

export async function generateStaticParams() {
  const { products } = await listProducts({ limit: 100 });
  return products.map((product) => ({ handle: product.handle }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { handle } = await params;
  const product = await getProduct(handle);
  if (!product) return {};

  const { seos } = await getCatalogMeta([product.id]);
  const seo = seos.get(product.id);
  const image = product.thumbnail ?? product.images[0]?.url;

  return {
    title: seo?.meta_title ?? product.title,
    description: seo?.meta_description ?? product.description ?? undefined,
    // Always the product's own URL, whichever collection linked here. This is
    // what prevents a collection creating a duplicate PDP.
    alternates: { canonical: `/products/${product.handle}` },
    openGraph: {
      title: seo?.meta_title ?? product.title,
      description: seo?.meta_description ?? product.description ?? undefined,
      images: seo?.og_image_url ?? image ? [seo?.og_image_url ?? image!] : undefined,
      type: "website",
    },
  };
}

export default async function ProductPage({ params }: Params) {
  const { handle } = await params;
  const product = await getProduct(handle);
  if (!product) notFound();

  const { extras } = await getCatalogMeta([product.id]);
  const extra = extras.get(product.id);

  // Medusa returns variant options as {option_id, value}; the picker wants
  // them keyed by the human option title.
  const optionTitleById = new Map(product.options.map((option) => [option.id, option.title]));

  const pickerOptions: PickerOption[] = product.options.map((option) => ({
    title: option.title,
    values: option.values.map((value) => value.value),
  }));

  const pickerVariants: PickerVariant[] = product.variants.map((variant) => ({
    id: variant.id,
    sku: variant.sku,
    pricePaise: variant.calculated_price?.calculated_amount ?? null,
    inventory: variant.manage_inventory === false ? 999 : (variant.inventory_quantity ?? 0),
    optionValues: Object.fromEntries(
      variant.options.map((o) => [optionTitleById.get(o.option_id) ?? o.option_id, o.value]),
    ),
  }));

  const image = product.thumbnail ?? product.images[0]?.url ?? null;
  const price = lowestPricePaise(product);
  const inStock = pickerVariants.some((v) => v.inventory > 0);
  const category = product.categories?.[0];

  return (
    <div className="wrap">
      <JsonLd
        data={productSchema({
          name: product.title,
          description: product.description,
          handle: product.handle,
          image,
          pricePaise: price,
          inStock,
          sku: product.variants[0]?.sku ?? null,
          countryOfOrigin: extra?.country_of_origin ?? null,
        })}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Shop", url: "/shop" },
          ...(category
            ? [{ name: category.name, url: `/collections/${category.handle}` }]
            : []),
          { name: product.title, url: `/products/${product.handle}` },
        ])}
      />

      <nav className="small muted" style={{ paddingTop: 20 }} aria-label="Breadcrumb">
        <Link href="/shop">Shop</Link>
        {category ? (
          <>
            {" / "}
            <Link href={`/collections/${category.handle}`}>{category.name}</Link>
          </>
        ) : null}
      </nav>

      <div className="pdp">
        <div className="pdp__media">
          {image ? (
            <Image
              src={image}
              alt={product.title}
              width={900}
              height={900}
              priority
              sizes="(max-width: 860px) 100vw, 55vw"
            />
          ) : null}
        </div>

        <div>
          <h1 style={{ fontSize: "clamp(26px, 5vw, 36px)" }}>{product.title}</h1>
          {extra?.is_handmade ? (
            <p style={{ margin: "10px 0 0" }}>
              <span className="badge badge--handmade">Handmade</span>
            </p>
          ) : null}

          <div style={{ marginTop: 20 }}>
            <VariantPicker
              options={pickerOptions}
              variants={pickerVariants}
              leadTimeDays={extra?.is_handmade ? (extra.handmade_lead_time_days ?? null) : null}
            />
          </div>

          {product.description ? (
            <p className="muted" style={{ marginTop: 28 }}>
              {product.description}
            </p>
          ) : null}

          <dl className="small muted" style={{ marginTop: 24, lineHeight: 1.9 }}>
            {extra?.country_of_origin ? (
              <div>Country of origin: {extra.country_of_origin}</div>
            ) : null}
            {extra?.hsn_code ? <div>HSN: {extra.hsn_code}</div> : null}
            <div>Prices include GST.</div>
          </dl>
        </div>
      </div>
    </div>
  );
}

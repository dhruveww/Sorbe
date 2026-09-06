import { getBrand } from "@sorbe/config";
import { paiseToRupees, type Paise } from "@sorbe/types";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

/**
 * Structured data. Rendered server-side.
 *
 * The `<` escape matters: without it, a product title containing `</script>`
 * would break out of the tag. Google reads the escaped form fine.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}

function absolute(path: string): string {
  return path.startsWith("http") ? path : `${SITE_URL}${path}`;
}

export function organizationSchema() {
  const brand = getBrand();
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: brand.name,
    legalName: brand.legalName,
    url: SITE_URL,
    ...(brand.supportEmail || brand.supportPhone
      ? {
          contactPoint: {
            "@type": "ContactPoint",
            contactType: "customer support",
            ...(brand.supportEmail ? { email: brand.supportEmail } : {}),
            ...(brand.supportPhone ? { telephone: brand.supportPhone } : {}),
            areaServed: "IN",
          },
        }
      : {}),
  };
}

export function breadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absolute(item.url),
    })),
  };
}

export function productSchema(input: {
  name: string;
  description: string | null;
  handle: string;
  image: string | null;
  pricePaise: Paise | null;
  inStock: boolean;
  sku: string | null;
  countryOfOrigin: string | null;
}) {
  const brand = getBrand();
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.name,
    ...(input.description ? { description: input.description } : {}),
    ...(input.image ? { image: absolute(input.image) } : {}),
    ...(input.sku ? { sku: input.sku } : {}),
    brand: { "@type": "Brand", name: brand.name },
    ...(input.countryOfOrigin
      ? { countryOfOrigin: { "@type": "Country", name: input.countryOfOrigin } }
      : {}),
    ...(input.pricePaise !== null
      ? {
          offers: {
            "@type": "Offer",
            // Schema.org wants a decimal price, so this is the one place paise
            // becomes rupees — right at the boundary, nowhere earlier.
            price: paiseToRupees(input.pricePaise).toFixed(2),
            priceCurrency: "INR",
            availability: input.inStock
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
            url: absolute(`/products/${input.handle}`),
          },
        }
      : {}),
  };
}

export function faqSchema(items: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

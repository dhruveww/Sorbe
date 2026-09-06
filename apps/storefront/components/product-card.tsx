import Image from "next/image";
import Link from "next/link";
import { formatPaise } from "@sorbe/types";
import { isSoldOut, lowestPricePaise, type Product, type ProductExtra } from "@/lib/catalog";

export function ProductCard({
  product,
  extra,
  priority = false,
}: {
  product: Product;
  extra?: ProductExtra;
  /** Set on the first row only — those are the LCP candidates. */
  priority?: boolean;
}) {
  const price = lowestPricePaise(product);
  const soldOut = isSoldOut(product);
  const image = product.thumbnail ?? product.images[0]?.url;

  return (
    <Link href={`/products/${product.handle}`}>
      <article>
        <div className="card__media">
          {image ? (
            <Image
              src={image}
              alt={product.title}
              width={600}
              height={600}
              priority={priority}
              loading={priority ? undefined : "lazy"}
              sizes="(max-width: 640px) 50vw, (max-width: 960px) 33vw, 25vw"
            />
          ) : null}
          {soldOut ? (
            <span className="badge badge--sold-out">Sold out</span>
          ) : extra?.is_handmade ? (
            <span className="badge badge--handmade">Handmade</span>
          ) : null}
        </div>
        <h3 className="card__title">{product.title}</h3>
        <p className="card__price">
          {price === null ? "—" : formatPaise(price)}
          {product.variants.length > 1 && price !== null ? " onwards" : ""}
        </p>
      </article>
    </Link>
  );
}

import Link from "next/link";
import { getBrand } from "@sorbe/config";
import { listCategories } from "@/lib/catalog";
import { cartItemCount, getCart } from "@/lib/cart";

/**
 * Home and Shop are top-level, not hidden behind a menu (docs/PLAN.md §8).
 * Category links come from the catalogue, so adding a category in admin puts it
 * in the nav without a deploy.
 */
export async function SiteHeader() {
  const brand = getBrand();
  const [categories, cart] = await Promise.all([listCategories(), getCart()]);
  const count = cartItemCount(cart);

  return (
    <header className="site-header">
      <div className="wrap site-header__bar">
        <Link href="/" className="site-header__brand">
          {brand.name}
        </Link>
        <nav className="site-nav" aria-label="Main">
          <Link href="/shop">Shop</Link>
          {categories.map((category) => (
            <Link key={category.id} href={`/collections/${category.handle}`}>
              {category.name}
            </Link>
          ))}
          <Link href="/cart" aria-label={`Bag, ${count} ${count === 1 ? "item" : "items"}`}>
            Bag{count > 0 ? ` (${count})` : ""}
          </Link>
        </nav>
      </div>
    </header>
  );
}

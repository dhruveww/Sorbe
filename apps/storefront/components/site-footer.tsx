import Link from "next/link";
import { getBrand } from "@sorbe/config";

/**
 * The legal/trust pages an Indian storefront is expected to carry. These are
 * real routes from day one — a footer link that 404s reads as an abandoned shop
 * and hurts trust more than a thin page does.
 */
const LEGAL_LINKS = [
  { href: "/shipping", label: "Shipping" },
  { href: "/returns", label: "Returns & refunds" },
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
  { href: "/track-order", label: "Track order" },
];

const SOON_LINKS = [
  { href: "/events", label: "Events" },
  { href: "/influencer", label: "Influencer" },
  { href: "/make-your-own", label: "Make your own charm" },
];

export function SiteFooter() {
  const brand = getBrand();

  return (
    <footer className="site-footer">
      <div className="wrap">
        <nav className="site-footer__links" aria-label="Footer">
          {[...LEGAL_LINKS, ...SOON_LINKS].map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
        <p style={{ margin: 0 }}>
          {brand.legalName}
          {brand.gstin ? ` · GSTIN ${brand.gstin}` : ""}
        </p>
        <p style={{ margin: "4px 0 0" }}>Prices include GST. Made in India.</p>
      </div>
    </footer>
  );
}

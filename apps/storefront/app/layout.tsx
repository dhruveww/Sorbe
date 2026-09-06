import type { Metadata, Viewport } from "next";
import { getBrand } from "@sorbe/config";
import "./globals.css";

// Server-side only, so reading env here is safe and the brand name stays in
// exactly one place (docs/PLAN.md §11).
const brand = getBrand();

export const metadata: Metadata = {
  title: {
    default: brand.name,
    template: `%s | ${brand.name}`,
  },
  description: `${brand.name} — handmade and curated bag charms, made in India.`,
  // Prevents duplicate-content penalties once collections link to the same PDP.
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Never block a customer from zooming a product photo.
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN">
      <body>{children}</body>
    </html>
  );
}

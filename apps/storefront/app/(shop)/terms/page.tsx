import type { Metadata } from "next";
import Link from "next/link";
import { getBrand } from "@sorbe/config";
import { StaticPage } from "@/components/static-page";

export const metadata: Metadata = {
  title: "Terms & conditions",
  description: "The terms you agree to when ordering from us.",
};

export default function TermsPage() {
  const brand = getBrand();

  return (
    <StaticPage title="Terms & conditions" lead="The short version, in plain language.">
      <h2 style={{ fontSize: 19, marginTop: 24 }}>Who you are buying from</h2>
      <p>
        This store is operated by {brand.legalName}
        {brand.gstin ? `, GSTIN ${brand.gstin}` : ""}.
      </p>

      <h2 style={{ fontSize: 19, marginTop: 24 }}>Prices</h2>
      <p>
        All prices are in Indian Rupees and <strong>include GST</strong>. The price you see is
        the price you pay; shipping, if any, is shown separately at checkout before payment.
      </p>

      <h2 style={{ fontSize: 19, marginTop: 24 }}>Orders</h2>
      <p>
        An order is confirmed once payment succeeds, or — for cash on delivery — once we have
        confirmed it with you. We may cancel and fully refund an order if a piece turns out to
        be unavailable or if a listing had a clear pricing error.
      </p>

      <h2 style={{ fontSize: 19, marginTop: 24 }}>Handmade pieces</h2>
      <p>
        Handmade charms vary slightly from photographs — beads are sorted by eye and finishes
        settle differently. That variation is the nature of the product, not a defect. See{" "}
        <Link href="/returns">returns</Link> for what this means for sending one back.
      </p>

      <h2 style={{ fontSize: 19, marginTop: 24 }}>Returns</h2>
      <p>
        Covered on the <Link href="/returns">returns and refunds</Link> page, which forms part
        of these terms.
      </p>

      <h2 style={{ fontSize: 19, marginTop: 24 }}>Contact</h2>
      <p>
        Questions about these terms go to <Link href="/contact">our contact page</Link>.
      </p>

      <p className="small muted" style={{ marginTop: 32 }}>
        These terms are under legal review before launch and may change.
      </p>
    </StaticPage>
  );
}

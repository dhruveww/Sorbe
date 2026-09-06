import type { Metadata } from "next";
import { StaticPage } from "@/components/static-page";

export const metadata: Metadata = {
  title: "Returns & refunds",
  description: "Our return window, what is returnable, and who pays return shipping.",
};

/**
 * These rules are the ones the admin refund actions enforce in M5 — the page
 * and the system must never disagree. Change one, change both.
 */
export default function ReturnsPage() {
  return (
    <StaticPage
      title="Returns & refunds"
      lead="Seven days to change your mind on ready-made pieces."
    >
      <h2 style={{ fontSize: 19, marginTop: 24 }}>The window</h2>
      <p>
        You can request a return within <strong>7 days of delivery</strong>. Tell us at the
        contact address below with your order number and we will confirm the next step.
      </p>

      <h2 style={{ fontSize: 19, marginTop: 24 }}>What can come back</h2>
      <ul>
        <li>Ready-made charms, unused and in their original packaging.</li>
        <li>
          <strong>Handmade and made-to-order pieces are not returnable.</strong> They are made
          for you after you order, so we cannot resell them.
        </li>
        <li>
          Anything that arrived <strong>damaged, faulty or not what you ordered</strong> is
          always covered, handmade or not.
        </li>
      </ul>

      <h2 style={{ fontSize: 19, marginTop: 24 }}>Who pays return shipping</h2>
      <p>
        You do, if you simply changed your mind. <strong>We do</strong> if the piece arrived
        damaged, faulty, or was the wrong item — that is our mistake to fix.
      </p>

      <h2 style={{ fontSize: 19, marginTop: 24 }}>Refunds</h2>
      <p>
        Once the piece reaches us and we have checked it, we refund within 5–7 working days.
        Prepaid orders go back to the original payment method. Cash-on-delivery orders are
        refunded by UPI or bank transfer, since there is no card to reverse.
      </p>

      <p className="small muted" style={{ marginTop: 32 }}>
        This policy is under review before launch and may change.
      </p>
    </StaticPage>
  );
}

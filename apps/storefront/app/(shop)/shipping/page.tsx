import type { Metadata } from "next";
import { StaticPage } from "@/components/static-page";

export const metadata: Metadata = {
  title: "Shipping",
  description: "Where we ship, how long it takes, and what it costs.",
};

export default function ShippingPage() {
  return (
    <StaticPage title="Shipping" lead="We ship across India.">
      <h2 style={{ fontSize: 19, marginTop: 24 }}>Delivery time</h2>
      <p>
        Ready-made pieces are dispatched within 1–2 working days. Handmade pieces are made to
        order — the lead time is shown on the product page before you buy, and the clock starts
        after that.
      </p>
      <p>
        Delivery is typically 2–4 working days to metros and 4–8 days elsewhere. Remote pincodes
        and the Northeast can take longer.
      </p>

      <h2 style={{ fontSize: 19, marginTop: 24 }}>Cost</h2>
      <p>
        The shipping fee and estimated delivery date are calculated from your pincode and shown
        at checkout <strong>before you pay</strong> — never as a surprise at the end.
      </p>

      <h2 style={{ fontSize: 19, marginTop: 24 }}>Cash on delivery</h2>
      <p>
        Available on most pincodes up to an order value limit. COD orders are confirmed before
        dispatch, so please keep your phone reachable after ordering.
      </p>

      <h2 style={{ fontSize: 19, marginTop: 24 }}>Tracking</h2>
      <p>
        You will get a tracking link once the parcel is handed to the courier. You can also
        check any order from the Track order page using your phone number and order number — no
        account needed.
      </p>

      <p className="small muted" style={{ marginTop: 32 }}>
        This policy is under review before launch and may change.
      </p>
    </StaticPage>
  );
}

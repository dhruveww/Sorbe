import type { Metadata } from "next";
import { TrackOrderForm } from "@/components/track-order-form";
import { StaticPage } from "@/components/static-page";

export const metadata: Metadata = {
  title: "Track order",
  description: "Check where your order is.",
  robots: { index: false },
};

export default function TrackOrderPage() {
  return (
    <StaticPage
      title="Track order"
      lead="Your order number and the mobile number you used. No account needed."
    >
      <TrackOrderForm />
    </StaticPage>
  );
}

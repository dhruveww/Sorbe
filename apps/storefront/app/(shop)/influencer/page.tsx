import type { Metadata } from "next";
import { getFlags } from "@sorbe/config";
import { ComingSoon, StaticPage } from "@/components/static-page";

export const metadata: Metadata = {
  title: "Influencer collaborations",
  description: "Collaborate with us on bag charm collections.",
};

export default function InfluencerPage() {
  if (!getFlags().influencerPageLive) {
    return (
      <ComingSoon
        title="Influencer collaborations"
        lead="Work with us on a charm collection."
        detail="We are opening collaborations with creators and bag brands. This page will explain how to apply and what we offer."
      />
    );
  }

  return <StaticPage title="Influencer collaborations" />;
}

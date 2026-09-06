import type { Metadata } from "next";
import { getFlags } from "@sorbe/config";
import { ComingSoon, StaticPage } from "@/components/static-page";
import { getSection } from "@/lib/content";

export const metadata: Metadata = {
  title: "Influencer collaborations",
  description: "Collaborate with us on bag charm collections.",
};

export const dynamic = "force-dynamic";

export default async function InfluencerPage() {
  const cms = await getSection("coming_soon_influencer");
  if (!getFlags().influencerPageLive) {
    return (
      <ComingSoon
        title="Influencer collaborations"
        lead="Work with us on a charm collection."
        detail="We are opening collaborations with creators and bag brands. This page will explain how to apply and what we offer."
        cmsHtml={cms?.body_html}
      />
    );
  }

  return <StaticPage title="Influencer collaborations" />;
}

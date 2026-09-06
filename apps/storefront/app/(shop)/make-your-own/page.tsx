import type { Metadata } from "next";
import { getFlags } from "@sorbe/config";
import { ComingSoon, StaticPage } from "@/components/static-page";
import { getSection } from "@/lib/content";

export const metadata: Metadata = {
  title: "Make your own charm",
  description: "Design a bag charm from your own choice of parts.",
};

export const dynamic = "force-dynamic";

export default async function MakeYourOwnPage() {
  const cms = await getSection("coming_soon_myoc");
  if (!getFlags().myocPageLive) {
    return (
      <ComingSoon
        title="Make your own charm"
        lead="Pick the parts, we build it."
        detail="A build-your-own charm tool is in the works — choose the base, beads, finish and clasp, and we make it to order."
        cmsHtml={cms?.body_html}
      />
    );
  }

  return <StaticPage title="Make your own charm" />;
}

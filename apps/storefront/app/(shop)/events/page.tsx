import type { Metadata } from "next";
import { getFlags } from "@sorbe/config";
import { ComingSoon, StaticPage } from "@/components/static-page";
import { getSection } from "@/lib/content";

export const metadata: Metadata = {
  title: "Events",
  description: "Exhibitions, pop-ups and DIY charm workshops.",
};

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const cms = await getSection("coming_soon_events");
  if (!getFlags().eventsPageLive) {
    return (
      <ComingSoon
        title="Events"
        lead="Exhibitions, pop-ups and DIY charm workshops."
        detail="We are planning our first pop-ups and workshops. This page will list dates, cities and how to book."
        cmsHtml={cms?.body_html}
      />
    );
  }

  return <StaticPage title="Events" lead="Exhibitions, pop-ups and DIY charm workshops." />;
}

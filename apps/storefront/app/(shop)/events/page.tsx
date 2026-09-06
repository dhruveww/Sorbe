import type { Metadata } from "next";
import { getFlags } from "@sorbe/config";
import { ComingSoon, StaticPage } from "@/components/static-page";

export const metadata: Metadata = {
  title: "Events",
  description: "Exhibitions, pop-ups and DIY charm workshops.",
};

export default function EventsPage() {
  if (!getFlags().eventsPageLive) {
    return (
      <ComingSoon
        title="Events"
        lead="Exhibitions, pop-ups and DIY charm workshops."
        detail="We are planning our first pop-ups and workshops. This page will list dates, cities and how to book."
      />
    );
  }

  return <StaticPage title="Events" lead="Exhibitions, pop-ups and DIY charm workshops." />;
}

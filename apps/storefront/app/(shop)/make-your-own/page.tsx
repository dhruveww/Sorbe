import type { Metadata } from "next";
import { getFlags } from "@sorbe/config";
import { ComingSoon, StaticPage } from "@/components/static-page";

export const metadata: Metadata = {
  title: "Make your own charm",
  description: "Design a bag charm from your own choice of parts.",
};

export default function MakeYourOwnPage() {
  if (!getFlags().myocPageLive) {
    return (
      <ComingSoon
        title="Make your own charm"
        lead="Pick the parts, we build it."
        detail="A build-your-own charm tool is in the works — choose the base, beads, finish and clasp, and we make it to order."
      />
    );
  }

  return <StaticPage title="Make your own charm" />;
}

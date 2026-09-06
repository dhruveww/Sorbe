import { getFlags } from "@sorbe/config";
import { getActivePopup } from "@/lib/content";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { OfferPopup } from "@/components/offer-popup";

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const flags = getFlags();
  // Fetched on the server so the popup costs the browser no round trip, and
  // renders nothing at all when there is no active offer.
  const popup = flags.popups ? await getActivePopup() : null;

  return (
    <>
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
      {popup ? (
        <OfferPopup
          id={popup.id}
          title={popup.title}
          bodyText={popup.body_text}
          ctaLabel={popup.cta_label}
          ctaUrl={popup.cta_url}
          displayMode={popup.display_mode}
        />
      ) : null}
    </>
  );
}

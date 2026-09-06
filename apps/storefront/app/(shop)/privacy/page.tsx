import type { Metadata } from "next";
import { getBrand } from "@sorbe/config";
import { StaticPage } from "@/components/static-page";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What we collect, why, and how to have it removed.",
};

/** DPDP Act expects a plain statement of what is collected and a named
 *  grievance officer. Both come from env so they stay in one place. */
export default function PrivacyPage() {
  const brand = getBrand();

  return (
    <StaticPage title="Privacy" lead="What we collect, why, and how to get it removed.">
      <h2 style={{ fontSize: 19, marginTop: 24 }}>What we collect</h2>
      <ul>
        <li>
          <strong>Name, mobile number and email.</strong> Needed to place and track an order.
          Your mobile number is how we identify your orders.
        </li>
        <li>
          <strong>Delivery address and pincode.</strong> To calculate shipping and deliver.
        </li>
        <li>
          <strong>Order and payment status.</strong> We never see or store your card, UPI PIN
          or bank details — the payment provider handles those.
        </li>
        <li>
          <strong>WhatsApp opt-in, if you give it.</strong> Recorded with the date and where you
          gave it, so we can prove consent and you can withdraw it.
        </li>
      </ul>

      <h2 style={{ fontSize: 19, marginTop: 24 }}>What we do not do</h2>
      <p>
        We do not sell your data. We do not message you on WhatsApp unless you opted in, and
        even then there are hard limits on how often.
      </p>

      <h2 style={{ fontSize: 19, marginTop: 24 }}>Cookies</h2>
      <p>
        We use a small number of strictly necessary cookies to keep your bag and your login
        working. There is no advertising tracker on this site.
      </p>

      <h2 style={{ fontSize: 19, marginTop: 24 }}>Getting your data removed</h2>
      <p>
        Write to us and we will delete what we are not legally required to keep. Tax law
        requires us to retain invoice records.
      </p>

      <h2 style={{ fontSize: 19, marginTop: 24 }}>Grievance officer</h2>
      <p>
        {brand.grievanceOfficerName || "To be appointed"}
        {brand.grievanceOfficerEmail ? ` — ${brand.grievanceOfficerEmail}` : ""}
      </p>

      <p className="small muted" style={{ marginTop: 32 }}>
        This policy is under review before launch and may change.
      </p>
    </StaticPage>
  );
}

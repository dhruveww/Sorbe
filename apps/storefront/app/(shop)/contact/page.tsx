import type { Metadata } from "next";
import { getBrand } from "@sorbe/config";
import { StaticPage } from "@/components/static-page";

export const metadata: Metadata = {
  title: "Contact",
  description: "How to reach us, and who operates this store.",
};

export default function ContactPage() {
  const brand = getBrand();

  return (
    <StaticPage title="Contact" lead="We are a two-person studio, so you reach us directly.">
      <dl style={{ lineHeight: 2 }}>
        <div>
          <strong>Legal name:</strong> {brand.legalName}
        </div>
        {brand.supportEmail ? (
          <div>
            <strong>Email:</strong>{" "}
            <a href={`mailto:${brand.supportEmail}`}>{brand.supportEmail}</a>
          </div>
        ) : null}
        {brand.supportPhone ? (
          <div>
            <strong>Phone:</strong> <a href={`tel:${brand.supportPhone}`}>{brand.supportPhone}</a>
          </div>
        ) : null}
        {brand.registeredAddress ? (
          <div>
            <strong>Address:</strong> {brand.registeredAddress}
          </div>
        ) : null}
        {brand.gstin ? (
          <div>
            <strong>GSTIN:</strong> {brand.gstin}
          </div>
        ) : null}
      </dl>

      <h2 style={{ fontSize: 19, marginTop: 28 }}>Grievance officer</h2>
      <p className="muted">
        {brand.grievanceOfficerName || "To be appointed"}
        {brand.grievanceOfficerEmail ? ` — ${brand.grievanceOfficerEmail}` : ""}
      </p>

      <p className="small muted" style={{ marginTop: 32 }}>
        Contact details are placeholders until launch.
      </p>
    </StaticPage>
  );
}

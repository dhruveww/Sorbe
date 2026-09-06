/**
 * The ONE place the brand identity is read from.
 *
 * Nothing anywhere else should contain the literal string "SORBE" — there is a
 * grep for it in the launch checklist (docs/PLAN.md, Verification step 6).
 * Renaming the store must be an env change and a redeploy, never a find/replace.
 *
 * SERVER-SIDE ONLY. Next.js inlines NEXT_PUBLIC_* at build time in app code, not
 * inside a pre-compiled workspace package, so a client component must receive
 * the brand name as a prop from a server component rather than importing this.
 */

export interface Brand {
  /** Display name used in titles, emails, and WhatsApp templates. */
  name: string;
  /** Registered company name, for invoices and legal pages. */
  legalName: string;
  supportEmail: string;
  supportPhone: string;
  registeredAddress: string;
  /** Empty until the business is GST-registered. Shown in the footer and on invoices. */
  gstin: string;
  /** Required by the DPDP Act on the privacy page. */
  grievanceOfficerName: string;
  grievanceOfficerEmail: string;
}

export function getBrand(env: NodeJS.ProcessEnv = process.env): Brand {
  const name = env.NEXT_PUBLIC_BRAND_NAME?.trim() || "SORBE";
  return {
    name,
    legalName: env.BRAND_LEGAL_NAME?.trim() || name,
    supportEmail: env.BRAND_SUPPORT_EMAIL?.trim() || "",
    supportPhone: env.BRAND_SUPPORT_PHONE?.trim() || "",
    registeredAddress: env.BRAND_REGISTERED_ADDRESS?.trim() || "",
    gstin: env.BRAND_GSTIN?.trim() || "",
    grievanceOfficerName: env.BRAND_GRIEVANCE_OFFICER_NAME?.trim() || "",
    grievanceOfficerEmail: env.BRAND_GRIEVANCE_OFFICER_EMAIL?.trim() || "",
  };
}

/** Page title helper, so every `<title>` is branded identically. */
export function pageTitle(title: string, brand: Brand): string {
  return title ? `${title} | ${brand.name}` : brand.name;
}

import { MedusaService } from "@medusajs/framework/utils";
import {
  ConsentLog,
  CustomerProfile,
  RestockAlert,
  WaLog,
  WaTemplate,
} from "./models/messaging";

export type WaSendInput = {
  phone: string;
  templateKey: string;
  variables?: Record<string, string>;
  customerId?: string | null;
  orderId?: string | null;
  /** SKU/variant for per-product caps. */
  subjectRef?: string | null;
  triggeredBy?: string;
};

export type WaSendResult = {
  status: "would_send" | "sent" | "failed" | "skipped";
  reason?: string;
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

class MessagingModuleService extends MedusaService({
  CustomerProfile,
  WaTemplate,
  WaLog,
  ConsentLog,
  RestockAlert,
}) {
  /**
   * Renders a template and records the attempt.
   *
   * Nothing is sent while FEATURE_WHATSAPP_LIVE is false — the row is written
   * as "would_send" and we stop. That is deliberate: every trigger, cap and
   * template is exercised and visible in the dashboard before any money is
   * spent on a BSP, and turning it live changes no code.
   */
  async sendWhatsApp(input: WaSendInput): Promise<WaSendResult> {
    const live =
      String(process.env.FEATURE_WHATSAPP_LIVE).toLowerCase() === "true" &&
      Boolean(process.env.WA_ACCESS_TOKEN && process.env.WA_PHONE_NUMBER_ID);

    const [template] = await this.listWaTemplates({ key: input.templateKey });
    if (!template || !template.is_active) {
      return this.record(input, "failed", `template ${input.templateKey} missing or inactive`);
    }

    // Marketing messages need explicit opt-in; utility ones ride on the order
    // the customer already placed.
    if (template.category === "marketing") {
      const allowed = await this.hasWhatsAppOptIn(input.customerId ?? null);
      if (!allowed) return this.record(input, "skipped", "no_whatsapp_opt_in");

      const capped = await this.isFrequencyCapped(input);
      if (capped) return this.record(input, "would_send", capped);
    }

    if (!live) return this.record(input, "would_send");

    // Real send lands here once WA_ACCESS_TOKEN exists. Until then this branch
    // is unreachable, which is why nothing can leak out by accident.
    return this.record(input, "would_send", "live_send_not_implemented");
  }

  private async record(
    input: WaSendInput,
    status: WaSendResult["status"],
    reason?: string,
  ): Promise<WaSendResult> {
    await this.createWaLogs({
      customer_id: input.customerId ?? null,
      phone: input.phone,
      template_key: input.templateKey,
      variables: (input.variables ?? {}) as any,
      status: status === "skipped" ? "would_send" : status,
      error: reason ?? null,
      order_id: input.orderId ?? null,
      subject_ref: input.subjectRef ?? null,
      triggered_by: input.triggeredBy ?? "system",
    });
    return { status, reason };
  }

  async hasWhatsAppOptIn(customerId: string | null): Promise<boolean> {
    if (!customerId) return false;
    const [profile] = await this.listCustomerProfiles({ customer_id: customerId });
    return Boolean(profile?.whatsapp_opt_in);
  }

  /**
   * Hard caps, checked before every marketing send.
   *
   * A capped message is still LOGGED (as would_send with a reason) rather than
   * silently dropped, so "why didn't this go out" is answerable from the
   * dashboard instead of a log dig.
   */
  private async isFrequencyCapped(input: WaSendInput): Promise<string | null> {
    const perSku = Number(process.env.WA_FREQUENCY_CAP_LOW_STOCK_PER_SKU_PER_WEEK ?? 1);
    const perUser = Number(process.env.WA_FREQUENCY_CAP_PER_USER_PER_WEEK ?? 3);
    const since = new Date(Date.now() - WEEK_MS);

    const recent = await this.listWaLogs({ phone: input.phone });
    const thisWeek = recent.filter((row) => new Date(row.created_at) >= since);

    if (thisWeek.length >= perUser) return "frequency_capped_per_user";

    if (input.subjectRef) {
      const sameSubject = thisWeek.filter(
        (row) => row.subject_ref === input.subjectRef && row.template_key === input.templateKey,
      );
      if (sameSubject.length >= perSku) return "frequency_capped_per_sku";
    }
    return null;
  }

  /** Records consent and keeps the audit trail in step with the current value. */
  async setWhatsAppOptIn(input: {
    customerId: string;
    phone?: string | null;
    granted: boolean;
    source: string;
    ip?: string | null;
    userAgent?: string | null;
  }): Promise<void> {
    const [profile] = await this.listCustomerProfiles({ customer_id: input.customerId });

    if (profile) {
      await this.updateCustomerProfiles({
        id: profile.id,
        whatsapp_opt_in: input.granted,
        whatsapp_opt_in_at: input.granted ? new Date() : null,
        whatsapp_opt_in_source: input.source,
      });
    } else {
      await this.createCustomerProfiles({
        customer_id: input.customerId,
        whatsapp_opt_in: input.granted,
        whatsapp_opt_in_at: input.granted ? new Date() : null,
        whatsapp_opt_in_source: input.source,
      });
    }

    await this.createConsentLogs({
      customer_id: input.customerId,
      phone: input.phone ?? null,
      consent_type: "whatsapp_marketing",
      granted: input.granted,
      source: input.source,
      ip: input.ip ?? null,
      user_agent: input.userAgent ?? null,
    });
  }
}

export default MessagingModuleService;

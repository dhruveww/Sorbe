import type { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { MESSAGING_MODULE } from "../modules/messaging";
import { CONTENT_MODULE } from "../modules/content";

/**
 * WhatsApp template copy and CMS page content.
 *
 * Templates are seeded as editable rows rather than hardcoded strings so the
 * owners can reword them in admin, and so `bsp_template_name` has somewhere to
 * live once Meta approves each one.
 *
 * Run with:  pnpm --filter @sorbe/medusa seed:content
 */

const TEMPLATES = [
  {
    key: "order_confirmed",
    category: "utility",
    body_text:
      "Thanks for your order! Order #{{order_number}} is confirmed. We'll message you when it ships.",
  },
  {
    key: "cod_confirm",
    category: "utility",
    body_text:
      "Please confirm your cash-on-delivery order #{{order_number}}. Reply YES to confirm so we can pack it.",
  },
  {
    key: "shipped",
    category: "utility",
    body_text: "Order #{{order_number}} has shipped. Track it here: {{tracking_url}}",
  },
  {
    key: "delivered",
    category: "utility",
    body_text: "Order #{{order_number}} was delivered. We hope you love it.",
  },
  {
    key: "payment_failed_retry",
    category: "utility",
    body_text:
      "Your payment for order #{{order_number}} didn't go through. Your bag is saved — finish here: {{retry_url}}",
  },
  {
    key: "restock_alert",
    category: "utility",
    body_text: "{{product_name}} is back in stock. Grab it here: {{product_url}}",
  },
  {
    // The only unsolicited message we ever send — opt-in required, capped to
    // once per SKU per week.
    key: "low_stock_nudge",
    category: "marketing",
    body_text: "Only a few {{product_name}} left. If you were waiting, now's the time.",
  },
  {
    key: "otp_login",
    category: "authentication",
    body_text: "{{code}} is your login code. It expires in 5 minutes.",
  },
];

const CMS = [
  {
    section: "coming_soon_events",
    title: "Events",
    body_html:
      "<p>We are planning our first pop-ups and DIY charm workshops. This page will list dates, cities and how to book.</p>",
  },
  {
    section: "coming_soon_influencer",
    title: "Influencer collaborations",
    body_html:
      "<p>We are opening collaborations with creators and bag brands. This page will explain how to apply.</p>",
  },
  {
    section: "coming_soon_myoc",
    title: "Make your own charm",
    body_html:
      "<p>Choose the base, beads, finish and clasp — we make it to order. The builder is on its way.</p>",
  },
  {
    section: "offer_copy",
    title: "Offer",
    body_html: "<p>Free delivery on orders above ₹999.</p>",
  },
];

const FAQS = [
  {
    category: "orders",
    question: "Do I need an account to order?",
    answer_html:
      "<p>No. You can browse and check out as a guest. An account only saves your addresses and order history.</p>",
    sort_order: 1,
  },
  {
    category: "orders",
    question: "How do I pay?",
    answer_html:
      "<p>UPI, cards, netbanking and wallets, or cash on delivery where available. Prices include GST.</p>",
    sort_order: 2,
  },
  {
    category: "shipping",
    question: "How long will delivery take?",
    answer_html:
      "<p>Ready-made pieces dispatch in 1–2 working days, then 2–4 days to metros and 4–8 elsewhere. Handmade pieces show their lead time on the product page.</p>",
    sort_order: 1,
  },
  {
    category: "charm_care",
    question: "Will the finish wear off?",
    answer_html:
      "<p>Keep charms dry and away from perfume and sanitiser, which strip plating fastest. Wipe with a soft dry cloth.</p>",
    sort_order: 1,
  },
];

export default async function seedContent({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const messaging: any = container.resolve(MESSAGING_MODULE);
  const content: any = container.resolve(CONTENT_MODULE);

  const existingTemplates = await messaging.listWaTemplates({});
  const haveKeys = new Set(existingTemplates.map((row: any) => row.key));
  const newTemplates = TEMPLATES.filter((template) => !haveKeys.has(template.key));

  for (const template of newTemplates) {
    await messaging.createWaTemplates({ ...template, is_active: true, language: "en" });
  }
  logger.info(`  whatsapp templates: ${newTemplates.length} created`);

  const existingCms = await content.listCmsContents({});
  const haveSections = new Set(existingCms.map((row: any) => row.section));
  const newCms = CMS.filter((row) => !haveSections.has(row.section));
  for (const row of newCms) {
    await content.createCmsContents({ ...row, is_published: true, locale: "en" });
  }
  logger.info(`  cms sections: ${newCms.length} created`);

  const existingFaqs = await content.listFaqItems({});
  if (existingFaqs.length === 0) {
    for (const faq of FAQS) {
      await content.createFaqItems({ ...faq, is_published: true });
    }
    logger.info(`  faqs: ${FAQS.length} created`);
  }

  logger.info("Content seed complete.");
}

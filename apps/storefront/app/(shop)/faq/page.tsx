import type { Metadata } from "next";
import { StaticPage } from "@/components/static-page";
import { JsonLd, faqSchema } from "@/components/json-ld";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Common questions about orders, shipping and charm care.",
};

/** Moves to `store_faq_item` in M7 so the owners can edit these in admin. */
const FAQS = [
  {
    group: "Orders",
    items: [
      {
        question: "Do I need an account to order?",
        answer:
          "No. You can browse and check out as a guest. An account only saves your addresses and order history for next time.",
      },
      {
        question: "How do I pay?",
        answer:
          "UPI, cards, netbanking and wallets, or cash on delivery where available. Prices include GST.",
      },
      {
        question: "Can I change my order after placing it?",
        answer:
          "Message us as soon as you can. If the parcel has not been handed to the courier we can usually still change it.",
      },
    ],
  },
  {
    group: "Shipping",
    items: [
      {
        question: "How long will delivery take?",
        answer:
          "Ready-made pieces dispatch in 1–2 working days, then 2–4 days to metros and 4–8 elsewhere. Handmade pieces show their lead time on the product page.",
      },
      {
        question: "How do I track my order?",
        answer:
          "Use the Track order page with your phone number and order number. No login needed.",
      },
    ],
  },
  {
    group: "Charm care",
    items: [
      {
        question: "Will the finish wear off?",
        answer:
          "Keep charms dry and away from perfume and sanitiser, which strip plating fastest. Wipe with a soft dry cloth. Solid brass pieces can be gently polished; plated ones should not be.",
      },
      {
        question: "Will my handmade charm look exactly like the photo?",
        answer:
          "Very close, but not identical. Beads are sorted by eye and each run differs slightly — that is the point of a handmade piece.",
      },
    ],
  },
];

export default function FaqPage() {
  const flat = FAQS.flatMap((group) => group.items);

  return (
    <StaticPage title="FAQ" lead="Orders, shipping and looking after your charms.">
      <JsonLd data={faqSchema(flat)} />
      {FAQS.map((group) => (
        <section key={group.group} style={{ marginTop: 28 }}>
          <h2 style={{ fontSize: 19 }}>{group.group}</h2>
          {group.items.map((item) => (
            <details
              key={item.question}
              style={{ borderBottom: "1px solid var(--border)", padding: "12px 0" }}
            >
              <summary style={{ cursor: "pointer", fontWeight: 500 }}>{item.question}</summary>
              <p className="muted" style={{ margin: "8px 0 0" }}>
                {item.answer}
              </p>
            </details>
          ))}
        </section>
      ))}
    </StaticPage>
  );
}

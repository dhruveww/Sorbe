import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { COMMERCE_OPS_MODULE } from "../modules/commerce-ops";
import { MESSAGING_MODULE } from "../modules/messaging";

/**
 * Everything that must happen once an order exists: record its state, mint the
 * GST invoice, and queue the confirmation message.
 *
 * Lives in a subscriber rather than the checkout route so it runs no matter how
 * the order was created — browser callback, Razorpay webhook, or an admin
 * placing one by hand. All three paths converge on order.placed.
 *
 * Every step is idempotent, because a retried webhook can fire this twice.
 */
export default async function orderPlacedHandler({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const ops: any = container.resolve(COMMERCE_OPS_MODULE);
  const messaging: any = container.resolve(MESSAGING_MODULE);

  const orderId = event.data.id;

  const { data: orders } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "display_id",
      "email",
      "total",
      "item_subtotal",
      "shipping_total",
      "discount_total",
      "customer_id",
      "payment_collections.status",
      "shipping_address.province",
      "shipping_address.phone",
      "items.title",
      "items.quantity",
    ],
    filters: { id: orderId },
  });

  const order: any = orders[0];
  if (!order) {
    logger.warn(`[order-placed] order ${orderId} not found`);
    return;
  }

  // --- state ------------------------------------------------------------------
  // COD orders are NOT confirmed on placement — someone has to call the
  // customer first. Prepaid orders are paid the moment the order exists.
  const paid = (order.payment_collections ?? []).some(
    (collection: any) => collection?.status === "authorized" || collection?.status === "captured",
  );
  const state = paid ? "paid" : "cod_pending";

  await ops.recordState({ orderId, state, changedBy: "system" });

  // --- invoice ----------------------------------------------------------------
  // order_id is unique on the invoice table, so a duplicate event cannot mint a
  // second invoice number for one sale — that would be an accounting problem,
  // not just a duplicate row.
  try {
    const gstRate = Number(process.env.DEFAULT_GST_RATE_PERCENT ?? 18);
    await ops.createInvoiceForOrder({
      orderId,
      subtotalPaise: order.item_subtotal ?? 0,
      shippingPaise: order.shipping_total ?? 0,
      discountPaise: order.discount_total ?? 0,
      totalPaise: order.total ?? 0,
      gstRatePercent: gstRate,
      buyerStateName: order.shipping_address?.province ?? null,
      hsnSummary: (order.items ?? []).map((item: any) => ({
        title: item.title,
        quantity: item.quantity,
      })),
    });
  } catch (error) {
    // An invoice failure must never roll back an order the customer has paid
    // for. Log loudly and let an owner regenerate it from admin.
    logger.error(`[order-placed] invoice failed for ${orderId}: ${error}`);
  }

  // --- confirmation message ---------------------------------------------------
  const phone = String(order.shipping_address?.phone ?? "").replace(/\D/g, "").slice(-10);
  if (phone) {
    await messaging
      .sendWhatsApp({
        phone,
        templateKey: paid ? "order_confirmed" : "cod_confirm",
        customerId: order.customer_id ?? null,
        orderId,
        variables: {
          order_number: String(order.display_id),
          total: String(order.total ?? 0),
        },
      })
      .catch((error: unknown) => {
        logger.error(`[order-placed] whatsapp log failed for ${orderId}: ${error}`);
      });
  }

  logger.info(`[order-placed] ${orderId} -> ${state}`);
}

export const config: SubscriberConfig = {
  event: "order.placed",
};

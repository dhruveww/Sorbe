import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

/**
 * Guest order tracking: order number PLUS the phone it was placed with.
 *
 * Both are required. A display_id is a small sequential number and would be
 * trivially enumerable on its own, which would expose customers' addresses.
 * The phone is compared server-side and never echoed back.
 *
 * The response is deliberately narrow — status and items, no address lines
 * beyond the city, and no email.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

  const displayId = Number.parseInt(String(req.query.display_id ?? ""), 10);
  const phone = String(req.query.phone ?? "").replace(/\D/g, "").slice(-10);

  if (!Number.isInteger(displayId) || displayId <= 0 || phone.length !== 10) {
    res.status(400).json({ message: "Enter your order number and mobile number" });
    return;
  }

  const { data: orders } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "display_id",
      "status",
      "payment_status",
      "fulfillment_status",
      "created_at",
      "total",
      "shipping_total",
      "items.title",
      "items.quantity",
      "shipping_address.phone",
      "shipping_address.city",
    ],
    filters: { display_id: displayId },
  });

  const order: any = orders[0];
  const phoneOnOrder = String(order?.shipping_address?.phone ?? "")
    .replace(/\D/g, "")
    .slice(-10);

  // One message for "no such order" and "wrong phone" alike, so the endpoint
  // cannot be used to test which order numbers exist.
  if (!order || phoneOnOrder !== phone) {
    res.status(404).json({ message: "We couldn't find that order. Check the details." });
    return;
  }

  res.json({
    order: {
      display_id: order.display_id,
      status: order.status,
      payment_status: order.payment_status,
      fulfillment_status: order.fulfillment_status,
      created_at: order.created_at,
      total: order.total,
      shipping_total: order.shipping_total,
      city: order.shipping_address?.city ?? null,
      items: (order.items ?? []).map((item: any) => ({
        title: item.title,
        quantity: item.quantity,
      })),
    },
  });
};

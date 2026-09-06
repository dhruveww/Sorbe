import { timingSafeEqual } from "node:crypto";
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

/**
 * Order history for one customer.
 *
 * Internal: the Next.js server has already resolved the session to a customer
 * id, so the customer id arrives here trusted. It is never taken from a query
 * string the browser controls — that would let anyone read anyone's orders.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const expected = process.env.MEDUSA_INTERNAL_AUTH_SECRET ?? "";
  const provided = (req.headers["x-internal-secret"] as string) ?? "";
  if (!expected || expected.length !== provided.length) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  if (!timingSafeEqual(Buffer.from(expected), Buffer.from(provided))) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const customerId = typeof req.query.customer_id === "string" ? req.query.customer_id : "";
  if (!customerId) {
    res.status(400).json({ message: "customer_id required" });
    return;
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const { data: orders } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "display_id",
      "total",
      "shipping_total",
      "created_at",
      "items.title",
      "items.quantity",
      "shipping_address.city",
    ],
    filters: { customer_id: customerId },
  });

  orders.sort(
    (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  res.json({ orders });
};

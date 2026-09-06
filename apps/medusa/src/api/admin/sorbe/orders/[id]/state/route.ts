import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { COMMERCE_OPS_MODULE } from "../../../../../../modules/commerce-ops";
import { MESSAGING_MODULE } from "../../../../../../modules/messaging";

/** Actions a packer may take. Anything else is owner-only. */
const PACKER_ALLOWED = new Set(["packed", "shipped", "confirmed"]);

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const ops: any = req.scope.resolve(COMMERCE_OPS_MODULE);
  const orderId = req.params.id;

  const timeline = await ops.listOrderStateLogs(
    { order_id: orderId },
    { order: { created_at: "ASC" } },
  );
  res.json({ timeline, current: timeline[timeline.length - 1]?.state ?? null });
};

/**
 * Moves an order to a new state.
 *
 * Role gating is enforced HERE, server-side. The admin UI also hides buttons a
 * packer may not use, but that is a convenience — hiding a button is not a
 * permission check, and anyone can call the API directly.
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const ops: any = req.scope.resolve(COMMERCE_OPS_MODULE);
  const messaging: any = req.scope.resolve(MESSAGING_MODULE);
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const userModule = req.scope.resolve(Modules.USER);

  const orderId = req.params.id;
  const body = (req.body ?? {}) as { state?: string; note?: string; tracking_url?: string };

  if (!body.state) {
    res.status(400).json({ message: "state is required" });
    return;
  }

  // Role comes from the authenticated admin user, never from the request body.
  const actorId = (req as any).auth_context?.actor_id as string | undefined;
  let role = "owner";
  if (actorId) {
    const [user] = await userModule.listUsers({ id: actorId });
    role = ((user?.metadata as any)?.role as string) ?? "owner";
  }

  if (role === "packer" && !PACKER_ALLOWED.has(body.state)) {
    res.status(403).json({
      message: "Packers can mark orders confirmed, packed or shipped only.",
    });
    return;
  }

  const result = await ops.recordState({
    orderId,
    state: body.state,
    changedBy: actorId ?? role,
    note: body.note ?? null,
  });

  if (!result.recorded && result.reason !== "unchanged") {
    // An illegal transition is a mistake worth surfacing, not silently ignoring.
    res.status(409).json({ message: result.reason });
    return;
  }

  // Tell the customer when something actually happened to their parcel.
  if (body.state === "shipped" || body.state === "delivered") {
    const { data: orders } = await query.graph({
      entity: "order",
      fields: ["id", "display_id", "customer_id", "shipping_address.phone"],
      filters: { id: orderId },
    });
    const order: any = orders[0];
    const phone = String(order?.shipping_address?.phone ?? "").replace(/\D/g, "").slice(-10);

    if (phone) {
      await messaging
        .sendWhatsApp({
          phone,
          templateKey: body.state,
          customerId: order.customer_id ?? null,
          orderId,
          variables: {
            order_number: String(order.display_id),
            tracking_url: body.tracking_url ?? "",
          },
          triggeredBy: actorId ?? role,
        })
        .catch(() => {});
    }
  }

  res.json({ ok: true, state: body.state });
};

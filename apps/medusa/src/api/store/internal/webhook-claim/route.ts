import { timingSafeEqual } from "node:crypto";
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { COMMERCE_OPS_MODULE } from "../../../../modules/commerce-ops";

/**
 * Durable webhook idempotency ledger.
 *
 * POST claims an event id (false = already seen), PATCH marks it finished.
 * Redis holds the fast lock during completion; this table is what survives a
 * Redis flush and a Razorpay retry hours later.
 *
 * Internal only — reachable with MEDUSA_INTERNAL_AUTH_SECRET.
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  if (!authorised(req)) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const body = (req.body ?? {}) as {
    event_id?: string;
    event_type?: string;
    payload?: unknown;
  };
  if (!body.event_id) {
    res.status(400).json({ message: "event_id required" });
    return;
  }

  const ops: any = req.scope.resolve(COMMERCE_OPS_MODULE);
  const claimed = await ops.claimWebhookEvent({
    eventId: body.event_id,
    eventType: body.event_type,
    payload: body.payload,
  });

  res.json({ claimed });
};

export const PATCH = async (req: MedusaRequest, res: MedusaResponse) => {
  if (!authorised(req)) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const body = (req.body ?? {}) as { event_id?: string; error?: string };
  if (!body.event_id) {
    res.status(400).json({ message: "event_id required" });
    return;
  }

  const ops: any = req.scope.resolve(COMMERCE_OPS_MODULE);
  await ops.markWebhookProcessed(body.event_id, body.error);
  res.json({ ok: true });
};

function authorised(req: MedusaRequest): boolean {
  const expected = process.env.MEDUSA_INTERNAL_AUTH_SECRET ?? "";
  const provided = (req.headers["x-internal-secret"] as string) ?? "";
  if (!expected || expected.length !== provided.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
}

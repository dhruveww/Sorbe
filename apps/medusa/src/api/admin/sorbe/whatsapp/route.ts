import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import { MESSAGING_MODULE } from "../../../../modules/messaging";

/**
 * WhatsApp dashboard data: templates, recent sends, and whether sending is
 * actually live.
 *
 * While FEATURE_WHATSAPP_LIVE is false the log is full of "would_send" rows —
 * that is the point. Every trigger and cap is visible and testable before a
 * rupee is spent on a BSP.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const messaging: any = req.scope.resolve(MESSAGING_MODULE);

  const [templates, logs] = await Promise.all([
    messaging.listWaTemplates({}),
    messaging.listWaLogs({}, { order: { created_at: "DESC" }, take: 100 }),
  ]);

  const counts: Record<string, number> = {};
  for (const row of logs) counts[row.status] = (counts[row.status] ?? 0) + 1;

  res.json({
    live:
      String(process.env.FEATURE_WHATSAPP_LIVE).toLowerCase() === "true" &&
      Boolean(process.env.WA_ACCESS_TOKEN && process.env.WA_PHONE_NUMBER_ID),
    provider: process.env.WA_PROVIDER ?? "mock",
    caps: {
      per_sku_per_week: Number(process.env.WA_FREQUENCY_CAP_LOW_STOCK_PER_SKU_PER_WEEK ?? 1),
      per_user_per_week: Number(process.env.WA_FREQUENCY_CAP_PER_USER_PER_WEEK ?? 3),
    },
    templates: templates.sort((a: any, b: any) => a.key.localeCompare(b.key)),
    counts,
    logs,
  });
};

/**
 * Edit template copy. Owner only — a packer changing the words that go out to
 * every customer is not a packing task.
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const messaging: any = req.scope.resolve(MESSAGING_MODULE);
  const userModule = req.scope.resolve(Modules.USER);

  const actorId = (req as any).auth_context?.actor_id as string | undefined;
  if (actorId) {
    const [user] = await userModule.listUsers({ id: actorId });
    const role = ((user?.metadata as any)?.role as string) ?? "owner";
    if (role === "packer") {
      res.status(403).json({ message: "Only an owner can edit message templates." });
      return;
    }
  }

  const body = (req.body ?? {}) as {
    key?: string;
    body_text?: string;
    is_active?: boolean;
    bsp_template_name?: string;
  };

  if (!body.key) {
    res.status(400).json({ message: "key is required" });
    return;
  }

  const [template] = await messaging.listWaTemplates({ key: body.key });
  if (!template) {
    res.status(404).json({ message: "No such template" });
    return;
  }

  await messaging.updateWaTemplates({
    id: template.id,
    ...(body.body_text !== undefined ? { body_text: body.body_text } : {}),
    ...(body.is_active !== undefined ? { is_active: body.is_active } : {}),
    ...(body.bsp_template_name !== undefined
      ? { bsp_template_name: body.bsp_template_name }
      : {}),
    updated_by: actorId ?? "owner",
  });

  res.json({ ok: true });
};

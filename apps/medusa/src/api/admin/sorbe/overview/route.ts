import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { COMMERCE_OPS_MODULE } from "../../../../modules/commerce-ops";

/**
 * The numbers the owners actually open the dashboard for: what came in today,
 * what needs packing, what needs a phone call, and what is about to run out.
 *
 * Admin routes are authenticated by Medusa before they reach here.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const ops: any = req.scope.resolve(COMMERCE_OPS_MODULE);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const { data: orders } = await query.graph({
    entity: "order",
    fields: ["id", "display_id", "total", "created_at", "email"],
    filters: {},
  });

  const todays = orders.filter((order: any) => new Date(order.created_at) >= startOfToday);
  const salesTodayPaise = todays.reduce(
    (sum: number, order: any) => sum + (Number(order.total) || 0),
    0,
  );

  // Latest state per order, so an order counts once and in its current state.
  const stateLogs = await ops.listOrderStateLogs({}, { order: { created_at: "DESC" } });
  const latestByOrder = new Map<string, string>();
  for (const entry of stateLogs) {
    if (!latestByOrder.has(entry.order_id)) latestByOrder.set(entry.order_id, entry.state);
  }

  const counts: Record<string, number> = {};
  for (const state of latestByOrder.values()) counts[state] = (counts[state] ?? 0) + 1;

  // Low stock: what is actually sellable, i.e. stocked minus already reserved.
  const { data: levels } = await query.graph({
    entity: "inventory_level",
    fields: ["stocked_quantity", "reserved_quantity", "inventory_item_id"],
    filters: {},
  });

  const lowStock = levels
    .map((level: any) => ({
      inventory_item_id: level.inventory_item_id,
      available: Number(level.stocked_quantity ?? 0) - Number(level.reserved_quantity ?? 0),
    }))
    .filter((level: any) => level.available <= 3)
    .sort((a: any, b: any) => a.available - b.available);

  res.json({
    sales_today_paise: salesTodayPaise,
    orders_today: todays.length,
    orders_total: orders.length,
    // These are the two queues an owner works through each morning.
    pending_cod: counts.cod_pending ?? 0,
    awaiting_packing: (counts.confirmed ?? 0) + (counts.paid ?? 0),
    packed: counts.packed ?? 0,
    shipped: counts.shipped ?? 0,
    states: counts,
    low_stock_count: lowStock.length,
    low_stock: lowStock.slice(0, 10),
  });
};

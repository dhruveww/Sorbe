import { timingSafeEqual } from "node:crypto";
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { addToCartWorkflow } from "@medusajs/medusa/core-flows";

/**
 * Internal: look up (or create) a customer by phone, attach the current cart to
 * them, and merge in anything left in an older cart.
 *
 * NOT public. It is reachable only with MEDUSA_INTERNAL_AUTH_SECRET, which
 * lives on the Next.js server. The OTP itself is verified there; by the time a
 * request reaches here, the caller has already proved they control the phone.
 *
 * Phone is the identity (spec hard constraint 3): email may be absent or may
 * change, but the number is how an order is found.
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  if (!isAuthorised(req)) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const body = (req.body ?? {}) as {
    phone?: string;
    email?: string;
    name?: string;
    cart_id?: string;
  };

  const phone = (body.phone ?? "").trim();
  if (!/^[6-9]\d{9}$/.test(phone)) {
    res.status(400).json({ message: "Invalid phone" });
    return;
  }

  const customerModule = req.scope.resolve(Modules.CUSTOMER);
  const cartModule = req.scope.resolve(Modules.CART);
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

  // --- customer: look up or create -------------------------------------------
  // Phone is not in Medusa's FilterableCustomerProps, so the lookup goes
  // through the graph query rather than listCustomers.
  const { data: found } = await query.graph({
    entity: "customer",
    fields: ["id", "email", "phone"],
    filters: { phone },
  });
  const existing: { id: string; email?: string | null } | undefined = found[0];

  async function resolveCustomer(): Promise<{ id: string; email?: string | null }> {
    if (existing) {
      // Fill in an email we did not have before, but never overwrite one.
      if (body.email && !existing.email) {
        await customerModule.updateCustomers(existing.id, { email: body.email.trim() });
        return { ...existing, email: body.email.trim() };
      }
      return existing;
    }

    const [first, ...rest] = (body.name ?? "").trim().split(/\s+/);
    const created = await customerModule.createCustomers({
      phone,
      email: body.email?.trim() || undefined,
      first_name: first || undefined,
      last_name: rest.join(" ") || undefined,
      has_account: true,
    });
    return Array.isArray(created) ? created[0]! : created;
  }

  const customer = await resolveCustomer();

  // --- cart: attach and merge -------------------------------------------------
  let cartId = body.cart_id ?? null;

  if (cartId) {
    const carts = await cartModule.listCarts({ id: cartId });
    if (carts.length === 0) {
      cartId = null;
    } else {
      await cartModule.updateCarts(cartId, {
        customer_id: customer.id,
        ...(customer.email ? { email: customer.email } : {}),
      });

      // Anything they left in a cart on another device, from a previous visit.
      // completed_at is filtered in JS: it is not a supported list operator.
      const priorCarts = await cartModule.listCarts({ customer_id: customer.id });

      const toMerge = priorCarts.filter(
        (cart) => cart.id !== cartId && !cart.completed_at && !cart.metadata?.merged_into,
      );

      for (const prior of toMerge) {
        const items = await cartModule.listLineItems({ cart_id: prior.id });
        if (items.length > 0) {
          await addToCartWorkflow(req.scope).run({
            input: {
              cart_id: cartId,
              // Medusa increments an existing line rather than duplicating it
              // when the same variant is already in the target cart.
              items: items.map((item: any) => ({
                variant_id: item.variant_id,
                quantity: item.quantity,
              })),
            },
          });
        }
        // Kept, never deleted — the merge stays auditable.
        await cartModule.updateCarts(prior.id, {
          metadata: { ...(prior.metadata ?? {}), merged_into: cartId },
        });
      }
    }
  }

  res.json({ customer_id: customer.id, cart_id: cartId });
};

function isAuthorised(req: MedusaRequest): boolean {
  const expected = process.env.MEDUSA_INTERNAL_AUTH_SECRET ?? "";
  const provided = (req.headers["x-internal-secret"] as string) ?? "";
  if (!expected || expected.length !== provided.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
}

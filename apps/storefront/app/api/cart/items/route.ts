import { NextResponse } from "next/server";
import { z } from "zod";
import { addLineItem, removeLineItem, updateLineItem } from "@/lib/cart";

export const dynamic = "force-dynamic";

/**
 * Cart line item mutations.
 *
 * The browser calls these; they call Medusa server-side. No Medusa key ever
 * reaches the client (docs/PLAN.md §2).
 */

const addSchema = z.object({
  variant_id: z.string().min(1),
  // A cap, because the field is user-controlled and a typo of 99999 would
  // otherwise try to reserve the entire stock.
  quantity: z.number().int().min(1).max(20).default(1),
});

const updateSchema = z.object({
  line_id: z.string().min(1),
  quantity: z.number().int().min(0).max(20),
});

const removeSchema = z.object({ line_id: z.string().min(1) });

export async function POST(request: Request) {
  const parsed = addSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid request" }, { status: 400 });
  }

  try {
    const cart = await addLineItem(parsed.data.variant_id, parsed.data.quantity);
    return NextResponse.json({ cart });
  } catch (error) {
    return failure(error, "Could not add that to your bag");
  }
}

export async function PATCH(request: Request) {
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid request" }, { status: 400 });
  }

  try {
    const cart = await updateLineItem(parsed.data.line_id, parsed.data.quantity);
    return NextResponse.json({ cart });
  } catch (error) {
    return failure(error, "Could not update your bag");
  }
}

export async function DELETE(request: Request) {
  const parsed = removeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid request" }, { status: 400 });
  }

  try {
    const cart = await removeLineItem(parsed.data.line_id);
    return NextResponse.json({ cart });
  } catch (error) {
    return failure(error, "Could not remove that item");
  }
}

/**
 * Medusa's own error text can name internal entities, so it is logged but never
 * returned. The customer gets a sentence they can act on.
 */
function failure(error: unknown, message: string) {
  console.error("[cart]", error);
  const detail = error instanceof Error ? error.message : "";
  // The one upstream error worth translating: it is the customer's answer.
  if (/insufficient|not enough|stock/i.test(detail)) {
    return NextResponse.json(
      { message: "Sorry — there isn't enough stock left for that." },
      { status: 409 },
    );
  }
  return NextResponse.json({ message }, { status: 500 });
}

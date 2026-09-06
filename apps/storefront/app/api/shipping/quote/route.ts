import { NextResponse } from "next/server";
import { pincodeSchema } from "@sorbe/validation";
import { getCart } from "@/lib/cart";
import { storeFetch } from "@/lib/medusa-client";

export const dynamic = "force-dynamic";

/**
 * Pincode -> shipping fee and ETA.
 *
 * The cart value comes from the SERVER's copy of the cart, never from the
 * request body — otherwise a caller could claim a high subtotal to unlock free
 * shipping.
 *
 * Not yet Redis-cached (docs/PLAN.md §7 step 1). Quotes are a cheap table
 * lookup today; the cache lands with the Redis client in M4, which needs it for
 * the checkout lock anyway.
 */
export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("pincode") ?? "";
  const parsed = pincodeSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Enter a valid 6-digit pincode" },
      { status: 400 },
    );
  }

  const cart = await getCart();
  const cartValuePaise = cart?.item_subtotal ?? 0;

  try {
    const { quote } = await storeFetch<{ quote: unknown }>(
      `/store/shipping-quote?pincode=${parsed.data}&cart_value_paise=${cartValuePaise}`,
    );
    return NextResponse.json({ quote });
  } catch (error) {
    // Medusa answers 404 when no zone matches — that is a real answer for the
    // customer ("we don't deliver there yet"), not a server fault.
    const status = error instanceof Error && /: 404/.test(error.message) ? 404 : 500;
    if (status === 404) {
      return NextResponse.json(
        { message: "We don't deliver to this pincode yet.", quote: null },
        { status: 404 },
      );
    }
    console.error("[shipping-quote]", error);
    return NextResponse.json({ message: "Could not check that pincode" }, { status: 500 });
  }
}

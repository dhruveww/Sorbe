import { NextResponse } from "next/server";
import { z } from "zod";
import { getFlags } from "@sorbe/config";
import { clearCartCookie } from "@/lib/cart";
import { completeCart, initPayment, listShippingOptions, selectShippingOption } from "@/lib/checkout";

export const dynamic = "force-dynamic";

const schema = z.object({
  method: z.enum(["prepaid", "cod"]),
  /** Mock mode only: lets us exercise the failure path without a real gateway. */
  simulate: z.enum(["success", "failure"]).default("success"),
});

/**
 * Place the order.
 *
 * In mock mode (no Razorpay keys) the "prepaid" path authorises through
 * Medusa's system provider and the caller can simulate a failure. The failure
 * path deliberately leaves the cart INTACT — the customer retries on the same
 * cart and never re-enters their address (docs/PLAN.md §7 step 8).
 */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid request" }, { status: 400 });
  }

  const flags = getFlags();
  const { method, simulate } = parsed.data;

  if (method === "cod" && !flags.codEnabled) {
    return NextResponse.json({ message: "Cash on delivery is not available" }, { status: 400 });
  }

  // A simulated failure must look like a real one: nothing is charged, nothing
  // is completed, and the cart survives for the retry.
  if (method === "prepaid" && flags.paymentsMockMode && simulate === "failure") {
    return NextResponse.json(
      {
        message: "Payment failed. Your bag is safe — try again.",
        retryable: true,
      },
      { status: 402 },
    );
  }

  try {
    // A shipping method is required before Medusa will complete a cart, and its
    // price is calculated from the pincode already on the address.
    const options = await listShippingOptions();
    const option = options[0];
    if (!option) {
      return NextResponse.json(
        { message: "We don't deliver to this pincode yet." },
        { status: 400 },
      );
    }
    await selectShippingOption(option.id);

    await initPayment();
    const order = await completeCart();

    // The cart is now an order; drop the cookie so the next visit starts fresh.
    await clearCartCookie();

    return NextResponse.json({ order_id: order.id, display_id: order.display_id });
  } catch (error) {
    console.error("[checkout/complete]", error);
    const detail = error instanceof Error ? error.message : "";
    if (/insufficient|not enough|stock/i.test(detail)) {
      return NextResponse.json(
        { message: "Something in your bag just sold out. Please review it." },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { message: "Could not place your order. Your bag is safe — try again." },
      { status: 500 },
    );
  }
}

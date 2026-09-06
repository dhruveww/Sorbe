import { NextResponse } from "next/server";
import { getCart } from "@/lib/cart";
import { listShippingOptions, selectShippingOption } from "@/lib/checkout";
import { createRazorpayOrder, razorpayConfigured } from "@/lib/razorpay";

export const dynamic = "force-dynamic";

/**
 * Creates the Razorpay order the browser widget opens against.
 *
 * The amount is computed from the SERVER's cart, never sent by the client —
 * otherwise a caller could pay ₹1 for a ₹1,299 order.
 *
 * Reuses an existing Razorpay order id when the cart already has one, so a
 * double-tap on "Pay" cannot create two orders for the same cart
 * (docs/PLAN.md §7 step 5).
 */
export async function POST() {
  if (!razorpayConfigured()) {
    return NextResponse.json(
      { message: "Online payment is not configured yet." },
      { status: 503 },
    );
  }

  const cart = await getCart();
  if (!cart || cart.items.length === 0) {
    return NextResponse.json({ message: "Your bag is empty" }, { status: 400 });
  }
  if (!cart.shipping_address?.postal_code) {
    return NextResponse.json({ message: "Add a delivery address first" }, { status: 400 });
  }

  try {
    // Shipping must be attached before the total is final — the fee is
    // calculated from the pincode.
    const options = await listShippingOptions();
    const option = options[0];
    if (!option) {
      return NextResponse.json(
        { message: "We don't deliver to this pincode yet." },
        { status: 400 },
      );
    }
    const priced = await selectShippingOption(option.id);

    const existing = (priced as any).metadata?.razorpay_order_id as string | undefined;
    if (existing) {
      return NextResponse.json({
        razorpay_order_id: existing,
        amount_paise: priced.total,
        key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      });
    }

    const order = await createRazorpayOrder({
      cartId: priced.id,
      amountPaise: priced.total,
    });

    return NextResponse.json({
      razorpay_order_id: order.id,
      amount_paise: priced.total,
      key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("[checkout/razorpay]", error);
    return NextResponse.json({ message: "Could not start payment" }, { status: 500 });
  }
}

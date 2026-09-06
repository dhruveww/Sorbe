import { NextResponse } from "next/server";
import { z } from "zod";
import { clearCartCookie, getCartId } from "@/lib/cart";
import { completeCartOnce } from "@/lib/complete-order";
import { verifyPaymentSignature } from "@/lib/razorpay";

export const dynamic = "force-dynamic";

const schema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

/**
 * Browser callback after Checkout.js succeeds.
 *
 * The signature is verified server-side before anything is completed — without
 * it, a caller could POST any pair of ids and claim a payment that never
 * happened.
 *
 * This races the webhook by design. Both funnel into completeCartOnce, so
 * whichever lands first creates the order and the other reports the same one.
 */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid payment response" }, { status: 400 });
  }

  const valid = verifyPaymentSignature({
    razorpayOrderId: parsed.data.razorpay_order_id,
    razorpayPaymentId: parsed.data.razorpay_payment_id,
    signature: parsed.data.razorpay_signature,
  });

  if (!valid) {
    console.error("[checkout/verify] signature mismatch");
    return NextResponse.json({ message: "Payment could not be verified" }, { status: 400 });
  }

  const cartId = await getCartId();
  if (!cartId) {
    return NextResponse.json({ message: "No cart to complete" }, { status: 400 });
  }

  try {
    const result = await completeCartOnce(cartId);
    await clearCartCookie();
    return NextResponse.json({ order_id: result.orderId, display_id: result.displayId });
  } catch (error) {
    console.error("[checkout/verify]", error);
    // The payment succeeded even though completion did not. Never tell the
    // customer it failed — the webhook will complete it moments later.
    return NextResponse.json(
      {
        message:
          "Payment received. We're confirming your order — check Track order in a minute.",
      },
      { status: 202 },
    );
  }
}

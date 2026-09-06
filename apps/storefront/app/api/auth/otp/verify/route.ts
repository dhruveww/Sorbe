import { NextResponse } from "next/server";
import { z } from "zod";
import { getFlags } from "@sorbe/config";
import { customerNameSchema, emailSchema, indianPhoneSchema } from "@sorbe/validation";
import { getCartId } from "@/lib/cart";
import { storeFetch } from "@/lib/medusa-client";
import { verifyOtp } from "@/lib/otp";
import { createSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const schema = z.object({
  phone: indianPhoneSchema,
  email: emailSchema.optional(),
  name: customerNameSchema.optional(),
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
});

/**
 * Verify the code, then attach the cart to the customer and merge anything left
 * in an older one.
 *
 * The cart id does NOT change here. That is the whole trick behind "log in
 * without losing your place": the checkout step lives in the URL and the cart
 * id in a cookie, so the page simply re-renders with merged totals on the same
 * step (docs/PLAN.md §6 step 4).
 */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Invalid details" },
      { status: 400 },
    );
  }

  const { phone, email, name, code } = parsed.data;
  const channel = getFlags().otpChannel;
  const identifier = channel === "email" ? email : phone;
  if (!identifier) {
    return NextResponse.json({ message: "Missing email" }, { status: 400 });
  }

  const verification = await verifyOtp(identifier, code);
  if (!verification.ok) {
    return NextResponse.json(
      { message: verification.message },
      { status: verification.reason === "too_many_attempts" ? 429 : 401 },
    );
  }

  const secret = process.env.MEDUSA_INTERNAL_AUTH_SECRET;
  if (!secret) {
    console.error("[auth] MEDUSA_INTERNAL_AUTH_SECRET is not set");
    return NextResponse.json({ message: "Login is not configured" }, { status: 500 });
  }

  try {
    const cartId = await getCartId();
    const { customer_id } = await storeFetch<{ customer_id: string; cart_id: string | null }>(
      "/store/internal/login",
      {
        method: "POST",
        body: { phone, email, name, cart_id: cartId },
        headers: { "x-internal-secret": secret },
      },
    );

    await createSession({ customerId: customer_id, phone });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[auth] login failed", error);
    return NextResponse.json({ message: "Could not sign you in. Try again." }, { status: 500 });
  }
}

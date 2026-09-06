import { NextResponse } from "next/server";
import { z } from "zod";
import { addressSchema, emailSchema } from "@sorbe/validation";
import { setCheckoutAddress } from "@/lib/checkout";

export const dynamic = "force-dynamic";

const schema = z.object({
  address: addressSchema,
  email: emailSchema,
  gift_note: z.string().trim().max(300).optional(),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Check the details you entered" },
      { status: 400 },
    );
  }

  try {
    const cart = await setCheckoutAddress({
      address: parsed.data.address,
      email: parsed.data.email,
      giftNote: parsed.data.gift_note,
    });
    return NextResponse.json({ cart });
  } catch (error) {
    console.error("[checkout/address]", error);
    return NextResponse.json({ message: "Could not save your address" }, { status: 500 });
  }
}

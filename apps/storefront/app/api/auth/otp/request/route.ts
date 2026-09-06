import { NextResponse } from "next/server";
import { z } from "zod";
import { getFlags } from "@sorbe/config";
import { emailSchema, indianPhoneSchema } from "@sorbe/validation";
import { requestOtp } from "@/lib/otp";

export const dynamic = "force-dynamic";

/**
 * Send a login code.
 *
 * Which field identifies the customer depends on the channel: email today
 * (free, no DLT), phone once WhatsApp is live. Phone is collected either way,
 * because it is the identity an order is looked up by.
 */
const schema = z.object({
  phone: indianPhoneSchema,
  email: emailSchema.optional(),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Invalid details" },
      { status: 400 },
    );
  }

  const channel = getFlags().otpChannel;
  const identifier = channel === "email" ? parsed.data.email : parsed.data.phone;

  if (channel === "email" && !identifier) {
    return NextResponse.json(
      { message: "Enter your email so we can send your code." },
      { status: 400 },
    );
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  const result = await requestOtp(identifier!, ip);
  if (!result.ok) {
    return NextResponse.json(
      { message: result.message },
      { status: result.reason === "rate_limited" ? 429 : 502 },
    );
  }

  return NextResponse.json({
    sent: true,
    channel: result.channel,
    // Present only in mock mode, so local development needs no mailbox.
    ...(result.devCode ? { dev_code: result.devCode } : {}),
  });
}

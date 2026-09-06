import { NextResponse } from "next/server";
import { z } from "zod";
import { indianPhoneSchema } from "@sorbe/validation";
import { rateLimit } from "@/lib/redis";
import { storeFetch } from "@/lib/medusa-client";

export const dynamic = "force-dynamic";

const schema = z.object({
  display_id: z.coerce.number().int().positive(),
  phone: indianPhoneSchema,
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Enter your order number and mobile number" },
      { status: 400 },
    );
  }

  // Rate limited because this endpoint answers a yes/no about whether an order
  // exists; without a limit it could be walked.
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";
  const limit = await rateLimit(`track:ip:${ip}`, 20, 3600);
  if (!limit.allowed) {
    return NextResponse.json({ message: "Too many attempts. Try again later." }, { status: 429 });
  }

  try {
    const { order } = await storeFetch<{ order: unknown }>(
      `/store/track-order?display_id=${parsed.data.display_id}&phone=${parsed.data.phone}`,
    );
    return NextResponse.json({ order });
  } catch {
    return NextResponse.json(
      { message: "We couldn't find that order. Check the details." },
      { status: 404 },
    );
  }
}

import { NextResponse } from "next/server";
import { getCart } from "@/lib/cart";

export const dynamic = "force-dynamic";

/** Current cart, or null. Never creates one — a GET must not have side effects. */
export async function GET() {
  const cart = await getCart();
  return NextResponse.json({ cart });
}

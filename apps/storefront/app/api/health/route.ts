import { NextResponse } from "next/server";
import { getFlags } from "@sorbe/config";
import { medusaHealth } from "@/lib/medusa-client";

export const dynamic = "force-dynamic";

/**
 * Liveness probe. Reports which integrations are live vs mocked, so "why didn't
 * the customer get a WhatsApp message" is answerable in one request instead of
 * a log dig.
 *
 * Deliberately reports MODES, never keys or their values.
 */
export async function GET() {
  const flags = getFlags();
  const medusaUp = await medusaHealth();

  return NextResponse.json(
    {
      status: medusaUp ? "ok" : "degraded",
      medusa: medusaUp ? "up" : "unreachable",
      modes: {
        payments: flags.paymentsMockMode ? "mock" : "live",
        whatsapp: flags.whatsappLive ? "live" : "mock (logs would_send)",
        otp: flags.otpChannel,
        shipping: flags.shippingProvider,
        cod: flags.codEnabled ? "enabled" : "disabled",
      },
    },
    { status: medusaUp ? 200 : 503 },
  );
}

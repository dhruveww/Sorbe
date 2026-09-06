import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { LoginForm } from "@/components/login-form";
import { StaticPage } from "@/components/static-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const session = await getSession();
  const { next } = await searchParams;

  if (session) redirect(next ?? "/account/orders");

  // Only same-site paths, so ?next= cannot be used to bounce someone off-site
  // after they log in.
  const safeNext = next?.startsWith("/") && !next.startsWith("//") ? next : "/account/orders";

  return (
    <StaticPage title="Sign in" lead="No password. We send you a code.">
      <LoginForm next={safeNext} />
    </StaticPage>
  );
}

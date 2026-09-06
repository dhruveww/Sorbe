// Importing this module from a client component is a build error. That is the
// point: every Medusa key, Razorpay secret and admin token funnels through here,
// and the browser must never receive any of them (docs/PLAN.md §2, hard
// constraint 5). The browser talks to our own /api/* routes; those talk to Medusa.
import "server-only";

const BACKEND_URL = process.env.MEDUSA_BACKEND_URL || "http://localhost:9000";

export class MedusaError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly path: string,
  ) {
    super(message);
    this.name = "MedusaError";
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "DELETE";
  body?: unknown;
  /** Forwarded to fetch's Next.js cache options. Default: no caching. */
  cache?: RequestCache;
  revalidate?: number | false;
  tags?: string[];
  /** A logged-in customer's Medusa token, when acting on their behalf. */
  customerToken?: string;
};

/**
 * Store API — public catalog, carts, customer-scoped reads.
 * Requires the publishable key, which scopes the request to a sales channel.
 */
export async function storeFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const publishableKey = process.env.MEDUSA_PUBLISHABLE_KEY;
  if (!publishableKey) {
    throw new Error(
      "MEDUSA_PUBLISHABLE_KEY is not set. Run `pnpm --filter @sorbe/medusa seed` and copy the key it prints into apps/storefront/.env.local",
    );
  }

  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-publishable-api-key": publishableKey,
  };
  if (options.customerToken) {
    headers.authorization = `Bearer ${options.customerToken}`;
  }

  return request<T>(path, headers, options);
}

/**
 * Admin API — privileged. Only ever called from server code that has already
 * checked the caller is allowed to do this. Never expose a route that forwards
 * arbitrary admin calls.
 */
export async function adminFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = process.env.MEDUSA_ADMIN_API_TOKEN;
  if (!token) {
    throw new Error("MEDUSA_ADMIN_API_TOKEN is not set. See .env.example section 4.");
  }

  return request<T>(
    path,
    { "content-type": "application/json", authorization: `Bearer ${token}` },
    options,
  );
}

async function request<T>(
  path: string,
  headers: Record<string, string>,
  options: RequestOptions,
): Promise<T> {
  const url = `${BACKEND_URL}${path}`;

  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    // Commerce data is mutable and personal; nothing is cached unless a caller
    // opts in explicitly (catalog pages do, carts never should).
    cache: options.cache ?? "no-store",
    next:
      options.revalidate !== undefined || options.tags
        ? { revalidate: options.revalidate, tags: options.tags }
        : undefined,
  });

  if (!response.ok) {
    // Read the body for context, but never let a Medusa error message containing
    // internal detail propagate verbatim to a customer-facing page.
    const detail = await response.text().catch(() => "");
    throw new MedusaError(
      `Medusa ${options.method ?? "GET"} ${path} failed: ${response.status} ${detail.slice(0, 500)}`,
      response.status,
      path,
    );
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/** Liveness probe used by /api/health. */
export async function medusaHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${BACKEND_URL}/health`, { cache: "no-store" });
    return response.ok;
  } catch {
    return false;
  }
}

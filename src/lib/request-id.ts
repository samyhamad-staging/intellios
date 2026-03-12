import type { NextRequest } from "next/server";

/**
 * Returns the request ID for the current request.
 * The proxy middleware (proxy.ts) injects X-Request-Id on every inbound
 * request before route handlers run, so this value is always present.
 * The fallback UUID is a safety net only.
 */
export function getRequestId(request: NextRequest): string {
  return request.headers.get("x-request-id") ?? crypto.randomUUID();
}

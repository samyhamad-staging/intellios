/**
 * Route test utilities: NextRequest builder, response helpers.
 *
 * These avoid mocking next/server entirely — we use the real NextRequest
 * and NextResponse classes from next/server during test execution
 * (Vitest resolves the path alias to the installed next package).
 */

import { NextRequest } from "next/server";

/**
 * Build a NextRequest for testing route handlers.
 *
 * @param method  HTTP method (GET, POST, PATCH, etc.)
 * @param url     Full URL (default: http://localhost:3000/api/test)
 * @param options Body and headers overrides
 */
export function makeRequest(
  method: string,
  url = "http://localhost:3000/api/blueprints/bp-001/status",
  options: {
    body?: Record<string, unknown>;
    headers?: Record<string, string>;
  } = {}
): NextRequest {
  const init: ConstructorParameters<typeof NextRequest>[1] = {
    method,
    headers: {
      "content-type": "application/json",
      "x-request-id": "req-test-001",
      ...(options.headers ?? {}),
    },
  };
  if (options.body) {
    init.body = JSON.stringify(options.body);
  }
  return new NextRequest(url, init);
}

/**
 * Extract JSON body from a NextResponse (handles both real and mock responses).
 */
export async function responseJson(response: Response): Promise<unknown> {
  return response.json();
}

/**
 * Build the params object that Next.js App Router passes to route handlers.
 * In Next.js 16 with async params, params is Promise<{ id: string }>.
 */
export function makeParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

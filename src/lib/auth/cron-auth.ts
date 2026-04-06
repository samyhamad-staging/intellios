/**
 * Cron Route Authentication — mandatory bearer token verification.
 *
 * All cron/service-to-service routes MUST call `requireCronAuth()` at the top
 * of their handler. This enforces that:
 *
 *   1. The `CRON_SECRET` environment variable is configured (production safety)
 *   2. The request includes a matching `Authorization: Bearer <secret>` header
 *
 * If `CRON_SECRET` is not set, the route returns 503 (Service Unavailable)
 * instead of silently allowing unauthenticated access.
 */

import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

export function requireCronAuth(request: NextRequest): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET;

  // Production safety: CRON_SECRET must be configured
  if (!cronSecret) {
    console.error("[cron-auth] CRON_SECRET env var is not set — rejecting cron request");
    return NextResponse.json(
      { error: "Cron authentication not configured. Set the CRON_SECRET environment variable." },
      { status: 503 }
    );
  }

  // P2-SEC-002 FIX: Use timing-safe comparison to prevent timing attacks
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${cronSecret}`;
  if (
    !authHeader ||
    authHeader.length !== expected.length ||
    !timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected))
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Authentication passed
  return null;
}

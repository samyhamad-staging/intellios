import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

/**
 * POST /api/waitlist
 *
 * Accepts design-partner access requests from the landing page.
 * Logs structured JSON to server stdout — capturable by Vercel log drain or
 * any log aggregation service. Zero schema migration required.
 *
 * To persist to a DB later, swap the console.log for a DB insert.
 */

const WaitlistSchema = z.object({
  email:   z.string().email("Invalid email address").max(255),
  company: z.string().min(1, "Company is required").max(255),
  role:    z.string().max(100).nullable().optional(),
  message: z.string().max(2000).nullable().optional(),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = WaitlistSchema.safeParse(body);
  if (!result.success) {
    const firstError = result.error.issues[0]?.message ?? "Validation failed";
    return NextResponse.json({ error: firstError }, { status: 422 });
  }

  const { email, company, role, message } = result.data;

  // Structured log — captured by Vercel log drain / any aggregation service.
  // Replace with `db.insert(waitlistSubmissions).values(...)` when a table exists.
  console.log(
    JSON.stringify({
      type:      "WAITLIST_SUBMISSION",
      email,
      company,
      role:      role ?? null,
      message:   message ?? null,
      timestamp: new Date().toISOString(),
      ip:        request.headers.get("x-forwarded-for") ?? "unknown",
      userAgent: request.headers.get("user-agent") ?? "unknown",
    })
  );

  return NextResponse.json({ ok: true }, { status: 201 });
}

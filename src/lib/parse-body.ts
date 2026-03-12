import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ErrorCode } from "@/lib/errors";

/**
 * Parse and validate a JSON request body against a Zod schema.
 * Returns { data } on success or { error } (a 400 NextResponse) on failure.
 */
export async function parseBody<T extends z.ZodTypeAny>(
  request: NextRequest,
  schema: T
): Promise<{ data: z.infer<T>; error: null } | { data: null; error: NextResponse }> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return {
      data: null,
      error: NextResponse.json(
        { code: ErrorCode.BAD_REQUEST, message: "Request body must be valid JSON" },
        { status: 400 }
      ),
    };
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
    return {
      data: null,
      error: NextResponse.json(
        { code: ErrorCode.BAD_REQUEST, message: "Validation failed", details: issues },
        { status: 400 }
      ),
    };
  }

  return { data: result.data, error: null };
}

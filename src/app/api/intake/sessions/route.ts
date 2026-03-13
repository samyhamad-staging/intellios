import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { intakeSessions } from "@/lib/db/schema";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { getRequestId } from "@/lib/request-id";

export async function POST(request: NextRequest) {
  const { session: authSession, error } = await requireAuth(["designer", "admin"]);
  if (error) return error;
  const requestId = getRequestId(request);

  try {
    const [session] = await db
      .insert(intakeSessions)
      .values({
        createdBy: authSession.user.email ?? null,
        enterpriseId: authSession.user.enterpriseId ?? null,
      })
      .returning();
    return NextResponse.json(session);
  } catch (error) {
    console.error(`[${requestId}] Failed to create intake session:`, error);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to create session", undefined, requestId);
  }
}

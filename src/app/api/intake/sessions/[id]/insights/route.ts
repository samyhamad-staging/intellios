import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { intakeSessions, intakeAIInsights } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require";
import { assertEnterpriseAccess } from "@/lib/auth/enterprise";
import { apiError, ErrorCode } from "@/lib/errors";
import { getRequestId } from "@/lib/request-id";

/** GET /api/intake/sessions/[id]/insights — return all AI insights for a session */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session: authSession, error } = await requireAuth([
    "designer", "reviewer", "compliance_officer", "admin",
  ]);
  if (error) return error;

  try {
    const { id: sessionId } = await params;

    const session = await db.query.intakeSessions.findFirst({
      where: eq(intakeSessions.id, sessionId),
    });
    if (!session) return apiError(ErrorCode.NOT_FOUND, "Session not found");

    const enterpriseError = assertEnterpriseAccess(session.enterpriseId, authSession.user);
    if (enterpriseError) return enterpriseError;

    const insights = await db
      .select()
      .from(intakeAIInsights)
      .where(eq(intakeAIInsights.sessionId, sessionId))
      .orderBy(desc(intakeAIInsights.createdAt));

    return NextResponse.json({ insights });
  } catch (err) {
    const requestId = getRequestId(request);
    console.error(`[${requestId}] GET insights failed:`, err);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to fetch insights");
  }
}

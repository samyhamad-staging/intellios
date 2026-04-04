import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { intakeSessions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { assertEnterpriseAccess } from "@/lib/auth/enterprise";
import { getRequestId } from "@/lib/request-id";

/**
 * POST /api/intake/sessions/[id]/duplicate
 *
 * Creates a new intake session pre-populated with the context and payload from
 * the source session. The duplicate starts in "active" status so the user can
 * continue refining it as a fresh conversation.
 *
 * Copied fields: intakeContext, intakePayload, agentType, riskTier
 * Reset fields:  id (new uuid), status → "active", createdAt / updatedAt → now
 * Not copied:    intakeMessages (chat history)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session: authSession, error } = await requireAuth(["architect", "admin"]);
  if (error) return error;
  const requestId = getRequestId(request);

  try {
    const { id } = await params;

    const source = await db.query.intakeSessions.findFirst({
      where: eq(intakeSessions.id, id),
    });

    if (!source) {
      return apiError(ErrorCode.NOT_FOUND, "Session not found");
    }

    const enterpriseError = assertEnterpriseAccess(source.enterpriseId, authSession.user);
    if (enterpriseError) return enterpriseError;

    const [newSession] = await db
      .insert(intakeSessions)
      .values({
        enterpriseId: source.enterpriseId,
        createdBy: authSession.user.email ?? null,
        status: "active",
        intakePayload: source.intakePayload ?? {},
        intakeContext: source.intakeContext ?? null,
        agentType: source.agentType ?? null,
        riskTier: source.riskTier ?? null,
        expertiseLevel: source.expertiseLevel ?? null,
      })
      .returning();

    return NextResponse.json({ sessionId: newSession.id });
  } catch (err) {
    console.error(`[${requestId}] Failed to duplicate intake session:`, err);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to duplicate session", undefined, requestId);
  }
}

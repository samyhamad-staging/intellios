import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { intakeSessions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { assertEnterpriseAccess } from "@/lib/auth/enterprise";
import { getRequestId } from "@/lib/request-id";
import { parseBody } from "@/lib/parse-body";
import { AgentTypeSchema, RiskTierSchema } from "@/lib/intake/classify";
import { z } from "zod";

const ClassificationOverrideBody = z.object({
  agentType: AgentTypeSchema.optional(),
  riskTier: RiskTierSchema.optional(),
});

/**
 * PATCH /api/intake/sessions/[id]/classification
 *
 * Allows a designer or admin to correct an auto-classification that was wrong.
 * Only agentType and/or riskTier may be updated; rationale is not stored separately.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session: authSession, error } = await requireAuth(["architect", "designer", "admin"]);
  if (error) return error;
  const requestId = getRequestId(request);

  const { data: body, error: bodyError } = await parseBody(request, ClassificationOverrideBody);
  if (bodyError) return bodyError;

  if (!body.agentType && !body.riskTier) {
    return apiError(ErrorCode.VALIDATION_ERROR, "At least one of agentType or riskTier is required");
  }

  try {
    const { id: sessionId } = await params;

    const session = await db.query.intakeSessions.findFirst({
      where: eq(intakeSessions.id, sessionId),
    });

    if (!session) {
      return apiError(ErrorCode.NOT_FOUND, "Session not found");
    }

    const enterpriseError = assertEnterpriseAccess(session.enterpriseId, authSession.user);
    if (enterpriseError) return enterpriseError;

    if (session.status === "completed") {
      return apiError(ErrorCode.CONFLICT, "Cannot update classification on a completed session");
    }

    const updates: { agentType?: string; riskTier?: string; updatedAt: Date } = {
      updatedAt: new Date(),
    };
    if (body.agentType) updates.agentType = body.agentType;
    if (body.riskTier) updates.riskTier = body.riskTier;

    await db
      .update(intakeSessions)
      .set(updates)
      .where(eq(intakeSessions.id, sessionId));

    return NextResponse.json({
      agentType: body.agentType ?? session.agentType,
      riskTier: body.riskTier ?? session.riskTier,
    });
  } catch (err) {
    console.error(`[${requestId}] Failed to update classification:`, err);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to update classification", undefined, requestId);
  }
}

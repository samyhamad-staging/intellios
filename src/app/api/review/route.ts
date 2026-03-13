import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agentBlueprints } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { getRequestId } from "@/lib/request-id";

/**
 * GET /api/review
 * Returns all blueprints in `in_review` status, scoped to the caller's enterprise.
 * Admins see all enterprises.
 */
export async function GET(request: NextRequest) {
  const { session: authSession, error } = await requireAuth(["reviewer", "compliance_officer", "admin"]);
  if (error) return error;
  const requestId = getRequestId(request);
  try {
    const enterpriseFilter =
      authSession.user.role === "admin"
        ? eq(agentBlueprints.status, "in_review")
        : authSession.user.enterpriseId
        ? and(
            eq(agentBlueprints.status, "in_review"),
            eq(agentBlueprints.enterpriseId, authSession.user.enterpriseId)
          )
        : and(eq(agentBlueprints.status, "in_review"), isNull(agentBlueprints.enterpriseId));

    const rows = await db
      .select({
        id: agentBlueprints.id,
        agentId: agentBlueprints.agentId,
        version: agentBlueprints.version,
        name: agentBlueprints.name,
        tags: agentBlueprints.tags,
        status: agentBlueprints.status,
        validationReport: agentBlueprints.validationReport,
        reviewComment: agentBlueprints.reviewComment,
        reviewedAt: agentBlueprints.reviewedAt,
        createdAt: agentBlueprints.createdAt,
        updatedAt: agentBlueprints.updatedAt,
      })
      .from(agentBlueprints)
      .where(enterpriseFilter)
      .orderBy(agentBlueprints.updatedAt);

    return NextResponse.json({ blueprints: rows });
  } catch (error) {
    console.error(`[${requestId}] Failed to fetch review queue:`, error);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to fetch review queue", undefined, requestId);
  }
}

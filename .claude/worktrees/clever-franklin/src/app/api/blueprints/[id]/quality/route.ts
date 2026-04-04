import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { blueprintQualityScores, agentBlueprints } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { assertEnterpriseAccess } from "@/lib/auth/enterprise";
import { getRequestId } from "@/lib/request-id";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session: authSession, error } = await requireAuth();
  if (error) return error;
  const requestId = getRequestId(request);
  try {
    const { id } = await params;

    const blueprint = await db.query.agentBlueprints.findFirst({
      where: eq(agentBlueprints.id, id),
      columns: { id: true, enterpriseId: true },
    });

    if (!blueprint) {
      return apiError(ErrorCode.NOT_FOUND, "Blueprint not found");
    }

    const enterpriseError = assertEnterpriseAccess(blueprint.enterpriseId, authSession.user);
    if (enterpriseError) return enterpriseError;

    const row = await db
      .select()
      .from(blueprintQualityScores)
      .where(eq(blueprintQualityScores.blueprintId, id))
      .orderBy(desc(blueprintQualityScores.evaluatedAt))
      .limit(1)
      .then((rows) => rows[0] ?? null);

    if (!row) {
      return apiError(ErrorCode.NOT_FOUND, "No quality score found for this blueprint");
    }

    return NextResponse.json({
      score: {
        id: row.id,
        blueprintId: row.blueprintId,
        enterpriseId: row.enterpriseId,
        overallScore: row.overallScore != null ? parseFloat(row.overallScore) : null,
        intentAlignment: row.intentAlignment != null ? parseFloat(row.intentAlignment) : null,
        toolAppropriateness: row.toolAppropriateness != null ? parseFloat(row.toolAppropriateness) : null,
        instructionSpecificity: row.instructionSpecificity != null ? parseFloat(row.instructionSpecificity) : null,
        governanceAdequacy: row.governanceAdequacy != null ? parseFloat(row.governanceAdequacy) : null,
        ownershipCompleteness: row.ownershipCompleteness != null ? parseFloat(row.ownershipCompleteness) : null,
        flags: row.flags as string[],
        evaluatorModel: row.evaluatorModel,
        evaluatedAt: row.evaluatedAt.toISOString(),
      },
    });
  } catch (err) {
    console.error(`[${requestId}] Failed to fetch quality score:`, err);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to fetch quality score", undefined, requestId);
  }
}

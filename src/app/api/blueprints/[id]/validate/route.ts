import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agentBlueprints } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ABP } from "@/lib/types/abp";
import { validateBlueprint } from "@/lib/governance/validator";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { assertEnterpriseAccess } from "@/lib/auth/enterprise";
import { getRequestId } from "@/lib/request-id";

/**
 * POST /api/blueprints/[id]/validate
 * Runs governance validation against all applicable policies.
 * Stores the report in agent_blueprints.validation_report and returns it.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session: authSession, error } = await requireAuth(["designer", "admin"]);
  if (error) return error;
  const requestId = getRequestId(request);
  try {
    const { id } = await params;

    const blueprint = await db.query.agentBlueprints.findFirst({
      where: eq(agentBlueprints.id, id),
    });

    if (!blueprint) {
      return apiError(ErrorCode.NOT_FOUND, "Blueprint not found");
    }

    const enterpriseError = assertEnterpriseAccess(blueprint.enterpriseId, authSession.user);
    if (enterpriseError) return enterpriseError;

    const abp = blueprint.abp as ABP;
    // Use denormalized enterpriseId from blueprint (set at creation)
    const enterpriseId = blueprint.enterpriseId ?? null;

    // Run validation
    const report = await validateBlueprint(abp, enterpriseId);

    // Persist the report
    await db
      .update(agentBlueprints)
      .set({ validationReport: report, updatedAt: new Date() })
      .where(eq(agentBlueprints.id, id));

    return NextResponse.json({ report });
  } catch (error) {
    console.error(`[${requestId}] Failed to validate blueprint:`, error);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to run validation", undefined, requestId);
  }
}

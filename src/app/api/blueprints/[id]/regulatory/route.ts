import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agentBlueprints, intakeSessions, deploymentHealth } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { ABP } from "@/lib/types/abp";
import type { IntakeContext } from "@/lib/types/intake";
import type { ValidationReport } from "@/lib/governance/types";
import { assessAllFrameworks } from "@/lib/regulatory/classifier";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { assertEnterpriseAccess } from "@/lib/auth/enterprise";
import { getRequestId } from "@/lib/request-id";

/**
 * GET /api/blueprints/[id]/regulatory
 *
 * Returns a deterministic regulatory compliance assessment for a blueprint
 * against EU AI Act (2024/1689), SR 11-7, and NIST AI RMF.
 *
 * No DB writes. Computed on every request — always current.
 * Accessible to all authenticated roles.
 */
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
    });

    if (!blueprint) {
      return apiError(ErrorCode.NOT_FOUND, "Blueprint not found");
    }

    const enterpriseError = assertEnterpriseAccess(blueprint.enterpriseId, authSession.user);
    if (enterpriseError) return enterpriseError;

    // Fetch intake session for Phase 1 context (may be null for pre-Phase 6 blueprints)
    const intakeSession = blueprint.sessionId
      ? await db.query.intakeSessions.findFirst({
          where: eq(intakeSessions.id, blueprint.sessionId),
        })
      : null;
    const intakeContext = (intakeSession?.intakeContext as IntakeContext | null) ?? null;

    // Fetch deployment health status for deployed agents (feeds NIST MANAGE assessment)
    let deploymentHealthStatus: string | null = null;
    if (blueprint.status === "deployed") {
      const health = await db.query.deploymentHealth.findFirst({
        where: eq(deploymentHealth.agentId, blueprint.agentId),
      });
      deploymentHealthStatus = health?.healthStatus ?? null;
    }

    const assessment = assessAllFrameworks({
      blueprintId: id,
      abp: blueprint.abp as ABP,
      intakeContext,
      validationReport: blueprint.validationReport as ValidationReport | null,
      deploymentHealthStatus,
    });

    return NextResponse.json(assessment);
  } catch (err) {
    console.error(`[${requestId}] Failed to compute regulatory assessment:`, err);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to compute regulatory assessment", undefined, requestId);
  }
}

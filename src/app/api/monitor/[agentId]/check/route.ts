import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agentBlueprints } from "@/lib/db/schema";
import { and, desc, eq, isNull } from "drizzle-orm";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { assertEnterpriseAccess } from "@/lib/auth/enterprise";
import { getRequestId } from "@/lib/request-id";
import { publishEvent } from "@/lib/events/publish";
import { checkDeploymentHealth } from "@/lib/monitoring/health";

/**
 * POST /api/monitor/[agentId]/check
 * Run a governance health check for a single deployed agent.
 * Roles: compliance_officer | admin
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { session: authSession, error } = await requireAuth(["compliance_officer", "admin"]);
  if (error) return error;
  const requestId = getRequestId(request);

  try {
    const { agentId } = await params;

    // Fetch the latest deployed version of this logical agent
    const [blueprint] = await db
      .selectDistinctOn([agentBlueprints.agentId], {
        id:           agentBlueprints.id,
        agentId:      agentBlueprints.agentId,
        name:         agentBlueprints.name,
        enterpriseId: agentBlueprints.enterpriseId,
        status:       agentBlueprints.status,
        updatedAt:    agentBlueprints.updatedAt,
        abp:          agentBlueprints.abp,
      })
      .from(agentBlueprints)
      .where(
        and(
          eq(agentBlueprints.agentId, agentId),
          eq(agentBlueprints.status, "deployed")
        )
      )
      .orderBy(agentBlueprints.agentId, desc(agentBlueprints.createdAt));

    if (!blueprint) {
      return apiError(ErrorCode.NOT_FOUND, "No deployed agent found with this agentId");
    }

    const enterpriseError = assertEnterpriseAccess(blueprint.enterpriseId, authSession.user);
    if (enterpriseError) return enterpriseError;

    // Run the health check
    const result = await checkDeploymentHealth(
      blueprint.id,
      blueprint.enterpriseId ?? null,
      blueprint.updatedAt
    );

    if (!result) {
      return apiError(ErrorCode.INTERNAL_ERROR, "Health check failed — blueprint not found");
    }

    // Derive agent name for audit metadata
    const abp = blueprint.abp as Record<string, unknown> | null;
    const agentName =
      (abp?.identity as Record<string, unknown> | undefined)?.name ??
      blueprint.name ??
      "Unknown Agent";

    // Write audit entry — notification handler routes this to compliance officers
    // when a clean→critical or critical→clean transition is detected.
    await publishEvent({
      event: {
        type: "blueprint.health_checked",
        payload: {
          blueprintId: blueprint.id,
          agentId,
          agentName: String(agentName),
          healthStatus: result.healthStatus,
          previousStatus: result.previousStatus ?? "",
          errorCount: result.errorCount,
        },
      },
      actor: { email: authSession.user.email!, role: authSession.user.role },
      entity: { type: "blueprint", id: blueprint.id },
      enterpriseId: blueprint.enterpriseId ?? null,
    });

    return NextResponse.json({
      agentId:      result.agentId,
      healthStatus: result.healthStatus,
      errorCount:   result.errorCount,
      warningCount: result.warningCount,
      checkedAt:    result.checkedAt,
    });
  } catch (err) {
    console.error(`[${requestId}] Health check failed:`, err);
    return apiError(ErrorCode.INTERNAL_ERROR, "Health check failed", undefined, requestId);
  }
}

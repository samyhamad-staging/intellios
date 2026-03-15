import { NextRequest, NextResponse } from "next/server";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { getRequestId } from "@/lib/request-id";
import { writeAuditLog } from "@/lib/audit/log";
import { checkAllDeployedAgents } from "@/lib/monitoring/health";
import { db } from "@/lib/db";
import { agentBlueprints } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * POST /api/monitor/check-all
 * Run governance health checks for all deployed agents in the caller's enterprise.
 * Roles: compliance_officer | admin
 */
export async function POST(request: NextRequest) {
  const { session: authSession, error } = await requireAuth(["compliance_officer", "admin"]);
  if (error) return error;
  const requestId = getRequestId(request);

  try {
    const enterpriseId = authSession.user.role === "admin"
      ? null  // admins check their own enterprise (null = global for platform admins)
      : authSession.user.enterpriseId ?? null;

    const { checked, critical, results } = await checkAllDeployedAgents(enterpriseId);

    // Write one audit entry per checked agent
    for (const result of results) {
      // Best-effort: fetch agent name for audit metadata
      const bp = await db.query.agentBlueprints.findFirst({
        where: eq(agentBlueprints.id, result.blueprintId),
        columns: { name: true, abp: true },
      });
      const abp = bp?.abp as Record<string, unknown> | null;
      const agentName =
        (abp?.identity as Record<string, unknown> | undefined)?.name ??
        bp?.name ??
        "Unknown Agent";

      await writeAuditLog({
        entityType:   "blueprint",
        entityId:     result.blueprintId,
        action:       "blueprint.health_checked",
        actorEmail:   authSession.user.email!,
        actorRole:    authSession.user.role,
        enterpriseId,
        fromState:    { healthStatus: result.previousStatus },
        toState:      { healthStatus: result.healthStatus },
        metadata: {
          agentId:        result.agentId,
          agentName,
          errorCount:     result.errorCount,
          warningCount:   result.warningCount,
          previousStatus: result.previousStatus,
          healthStatus:   result.healthStatus,
          triggeredBy:    "manual-check-all",
        },
      });
    }

    return NextResponse.json({ checked, critical });
  } catch (err) {
    console.error(`[${requestId}] Check-all failed:`, err);
    return apiError(ErrorCode.INTERNAL_ERROR, "Check-all failed", undefined, requestId);
  }
}

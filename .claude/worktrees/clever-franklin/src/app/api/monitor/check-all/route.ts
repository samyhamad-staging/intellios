import { NextRequest, NextResponse } from "next/server";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { getRequestId } from "@/lib/request-id";
import { publishEvent } from "@/lib/events/publish";
import { checkAllDeployedAgents } from "@/lib/monitoring/health";
import { db } from "@/lib/db";
import { agentBlueprints } from "@/lib/db/schema";
import { inArray } from "drizzle-orm";

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

    // Batch-fetch all blueprint names in one query (prevents N+1)
    const bpIds = results.map((r) => r.blueprintId);
    const bpRows = bpIds.length > 0
      ? await db.query.agentBlueprints.findMany({
          where: inArray(agentBlueprints.id, bpIds),
          columns: { id: true, name: true, abp: true },
        })
      : [];
    const bpMap = new Map(bpRows.map((bp) => [bp.id, bp]));

    // Write one audit entry per checked agent
    for (const result of results) {
      const bp = bpMap.get(result.blueprintId);
      const abp = bp?.abp as Record<string, unknown> | null;
      const agentName =
        (abp?.identity as Record<string, unknown> | undefined)?.name ??
        bp?.name ??
        "Unknown Agent";

      await publishEvent({
        event: {
          type: "blueprint.health_checked",
          payload: {
            blueprintId: result.blueprintId,
            agentId: result.agentId,
            agentName: String(agentName),
            healthStatus: result.healthStatus,
            previousStatus: result.previousStatus ?? "",
            errorCount: result.errorCount,
          },
        },
        actor: { email: authSession.user.email!, role: authSession.user.role },
        entity: { type: "blueprint", id: result.blueprintId },
        enterpriseId,
      });
    }

    return NextResponse.json({ checked, critical });
  } catch (err) {
    console.error(`[${requestId}] Check-all failed:`, err);
    return apiError(ErrorCode.INTERNAL_ERROR, "Check-all failed", undefined, requestId);
  }
}

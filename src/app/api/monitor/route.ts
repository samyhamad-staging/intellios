import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agentBlueprints, deploymentHealth } from "@/lib/db/schema";
import { and, desc, eq, isNull } from "drizzle-orm";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { getRequestId } from "@/lib/request-id";

/**
 * GET /api/monitor
 * Returns all deployed agents enriched with their current governance health.
 * Roles: reviewer | compliance_officer | admin
 */
export async function GET(request: NextRequest) {
  const { session: authSession, error } = await requireAuth(["reviewer", "compliance_officer", "admin"]);
  if (error) return error;
  const requestId = getRequestId(request);

  try {
    const enterpriseFilter =
      authSession.user.role === "admin"
        ? undefined
        : authSession.user.enterpriseId
        ? eq(agentBlueprints.enterpriseId, authSession.user.enterpriseId)
        : isNull(agentBlueprints.enterpriseId);

    // Latest deployed version per logical agent
    const deployed = await db
      .selectDistinctOn([agentBlueprints.agentId], {
        id:           agentBlueprints.id,
        agentId:      agentBlueprints.agentId,
        version:      agentBlueprints.version,
        name:         agentBlueprints.name,
        tags:         agentBlueprints.tags,
        enterpriseId: agentBlueprints.enterpriseId,
        createdBy:    agentBlueprints.createdBy,
        createdAt:    agentBlueprints.createdAt,
        updatedAt:    agentBlueprints.updatedAt,
      })
      .from(agentBlueprints)
      .where(
        enterpriseFilter
          ? and(eq(agentBlueprints.status, "deployed"), enterpriseFilter)
          : eq(agentBlueprints.status, "deployed")
      )
      .orderBy(agentBlueprints.agentId, desc(agentBlueprints.createdAt));

    // Sort by deployedAt desc (distinctOn forces agentId ordering first)
    deployed.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    // Load all health records for these agents and build a lookup map
    const agentIds = deployed.map((a) => a.agentId);
    const healthRows =
      agentIds.length > 0
        ? await db.query.deploymentHealth.findMany({
            where: (t, { inArray }) => inArray(t.agentId, agentIds),
          })
        : [];
    const healthMap = new Map(healthRows.map((h) => [h.agentId, h]));

    // Enrich each deployed agent with health data
    const agents = deployed.map((a) => {
      const health = healthMap.get(a.agentId);
      return {
        agentId:       a.agentId,
        blueprintId:   a.id,
        name:          a.name,
        version:       a.version,
        tags:          (a.tags ?? []) as string[],
        deployedAt:    a.updatedAt.toISOString(), // updatedAt = when status last changed to deployed
        healthStatus:  (health?.healthStatus ?? "unknown") as "clean" | "critical" | "unknown",
        errorCount:    health?.errorCount ?? 0,
        warningCount:  health?.warningCount ?? 0,
        lastCheckedAt: health?.lastCheckedAt?.toISOString() ?? null,
      };
    });

    // Summary counts
    const summary = {
      total:    agents.length,
      clean:    agents.filter((a) => a.healthStatus === "clean").length,
      critical: agents.filter((a) => a.healthStatus === "critical").length,
      unknown:  agents.filter((a) => a.healthStatus === "unknown").length,
    };

    return NextResponse.json({ agents, summary });
  } catch (err) {
    console.error(`[${requestId}] Failed to list deployment health:`, err);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to list deployment health", undefined, requestId);
  }
}

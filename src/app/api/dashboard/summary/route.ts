import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agentBlueprints, governancePolicies } from "@/lib/db/schema";
import { and, count, desc, eq, isNull } from "drizzle-orm";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { getRequestId } from "@/lib/request-id";
import { getEnterpriseId, enterpriseScope } from "@/lib/auth/enterprise-scope";

/**
 * GET /api/dashboard/summary
 * Returns pre-computed KPI counts + top-5 lists for the executive dashboard.
 * Much cheaper than fetching all agents: computes counts server-side and
 * returns only the minimal fields needed to render the dashboard.
 */
export async function GET(request: NextRequest) {
  const { session: authSession, error } = await requireAuth();
  if (error) return error;
  const requestId = getRequestId(request);
  const ctx = getEnterpriseId(request);

  try {
    // Enterprise-scoped filters derived from middleware-injected context
    const enterpriseFilter = enterpriseScope(agentBlueprints.enterpriseId, ctx);
    const policyEnterpriseFilter = enterpriseScope(governancePolicies.enterpriseId, ctx);

    // Fetch minimal agent fields (no blueprint JSON, no tags)
    const agents = await db
      .selectDistinctOn([agentBlueprints.agentId], {
        id: agentBlueprints.id,
        agentId: agentBlueprints.agentId,
        name: agentBlueprints.name,
        version: agentBlueprints.version,
        tags: agentBlueprints.tags,
        status: agentBlueprints.status,
        validationReport: agentBlueprints.validationReport,
        updatedAt: agentBlueprints.updatedAt,
      })
      .from(agentBlueprints)
      .where(enterpriseFilter)
      .orderBy(agentBlueprints.agentId, desc(agentBlueprints.createdAt));

    // Policy count — active (non-superseded) policies only
    const policyWhere = policyEnterpriseFilter
      ? and(policyEnterpriseFilter, isNull(governancePolicies.supersededAt))
      : isNull(governancePolicies.supersededAt);
    const [policyRow] = await db
      .select({ count: count() })
      .from(governancePolicies)
      .where(policyWhere);

    const policyCount = Number(policyRow?.count ?? 0);

    // Derive violationCount for each agent
    type AgentSummary = {
      id: string;
      agentId: string;
      name: string | null;
      version: string;
      tags: string[];
      status: string;
      violationCount: number | null;
      updatedAt: Date;
    };

    const enriched: AgentSummary[] = agents.map((a) => {
      const report = a.validationReport as { violations?: { severity: string }[] } | null;
      const violationCount = report?.violations
        ? report.violations.filter((v) => v.severity === "error").length
        : null;
      return { id: a.id, agentId: a.agentId, name: a.name, version: a.version, tags: (a.tags ?? []) as string[], status: a.status, violationCount, updatedAt: a.updatedAt };
    });

    // Pipeline counts
    const byStatus = (s: string) => enriched.filter((a) => a.status === s).length;
    const counts = {
      total: enriched.length,
      deployed: byStatus("deployed"),
      approved: byStatus("approved"),
      inReview: byStatus("in_review"),
      draft: byStatus("draft"),
      rejected: byStatus("rejected"),
      deprecated: byStatus("deprecated"),
    };

    // Governance health
    const validated = enriched.filter((a) => a.violationCount !== null);
    const clean = enriched.filter((a) => a.violationCount === 0).length;
    const withErrors = enriched.filter((a) => (a.violationCount ?? 0) > 0).length;
    const notValidated = enriched.filter((a) => a.violationCount === null).length;
    const complianceRate =
      validated.length > 0 ? Math.round((clean / validated.length) * 100) : null;

    // Top 5 recently deployed
    const recentDeployed = enriched
      .filter((a) => a.status === "deployed")
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5)
      .map(({ id, agentId, name, version, tags, status, updatedAt }) => ({ id, agentId, name, version, tags, status, updatedAt }));

    // Top 5 needing attention (most violations first)
    const needingAttention = enriched
      .filter((a) => (a.violationCount ?? 0) > 0)
      .sort((a, b) => (b.violationCount ?? 0) - (a.violationCount ?? 0))
      .slice(0, 5)
      .map(({ id, agentId, name, violationCount }) => ({ id, agentId, name, violationCount }));

    return NextResponse.json({
      counts,
      governance: { clean, withErrors, notValidated, complianceRate },
      policyCount,
      recentDeployed,
      needingAttention,
    });
  } catch (err) {
    console.error(`[${requestId}] Dashboard summary failed:`, err);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to load dashboard summary", undefined, requestId);
  }
}

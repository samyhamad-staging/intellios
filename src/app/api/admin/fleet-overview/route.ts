import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agentBlueprints } from "@/lib/db/schema";
import { desc, eq, isNull, sql } from "drizzle-orm";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { getRequestId } from "@/lib/request-id";
import type { ValidationReport } from "@/lib/governance/types";

/**
 * GET /api/admin/fleet-overview
 *
 * Cross-enterprise fleet summary for platform super-admins only
 * (admin role with no enterpriseId — i.e., null enterprise scope).
 *
 * Returns per-enterprise counts + platform totals.
 */
export async function GET(request: NextRequest) {
  const { session: authSession, error } = await requireAuth(["admin"]);
  if (error) return error;
  const requestId = getRequestId(request);

  // Super-admin only: admin users scoped to a specific enterprise
  // should use the regular compliance posture API instead
  if (authSession.user.enterpriseId) {
    return apiError(
      ErrorCode.FORBIDDEN,
      "Platform fleet overview is only available to super-admins",
      undefined,
      requestId
    );
  }

  try {
    // Aggregate per-enterprise stats from agentBlueprints
    // Use the LATEST version per agentId (DISTINCT ON agentId ORDER BY createdAt DESC)
    // then group by enterpriseId + status
    const rows = await db
      .select({
        enterpriseId: agentBlueprints.enterpriseId,
        status:       agentBlueprints.status,
        count:        sql<number>`COUNT(DISTINCT ${agentBlueprints.agentId})::int`,
      })
      .from(agentBlueprints)
      .groupBy(agentBlueprints.enterpriseId, agentBlueprints.status)
      .orderBy(agentBlueprints.enterpriseId);

    // Build per-enterprise map
    const enterpriseMap: Record<
      string,
      {
        enterpriseId: string | null;
        totalAgents: number;
        deployedAgents: number;
        statusCounts: Record<string, number>;
      }
    > = {};

    for (const row of rows) {
      const key = row.enterpriseId ?? "__null__";
      if (!enterpriseMap[key]) {
        enterpriseMap[key] = {
          enterpriseId: row.enterpriseId,
          totalAgents: 0,
          deployedAgents: 0,
          statusCounts: {},
        };
      }
      enterpriseMap[key].statusCounts[row.status] = row.count;
      enterpriseMap[key].totalAgents += row.count;
      if (row.status === "deployed" || row.status === "approved") {
        enterpriseMap[key].deployedAgents += row.count;
      }
    }

    // Compute compliance rate per enterprise from validation reports
    // Fetch latest deployed/approved blueprints for compliance rate calculation
    const prodBlueprints = await db
      .selectDistinctOn([agentBlueprints.agentId], {
        agentId: agentBlueprints.agentId,
        enterpriseId: agentBlueprints.enterpriseId,
        validationReport: agentBlueprints.validationReport,
        status: agentBlueprints.status,
      })
      .from(agentBlueprints)
      .where(
        sql`${agentBlueprints.status} IN ('approved', 'deployed')`
      )
      .orderBy(agentBlueprints.agentId, desc(agentBlueprints.createdAt));

    // Group by enterprise for compliance calc
    const prodByEnterprise: Record<
      string,
      Array<{ validationReport: unknown }>
    > = {};
    for (const bp of prodBlueprints) {
      const key = bp.enterpriseId ?? "__null__";
      if (!prodByEnterprise[key]) prodByEnterprise[key] = [];
      prodByEnterprise[key].push({ validationReport: bp.validationReport });
    }

    // Build final enterprise list
    const enterprises = Object.values(enterpriseMap).map((e) => {
      const key = e.enterpriseId ?? "__null__";
      const prod = prodByEnterprise[key] ?? [];
      const prodWithErrors = prod.filter((bp) => {
        const report = bp.validationReport as ValidationReport | null;
        return report?.violations?.some((v) => v.severity === "error") ?? false;
      }).length;
      const complianceRate =
        prod.length > 0
          ? Math.round(((prod.length - prodWithErrors) / prod.length) * 100)
          : null;

      return {
        enterpriseId: e.enterpriseId,
        totalAgents: e.totalAgents,
        deployedAgents: e.deployedAgents,
        statusCounts: e.statusCounts,
        complianceRate,
      };
    });

    // Sort: named enterprises first (by agent count desc), then null enterprise
    enterprises.sort((a, b) => {
      if (a.enterpriseId === null) return 1;
      if (b.enterpriseId === null) return -1;
      return b.totalAgents - a.totalAgents;
    });

    // Platform totals
    const totals = {
      enterpriseCount: enterprises.filter((e) => e.enterpriseId !== null).length,
      totalAgents:     enterprises.reduce((s, e) => s + e.totalAgents, 0),
      deployedAgents:  enterprises.reduce((s, e) => s + e.deployedAgents, 0),
      avgComplianceRate:
        enterprises.filter((e) => e.complianceRate !== null).length > 0
          ? Math.round(
              enterprises
                .filter((e) => e.complianceRate !== null)
                .reduce((s, e) => s + (e.complianceRate ?? 0), 0) /
                enterprises.filter((e) => e.complianceRate !== null).length
            )
          : null,
    };

    return NextResponse.json({ enterprises, totals });
  } catch (err) {
    console.error(`[${requestId}] Failed to fetch fleet overview:`, err);
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      "Failed to fetch fleet overview",
      undefined,
      requestId
    );
  }
}

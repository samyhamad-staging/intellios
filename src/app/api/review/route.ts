import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agentBlueprints } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { getRequestId } from "@/lib/request-id";
import { getEnterpriseId, enterpriseScope } from "@/lib/auth/enterprise-scope";
import { getEnterpriseSettings } from "@/lib/settings/get-settings";
import type { ApprovalStepRecord } from "@/lib/settings/types";

/**
 * GET /api/review
 * Returns all blueprints in `in_review` status, scoped to the caller's enterprise
 * via middleware-injected x-enterprise-id header. Admins see all enterprises.
 *
 * Query params:
 *   ?role=X  — When provided, filters results to blueprints where the active
 *              approval step requires role X (multi-step approval filtering).
 *              When absent, all in_review blueprints are returned (legacy behavior).
 */
export async function GET(request: NextRequest) {
  const { session: authSession, error } = await requireAuth(["reviewer", "compliance_officer", "admin"]);
  if (error) return error;
  const requestId = getRequestId(request);
  const ctx = getEnterpriseId(request);

  const { searchParams } = new URL(request.url);
  const roleFilter = searchParams.get("role");

  try {
    // Combine enterprise scope with status filter
    const scope = enterpriseScope(agentBlueprints.enterpriseId, ctx);
    const enterpriseFilter = scope
      ? and(eq(agentBlueprints.status, "in_review"), scope)
      : eq(agentBlueprints.status, "in_review");

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
        currentApprovalStep: agentBlueprints.currentApprovalStep,
        approvalProgress: agentBlueprints.approvalProgress,
        enterpriseId: agentBlueprints.enterpriseId,
        createdAt: agentBlueprints.createdAt,
        updatedAt: agentBlueprints.updatedAt,
      })
      .from(agentBlueprints)
      .where(enterpriseFilter)
      .orderBy(agentBlueprints.updatedAt);

    // Phase 22: if ?role= is provided, resolve the enterprise's approval chain
    // and filter to blueprints where the active step requires the given role.
    if (roleFilter) {
      // Group blueprints by enterprise to avoid multiple settings fetches for same enterprise
      const enterpriseIds = [...new Set(rows.map((r) => r.enterpriseId))];
      const chainMap = new Map<string | null, Awaited<ReturnType<typeof getEnterpriseSettings>>>();

      for (const eid of enterpriseIds) {
        const settings = await getEnterpriseSettings(eid);
        chainMap.set(eid, settings);
      }

      const filtered = rows.filter((row) => {
        const settings = chainMap.get(row.enterpriseId);
        const chain = settings?.approvalChain ?? [];
        if (chain.length === 0) {
          // Legacy mode: all reviewer/admin roles see all items
          return roleFilter === "reviewer" || roleFilter === "admin";
        }
        const activeStep = chain[row.currentApprovalStep];
        return activeStep?.role === roleFilter;
      });

      return NextResponse.json({ blueprints: filtered });
    }

    return NextResponse.json({ blueprints: rows });
  } catch (error) {
    console.error(`[${requestId}] Failed to fetch review queue:`, error);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to fetch review queue", undefined, requestId);
  }
}

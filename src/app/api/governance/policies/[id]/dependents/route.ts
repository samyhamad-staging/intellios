/**
 * GET /api/governance/policies/[id]/dependents
 * Returns the count of active blueprints that would be affected by deleting this policy.
 * "Affected" = blueprints in the same enterprise scope that are not in terminal states.
 * Used by the delete confirmation dialog to show the cascade impact (W3-05).
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { governancePolicies, agentBlueprints } from "@/lib/db/schema";
import { eq, isNull, or, and, inArray } from "drizzle-orm";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { getRequestId } from "@/lib/request-id";

const TERMINAL_STATUSES = ["deprecated", "rejected"];
const ACTIVE_STATUSES = ["draft", "in_review", "approved", "deployed", "suspended"];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error: authError } = await requireAuth(["compliance_officer", "admin"]);
  if (authError) return authError;

  const requestId = getRequestId(request);
  const { id } = await params;

  try {
    const policy = await db.query.governancePolicies.findFirst({
      where: eq(governancePolicies.id, id),
    });

    if (!policy) {
      return apiError(ErrorCode.NOT_FOUND, "Policy not found", undefined, requestId);
    }

    // Count active blueprints in the policy's enterprise scope
    // Global policies (enterpriseId IS NULL) affect all enterprises — count all active blueprints
    // Enterprise-scoped policies affect only that enterprise's blueprints
    const enterpriseFilter = policy.enterpriseId
      ? eq(agentBlueprints.enterpriseId, policy.enterpriseId)
      : undefined; // global policy — no enterprise restriction

    const statusFilter = inArray(agentBlueprints.status, ACTIVE_STATUSES);

    const blueprintFilter = enterpriseFilter
      ? and(statusFilter, enterpriseFilter)
      : statusFilter;

    const rows = await db
      .select({ id: agentBlueprints.id })
      .from(agentBlueprints)
      .where(blueprintFilter);

    // If the policy has scopedAgentIds, only count those specific agents
    const scopedAgentIds = policy.scopedAgentIds as string[] | null;
    let blueprintCount = rows.length;

    if (scopedAgentIds && Array.isArray(scopedAgentIds) && scopedAgentIds.length > 0) {
      // Count only the blueprints belonging to the scoped agents
      const scopedRows = await db
        .select({ id: agentBlueprints.id })
        .from(agentBlueprints)
        .where(
          and(
            statusFilter,
            inArray(agentBlueprints.agentId, scopedAgentIds)
          )
        );
      blueprintCount = scopedRows.length;
    }

    return NextResponse.json({ blueprintCount, policyName: policy.name });
  } catch (error) {
    console.error(`[${requestId}] Failed to count policy dependents:`, error);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to count dependents", undefined, requestId);
  }
}

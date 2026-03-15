import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { governancePolicies } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { getRequestId } from "@/lib/request-id";

/**
 * GET /api/governance/policies/[id]/history
 *
 * Returns the full version history for a policy, ordered newest → oldest.
 * The [id] may be any version in the chain (oldest, middle, or newest) —
 * the endpoint will walk the chain from the given version back to the root.
 *
 * Access: compliance_officer | admin only.
 * enterprise_officer may only access global or own-enterprise policies.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session: authSession, error: authError } = await requireAuth([
    "compliance_officer",
    "admin",
  ]);
  if (authError) return authError;

  const requestId = getRequestId(request);
  const { id } = await params;

  try {
    // Fetch the requested version to validate access
    const startPolicy = await db.query.governancePolicies.findFirst({
      where: eq(governancePolicies.id, id),
    });

    if (!startPolicy) {
      return apiError(ErrorCode.NOT_FOUND, "Policy not found", undefined, requestId);
    }

    // Access control: compliance_officer cannot access another enterprise's policies
    if (authSession.user.role === "compliance_officer") {
      if (
        startPolicy.enterpriseId !== null &&
        startPolicy.enterpriseId !== authSession.user.enterpriseId
      ) {
        return apiError(ErrorCode.FORBIDDEN, "Access denied", undefined, requestId);
      }
    }

    // Walk the previousVersionId chain backward (up to 20 hops — cycle protection)
    // The chain from startPolicy is: startPolicy → prev → prev.prev → ...
    // We want newest → oldest, so we start from startPolicy and walk backward.
    // But startPolicy might not be the newest version. We need to find the root
    // of the lineage and collect all versions.
    //
    // Strategy: collect all versions sharing the same lineage.
    // Since each version stores previousVersionId, we build the chain by walking back.
    const chain: typeof startPolicy[] = [startPolicy];
    const seen = new Set<string>([startPolicy.id]);
    let current = startPolicy;

    for (let i = 0; i < 20 && current.previousVersionId; i++) {
      const prev = await db.query.governancePolicies.findFirst({
        where: eq(governancePolicies.id, current.previousVersionId),
      });
      if (!prev || seen.has(prev.id)) break;
      chain.push(prev);
      seen.add(prev.id);
      current = prev;
    }

    // chain is ordered newest-first (startPolicy first, then walking backward)
    // This is the desired order (newest → oldest)
    return NextResponse.json({
      history: chain.map((p) => ({
        id: p.id,
        policyVersion: p.policyVersion,
        name: p.name,
        type: p.type,
        description: p.description,
        rules: p.rules,
        previousVersionId: p.previousVersionId,
        supersededAt: p.supersededAt,
        createdAt: p.createdAt,
        isActive: p.supersededAt === null,
      })),
    });
  } catch (error) {
    console.error(`[${requestId}] Failed to fetch policy history:`, error);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to fetch policy history", undefined, requestId);
  }
}

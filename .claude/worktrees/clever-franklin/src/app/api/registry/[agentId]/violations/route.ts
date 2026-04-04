/**
 * Runtime Violations API — H2-1.3.
 *
 * GET /api/registry/[agentId]/violations
 *   ?since=<ISO>        — filter detectedAt >= since (default: 7 days ago)
 *   ?severity=<error|warning> — filter by severity (default: all)
 *   ?limit=<n>          — max rows (default: 50, max: 200)
 *
 * Auth: all authenticated roles; enterprise-scoped.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { runtimeViolations, agentBlueprints } from "@/lib/db/schema";
import { and, desc, eq, gte } from "drizzle-orm";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { assertEnterpriseAccess } from "@/lib/auth/enterprise";
import { getRequestId } from "@/lib/request-id";

async function resolveAgent(agentId: string) {
  return db.query.agentBlueprints.findFirst({
    where: eq(agentBlueprints.agentId, agentId),
    orderBy: [desc(agentBlueprints.createdAt)],
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { session: authSession, error } = await requireAuth();
  if (error) return error;
  const requestId = getRequestId(request);

  try {
    const { agentId } = await params;
    const { searchParams } = new URL(request.url);

    // Parse query params
    const sinceParam = searchParams.get("since");
    const severityParam = searchParams.get("severity");
    const limitParam = searchParams.get("limit");

    const since = sinceParam
      ? new Date(sinceParam)
      : new Date(Date.now() - 7 * 86_400_000); // default: 7 days ago
    const limit = Math.min(200, Math.max(1, parseInt(limitParam ?? "50", 10) || 50));

    // Validate severity filter
    const severity =
      severityParam === "error" || severityParam === "warning"
        ? severityParam
        : null;

    // Verify agent exists + enterprise access
    const latest = await resolveAgent(agentId);
    if (!latest) {
      return apiError(ErrorCode.NOT_FOUND, "Agent not found", undefined, requestId);
    }

    const enterpriseError = assertEnterpriseAccess(
      latest.enterpriseId,
      authSession.user
    );
    if (enterpriseError) return enterpriseError;

    // Build filter conditions
    const conditions = [
      eq(runtimeViolations.agentId, agentId),
      gte(runtimeViolations.detectedAt, since),
      ...(severity ? [eq(runtimeViolations.severity, severity)] : []),
    ];

    const violations = await db
      .select()
      .from(runtimeViolations)
      .where(and(...conditions))
      .orderBy(desc(runtimeViolations.detectedAt))
      .limit(limit);

    return NextResponse.json({ violations, total: violations.length });
  } catch (err) {
    console.error(`[${requestId}] Failed to fetch runtime violations:`, err);
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      "Failed to fetch runtime violations",
      undefined,
      requestId
    );
  }
}

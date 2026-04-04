import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agentBlueprints } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { ABP } from "@/lib/types/abp";
import { diffABP } from "@/lib/diff/abp-diff";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { assertEnterpriseAccess } from "@/lib/auth/enterprise";
import { getRequestId } from "@/lib/request-id";

/**
 * GET /api/blueprints/[id]/diff?compareWith={blueprintId}
 *
 * Returns a structural diff between two blueprint versions of the same logical agent.
 * [id] is the newer (target) version; compareWith is the baseline.
 *
 * No DB writes. Computed on every request from immutable ABP records.
 * Accessible to all authenticated roles.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session: authSession, error } = await requireAuth();
  if (error) return error;
  const requestId = getRequestId(request);
  try {
    const { id } = await params;
    const compareWithId = new URL(request.url).searchParams.get("compareWith");

    if (!compareWithId) {
      return apiError(ErrorCode.BAD_REQUEST, "compareWith query parameter is required");
    }
    if (compareWithId === id) {
      return apiError(ErrorCode.BAD_REQUEST, "compareWith must be a different blueprint version");
    }

    const [blueprintTo, blueprintFrom] = await Promise.all([
      db.query.agentBlueprints.findFirst({ where: eq(agentBlueprints.id, id) }),
      db.query.agentBlueprints.findFirst({ where: eq(agentBlueprints.id, compareWithId) }),
    ]);

    if (!blueprintTo) return apiError(ErrorCode.NOT_FOUND, "Blueprint not found");
    if (!blueprintFrom) return apiError(ErrorCode.NOT_FOUND, "Comparison blueprint not found");

    // Both must belong to the same logical agent
    if (blueprintTo.agentId !== blueprintFrom.agentId) {
      return apiError(ErrorCode.BAD_REQUEST, "Cannot diff blueprints from different logical agents");
    }

    // Enterprise access check (checking the newer version is sufficient — they share agentId)
    const enterpriseError = assertEnterpriseAccess(blueprintTo.enterpriseId, authSession.user);
    if (enterpriseError) return enterpriseError;

    const diff = diffABP(
      { ...(blueprintFrom.abp as ABP), id: blueprintFrom.id, version: blueprintFrom.version } as ABP & { id: string; version: string },
      { ...(blueprintTo.abp as ABP),   id: blueprintTo.id,   version: blueprintTo.version }   as ABP & { id: string; version: string }
    );

    return NextResponse.json(diff);
  } catch (err) {
    console.error(`[${requestId}] Failed to compute blueprint diff:`, err);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to compute blueprint diff", undefined, requestId);
  }
}

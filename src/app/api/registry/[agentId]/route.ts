import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agentBlueprints } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { getRequestId } from "@/lib/request-id";

/**
 * GET /api/registry/[agentId]
 * Returns the latest version of an agent plus its full version history.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { error } = await requireAuth();
  if (error) return error;
  const requestId = getRequestId(request);
  try {
    const { agentId } = await params;

    const versions = await db
      .select()
      .from(agentBlueprints)
      .where(eq(agentBlueprints.agentId, agentId))
      .orderBy(desc(agentBlueprints.createdAt));

    if (versions.length === 0) {
      return apiError(ErrorCode.NOT_FOUND, "Agent not found");
    }

    const latest = versions[0];

    return NextResponse.json({ agent: latest, versions });
  } catch (error) {
    console.error(`[${requestId}] Failed to fetch agent:`, error);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to fetch agent", undefined, requestId);
  }
}

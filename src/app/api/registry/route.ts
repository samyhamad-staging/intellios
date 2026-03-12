import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agentBlueprints } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { apiError, ErrorCode } from "@/lib/errors";

/**
 * GET /api/registry
 * Returns all registered agents — latest version per agentId.
 * In MVP, each agentId has exactly one version row.
 */
export async function GET() {
  try {
    // Fetch all blueprints; DISTINCT ON agentId ordered by created_at desc gives latest per agent
    const agents = await db
      .selectDistinctOn([agentBlueprints.agentId], {
        id: agentBlueprints.id,
        agentId: agentBlueprints.agentId,
        version: agentBlueprints.version,
        name: agentBlueprints.name,
        tags: agentBlueprints.tags,
        status: agentBlueprints.status,
        sessionId: agentBlueprints.sessionId,
        createdAt: agentBlueprints.createdAt,
        updatedAt: agentBlueprints.updatedAt,
      })
      .from(agentBlueprints)
      .orderBy(agentBlueprints.agentId, desc(agentBlueprints.createdAt));

    // Sort the results by updatedAt desc (distinctOn forces agentId ordering)
    agents.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    return NextResponse.json({ agents });
  } catch (error) {
    console.error("Failed to list registry agents:", error);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to list agents");
  }
}

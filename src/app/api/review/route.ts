import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agentBlueprints } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";

/**
 * GET /api/review
 * Returns all blueprints currently in the `in_review` status (the review queue).
 */
export async function GET() {
  const { error } = await requireAuth(["reviewer", "compliance_officer", "admin"]);
  if (error) return error;
  try {
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
        createdAt: agentBlueprints.createdAt,
        updatedAt: agentBlueprints.updatedAt,
      })
      .from(agentBlueprints)
      .where(eq(agentBlueprints.status, "in_review"))
      .orderBy(agentBlueprints.updatedAt);

    return NextResponse.json({ blueprints: rows });
  } catch (error) {
    console.error("Failed to fetch review queue:", error);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to fetch review queue");
  }
}

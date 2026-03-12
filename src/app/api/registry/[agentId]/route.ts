import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agentBlueprints } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

/**
 * GET /api/registry/[agentId]
 * Returns the latest version of an agent plus its full version history.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params;

    const versions = await db
      .select()
      .from(agentBlueprints)
      .where(eq(agentBlueprints.agentId, agentId))
      .orderBy(desc(agentBlueprints.createdAt));

    if (versions.length === 0) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const latest = versions[0];

    return NextResponse.json({ agent: latest, versions });
  } catch (error) {
    console.error("Failed to fetch agent:", error);
    return NextResponse.json(
      { error: "Failed to fetch agent" },
      { status: 500 }
    );
  }
}

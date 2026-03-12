import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agentBlueprints, intakeSessions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ABP } from "@/lib/types/abp";
import { validateBlueprint } from "@/lib/governance/validator";

/**
 * POST /api/blueprints/[id]/validate
 * Runs governance validation against all applicable policies.
 * Stores the report in agent_blueprints.validation_report and returns it.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const blueprint = await db.query.agentBlueprints.findFirst({
      where: eq(agentBlueprints.id, id),
    });

    if (!blueprint) {
      return NextResponse.json(
        { error: "Blueprint not found" },
        { status: 404 }
      );
    }

    const abp = blueprint.abp as ABP;

    // Determine enterprise scope from the originating intake session
    const session = await db.query.intakeSessions.findFirst({
      where: eq(intakeSessions.id, blueprint.sessionId),
    });
    const enterpriseId = session?.enterpriseId ?? null;

    // Run validation
    const report = await validateBlueprint(abp, enterpriseId);

    // Persist the report
    await db
      .update(agentBlueprints)
      .set({ validationReport: report, updatedAt: new Date() })
      .where(eq(agentBlueprints.id, id));

    return NextResponse.json({ report });
  } catch (error) {
    console.error("Failed to validate blueprint:", error);
    return NextResponse.json(
      { error: "Failed to run validation" },
      { status: 500 }
    );
  }
}

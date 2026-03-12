import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agentBlueprints, intakeSessions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { refineBlueprint } from "@/lib/generation/generate";
import { ABP } from "@/lib/types/abp";
import { IntakePayload } from "@/lib/types/intake";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { change } = (await request.json()) as { change: string };

    if (!change?.trim()) {
      return NextResponse.json(
        { error: "change is required" },
        { status: 400 }
      );
    }

    const blueprint = await db.query.agentBlueprints.findFirst({
      where: eq(agentBlueprints.id, id),
    });

    if (!blueprint) {
      return NextResponse.json(
        { error: "Blueprint not found" },
        { status: 404 }
      );
    }

    if (blueprint.status === "approved") {
      return NextResponse.json(
        { error: "Approved blueprints cannot be refined" },
        { status: 409 }
      );
    }

    // Fetch original intake for context
    const session = await db.query.intakeSessions.findFirst({
      where: eq(intakeSessions.id, blueprint.sessionId),
    });

    const intake = (session?.intakePayload ?? {}) as IntakePayload;
    const currentAbp = blueprint.abp as ABP;

    // Refine via Claude
    const updatedAbp = await refineBlueprint(currentAbp, change.trim(), intake);
    const newCount = String(parseInt(blueprint.refinementCount ?? "0", 10) + 1);

    // Persist the refined version
    const [updated] = await db
      .update(agentBlueprints)
      .set({
        abp: updatedAbp,
        refinementCount: newCount,
        updatedAt: new Date(),
      })
      .where(eq(agentBlueprints.id, id))
      .returning();

    return NextResponse.json({ id: updated.id, abp: updatedAbp, refinementCount: newCount });
  } catch (error) {
    console.error("Failed to refine blueprint:", error);
    return NextResponse.json(
      { error: "Failed to refine blueprint" },
      { status: 500 }
    );
  }
}

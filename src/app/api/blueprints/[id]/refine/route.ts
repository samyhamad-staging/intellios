import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agentBlueprints, intakeSessions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { refineBlueprint } from "@/lib/generation/generate";
import { ABP } from "@/lib/types/abp";
import { IntakePayload } from "@/lib/types/intake";
import { apiError, aiError, ErrorCode } from "@/lib/errors";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { change } = (await request.json()) as { change: string };

    if (!change?.trim()) {
      return apiError(ErrorCode.BAD_REQUEST, "change is required");
    }

    const blueprint = await db.query.agentBlueprints.findFirst({
      where: eq(agentBlueprints.id, id),
    });

    if (!blueprint) {
      return apiError(ErrorCode.NOT_FOUND, "Blueprint not found");
    }

    if (blueprint.status === "approved") {
      return apiError(ErrorCode.CONFLICT, "Approved blueprints cannot be refined");
    }

    // Fetch original intake for context
    const session = await db.query.intakeSessions.findFirst({
      where: eq(intakeSessions.id, blueprint.sessionId),
    });

    const intake = (session?.intakePayload ?? {}) as IntakePayload;
    const currentAbp = blueprint.abp as ABP;

    // Refine via Claude
    let updatedAbp: ABP;
    try {
      updatedAbp = await refineBlueprint(currentAbp, change.trim(), intake);
    } catch (err) {
      console.error("Claude refineBlueprint failed:", err);
      return aiError(err);
    }
    const newCount = String(parseInt(blueprint.refinementCount ?? "0", 10) + 1);

    // Re-sync denormalized registry fields in case identity or tags changed
    const name = updatedAbp.identity.name ?? null;
    const tags = (updatedAbp.metadata.tags ?? []) as string[];

    // Persist the refined version (update-in-place for MVP)
    const [updated] = await db
      .update(agentBlueprints)
      .set({ abp: updatedAbp, name, tags, refinementCount: newCount, updatedAt: new Date() })
      .where(eq(agentBlueprints.id, id))
      .returning();

    return NextResponse.json({
      id: updated.id,
      agentId: updated.agentId,
      abp: updatedAbp,
      refinementCount: newCount,
    });
  } catch (error) {
    console.error("Failed to refine blueprint:", error);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to refine blueprint");
  }
}

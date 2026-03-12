import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { intakeSessions, agentBlueprints } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generateBlueprint } from "@/lib/generation/generate";
import { IntakePayload } from "@/lib/types/intake";

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = (await request.json()) as { sessionId: string };

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      );
    }

    const session = await db.query.intakeSessions.findFirst({
      where: eq(intakeSessions.id, sessionId),
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.status !== "completed") {
      return NextResponse.json(
        { error: "Intake session must be completed before generating a blueprint" },
        { status: 422 }
      );
    }

    const intake = session.intakePayload as IntakePayload;

    // Generate the ABP via Claude
    const abp = await generateBlueprint(intake, sessionId);

    // Denormalize searchable fields from the ABP for the registry
    const name = abp.identity.name ?? null;
    const tags = (abp.metadata.tags ?? []) as string[];

    // Persist — agentId defaults to a new UUID (first version of a new agent)
    const [blueprint] = await db
      .insert(agentBlueprints)
      .values({ sessionId, abp, name, tags })
      .returning();

    return NextResponse.json({ id: blueprint.id, agentId: blueprint.agentId, abp });
  } catch (error) {
    console.error("Failed to generate blueprint:", error);
    return NextResponse.json(
      { error: "Failed to generate blueprint" },
      { status: 500 }
    );
  }
}

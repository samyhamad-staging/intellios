import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { intakeSessions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { IntakePayload } from "@/lib/types/intake";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const session = await db.query.intakeSessions.findFirst({
      where: eq(intakeSessions.id, id),
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.status === "completed") {
      return NextResponse.json(
        { error: "Session is already finalized" },
        { status: 409 }
      );
    }

    const payload = session.intakePayload as IntakePayload;

    // Validate minimum requirements (aligned with mark_intake_complete tool)
    const errors: string[] = [];
    if (!payload.identity?.name) errors.push("Agent name is required");
    if (!payload.identity?.description) errors.push("Agent description is required");
    if (!payload.capabilities?.tools?.length)
      errors.push("At least one tool/capability is required");

    if (errors.length > 0) {
      return NextResponse.json(
        { error: "Validation failed", details: errors },
        { status: 400 }
      );
    }

    // Mark session as completed
    const [updated] = await db
      .update(intakeSessions)
      .set({ status: "completed", updatedAt: new Date() })
      .where(eq(intakeSessions.id, id))
      .returning();

    return NextResponse.json({ session: updated, payload });
  } catch (error) {
    console.error("Failed to finalize intake session:", error);
    return NextResponse.json(
      { error: "Failed to finalize session" },
      { status: 500 }
    );
  }
}

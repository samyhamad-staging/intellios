import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { intakeSessions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
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

    return NextResponse.json(session.intakePayload);
  } catch (error) {
    console.error("Failed to fetch intake payload:", error);
    return NextResponse.json(
      { error: "Failed to fetch payload" },
      { status: 500 }
    );
  }
}

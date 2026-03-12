import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { intakeSessions, intakeMessages } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";

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

    const messages = await db.query.intakeMessages.findMany({
      where: eq(intakeMessages.sessionId, id),
      orderBy: [asc(intakeMessages.createdAt)],
    });

    return NextResponse.json({ session, messages });
  } catch (error) {
    console.error("Failed to fetch intake session:", error);
    return NextResponse.json(
      { error: "Failed to fetch session" },
      { status: 500 }
    );
  }
}

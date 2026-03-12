import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { intakeSessions, intakeMessages } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { apiError, ErrorCode } from "@/lib/errors";

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
      return apiError(ErrorCode.NOT_FOUND, "Session not found");
    }

    const messages = await db.query.intakeMessages.findMany({
      where: eq(intakeMessages.sessionId, id),
      orderBy: [asc(intakeMessages.createdAt)],
    });

    return NextResponse.json({ session, messages });
  } catch (error) {
    console.error("Failed to fetch intake session:", error);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to fetch session");
  }
}

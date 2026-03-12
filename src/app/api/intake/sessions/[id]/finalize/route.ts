import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { intakeSessions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { IntakePayload } from "@/lib/types/intake";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { getRequestId } from "@/lib/request-id";
import { writeAuditLog } from "@/lib/audit/log";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session: authSession, error } = await requireAuth(["designer", "admin"]);
  if (error) return error;
  const requestId = getRequestId(request);
  try {
    const { id } = await params;

    const session = await db.query.intakeSessions.findFirst({
      where: eq(intakeSessions.id, id),
    });

    if (!session) {
      return apiError(ErrorCode.NOT_FOUND, "Session not found");
    }

    if (session.status === "completed") {
      return apiError(ErrorCode.CONFLICT, "Session is already finalized");
    }

    const payload = session.intakePayload as IntakePayload;

    // Validate minimum requirements (aligned with mark_intake_complete tool)
    const errors: string[] = [];
    if (!payload.identity?.name) errors.push("Agent name is required");
    if (!payload.identity?.description) errors.push("Agent description is required");
    if (!payload.capabilities?.tools?.length)
      errors.push("At least one tool/capability is required");

    if (errors.length > 0) {
      return apiError(ErrorCode.BAD_REQUEST, "Validation failed", errors);
    }

    // Mark session as completed
    const [updated] = await db
      .update(intakeSessions)
      .set({ status: "completed", updatedAt: new Date() })
      .where(eq(intakeSessions.id, id))
      .returning();

    await writeAuditLog({
      entityType: "intake_session",
      entityId: id,
      action: "intake.finalized",
      actorEmail: authSession.user.email!,
      actorRole: authSession.user.role,
      fromState: { status: "active" },
      toState: { status: "completed" },
      metadata: { agentName: payload.identity?.name ?? null },
    });

    return NextResponse.json({ session: updated, payload });
  } catch (error) {
    console.error(`[${requestId}] Failed to finalize intake session:`, error);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to finalize session", undefined, requestId);
  }
}

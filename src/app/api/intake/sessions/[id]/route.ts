import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { intakeSessions, intakeMessages } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { assertEnterpriseAccess } from "@/lib/auth/enterprise";
import { getRequestId } from "@/lib/request-id";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session: authSession, error } = await requireAuth();
  if (error) return error;
  const requestId = getRequestId(request);

  try {
    const { id } = await params;
    const body = await request.json();

    const session = await db.query.intakeSessions.findFirst({
      where: eq(intakeSessions.id, id),
    });

    if (!session) {
      return apiError(ErrorCode.NOT_FOUND, "Session not found");
    }

    const enterpriseError = assertEnterpriseAccess(session.enterpriseId, authSession.user);
    if (enterpriseError) return enterpriseError;

    if (body.status === "in_progress") {
      await db
        .update(intakeSessions)
        .set({ status: "in_progress" })
        .where(eq(intakeSessions.id, id));
      return NextResponse.json({ ok: true });
    }

    return apiError(ErrorCode.BAD_REQUEST, "Unsupported status transition");
  } catch (error) {
    console.error(`[${requestId}] Failed to update intake session:`, error);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to update session", undefined, requestId);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session: authSession, error } = await requireAuth();
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

    const enterpriseError = assertEnterpriseAccess(session.enterpriseId, authSession.user);
    if (enterpriseError) return enterpriseError;

    // Only allow deleting incomplete sessions
    if (session.status === "completed") {
      return apiError(ErrorCode.BAD_REQUEST, "Cannot delete a completed session");
    }

    await db.delete(intakeSessions).where(eq(intakeSessions.id, id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(`[${requestId}] Failed to delete intake session:`, error);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to delete session", undefined, requestId);
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session: authSession, error } = await requireAuth();
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

    const enterpriseError = assertEnterpriseAccess(session.enterpriseId, authSession.user);
    if (enterpriseError) return enterpriseError;

    const messages = await db.query.intakeMessages.findMany({
      where: eq(intakeMessages.sessionId, id),
      orderBy: [asc(intakeMessages.createdAt)],
    });

    return NextResponse.json({ session, messages });
  } catch (error) {
    console.error(`[${requestId}] Failed to fetch intake session:`, error);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to fetch session", undefined, requestId);
  }
}

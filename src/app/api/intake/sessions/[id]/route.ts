import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { intakeSessions, intakeMessages, auditLog } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { z } from "zod";
import { parseBody } from "@/lib/parse-body";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { assertEnterpriseAccess } from "@/lib/auth/enterprise";
import { getRequestId } from "@/lib/request-id";
import { withTenantScopeGuarded } from "@/lib/auth/with-tenant-scope";
import { logger, serializeError } from "@/lib/logger";

const IntakeSessionPatchSchema = z.object({
  status: z.enum(["in_progress"]),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session: authSession, error } = await requireAuth();
  if (error) return error;
  const requestId = getRequestId(request);

  return withTenantScopeGuarded(request, async () => {
    try {
      // Activate RLS defense-in-depth layer
      const { id } = await params;

      const { data: body, error: bodyError } = await parseBody(request, IntakeSessionPatchSchema);
      if (bodyError) return bodyError;

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

        // Audit log
        try {
          await db.insert(auditLog).values({
            actorEmail: authSession.user.email!,
            actorRole: authSession.user.role!,
            action: "intake_session.updated",
            entityType: "intake_session",
            entityId: id,
            enterpriseId: session.enterpriseId ?? null,
            metadata: { status: "in_progress" },
          });
        } catch (auditErr) {
          logger.error("audit.write.failed", { action: "intake_session.updated", sessionId: id, requestId, err: serializeError(auditErr) });
        }

        return NextResponse.json({ ok: true });
      }

      return apiError(ErrorCode.BAD_REQUEST, "Unsupported status transition");
    } catch (error) {
      logger.error("intake_session.update.failed", { requestId, err: serializeError(error) });
      return apiError(ErrorCode.INTERNAL_ERROR, "Failed to update session", undefined, requestId);
    }
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session: authSession, error } = await requireAuth();
  if (error) return error;
  const requestId = getRequestId(request);

  return withTenantScopeGuarded(request, async () => {
    try {
      // Activate RLS defense-in-depth layer
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

      // Audit log
      try {
        await db.insert(auditLog).values({
          actorEmail: authSession.user.email!,
          actorRole: authSession.user.role!,
          action: "intake_session.deleted",
          entityType: "intake_session",
          entityId: id,
          enterpriseId: session.enterpriseId ?? null,
          metadata: {},
        });
      } catch (auditErr) {
        logger.error("audit.write.failed", { action: "intake_session.deleted", sessionId: id, requestId, err: serializeError(auditErr) });
      }

      return NextResponse.json({ ok: true });
    } catch (error) {
      logger.error("intake_session.delete.failed", { requestId, err: serializeError(error) });
      return apiError(ErrorCode.INTERNAL_ERROR, "Failed to delete session", undefined, requestId);
    }
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session: authSession, error } = await requireAuth();
  if (error) return error;
  const requestId = getRequestId(request);

  return withTenantScopeGuarded(request, async () => {
    try {
      // Activate RLS defense-in-depth layer
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
      logger.error("intake_session.fetch.failed", { requestId, err: serializeError(error) });
      return apiError(ErrorCode.INTERNAL_ERROR, "Failed to fetch session", undefined, requestId);
    }
  });
}

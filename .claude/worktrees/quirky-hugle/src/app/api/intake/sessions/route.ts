import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { intakeSessions } from "@/lib/db/schema";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { getRequestId } from "@/lib/request-id";
import { desc, eq, and, isNull } from "drizzle-orm";
import { IntakeContext } from "@/lib/types/intake";

export async function GET(request: NextRequest) {
  const { session: authSession, error } = await requireAuth(["architect", "admin"]);
  if (error) return error;
  const requestId = getRequestId(request);

  try {
    const user = authSession.user;

    // Scope: designer sees own sessions; admin sees all enterprise sessions
    const enterpriseFilter =
      user.role === "admin"
        ? user.enterpriseId
          ? eq(intakeSessions.enterpriseId, user.enterpriseId)
          : isNull(intakeSessions.enterpriseId)
        : user.enterpriseId
        ? and(
            eq(intakeSessions.enterpriseId, user.enterpriseId),
            eq(intakeSessions.createdBy, user.email ?? "")
          )
        : and(
            isNull(intakeSessions.enterpriseId),
            eq(intakeSessions.createdBy, user.email ?? "")
          );

    const sessions = await db
      .select({
        id: intakeSessions.id,
        status: intakeSessions.status,
        createdBy: intakeSessions.createdBy,
        createdAt: intakeSessions.createdAt,
        updatedAt: intakeSessions.updatedAt,
        intakePayload: intakeSessions.intakePayload,
        intakeContext: intakeSessions.intakeContext,
      })
      .from(intakeSessions)
      .where(enterpriseFilter)
      .orderBy(desc(intakeSessions.updatedAt));

    // Derive display fields from JSONB payload / context
    const result = sessions.map((s) => {
      const payload = s.intakePayload as Record<string, unknown> | null;
      const context = s.intakeContext as IntakeContext | null;
      const agentName =
        (payload?.identity as Record<string, unknown> | undefined)?.name as string | undefined;
      return {
        id: s.id,
        status: s.status,
        createdBy: s.createdBy,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
        agentName: agentName ?? null,
        agentPurpose: context?.agentPurpose ?? null,
        deploymentType: context?.deploymentType ?? null,
        dataSensitivity: context?.dataSensitivity ?? null,
        hasContext: !!context,
      };
    });

    return NextResponse.json({ sessions: result });
  } catch (err) {
    console.error(`[${requestId}] Failed to list intake sessions:`, err);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to list sessions", undefined, requestId);
  }
}

export async function POST(request: NextRequest) {
  const { session: authSession, error } = await requireAuth(["architect", "admin"]);
  if (error) return error;
  const requestId = getRequestId(request);

  try {
    const [session] = await db
      .insert(intakeSessions)
      .values({
        createdBy: authSession.user.email ?? null,
        enterpriseId: authSession.user.enterpriseId ?? null,
      })
      .returning();
    return NextResponse.json(session);
  } catch (error) {
    console.error(`[${requestId}] Failed to create intake session:`, error);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to create session", undefined, requestId);
  }
}

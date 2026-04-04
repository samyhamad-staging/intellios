import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { intakeSessions, intakeContributions } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { assertEnterpriseAccess } from "@/lib/auth/enterprise";
import { getRequestId } from "@/lib/request-id";
import { parseBody } from "@/lib/parse-body";
import { publishEvent } from "@/lib/events/publish";
import { z } from "zod";
import { ContributionDomain, StakeholderContribution } from "@/lib/types/intake";

const ContributionBody = z.object({
  domain: z.enum(["compliance", "risk", "legal", "security", "it", "operations", "business"]),
  fields: z.record(z.string(), z.string()),
});

// ── POST — Submit a stakeholder contribution ──────────────────────────────────
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Any authenticated enterprise user can contribute — no role restriction
  const { session: authSession, error } = await requireAuth(["architect", "designer", "reviewer", "compliance_officer", "admin"]);
  if (error) return error;
  const requestId = getRequestId(request);

  const { data: body, error: bodyError } = await parseBody(request, ContributionBody);
  if (bodyError) return bodyError;

  try {
    const { id: sessionId } = await params;

    const session = await db.query.intakeSessions.findFirst({
      where: eq(intakeSessions.id, sessionId),
    });

    if (!session) {
      return apiError(ErrorCode.NOT_FOUND, "Session not found");
    }

    const enterpriseError = assertEnterpriseAccess(session.enterpriseId, authSession.user);
    if (enterpriseError) return enterpriseError;

    if (session.status === "completed") {
      return apiError(ErrorCode.CONFLICT, "Cannot add contributions to a completed session");
    }

    const [row] = await db
      .insert(intakeContributions)
      .values({
        sessionId,
        enterpriseId: session.enterpriseId,
        contributorEmail: authSession.user.email!,
        contributorRole: authSession.user.role,
        domain: body.domain,
        fields: body.fields,
      })
      .returning();

    void publishEvent({
      event: {
        type: "intake.contribution_submitted",
        payload: {
          sessionId,
          domain: body.domain,
          raciRole: authSession.user.role,
          sessionCreatedBy: session.createdBy ?? "",
        },
      },
      actor: { email: authSession.user.email!, role: authSession.user.role },
      entity: { type: "intake_session", id: sessionId },
      enterpriseId: session.enterpriseId ?? null,
    });

    const contribution: StakeholderContribution = {
      id: row.id,
      sessionId: row.sessionId,
      contributorEmail: row.contributorEmail,
      contributorRole: row.contributorRole,
      domain: row.domain as ContributionDomain,
      fields: row.fields as Record<string, string>,
      createdAt: row.createdAt.toISOString(),
    };

    return NextResponse.json({ contribution }, { status: 201 });
  } catch (err) {
    console.error(`[${requestId}] Failed to save stakeholder contribution:`, err);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to save contribution", undefined, requestId);
  }
}

// ── GET — List contributions for a session ────────────────────────────────────
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session: authSession, error } = await requireAuth(["architect", "designer", "reviewer", "compliance_officer", "admin"]);
  if (error) return error;
  const requestId = getRequestId(request);

  try {
    const { id: sessionId } = await params;

    const session = await db.query.intakeSessions.findFirst({
      where: eq(intakeSessions.id, sessionId),
    });

    if (!session) {
      return apiError(ErrorCode.NOT_FOUND, "Session not found");
    }

    const enterpriseError = assertEnterpriseAccess(session.enterpriseId, authSession.user);
    if (enterpriseError) return enterpriseError;

    const rows = await db
      .select()
      .from(intakeContributions)
      .where(eq(intakeContributions.sessionId, sessionId))
      .orderBy(asc(intakeContributions.createdAt));

    const contributions: StakeholderContribution[] = rows.map((row) => ({
      id: row.id,
      sessionId: row.sessionId,
      contributorEmail: row.contributorEmail,
      contributorRole: row.contributorRole,
      domain: row.domain as ContributionDomain,
      fields: row.fields as Record<string, string>,
      createdAt: row.createdAt.toISOString(),
    }));

    return NextResponse.json({ contributions });
  } catch (err) {
    console.error(`[${requestId}] Failed to fetch stakeholder contributions:`, err);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to fetch contributions", undefined, requestId);
  }
}

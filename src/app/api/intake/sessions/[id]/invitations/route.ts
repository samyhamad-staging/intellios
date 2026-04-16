import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { intakeSessions, intakeInvitations, auditLog } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require";
import { assertEnterpriseAccess } from "@/lib/auth/enterprise";
import { apiError, ErrorCode } from "@/lib/errors";
import { getRequestId } from "@/lib/request-id";
import { parseBody } from "@/lib/parse-body";
import { logger, serializeError } from "@/lib/logger";
import { sendEmail, buildInvitationEmail } from "@/lib/notifications/email";
import { publishEvent } from "@/lib/events/publish";

const VALID_RACI_ROLES = ["responsible", "accountable", "consulted", "informed"] as const;
const VALID_DOMAINS = ["compliance", "risk", "legal", "security", "it", "operations", "business"] as const;

const CreateInvitationBody = z.object({
  domain: z.enum(VALID_DOMAINS),
  inviteeEmail: z.string().email(),
  inviteeName: z.string().max(100).optional(),
  roleTitle: z.string().max(100).optional(),
  raciRole: z.enum(VALID_RACI_ROLES).default("consulted"),
});

/** GET /api/intake/sessions/[id]/invitations — list all invitations for a session */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session: authSession, error } = await requireAuth([
    "architect", "designer", "reviewer", "compliance_officer", "admin",
  ]);
  if (error) return error;

  try {
    const { id: sessionId } = await params;

    const session = await db.query.intakeSessions.findFirst({
      where: eq(intakeSessions.id, sessionId),
    });
    if (!session) return apiError(ErrorCode.NOT_FOUND, "Session not found");

    const enterpriseError = assertEnterpriseAccess(session.enterpriseId, authSession.user);
    if (enterpriseError) return enterpriseError;

    const invitations = await db.query.intakeInvitations.findMany({
      where: eq(intakeInvitations.sessionId, sessionId),
    });

    return NextResponse.json({ invitations });
  } catch (err) {
    const requestId = getRequestId(request);
    logger.error("intake_invitations.fetch.failed", { requestId, err: serializeError(err) });
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to fetch invitations");
  }
}

/** POST /api/intake/sessions/[id]/invitations — create and send an invitation */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session: authSession, error } = await requireAuth(["architect", "designer", "admin"]);
  if (error) return error;

  const requestId = getRequestId(request);
  const { data: body, error: bodyError } = await parseBody(request, CreateInvitationBody);
  if (bodyError) return bodyError;

  try {
    const { id: sessionId } = await params;

    const session = await db.query.intakeSessions.findFirst({
      where: eq(intakeSessions.id, sessionId),
    });
    if (!session) return apiError(ErrorCode.NOT_FOUND, "Session not found");

    const enterpriseError = assertEnterpriseAccess(session.enterpriseId, authSession.user);
    if (enterpriseError) return enterpriseError;

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const [invitation] = await db
      .insert(intakeInvitations)
      .values({
        sessionId,
        domain: body.domain,
        inviteeEmail: body.inviteeEmail,
        inviteeName: body.inviteeName ?? null,
        roleTitle: body.roleTitle ?? null,
        raciRole: body.raciRole,
        token,
        status: "pending",
        expiresAt,
        sentAt: new Date(),
      })
      .returning();

    // Send invitation email (fire-and-forget)
    const appUrl = process.env.NOTIFICATION_APP_URL ?? "";
    const contributionUrl = `${appUrl}/contribute/${token}`;
    const sessionName = session.intakeContext
      ? ((session.intakeContext as { agentPurpose?: string }).agentPurpose ?? "Agent Design Session")
      : "Agent Design Session";

    void sendEmail({
      to: body.inviteeEmail,
      subject: `[Intellios] You've been invited to contribute to: ${sessionName}`,
      html: buildInvitationEmail(
        body.inviteeName ?? null,
        sessionName,
        body.domain,
        body.raciRole,
        body.roleTitle ?? null,
        contributionUrl,
        expiresAt
      ),
    });

    // Audit log for database
    try {
      await db.insert(auditLog).values({
        actorEmail: authSession.user.email!,
        actorRole: authSession.user.role!,
        action: "intake_invitation.created",
        entityType: "intake_invitation",
        entityId: invitation.id,
        enterpriseId: session.enterpriseId ?? null,
        metadata: { inviteeEmail: body.inviteeEmail, domain: body.domain, raciRole: body.raciRole },
      });
    } catch (auditErr) {
      logger.error("audit.write.failed", { action: "intake_invitation.created", requestId, err: serializeError(auditErr) });
    }

    // Event log for pub/sub
    void publishEvent({
      event: {
        type: "intake.invitation_sent",
        payload: {
          sessionId,
          inviteeEmail: body.inviteeEmail,
          raciRole: body.raciRole,
        },
      },
      actor: { email: authSession.user.email!, role: authSession.user.role ?? "architect" },
      entity: { type: "intake_session", id: sessionId },
      enterpriseId: session.enterpriseId ?? null,
    });

    return NextResponse.json({ invitation }, { status: 201 });
  } catch (err) {
    logger.error("intake_invitations.create.failed", { requestId, err: serializeError(err) });
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to create invitation");
  }
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { intakeSessions, intakeAIInsights, intakeInvitations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require";
import { assertEnterpriseAccess } from "@/lib/auth/enterprise";
import { apiError, ErrorCode } from "@/lib/errors";
import { getRequestId } from "@/lib/request-id";
import { parseBody } from "@/lib/parse-body";
import { randomBytes } from "crypto";
import { sendEmail, buildInvitationEmail } from "@/lib/notifications/email";
import { writeAuditLog } from "@/lib/audit/log";

const PatchBody = z.object({
  status: z.enum(["approved", "dismissed"]),
});

/** PATCH /api/intake/sessions/[id]/insights/[insightId] — approve or dismiss an insight */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; insightId: string }> }
) {
  const { session: authSession, error } = await requireAuth(["designer", "admin"]);
  if (error) return error;

  const requestId = getRequestId(request);
  const { data: body, error: bodyError } = await parseBody(request, PatchBody);
  if (bodyError) return bodyError;

  try {
    const { id: sessionId, insightId } = await params;

    const session = await db.query.intakeSessions.findFirst({
      where: eq(intakeSessions.id, sessionId),
    });
    if (!session) return apiError(ErrorCode.NOT_FOUND, "Session not found");

    const enterpriseError = assertEnterpriseAccess(session.enterpriseId, authSession.user);
    if (enterpriseError) return enterpriseError;

    const insight = await db.query.intakeAIInsights.findFirst({
      where: and(
        eq(intakeAIInsights.id, insightId),
        eq(intakeAIInsights.sessionId, sessionId)
      ),
    });
    if (!insight) return apiError(ErrorCode.NOT_FOUND, "Insight not found");

    // Update status
    const [updated] = await db
      .update(intakeAIInsights)
      .set({ status: body.status })
      .where(eq(intakeAIInsights.id, insightId))
      .returning();

    // If approved and this is a "suggest invite" — auto-create the invitation
    if (body.status === "approved" && insight.type === "suggestion") {
      const meta = insight.metadata as {
        action?: string;
        domain?: string;
        suggestedEmail?: string;
        suggestedRoleTitle?: string;
      } | null;

      if (meta?.action === "invite" && meta.domain) {
        const token = randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        const [invitation] = await db
          .insert(intakeInvitations)
          .values({
            sessionId,
            domain: meta.domain,
            inviteeEmail: meta.suggestedEmail ?? "unknown@placeholder.com",
            inviteeName: null,
            roleTitle: meta.suggestedRoleTitle ?? null,
            raciRole: "consulted",
            token,
            status: "pending",
            expiresAt,
            sentAt: meta.suggestedEmail ? new Date() : null,
          })
          .returning();

        // Send email only if we have a real email address
        if (meta.suggestedEmail && meta.suggestedEmail !== "unknown@placeholder.com") {
          const appUrl = process.env.NOTIFICATION_APP_URL ?? "";
          const contributionUrl = `${appUrl}/contribute/${token}`;
          const context = session.intakeContext as { agentPurpose?: string } | null;
          const sessionName = context?.agentPurpose ?? "Agent Design Session";

          void sendEmail({
            to: meta.suggestedEmail,
            subject: `[Intellios] You've been invited to contribute to: ${sessionName}`,
            html: buildInvitationEmail(
              null,
              sessionName,
              meta.domain,
              "consulted",
              meta.suggestedRoleTitle ?? null,
              contributionUrl,
              expiresAt
            ),
          });
        }

        void writeAuditLog({
          entityType: "intake_session",
          entityId: sessionId,
          action: "intake.invitation_sent",
          actorEmail: authSession.user.email!,
          actorRole: authSession.user.role ?? "designer",
          enterpriseId: session.enterpriseId,
          metadata: {
            invitationId: invitation.id,
            domain: meta.domain,
            source: "insight_approved",
            insightId,
          },
        });
      }
    }

    return NextResponse.json({ insight: updated });
  } catch (err) {
    console.error(`[${requestId}] PATCH insight failed:`, err);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to update insight");
  }
}

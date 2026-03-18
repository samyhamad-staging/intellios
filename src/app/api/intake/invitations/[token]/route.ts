import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { intakeInvitations, intakeSessions, intakeContributions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { apiError, ErrorCode } from "@/lib/errors";
import { getLatestSynthesis } from "@/lib/intake/orchestrator";
import type { IntakeContext, IntakePayload } from "@/lib/types/intake";

/** GET /api/intake/invitations/[token] — validate token and return workspace metadata */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const invitation = await db.query.intakeInvitations.findFirst({
      where: eq(intakeInvitations.token, token),
    });

    if (!invitation) {
      return NextResponse.json({ valid: false, reason: "not_found" });
    }

    if (invitation.status === "completed") {
      // Still return metadata so the completed page can show the synthesis
      const session = await db.query.intakeSessions.findFirst({
        where: eq(intakeSessions.id, invitation.sessionId),
      });
      const synthesis = await getLatestSynthesis(invitation.sessionId);

      const context = session?.intakeContext as IntakeContext | null;
      const payload = session?.intakePayload as IntakePayload | null;
      const sessionName =
        (payload as { agentIdentity?: { name?: string } } | null)?.agentIdentity?.name ??
        context?.agentPurpose ??
        "Agent Design Session";

      return NextResponse.json({
        valid: false,
        reason: "already_completed",
        domain: invitation.domain,
        inviteeName: invitation.inviteeName,
        sessionContext: { name: sessionName },
        synthesis,
      });
    }

    if (new Date(invitation.expiresAt) < new Date()) {
      return NextResponse.json({ valid: false, reason: "expired" });
    }

    // Load session context
    const session = await db.query.intakeSessions.findFirst({
      where: eq(intakeSessions.id, invitation.sessionId),
    });
    if (!session) {
      return NextResponse.json({ valid: false, reason: "not_found" });
    }

    const context = session.intakeContext as IntakeContext | null;
    const payload = session.intakePayload as IntakePayload | null;
    const sessionName =
      (payload as { agentIdentity?: { name?: string } } | null)?.agentIdentity?.name ??
      context?.agentPurpose ??
      "Agent Design Session";

    // Load all invitations for this session (for collaborator list — redact name/email)
    const allInvitations = await db.query.intakeInvitations.findMany({
      where: eq(intakeInvitations.sessionId, invitation.sessionId),
    });

    const collaborators = allInvitations
      .filter((inv) => inv.id !== invitation.id)
      .map((inv) => ({
        roleTitle: inv.roleTitle ?? inv.raciRole,
        domain: inv.domain,
        raciRole: inv.raciRole,
        status: inv.status,
      }));

    // Get latest synthesis
    const synthesis = await getLatestSynthesis(invitation.sessionId);

    return NextResponse.json({
      valid: true,
      invitationId: invitation.id,
      domain: invitation.domain,
      raciRole: invitation.raciRole,
      roleTitle: invitation.roleTitle,
      inviteeName: invitation.inviteeName,
      sessionContext: {
        name: sessionName,
        description: context?.agentPurpose ?? "",
        riskTier: session.riskTier,
        agentType: session.agentType,
      },
      collaborators,
      synthesis,
    });
  } catch (err) {
    console.error("[invitations/token] GET failed:", err);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to validate invitation");
  }
}

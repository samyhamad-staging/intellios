import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, userInvitations, auditLog } from "@/lib/db/schema";
import { and, eq, isNull, gt } from "drizzle-orm";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { getRequestId } from "@/lib/request-id";
import { parseBody } from "@/lib/parse-body";
import { sendEmail, buildNotificationEmail } from "@/lib/notifications/email";
import crypto from "node:crypto";
import { z } from "zod";

const ROLES = ["architect", "designer", "reviewer", "compliance_officer", "admin", "viewer"] as const;

const InviteBody = z.object({
  email: z.string().email().max(300),
  role: z.enum(ROLES),
});

/**
 * POST /api/admin/users/invite
 *
 * Sends an invitation email to a new user. The invitee clicks the link to
 * create their account and set their own password.
 *
 * Admin-only. Invitation expires in 72 hours.
 */
export async function POST(request: NextRequest) {
  const { session: authSession, error: authError } = await requireAuth(["admin"]);
  if (authError) return authError;

  const { data: body, error: bodyError } = await parseBody(request, InviteBody);
  if (bodyError) return bodyError;

  const requestId = getRequestId(request);
  const email = body.email.toLowerCase();
  const enterpriseId = authSession.user.enterpriseId ?? null;

  try {
    // Check no active user with this email
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });
    if (existingUser) {
      return apiError(
        ErrorCode.CONFLICT,
        "A user with this email address already exists",
        undefined,
        requestId
      );
    }

    // Check no unexpired, unaccepted invitation for same email + enterprise
    const existingInvite = await db.query.userInvitations.findFirst({
      where: and(
        eq(userInvitations.email, email),
        enterpriseId
          ? eq(userInvitations.enterpriseId, enterpriseId)
          : isNull(userInvitations.enterpriseId),
        isNull(userInvitations.acceptedAt),
        gt(userInvitations.expiresAt, new Date())
      ),
    });
    if (existingInvite) {
      return apiError(
        ErrorCode.CONFLICT,
        "A pending invitation has already been sent to this email address",
        undefined,
        requestId
      );
    }

    // Generate invitation token
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours

    const [invitation] = await db
      .insert(userInvitations)
      .values({
        enterpriseId,
        email,
        role: body.role,
        invitedBy: authSession.user.id!,
        tokenHash,
        expiresAt,
      })
      .returning();

    const invitePath = `/auth/invite?token=${rawToken}`;
    const roleLabel = body.role.replace(/_/g, " ");
    const title = "You've been invited to Intellios";
    const message = `You've been invited to join as ${roleLabel}. Click the link below to accept and create your account. This invitation expires in 72 hours.`;

    void sendEmail({
      to: email,
      subject: "[Intellios] You've been invited",
      html: buildNotificationEmail(title, message, invitePath),
    });

    // Audit log: user invitation
    try {
      await db.insert(auditLog).values({
        actorEmail: authSession.user.email!,
        actorRole: authSession.user.role!,
        action: "user.invited",
        entityType: "invitation",
        entityId: invitation.id,
        enterpriseId: invitation.enterpriseId,
        metadata: {
          inviteeEmail: email,
          inviteeRole: body.role,
          expiresAt: expiresAt.toISOString(),
        },
      });
    } catch (auditErr) {
      console.error(`[${requestId}] Failed to write audit log:`, auditErr);
    }

    return NextResponse.json(
      {
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          expiresAt: invitation.expiresAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error(`[${requestId}] Failed to create invitation:`, err);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to send invitation", undefined, requestId);
  }
}

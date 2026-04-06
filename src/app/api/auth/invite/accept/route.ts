import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, userInvitations, auditLog } from "@/lib/db/schema";
import { and, eq, gt, isNull } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { parseBody } from "@/lib/parse-body";
import { getRequestId } from "@/lib/request-id";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const AcceptInviteBody = z.object({
  token: z.string().min(1),
  name: z.string().min(1).max(200),
  password: z.string().min(8).max(128),
});

/**
 * POST /api/auth/invite/accept
 *
 * Accepts a user invitation: creates the user account with the provided
 * name and password, then marks the invitation as accepted.
 *
 * Public — no requireAuth. Token validation is the security mechanism.
 */
export async function POST(request: NextRequest) {
  // P1-SEC-010 FIX: Rate limit invitation acceptance to prevent brute-force token guessing
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  const rateLimitResponse = await rateLimit(ip, {
    endpoint: "invite-accept",
    max: 10,
    windowMs: 60 * 60 * 1000, // 10 per hour per IP
  });
  if (rateLimitResponse) return rateLimitResponse;

  const { data: body, error: bodyError } = await parseBody(request, AcceptInviteBody);
  if (bodyError) return bodyError;

  const requestId = getRequestId(request);

  const tokenHash = crypto.createHash("sha256").update(body.token).digest("hex");

  try {
    // P1-SEC-002 FIX: Wrap in transaction to prevent race condition.
    // Without a transaction, concurrent requests with the same token can both
    // pass the isNull(acceptedAt) check and create duplicate user accounts.
    const result = await db.transaction(async (tx) => {
      // Validate invitation
      const invitation = await tx.query.userInvitations.findFirst({
        where: and(
          eq(userInvitations.tokenHash, tokenHash),
          isNull(userInvitations.acceptedAt),
          gt(userInvitations.expiresAt, new Date())
        ),
      });

      if (!invitation) return { ok: false as const, reason: "expired" as const };

      // Mark invitation accepted FIRST (within transaction) to prevent concurrent reuse
      await tx
        .update(userInvitations)
        .set({ acceptedAt: new Date() })
        .where(eq(userInvitations.id, invitation.id));

      // Guard: ensure email not already registered
      const existingUser = await tx.query.users.findFirst({
        where: eq(users.email, invitation.email),
      });
      if (existingUser) return { ok: false as const, reason: "exists" as const };

      const passwordHash = await bcrypt.hash(body.password, 12);

      // Create user
      const [newUser] = await tx.insert(users).values({
        name: body.name,
        email: invitation.email,
        passwordHash,
        role: invitation.role,
        enterpriseId: invitation.enterpriseId ?? null,
      }).returning({
        id: users.id,
        email: users.email,
        role: users.role,
        enterpriseId: users.enterpriseId,
      });

      return { ok: true as const, user: newUser, invitationId: invitation.id };
    });

    if (!result.ok) {
      if (result.reason === "exists") {
        return NextResponse.json(
          { error: "An account with this email already exists. Please sign in." },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: "This invitation has expired or has already been used." },
        { status: 400 }
      );
    }

    // Audit log: invitation accepted (actor is the newly created user)
    try {
      await db.insert(auditLog).values({
        actorEmail: result.user.email,
        actorRole: result.user.role,
        action: "invitation.accepted",
        entityType: "invitation",
        entityId: result.invitationId,
        enterpriseId: result.user.enterpriseId,
        metadata: {
          userEmail: result.user.email,
          userRole: result.user.role,
        },
      });
    } catch (auditErr) {
      console.error(`[${requestId}] Failed to write audit log:`, auditErr);
    }

    return NextResponse.json({ message: "Account created successfully." });
  } catch (err) {
    console.error(`[${requestId}] Failed to accept invitation:`, err);
    return NextResponse.json({ error: "Failed to create account." }, { status: 500 });
  }
}

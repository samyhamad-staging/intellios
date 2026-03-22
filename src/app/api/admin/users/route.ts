import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { getRequestId } from "@/lib/request-id";
import { parseBody } from "@/lib/parse-body";
import { z } from "zod";

const ROLES = ["architect", "reviewer", "compliance_officer", "admin", "viewer"] as const;
const MIN_PASSWORD_LENGTH = 8;

const CreateUserBody = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(300),
  role: z.enum(ROLES),
  password: z.string().min(MIN_PASSWORD_LENGTH).max(128),
});

/**
 * GET /api/admin/users
 * Returns all users scoped to the admin's enterprise.
 * Platform admins (no enterpriseId) see all users.
 * Admin-only.
 */
export async function GET(request: NextRequest) {
  const { session: authSession, error: authError } = await requireAuth(["admin"]);
  if (authError) return authError;

  const requestId = getRequestId(request);
  try {
    const filter = authSession.user.enterpriseId
      ? eq(users.enterpriseId, authSession.user.enterpriseId)
      : undefined;

    const rows = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        enterpriseId: users.enterpriseId,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(filter);

    return NextResponse.json({ users: rows });
  } catch (error) {
    console.error(`[${requestId}] Failed to list users:`, error);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to list users", undefined, requestId);
  }
}

/**
 * POST /api/admin/users
 * Creates a new user in the admin's enterprise.
 * Password is hashed before storage. Admin-only.
 * Body: { name, email, role, password }
 */
export async function POST(request: NextRequest) {
  const { session: authSession, error: authError } = await requireAuth(["admin"]);
  if (authError) return authError;

  const { data: body, error: bodyError } = await parseBody(request, CreateUserBody);
  if (bodyError) return bodyError;

  const requestId = getRequestId(request);
  try {
    // Ensure email is not already taken
    const existing = await db.query.users.findFirst({
      where: eq(users.email, body.email.toLowerCase()),
    });
    if (existing) {
      return apiError(ErrorCode.CONFLICT, "A user with this email already exists", undefined, requestId);
    }

    const passwordHash = await bcrypt.hash(body.password, 12);

    const [user] = await db
      .insert(users)
      .values({
        name: body.name,
        email: body.email.toLowerCase(),
        passwordHash,
        role: body.role,
        enterpriseId: authSession.user.enterpriseId ?? null,
      })
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        enterpriseId: users.enterpriseId,
        createdAt: users.createdAt,
      });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error(`[${requestId}] Failed to create user:`, error);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to create user", undefined, requestId);
  }
}

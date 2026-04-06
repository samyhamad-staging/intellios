/**
 * POST /api/auth/register
 * Public — no auth required.
 *
 * Creates a new enterprise from scratch:
 *   1. Validates input
 *   2. Checks email uniqueness
 *   3. Generates a new enterpriseId UUID
 *   4. Creates the admin user (bcrypt)
 *   5. Upserts initial enterprise settings (branding + approval chain)
 *   6. Seeds the SR 11-7 Core governance policy pack
 *
 * On success: returns 201 { message: "Account created" }.
 * Client redirects to /login?registered=1.
 *
 * Rate limit: 5 requests/hour per IP.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, enterpriseSettings, governancePolicies, auditLog } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { z } from "zod";
import { apiError, ErrorCode } from "@/lib/errors";
import { parseBody } from "@/lib/parse-body";
import { rateLimit } from "@/lib/rate-limit";
import { findTemplatePack } from "@/lib/governance/policy-templates";
import { getRequestId } from "@/lib/request-id";

const RegisterBody = z.object({
  companyName: z.string().min(1).max(80),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().max(300),
  password: z.string().min(8).max(128),
});

export async function POST(request: NextRequest) {
  // Rate limit by IP — user doesn't have an account yet, so can't use email
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    "unknown";
  const rateLimitResponse = await rateLimit(ip, {
    endpoint: "register",
    max: 5,
    windowMs: 60 * 60 * 1000, // 1 hour
  });
  if (rateLimitResponse) return rateLimitResponse;

  const { data: body, error: bodyError } = await parseBody(request, RegisterBody);
  if (bodyError) return bodyError;

  const requestId = getRequestId(request);
  const email = body.email.toLowerCase();

  try {
    // Check email uniqueness
    const existing = await db.query.users.findFirst({
      where: eq(users.email, email),
    });
    if (existing) {
      return apiError(
        ErrorCode.CONFLICT,
        "An account with this email already exists",
        undefined,
        requestId
      );
    }

    const enterpriseId = randomUUID();
    const passwordHash = await bcrypt.hash(body.password, 12);

    // 1. Create admin user
    const [newUser] = await db.insert(users).values({
      name: `${body.firstName} ${body.lastName}`,
      email,
      passwordHash,
      role: "admin",
      enterpriseId,
    }).returning({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
    });

    // 2. Seed initial enterprise settings
    //    - branding.companyName from the form
    //    - Default 2-step approval chain (reviewer → compliance_officer)
    const initialSettings = {
      branding: { companyName: body.companyName },
      approvalChain: [
        { step: 0, role: "reviewer", label: "Reviewer Approval" },
        { step: 1, role: "compliance_officer", label: "Compliance Sign-off" },
      ],
    };

    await db
      .insert(enterpriseSettings)
      .values({
        enterpriseId,
        settings: initialSettings,
        updatedAt: new Date(),
        updatedBy: email,
      })
      .onConflictDoUpdate({
        target: enterpriseSettings.enterpriseId,
        set: {
          settings: initialSettings,
          updatedAt: new Date(),
          updatedBy: email,
        },
      });

    // 3. Seed SR 11-7 Core policies (starter pack for regulated industries)
    const pack = findTemplatePack("sr-11-7-core");
    if (pack) {
      for (const template of pack.policies) {
        const rulesWithIds = template.rules.map((rule) => ({
          ...rule,
          id: randomUUID(),
        }));
        await db.insert(governancePolicies).values({
          name: template.name,
          type: template.type,
          description: template.description,
          rules: rulesWithIds,
          enterpriseId,
        });
      }
    }

    // Audit log: new account registered
    try {
      await db.insert(auditLog).values({
        actorEmail: email,
        actorRole: "admin",
        action: "user.registered",
        entityType: "user",
        entityId: newUser.id,
        enterpriseId,
        metadata: {
          userName: body.firstName + " " + body.lastName,
          companyName: body.companyName,
          policiesSeeded: pack ? pack.policies.length : 0,
        },
      });
    } catch (auditErr) {
      console.error(`[${requestId}] Failed to write audit log:`, auditErr);
    }

    return NextResponse.json({ message: "Account created" }, { status: 201 });
  } catch (err) {
    console.error(`[${requestId}] Registration failed:`, err);
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      "Registration failed. Please try again.",
      undefined,
      requestId
    );
  }
}

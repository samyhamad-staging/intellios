import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { governancePolicies } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { getRequestId } from "@/lib/request-id";
import { parseBody } from "@/lib/parse-body";
import { z } from "zod";
import { writeAuditLog } from "@/lib/audit/log";

const POLICY_TYPES = ["safety", "compliance", "data_handling", "access_control", "audit"] as const;

const UpdatePolicyBody = z.object({
  name: z.string().min(1).max(200).optional(),
  type: z.enum(POLICY_TYPES).optional(),
  description: z.string().max(1000).nullable().optional(),
  rules: z.array(z.unknown()).optional(),
});

/** Fetch a policy by id. Returns undefined if not found. */
async function fetchPolicy(id: string) {
  return db.query.governancePolicies.findFirst({
    where: eq(governancePolicies.id, id),
  });
}

/**
 * GET /api/governance/policies/[id]
 * Returns a single policy. compliance_officer and admin only.
 * compliance_officer may only access global or own-enterprise policies.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session: authSession, error: authError } = await requireAuth([
    "compliance_officer",
    "admin",
  ]);
  if (authError) return authError;

  const requestId = getRequestId(request);
  const { id } = await params;

  try {
    const policy = await fetchPolicy(id);
    if (!policy) {
      return apiError(ErrorCode.NOT_FOUND, "Policy not found", undefined, requestId);
    }

    // compliance_officer: may not access another enterprise's policies
    if (authSession.user.role === "compliance_officer") {
      if (
        policy.enterpriseId !== null &&
        policy.enterpriseId !== authSession.user.enterpriseId
      ) {
        return apiError(ErrorCode.FORBIDDEN, "Access denied", undefined, requestId);
      }
    }

    return NextResponse.json({ policy });
  } catch (error) {
    console.error(`[${requestId}] Failed to fetch policy:`, error);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to fetch policy", undefined, requestId);
  }
}

/**
 * PATCH /api/governance/policies/[id]
 * Updates a policy. compliance_officer and admin only.
 * compliance_officer cannot modify global (platform-level) policies or
 * policies belonging to other enterprises.
 * Body: { name?, type?, description?, rules? }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session: authSession, error: authError } = await requireAuth([
    "compliance_officer",
    "admin",
  ]);
  if (authError) return authError;

  const { data: body, error: bodyError } = await parseBody(request, UpdatePolicyBody);
  if (bodyError) return bodyError;

  const requestId = getRequestId(request);
  const { id } = await params;

  try {
    const policy = await fetchPolicy(id);
    if (!policy) {
      return apiError(ErrorCode.NOT_FOUND, "Policy not found", undefined, requestId);
    }

    if (authSession.user.role === "compliance_officer") {
      if (policy.enterpriseId === null) {
        return apiError(
          ErrorCode.FORBIDDEN,
          "Platform policies cannot be modified by compliance officers",
          undefined,
          requestId
        );
      }
      if (policy.enterpriseId !== authSession.user.enterpriseId) {
        return apiError(ErrorCode.FORBIDDEN, "Access denied", undefined, requestId);
      }
    }

    const updates: Partial<{
      name: string;
      type: string;
      description: string | null;
      rules: unknown[];
    }> = {};

    if (body.name !== undefined) updates.name = body.name;
    if (body.type !== undefined) updates.type = body.type;
    if ("description" in body) updates.description = body.description ?? null;
    if (body.rules !== undefined) updates.rules = body.rules as unknown[];

    const [updated] = await db
      .update(governancePolicies)
      .set(updates)
      .where(eq(governancePolicies.id, id))
      .returning();

    void writeAuditLog({
      entityType: "policy",
      entityId: id,
      action: "policy.updated",
      actorEmail: authSession.user.email!,
      actorRole: authSession.user.role!,
      enterpriseId: policy.enterpriseId,
      fromState: { name: policy.name, type: policy.type, ruleCount: (policy.rules as unknown[]).length },
      toState: { name: updated.name, type: updated.type, ruleCount: (updated.rules as unknown[]).length },
    });

    return NextResponse.json({ policy: updated });
  } catch (error) {
    console.error(`[${requestId}] Failed to update policy:`, error);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to update policy", undefined, requestId);
  }
}

/**
 * DELETE /api/governance/policies/[id]
 * Deletes a policy. compliance_officer and admin only.
 * compliance_officer cannot delete global (platform-level) policies or
 * policies belonging to other enterprises.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session: authSession, error: authError } = await requireAuth([
    "compliance_officer",
    "admin",
  ]);
  if (authError) return authError;

  const requestId = getRequestId(request);
  const { id } = await params;

  try {
    const policy = await fetchPolicy(id);
    if (!policy) {
      return apiError(ErrorCode.NOT_FOUND, "Policy not found", undefined, requestId);
    }

    if (authSession.user.role === "compliance_officer") {
      if (policy.enterpriseId === null) {
        return apiError(
          ErrorCode.FORBIDDEN,
          "Platform policies cannot be deleted by compliance officers",
          undefined,
          requestId
        );
      }
      if (policy.enterpriseId !== authSession.user.enterpriseId) {
        return apiError(ErrorCode.FORBIDDEN, "Access denied", undefined, requestId);
      }
    }

    await db.delete(governancePolicies).where(eq(governancePolicies.id, id));

    void writeAuditLog({
      entityType: "policy",
      entityId: id,
      action: "policy.deleted",
      actorEmail: authSession.user.email!,
      actorRole: authSession.user.role!,
      enterpriseId: policy.enterpriseId,
      fromState: { name: policy.name, type: policy.type, ruleCount: (policy.rules as unknown[]).length },
    });

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error(`[${requestId}] Failed to delete policy:`, error);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to delete policy", undefined, requestId);
  }
}

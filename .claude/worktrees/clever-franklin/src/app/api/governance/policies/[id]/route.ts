import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { governancePolicies } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { getRequestId } from "@/lib/request-id";
import { parseBody } from "@/lib/parse-body";
import { z } from "zod";
import { publishEvent } from "@/lib/events/publish";
import { randomUUID } from "crypto";

const ALL_POLICY_TYPES = ["safety", "compliance", "data_handling", "access_control", "audit", "runtime"] as const;

const UpdatePolicyBody = z.object({
  name: z.string().min(1).max(200).optional(),
  type: z.enum(ALL_POLICY_TYPES).optional(),
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

    // Phase 22: PATCH creates a new version row instead of updating in place.
    // This preserves the exact policy snapshot evaluated by existing ValidationReports.
    const newId = randomUUID();
    const newName = body.name ?? policy.name;
    const newType = body.type ?? policy.type;
    const newDescription = "description" in body ? (body.description ?? null) : policy.description;
    const newRules = body.rules !== undefined ? (body.rules as unknown[]) : (policy.rules as unknown[]);

    let newPolicy: typeof policy;

    await db.transaction(async (tx) => {
      // 1. Insert new version row
      const [inserted] = await tx
        .insert(governancePolicies)
        .values({
          id: newId,
          enterpriseId: policy.enterpriseId,
          name: newName,
          type: newType,
          description: newDescription,
          rules: newRules,
          policyVersion: policy.policyVersion + 1,
          previousVersionId: policy.id,
          supersededAt: null,
          createdAt: new Date(),
        })
        .returning();
      newPolicy = inserted;

      // 2. Mark old row as superseded
      await tx
        .update(governancePolicies)
        .set({ supersededAt: new Date() })
        .where(eq(governancePolicies.id, id));
    });

    void publishEvent({
      event: {
        type: "policy.updated",
        payload: {
          policyId: newId,
          name: newPolicy!.name,
        },
      },
      actor: { email: authSession.user.email!, role: authSession.user.role! },
      entity: { type: "policy", id: newId },
      enterpriseId: policy.enterpriseId ?? null,
    });

    return NextResponse.json({ policy: newPolicy! });
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

    void publishEvent({
      event: {
        type: "policy.deleted",
        payload: {
          policyId: id,
          name: policy.name,
        },
      },
      actor: { email: authSession.user.email!, role: authSession.user.role! },
      entity: { type: "policy", id },
      enterpriseId: policy.enterpriseId ?? null,
    });

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error(`[${requestId}] Failed to delete policy:`, error);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to delete policy", undefined, requestId);
  }
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { governancePolicies } from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { getRequestId } from "@/lib/request-id";
import { parseBody } from "@/lib/parse-body";
import { z } from "zod";
import { writeAuditLog } from "@/lib/audit/log";
import { findTemplatePack } from "@/lib/governance/policy-templates";
import { randomUUID } from "crypto";

const ApplyPackBody = z.object({
  force: z.boolean().optional(),
});

/**
 * POST /api/governance/templates/[pack]/apply
 * Imports all policies from the named compliance starter pack into the
 * caller's enterprise.
 *
 * - Returns 404 if the pack slug is not found.
 * - Returns 409 with { duplicates: string[] } if any policies with the same
 *   name already exist in the enterprise (unless force=true).
 * - With force=true, deletes existing matching policies first (with audit
 *   entries) then creates fresh ones.
 * - Requires compliance_officer or admin.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ pack: string }> }
) {
  const { session: authSession, error: authError } = await requireAuth([
    "compliance_officer",
    "admin",
  ]);
  if (authError) return authError;

  const { data: body, error: bodyError } = await parseBody(request, ApplyPackBody);
  if (bodyError) return bodyError;

  const requestId = getRequestId(request);
  const { pack: packId } = await params;

  // Resolve pack
  const pack = findTemplatePack(packId);
  if (!pack) {
    return apiError(ErrorCode.NOT_FOUND, `Template pack "${packId}" not found`, undefined, requestId);
  }

  const enterpriseId = authSession.user.enterpriseId ?? null;
  const policyNames = pack.policies.map((p) => p.name);

  try {
    // --- Duplicate detection ---
    if (enterpriseId) {
      const existing = await db
        .select({ id: governancePolicies.id, name: governancePolicies.name })
        .from(governancePolicies)
        .where(
          and(
            eq(governancePolicies.enterpriseId, enterpriseId),
            inArray(governancePolicies.name, policyNames)
          )
        );

      if (existing.length > 0 && !body.force) {
        return NextResponse.json(
          { duplicates: existing.map((p) => p.name) },
          { status: 409 }
        );
      }

      // --- Force mode: delete duplicates first ---
      if (existing.length > 0 && body.force) {
        const existingIds = existing.map((p) => p.id);

        // Fetch full policy records for audit (names + types)
        const existingFull = await db
          .select()
          .from(governancePolicies)
          .where(inArray(governancePolicies.id, existingIds));

        await db
          .delete(governancePolicies)
          .where(inArray(governancePolicies.id, existingIds));

        for (const deleted of existingFull) {
          void writeAuditLog({
            entityType: "policy",
            entityId: deleted.id,
            action: "policy.deleted",
            actorEmail: authSession.user.email!,
            actorRole: authSession.user.role!,
            enterpriseId: deleted.enterpriseId,
            fromState: {
              name: deleted.name,
              type: deleted.type,
              ruleCount: (deleted.rules as unknown[]).length,
            },
            metadata: { reason: "template_force_reimport", pack: packId },
          });
        }
      }
    }

    // --- Create policies ---
    const createdPolicies: Array<{ id: string; name: string; type: string }> = [];

    for (const template of pack.policies) {
      // Assign UUIDs to each rule
      const rulesWithIds = template.rules.map((rule) => ({
        ...rule,
        id: randomUUID(),
      }));

      const [policy] = await db
        .insert(governancePolicies)
        .values({
          name: template.name,
          type: template.type,
          description: template.description,
          rules: rulesWithIds,
          enterpriseId,
        })
        .returning();

      void writeAuditLog({
        entityType: "policy",
        entityId: policy.id,
        action: "policy.created",
        actorEmail: authSession.user.email!,
        actorRole: authSession.user.role!,
        enterpriseId: policy.enterpriseId,
        toState: {
          name: policy.name,
          type: policy.type,
          ruleCount: (policy.rules as unknown[]).length,
        },
        metadata: { source: "template", pack: packId },
      });

      createdPolicies.push({ id: policy.id, name: policy.name, type: policy.type });
    }

    return NextResponse.json(
      { created: createdPolicies.length, policies: createdPolicies },
      { status: 201 }
    );
  } catch (error) {
    console.error(`[${requestId}] Failed to apply template pack "${packId}":`, error);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to apply template pack", undefined, requestId);
  }
}

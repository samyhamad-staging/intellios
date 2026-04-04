import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agentBlueprints } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import type { ABP } from "@/lib/types/abp";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { assertEnterpriseAccess } from "@/lib/auth/enterprise";
import { getRequestId } from "@/lib/request-id";

/**
 * PATCH /api/blueprints/[id]/ownership
 *
 * Directly updates the `ownership` block of an ABP without going through
 * the AI refinement path. This is for organizational metadata that the
 * designer sets manually (business unit, owner email, cost center, etc.).
 *
 * Access: designer and admin only.
 */

const OwnershipBody = z.object({
  businessUnit: z.string().max(200).optional().nullable(),
  ownerEmail: z.string().email().max(200).optional().nullable(),
  costCenter: z.string().max(100).optional().nullable(),
  deploymentEnvironment: z.enum(["production", "staging", "sandbox", "internal"]).optional().nullable(),
  dataClassification: z.enum(["public", "internal", "confidential", "regulated"]).optional().nullable(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session: authSession, error } = await requireAuth(["architect", "admin"]);
  if (error) return error;
  const requestId = getRequestId(request);

  try {
    const { id } = await params;

    let body: z.infer<typeof OwnershipBody>;
    try {
      const raw = await request.json();
      body = OwnershipBody.parse(raw);
    } catch {
      return apiError(ErrorCode.BAD_REQUEST, "Invalid ownership data");
    }

    // Fetch blueprint
    const blueprint = await db.query.agentBlueprints.findFirst({
      where: eq(agentBlueprints.id, id),
    });
    if (!blueprint) return apiError(ErrorCode.NOT_FOUND, "Blueprint not found");

    // Enterprise access check
    const enterpriseError = assertEnterpriseAccess(blueprint.enterpriseId, authSession.user);
    if (enterpriseError) return enterpriseError;

    // Build updated ownership block — strip null values (treat null as "clear field")
    const ownership: ABP["ownership"] = {};
    if (body.businessUnit) ownership.businessUnit = body.businessUnit;
    if (body.ownerEmail) ownership.ownerEmail = body.ownerEmail;
    if (body.costCenter) ownership.costCenter = body.costCenter;
    if (body.deploymentEnvironment) ownership.deploymentEnvironment = body.deploymentEnvironment;
    if (body.dataClassification) ownership.dataClassification = body.dataClassification;

    // Merge ownership into ABP
    const updatedAbp: ABP = {
      ...(blueprint.abp as ABP),
      ownership: Object.keys(ownership).length > 0 ? ownership : undefined,
    };

    // Update blueprint
    await db
      .update(agentBlueprints)
      .set({ abp: updatedAbp, updatedAt: new Date() })
      .where(eq(agentBlueprints.id, id));

    return NextResponse.json({ ownership: updatedAbp.ownership ?? null });
  } catch (err) {
    console.error(`[${requestId}] Failed to update ownership:`, err);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to update ownership", undefined, requestId);
  }
}

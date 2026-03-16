/**
 * Agent Code Export — Phase 40.
 * GET /api/blueprints/[id]/export/code
 *
 * Downloads a ready-to-run TypeScript agent generated from the blueprint's ABP.
 * Accessible to all authenticated roles (same as Export JSON).
 */

import { NextRequest } from "next/server";
import { apiError, ErrorCode } from "@/lib/errors";
import { db } from "@/lib/db";
import { agentBlueprints } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require";
import { assertEnterpriseAccess } from "@/lib/auth/enterprise";
import { writeAuditLog } from "@/lib/audit/log";
import { getRequestId } from "@/lib/request-id";
import { generateAgentCode } from "@/lib/export/code-generator";
import type { ABP } from "@/lib/types/abp";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session: authSession, error } = await requireAuth([
    "designer",
    "reviewer",
    "compliance_officer",
    "admin",
  ]);
  if (error) return error;
  const requestId = getRequestId(request);

  try {
    const { id: blueprintId } = await params;

    const blueprint = await db.query.agentBlueprints.findFirst({
      where: eq(agentBlueprints.id, blueprintId),
    });
    if (!blueprint) {
      return apiError(ErrorCode.NOT_FOUND, "Blueprint not found");
    }

    const enterpriseError = assertEnterpriseAccess(blueprint.enterpriseId, authSession.user);
    if (enterpriseError) return enterpriseError;

    const abp = blueprint.abp as ABP;

    const code = generateAgentCode(abp, {
      blueprintId,
      agentId: blueprint.agentId,
      version: blueprint.version,
      exportedAt: new Date().toISOString(),
    });

    // Audit log — fire-and-forget
    void writeAuditLog({
      entityType: "blueprint",
      entityId: blueprintId,
      action: "blueprint.code_exported",
      actorEmail: authSession.user.email!,
      actorRole: authSession.user.role,
      enterpriseId: blueprint.enterpriseId,
      metadata: {
        agentId: blueprint.agentId,
        agentName: blueprint.name,
        version: blueprint.version,
        format: "typescript",
      },
    });

    const safeName = (blueprint.name ?? "agent")
      .replace(/[^a-zA-Z0-9_-]/g, "-")
      .toLowerCase();

    return new Response(code, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safeName}-agent.ts"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error(`[${requestId}] Code export error:`, err);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to generate agent code", undefined, requestId);
  }
}

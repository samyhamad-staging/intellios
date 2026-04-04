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
import { publishEvent } from "@/lib/events/publish";
import { getRequestId } from "@/lib/request-id";
import { generateAgentCode } from "@/lib/export/code-generator";
import { artifactExists, getSignedUrl, uploadArtifact } from "@/lib/storage/s3";
import type { ABP } from "@/lib/types/abp";
import { readABP } from "@/lib/abp/read";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session: authSession, error } = await requireAuth([
    "architect",
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

    // Status gate: only export approved or deployed blueprints.
    // Prevents distribution of unreviewed code with active governance violations.
    if (blueprint.status !== "approved" && blueprint.status !== "deployed") {
      return apiError(
        ErrorCode.BAD_REQUEST,
        "Code export is only available for approved or deployed blueprints"
      );
    }

    const abp = readABP(blueprint.abp);

    const code = generateAgentCode(abp, {
      blueprintId,
      agentId: blueprint.agentId,
      version: blueprint.version,
      exportedAt: new Date().toISOString(),
    });

    // Audit log — fire-and-forget
    void publishEvent({
      event: {
        type: "blueprint.code_exported",
        payload: {
          blueprintId,
          agentId: blueprint.agentId,
        },
      },
      actor: { email: authSession.user.email!, role: authSession.user.role },
      entity: { type: "blueprint", id: blueprintId },
      enterpriseId: blueprint.enterpriseId ?? null,
    });

    const safeName = (blueprint.name ?? "agent")
      .replace(/[^a-zA-Z0-9_-]/g, "-")
      .toLowerCase();

    // S3 cache
    const s3Key = `code/${blueprintId}/${blueprint.version}.ts`;
    const cached = await artifactExists(s3Key);
    if (cached) {
      const signedUrl = await getSignedUrl(s3Key, 3600);
      if (signedUrl) return Response.redirect(signedUrl, 302);
    }
    void uploadArtifact(s3Key, code, "text/plain");

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

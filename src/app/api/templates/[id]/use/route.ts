/**
 * POST /api/templates/[id]/use
 *
 * Creates a new draft blueprint from a template.
 * Templates have no source intake session, so a stub intakeSessions row
 * is created inside a transaction before the blueprint is inserted.
 *
 * Access: designer and admin only.
 * Returns: { blueprintId, agentId } with 201.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agentBlueprints, intakeSessions } from "@/lib/db/schema";
import { randomUUID } from "crypto";
import type { ABP } from "@/lib/types/abp";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { getRequestId } from "@/lib/request-id";
import { writeAuditLog } from "@/lib/audit/log";
import { findBlueprintTemplate } from "@/lib/templates/blueprint-templates";
import { validateBlueprint } from "@/lib/governance/validator";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session: authSession, error } = await requireAuth(["designer", "admin"]);
  if (error) return error;

  const requestId = getRequestId(request);

  try {
    const { id: templateId } = await params;

    const template = findBlueprintTemplate(templateId);
    if (!template) {
      return apiError(ErrorCode.NOT_FOUND, "Template not found");
    }

    const enterpriseId = authSession.user.enterpriseId ?? null;
    const newAgentId = randomUUID();
    const newBlueprintId = randomUUID();

    // Build the live ABP — override metadata with runtime values
    const liveAbp: ABP = {
      ...template.abp,
      metadata: {
        ...template.abp.metadata,
        id: newAgentId,
        created_at: new Date().toISOString(),
        created_by: authSession.user.email!,
        status: "draft",
        enterprise_id: enterpriseId ?? undefined,
      },
    };

    // Run validation BEFORE opening the transaction (uses regular db client)
    const validationReport = await validateBlueprint(liveAbp, enterpriseId);

    // Transaction: stub session + blueprint insert
    await db.transaction(async (tx) => {
      // Create stub intake session (templates have no real intake)
      const [stubSession] = await tx
        .insert(intakeSessions)
        .values({
          enterpriseId,
          createdBy: authSession.user.email!,
          status: "completed",
          intakePayload: {
            source: "template",
            templateId,
            templateName: template.name,
          },
        })
        .returning({ id: intakeSessions.id });

      // Insert the blueprint
      await tx.insert(agentBlueprints).values({
        id: newBlueprintId,
        agentId: newAgentId,
        version: "1.0.0",
        name: template.abp.identity.name,
        tags: (template.abp.metadata.tags ?? template.tags) as string[],
        enterpriseId,
        sessionId: stubSession.id,
        abp: liveAbp as unknown as Record<string, unknown>,
        status: "draft",
        refinementCount: "0",
        validationReport: validationReport as unknown as Record<string, unknown>,
        reviewComment: null,
        reviewedAt: null,
        reviewedBy: null,
        createdBy: authSession.user.email!,
      });
    });

    // Audit trail
    void writeAuditLog({
      entityType: "blueprint",
      entityId: newBlueprintId,
      action: "blueprint.created_from_template",
      actorEmail: authSession.user.email!,
      actorRole: authSession.user.role,
      enterpriseId,
      metadata: {
        templateId,
        templateName: template.name,
        agentName: template.abp.identity.name,
        agentId: newAgentId,
      },
    });

    return NextResponse.json({ blueprintId: newBlueprintId, agentId: newAgentId }, { status: 201 });
  } catch (err) {
    console.error(`[${requestId}] Failed to create blueprint from template:`, err);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to create blueprint from template", undefined, requestId);
  }
}

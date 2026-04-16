import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agentBlueprints, intakeSessions, auditLog } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ALL_BLUEPRINT_COLUMNS } from "@/lib/db/safe-columns";
import { refineBlueprint } from "@/lib/generation/generate";
import { sanitizePromptInput } from "@/lib/generation/system-prompt";
import { validateBlueprint } from "@/lib/governance/validator";
import { loadPolicies } from "@/lib/governance/load-policies";
import { logger, serializeError } from "@/lib/logger";
import { ABP } from "@/lib/types/abp";
import { readABP } from "@/lib/abp/read";
import { IntakePayload } from "@/lib/types/intake";
import { apiError, aiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { assertEnterpriseAccess } from "@/lib/auth/enterprise";
import { getRequestId } from "@/lib/request-id";
import { publishEvent } from "@/lib/events/publish";
import { rateLimit } from "@/lib/rate-limit";
import { parseBody } from "@/lib/parse-body";
import { z } from "zod";

const RefineBody = z.object({
  change: z.string().min(1).max(2000),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session: authSession, error } = await requireAuth(["architect", "designer", "admin"]);
  if (error) return error;
  const requestId = getRequestId(request);

  const rateLimitResponse = await rateLimit(authSession.user.email!, {
    endpoint: "generate",
    max: 10,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  const { data: body, error: bodyError } = await parseBody(request, RefineBody);
  if (bodyError) return bodyError;

  try {
    const { id } = await params;
    // Sanitize before using in LLM prompt — prevents prompt injection
    const change = sanitizePromptInput(body.change.trim(), 2000);

    const [blueprint] = await db
      .select(ALL_BLUEPRINT_COLUMNS)
      .from(agentBlueprints)
      .where(eq(agentBlueprints.id, id))
      .limit(1);

    if (!blueprint) {
      return apiError(ErrorCode.NOT_FOUND, "Blueprint not found");
    }

    const enterpriseError = assertEnterpriseAccess(blueprint.enterpriseId, authSession.user);
    if (enterpriseError) return enterpriseError;

    if (blueprint.status === "approved") {
      return apiError(ErrorCode.CONFLICT, "Approved blueprints cannot be refined");
    }

    // Fetch original intake for context
    const session = await db.query.intakeSessions.findFirst({
      where: eq(intakeSessions.id, blueprint.sessionId),
    });

    const intake = (session?.intakePayload ?? {}) as IntakePayload;
    const currentAbp = readABP(blueprint.abp);

    // Load policies so Claude can maintain governance compliance during refinement
    // and avoid inadvertently dropping required policy sections during regeneration.
    const enterpriseId = blueprint.enterpriseId ?? null;
    const policies = await loadPolicies(enterpriseId);

    // Refine via Claude
    const log = logger.child({ requestId, userEmail: authSession.user.email, enterpriseId });
    let updatedAbp: ABP;
    try {
      updatedAbp = await refineBlueprint(currentAbp, change, intake, policies);
    } catch (err) {
      log.error("blueprint.refine.ai.failed", { blueprintId: id, err: serializeError(err) });
      return aiError(err, requestId);
    }
    const newCount = String(parseInt(blueprint.refinementCount ?? "0", 10) + 1);

    // Re-validate against governance policies — pass pre-loaded policies to avoid a
    // redundant DB round-trip. Any policy drift introduced during refinement is caught here.
    const validationReport = await validateBlueprint(
      updatedAbp,
      enterpriseId,
      policies,
      blueprint.agentId
    );

    // Re-sync denormalized registry fields in case identity or tags changed
    const name = updatedAbp.identity.name ?? null;
    const tags = (updatedAbp.metadata.tags ?? []) as string[];

    // Persist the refined version (update-in-place for MVP)
    const [updated] = await db
      .update(agentBlueprints)
      .set({ abp: updatedAbp, name, tags, refinementCount: newCount, validationReport, updatedAt: new Date() })
      .where(eq(agentBlueprints.id, id))
      .returning();

    // Audit log
    try {
      await db.insert(auditLog).values({
        actorEmail: authSession.user.email!,
        actorRole: authSession.user.role!,
        action: "blueprint.refined",
        entityType: "blueprint",
        entityId: id,
        enterpriseId: blueprint.enterpriseId ?? null,
        fromState: {
          abp: currentAbp,
          refinementCount: blueprint.refinementCount,
        },
        toState: {
          abp: updatedAbp,
          refinementCount: newCount,
        },
        metadata: {
          agentId: blueprint.agentId,
          name: blueprint.name,
          change: change.slice(0, 200),
          refinementCount: newCount,
          governanceValid: validationReport.valid,
          violationCount: validationReport.violations.length,
        },
      });
    } catch (auditErr) {
      log.error("audit.write.failed", { action: "blueprint.refined", blueprintId: id, err: serializeError(auditErr) });
    }

    await publishEvent({
      event: {
        type: "blueprint.refined",
        payload: {
          blueprintId: id,
          agentId: blueprint.agentId,
          name: blueprint.name ?? "",
          createdBy: blueprint.createdBy ?? "",
        },
      },
      actor: { email: authSession.user.email!, role: authSession.user.role },
      entity: { type: "blueprint", id },
      enterpriseId: blueprint.enterpriseId ?? null,
    });

    return NextResponse.json({
      id: updated.id,
      agentId: updated.agentId,
      abp: updatedAbp,
      refinementCount: newCount,
      validationReport,
    });
  } catch (error) {
    logger.error("blueprint.refine.failed", { requestId, err: serializeError(error) });
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to refine blueprint", undefined, requestId);
  }
}

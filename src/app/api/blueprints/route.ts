import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { intakeSessions, agentBlueprints, auditLog } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { generateBlueprint } from "@/lib/generation/generate";
import { validateBlueprint } from "@/lib/governance/validator";
import { loadPolicies } from "@/lib/governance/load-policies";
import { IntakePayload, IntakeContext, IntakeClassification, AgentType, IntakeRiskTier } from "@/lib/types/intake";
import { apiError, aiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { assertEnterpriseAccess } from "@/lib/auth/enterprise";
import { getRequestId } from "@/lib/request-id";
import { publishEvent } from "@/lib/events/publish";
import { rateLimit, enterpriseRateLimit } from "@/lib/rate-limit";
import { parseBody } from "@/lib/parse-body";
import { enterpriseScope } from "@/lib/auth/enterprise-scope";
import { withTenantScopeGuarded } from "@/lib/auth/with-tenant-scope";
import { logger, serializeError } from "@/lib/logger";
import { z } from "zod";

// Vercel Hobby plan defaults to 10s — blueprint generation needs 30-60s for Claude to
// produce a full ABP via generateObject. Without this, the function times out → 500.
export const maxDuration = 60;

/**
 * GET /api/blueprints
 * Returns all blueprint versions scoped to the caller's enterprise,
 * ordered by updatedAt desc (most recent first).
 */
export async function GET(request: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;
  const requestId = getRequestId(request);

  return withTenantScopeGuarded(request, async (ctx) => {
    try {
      const filter = enterpriseScope(agentBlueprints.enterpriseId, ctx);

      const rows = await db
        .select({
          id: agentBlueprints.id,
          agentId: agentBlueprints.agentId,
          version: agentBlueprints.version,
          name: agentBlueprints.name,
          tags: agentBlueprints.tags,
          status: agentBlueprints.status,
          validationReport: agentBlueprints.validationReport,
          createdBy: agentBlueprints.createdBy,
          createdAt: agentBlueprints.createdAt,
          updatedAt: agentBlueprints.updatedAt,
        })
        .from(agentBlueprints)
        .where(filter ?? undefined)
        .orderBy(desc(agentBlueprints.updatedAt));

      return NextResponse.json({ blueprints: rows });
    } catch (err) {
      logger.error("blueprint.list.failed", { requestId, err: serializeError(err) });
      return apiError(ErrorCode.INTERNAL_ERROR, "Failed to list blueprints", undefined, requestId);
    }
  });
}

const GenerateBody = z.object({
  sessionId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  // C-13: include "designer" (legacy role alias for architect) so existing
  // accounts can generate blueprints without a DB migration.
  const { session: authSession, error } = await requireAuth(["architect", "designer", "admin"]);
  if (error) return error;
  const requestId = getRequestId(request);

  const rateLimitResponse = await rateLimit(authSession.user.email!, {
    endpoint: "generate",
    max: 10,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  // Per-enterprise ceiling (C4 / ADR-020) — prevents a single tenant from
  // saturating Bedrock for the whole platform. Applies even when a tenant
  // has many distinct users all under their per-user limit.
  if (authSession.user.enterpriseId) {
    const tenantLimitResponse = await enterpriseRateLimit(authSession.user.enterpriseId, {
      endpoint: "generate",
      max: 60,
      windowMs: 60_000,
    });
    if (tenantLimitResponse) return tenantLimitResponse;
  }

  const { data: body, error: bodyError } = await parseBody(request, GenerateBody);
  if (bodyError) return bodyError;

  try {
    const { sessionId } = body;

    const session = await db.query.intakeSessions.findFirst({
      where: eq(intakeSessions.id, sessionId),
    });

    if (!session) {
      return apiError(ErrorCode.NOT_FOUND, "Session not found");
    }

    // Enterprise access check — designer can only generate from their own enterprise's sessions
    const enterpriseError = assertEnterpriseAccess(session.enterpriseId, authSession.user);
    if (enterpriseError) return enterpriseError;

    if (session.status !== "completed") {
      return apiError(ErrorCode.INVALID_STATE, "Intake session must be completed before generating a blueprint");
    }

    const intake = session.intakePayload as IntakePayload;
    const intakeContext = (session.intakeContext as IntakeContext | null) ?? null;
    const enterpriseId = session.enterpriseId ?? null;

    // Build classification from session columns if available
    const intakeClassification: IntakeClassification | null =
      session.agentType && session.riskTier
        ? {
            agentType: session.agentType as AgentType,
            riskTier: session.riskTier as IntakeRiskTier,
            rationale: "",
          }
        : null;

    // Load enterprise policies once — passed to both generation (so Claude can satisfy
    // them proactively) and validation (skips the redundant second DB query).
    const policies = await loadPolicies(enterpriseId);

    // Generate the ABP via Claude
    let abp;
    try {
      abp = await generateBlueprint(intake, intakeContext, intakeClassification, sessionId, policies);
    } catch (err) {
      logger.error("blueprint.generate.claude.failed", { requestId, err: serializeError(err) });
      return aiError(err, requestId);
    }

    // Denormalize searchable fields from the ABP for the registry
    const name = abp.identity.name ?? null;
    const tags = (abp.metadata.tags ?? []) as string[];

    // Run governance validation synchronously (ADR-003, ADR-005).
    // Pre-loaded policies are passed to avoid a second DB round-trip.
    const validationReport = await validateBlueprint(abp, enterpriseId, policies);

    // Persist — agentId defaults to a new UUID (first version of a new agent).
    // Entity insert and audit insert share a transaction (ADR-021). If either
    // fails the whole operation rolls back — no divergence between state and audit.
    const blueprint = await db.transaction(async (tx) => {
      const [bp] = await tx
        .insert(agentBlueprints)
        .values({ sessionId, abp, name, tags, enterpriseId, validationReport, createdBy: authSession.user.email ?? null })
        .returning();

      await tx.insert(auditLog).values({
        actorEmail: authSession.user.email!,
        actorRole: authSession.user.role!,
        action: "blueprint.created",
        entityType: "blueprint",
        entityId: bp.id,
        enterpriseId,
        metadata: { agentId: bp.agentId, name: bp.name },
      });

      return bp;
    });

    // Event dispatch runs post-commit. Downstream handler failures must not
    // roll back the primary operation (the state is already durable).
    try {
      await publishEvent({
        event: {
          type: "blueprint.created",
          payload: {
            blueprintId: blueprint.id,
            agentId: blueprint.agentId,
            name: blueprint.name ?? "",
            createdBy: authSession.user.email!,
          },
        },
        actor: { email: authSession.user.email!, role: authSession.user.role },
        entity: { type: "blueprint", id: blueprint.id },
        enterpriseId,
      });
    } catch (eventErr) {
      logger.error("event.dispatch.failed", { requestId, type: "blueprint.created", err: serializeError(eventErr) });
    }

    return NextResponse.json({
      id: blueprint.id,
      agentId: blueprint.agentId,
      abp,
      validationReport,
    });
  } catch (error) {
    logger.error("blueprint.generate.failed", { requestId, err: serializeError(error) });
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to generate blueprint", undefined, requestId);
  }
}

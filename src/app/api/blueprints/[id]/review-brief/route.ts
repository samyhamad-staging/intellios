import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agentBlueprints, auditLog } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { assertEnterpriseAccess } from "@/lib/auth/enterprise";
import { rateLimit } from "@/lib/rate-limit";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import type { ValidationReport } from "@/lib/governance/types";

// Extend Vercel function timeout for AI generation (default 10s is too short)
export const maxDuration = 60;

const riskBriefSchema = z.object({
  riskLevel: z.enum(["low", "medium", "high"]).describe("Overall risk level of this blueprint"),
  summary: z.string().describe("One-sentence summary of the blueprint's risk profile"),
  keyPoints: z.array(z.string()).describe("2–5 key risk points or governance concerns for the reviewer"),
  recommendation: z.enum(["approve", "request_changes", "reject"]).describe("Suggested reviewer action"),
  recommendationReason: z.string().describe("Brief one-sentence reason for the recommendation"),
});

/**
 * POST /api/blueprints/[id]/review-brief
 *
 * Generates a Claude Haiku AI risk brief for a blueprint under review.
 * Roles: reviewer | compliance_officer | admin
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth(["reviewer", "compliance_officer", "admin"]);
  if (error) return error;

  // P2-SEC-006 FIX: Rate limit expensive LLM generation endpoint
  const rateLimitResponse = await rateLimit(session.user.email!, {
    endpoint: "review-brief",
    max: 10,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  const { id } = await params;

  try {
    const [blueprint] = await db
      .select()
      .from(agentBlueprints)
      .where(eq(agentBlueprints.id, id))
      .limit(1);

    if (!blueprint) {
      return apiError(ErrorCode.NOT_FOUND, "Blueprint not found");
    }

    const accessError = assertEnterpriseAccess(blueprint.enterpriseId ?? null, session.user);
    if (accessError) return accessError;

    const abp = blueprint.abp as Record<string, unknown>;
    const validation = blueprint.validationReport as ValidationReport | null;

    const prompt = `You are a governance risk analyst reviewing an AI agent blueprint for enterprise deployment.

BLUEPRINT SUMMARY:
- Agent Name: ${(abp.identity as Record<string, unknown>)?.name ?? "Unknown"}
- Description: ${(abp.identity as Record<string, unknown>)?.description ?? "None"}
- Tools: ${JSON.stringify((abp.capabilities as Record<string, unknown>)?.tools ?? [])}
- Governance Policies: ${JSON.stringify((abp.governance as Record<string, unknown>)?.policies ?? [])}
- Constraints: ${JSON.stringify(abp.constraints ?? {})}
- Ownership: ${JSON.stringify(abp.ownership ?? {})}

VALIDATION REPORT:
${validation ? `Valid: ${validation.valid}\nViolations: ${JSON.stringify(validation.violations, null, 2)}` : "No validation report available — governance status unknown."}

Provide a concise risk brief for the reviewer. Focus on: governance gaps, tool risk, policy coverage, ownership completeness, and any validation violations.`;

    const { object } = await generateObject({
      model: anthropic("claude-haiku-4-5-20251001"),
      schema: riskBriefSchema,
      prompt,
      temperature: 0.1,
    });

    // P2-BUG-004 FIX: Add audit logging for review brief generation
    try {
      await db.insert(auditLog).values({
        actorEmail: session.user.email!,
        actorRole: session.user.role!,
        action: "blueprint.review_brief_generated",
        entityType: "blueprint",
        entityId: id,
        enterpriseId: blueprint.enterpriseId ?? null,
        metadata: { riskLevel: object.riskLevel, recommendation: object.recommendation },
      });
    } catch (auditErr) {
      console.error("[review-brief] Failed to write audit log:", auditErr);
    }

    return NextResponse.json({ brief: object });
  } catch (err) {
    console.error("[POST /api/blueprints/[id]/review-brief]", err);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to generate risk brief");
  }
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agentBlueprints, auditLog } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require";
import { rateLimit } from "@/lib/rate-limit";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import type { ABP } from "@/lib/types/abp";

// Extend Vercel function timeout for AI generation (default 10s is too short)
export const maxDuration = 60;

/**
 * POST /api/blueprints/[id]/suggest-fix
 *
 * Uses Claude to propose specific ABP changes that would resolve governance
 * violations. Returns a "suggested ABP" with changes applied and a human-
 * readable explanation of each change.
 *
 * Does NOT create a new blueprint version — that requires architect action via
 * the Studio "Accept Fix" button.
 *
 * Access: architect | admin
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth(["architect", "designer", "admin"]);
  if (error) return error;

  // P2-SEC-006 FIX: Rate limit expensive LLM generation endpoint
  const rateLimitResponse = await rateLimit(session.user.email!, {
    endpoint: "suggest-fix",
    max: 10,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  const { id } = await params;

  const blueprint = await db.query.agentBlueprints.findFirst({
    where: eq(agentBlueprints.id, id),
  });
  if (!blueprint) {
    return NextResponse.json({ error: "Blueprint not found" }, { status: 404 });
  }

  // Tenant isolation
  if (session.user.role !== "admin" && blueprint.enterpriseId !== session.user.enterpriseId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const drift = blueprint.governanceDrift as {
    status?: string;
    newViolations?: Array<{ field: string; message: string; severity: string }>;
  } | null;

  const report = blueprint.validationReport as {
    violations?: Array<{ field: string; message: string; severity: string; suggestion?: string }>;
  } | null;

  const violations = drift?.newViolations?.length
    ? drift.newViolations
    : (report?.violations ?? []);

  if (!violations.length) {
    return NextResponse.json({
      message: "No violations found — no fix needed",
      suggestedAbp: blueprint.abp,
      changes: [],
    });
  }

  const abp = blueprint.abp as ABP;

  const prompt = `You are an AI governance remediation specialist for Intellios, an enterprise AI agent governance platform.

An agent blueprint has governance violations that need to be fixed. Your job is to:
1. Propose specific, minimal changes to the ABP JSON that would resolve each violation
2. Return a modified ABP with those changes applied
3. Return a human-readable list of changes with explanations

CURRENT ABP:
${JSON.stringify(abp, null, 2)}

VIOLATIONS TO FIX:
${violations.map((v, i) => `${i + 1}. Field: ${v.field} | Severity: ${v.severity} | Issue: ${v.message}`).join("\n")}

Respond with a JSON object in this exact format:
{
  "changes": [
    {
      "field": "the ABP field path (e.g. governance.riskTier)",
      "oldValue": "what it was",
      "newValue": "what you changed it to",
      "reason": "why this resolves the violation"
    }
  ],
  "suggestedAbp": { ...the complete modified ABP JSON... },
  "summary": "A 1-2 sentence summary of what was changed and why"
}

Rules:
- Make the minimum changes necessary to resolve violations
- Preserve all other ABP content exactly
- Only modify fields that are directly related to violations
- Do not add fields that don't exist in the schema`;

  let result;
  try {
    const { text } = await generateText({
      model: anthropic("claude-3-5-haiku-20241022"),
      prompt,
      maxOutputTokens: 4000,
    });

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    result = JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error("[suggest-fix] AI generation failed:", err);
    return NextResponse.json({ error: "Failed to generate fix suggestion" }, { status: 500 });
  }

  // Audit
  await db.insert(auditLog).values({
    actorEmail: session.user.email!,
    actorRole: session.user.role!,
    action: "blueprint.fix_suggested",
    entityType: "blueprint",
    entityId: id,
    enterpriseId: blueprint.enterpriseId ?? null,
    metadata: {
      violationCount: violations.length,
      changeCount: result.changes?.length ?? 0,
    },
  });

  return NextResponse.json({
    changes: result.changes ?? [],
    suggestedAbp: result.suggestedAbp ?? abp,
    summary: result.summary ?? "",
    violationCount: violations.length,
  });
}

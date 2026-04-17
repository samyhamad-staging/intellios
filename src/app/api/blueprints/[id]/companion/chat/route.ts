/**
 * Blueprint Companion — AI design partner for the Blueprint Workbench.
 *
 * A streaming multi-turn chat endpoint that gives the Architect an always-
 * available AI conversational partner on the Workbench. Unlike the Help
 * System (which knows about Intellios features), the Companion knows about
 * THIS specific blueprint — its content, governance violations, intake
 * context, and policies — and can explain design choices, suggest targeted
 * improvements, and answer "why" questions.
 *
 * Model: Claude Haiku 4.5 for fast streaming. Stateless — conversation
 * history is kept client-side via the AI SDK.
 */

import { NextRequest } from "next/server";
import {
  streamText,
  convertToModelMessages,
  tool,
  stepCountIs,
  zodSchema,
} from "ai";
import type { UIMessage } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { aiError } from "@/lib/errors";
import { ensureCircuitClosed, recordBreakerError, recordBreakerSuccess } from "@/lib/ai/circuit-breaker";
import { requireAuth } from "@/lib/auth/require";
import { assertEnterpriseAccess } from "@/lib/auth/enterprise";
import { getRequestId } from "@/lib/request-id";
import { rateLimit, enterpriseRateLimit } from "@/lib/rate-limit";
import { parseBody } from "@/lib/parse-body";
import { logger, serializeError } from "@/lib/logger";
import { db } from "@/lib/db";
import { agentBlueprints, intakeSessions } from "@/lib/db/schema";
import { loadPolicies } from "@/lib/governance/load-policies";
import { SAFE_BLUEPRINT_COLUMNS } from "@/lib/db/safe-columns";
import { eq } from "drizzle-orm";
import { z } from "zod";
import type { ABP } from "@/lib/types/abp";
import type { IntakePayload } from "@/lib/types/intake";
import type { ValidationReport } from "@/lib/governance/types";

// Extend Vercel function timeout for AI generation (default 10s is too short)
export const maxDuration = 60;

const ChatBody = z.object({
  messages: z.array(z.unknown()).min(1).max(200),
});

// ── System prompt ────────────────────────────────────────────────────────────

function buildCompanionSystemPrompt(
  abp: ABP,
  validationReport: ValidationReport | null,
  intake: IntakePayload | null,
  policyNames: string[],
  status: string,
  refinementCount: number
): string {
  const violations = validationReport?.violations ?? [];
  const errorViolations = violations.filter((v) => v.severity === "error");
  const warnViolations = violations.filter((v) => v.severity === "warning");

  const governanceStatus = validationReport?.valid
    ? "✓ All governance checks pass"
    : `${errorViolations.length} blocking violation(s), ${warnViolations.length} warning(s)`;

  const violationDetail =
    violations.length > 0
      ? violations
          .map(
            (v) =>
              `- [${v.severity.toUpperCase()}] ${v.policyName}: ${v.message} (field: ${v.field})${v.suggestion ? ` → Suggested fix: ${v.suggestion}` : ""}`
          )
          .join("\n")
      : "None";

  const abpSummary = JSON.stringify(
    {
      identity: abp.identity,
      capabilities: {
        tools: abp.capabilities?.tools?.map((t) => ({
          name: t.name,
          type: t.type,
        })),
        instructions: abp.capabilities?.instructions
          ? `${abp.capabilities.instructions.substring(0, 500)}${abp.capabilities.instructions.length > 500 ? "…" : ""}`
          : null,
        knowledge_sources: abp.capabilities?.knowledge_sources?.map((k) => ({
          name: k.name,
          type: k.type,
        })),
      },
      constraints: abp.constraints,
      governance: {
        policies: abp.governance?.policies?.map((p) => ({
          name: p.name,
          type: p.type,
        })),
        audit: abp.governance?.audit,
      },
      ownership: abp.ownership,
    },
    null,
    2
  );

  const intakeContext = intake
    ? `
## Original Intake Requirements
${intake.identity?.name ? `Agent name: ${intake.identity.name}` : ""}
${intake.identity?.description ? `Description: ${intake.identity.description}` : ""}
${intake.capabilities?.instructions ? `Instructions summary: ${intake.capabilities.instructions.substring(0, 300)}…` : ""}
${intake._flags && intake._flags.length > 0 ? `Unresolved ambiguities: ${intake._flags.map((f) => f.description).join("; ")}` : ""}
`
    : "";

  return `You are the Blueprint Companion — an AI design partner embedded in the Intellios Blueprint Workbench.

You are NOT a general help assistant. You are a knowledgeable, context-aware partner for THIS specific blueprint. You understand its content, its governance posture, its original requirements, and the enterprise policies that govern it.

## Your Capabilities
- **Explain design choices**: Why was this section designed this way? What drove the governance configuration?
- **Suggest improvements**: Identify gaps, recommend additions, propose refinements with rationale.
- **Analyze governance**: Explain what violations mean, why they matter, and how to resolve them.
- **Answer questions**: About any section of the blueprint, its regulatory implications, or its readiness.
- **Provide next-step guidance**: What should the Architect focus on next? What's blocking progress?

## Communication Style
- Be concise (2–6 sentences per response unless depth is requested).
- Be direct and actionable. Don't hedge excessively.
- Reference specific sections by name (Identity, Capabilities, Constraints, Governance, etc.).
- When suggesting changes, be specific about WHAT to change and WHY.
- Use the suggest_change tool when you have a concrete refinement to propose.

## This Blueprint

**Status:** ${status} | **Refinements:** ${refinementCount}
**Governance:** ${governanceStatus}

### Blueprint Content
${abpSummary}

### Active Governance Violations
${violationDetail}

### Enterprise Policies Evaluated
${policyNames.length > 0 ? policyNames.map((n) => `- ${n}`).join("\n") : "No enterprise policies loaded"}

${intakeContext}

## Important Constraints
- You can EXPLAIN the blueprint and SUGGEST changes, but you cannot directly modify it. Use the suggest_change tool to propose specific changes the Architect can apply.
- Do not hallucinate information about the blueprint. Only reference what is in the context above.
- Be honest if a question is outside your context. Say "I don't have visibility into [X]" rather than guessing.
- When governance violations exist, proactively surface the most impactful ones early.`;
}

// ── Route handler ────────────────────────────────────────────────────────────

export async function POST(
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

  const rateLimitResponse = await rateLimit(authSession.user.email!, {
    endpoint: "companion",
    max: 40,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  // Per-enterprise ceiling (C4 / ADR-020).
  if (authSession.user.enterpriseId) {
    const tenantLimitResponse = await enterpriseRateLimit(authSession.user.enterpriseId, {
      endpoint: "companion",
      max: 240,
      windowMs: 60_000,
    });
    if (tenantLimitResponse) return tenantLimitResponse;
  }

  const { data: body, error: bodyError } = await parseBody(request, ChatBody);
  if (bodyError) return bodyError;

  try {
    const { id } = await params;

    // Load blueprint
    const [blueprint] = await db
      .select(SAFE_BLUEPRINT_COLUMNS)
      .from(agentBlueprints)
      .where(eq(agentBlueprints.id, id))
      .limit(1);
    if (!blueprint) {
      return new Response("Blueprint not found", { status: 404 });
    }

    const enterpriseError = assertEnterpriseAccess(
      blueprint.enterpriseId,
      authSession.user
    );
    if (enterpriseError) return enterpriseError;

    const abp = blueprint.abp as ABP;
    const validationReport =
      (blueprint.validationReport as ValidationReport) ?? null;

    // Load original intake for context
    let intake: IntakePayload | null = null;
    if (blueprint.sessionId) {
      const session = await db.query.intakeSessions.findFirst({
        where: eq(intakeSessions.id, blueprint.sessionId),
      });
      intake = (session?.intakePayload as IntakePayload) ?? null;
    }

    // Load policies for context
    const policies = await loadPolicies(blueprint.enterpriseId ?? null);
    const policyNames = policies.map(
      (p) => `${p.name} (${p.type}${p.enterpriseId ? ", enterprise" : ", global"})`
    );

    const systemPrompt = buildCompanionSystemPrompt(
      abp,
      validationReport,
      intake,
      policyNames,
      blueprint.status,
      parseInt(blueprint.refinementCount ?? "0", 10)
    );

    const messages = body.messages as UIMessage[];
    const modelMessages = await convertToModelMessages(messages);

    // ADR-023 — pre-flight circuit breaker check. See help/chat/route.ts for pattern.
    const CHAT_MODEL_ID = "claude-haiku-4-5-20251001";
    ensureCircuitClosed(CHAT_MODEL_ID);

    const result = streamText({
      model: anthropic(CHAT_MODEL_ID),
      // Transient-error retry budget (ADR-010 / C6). Mirrors the 3-attempt
      // envelope used by resilientGenerateObject for non-streaming calls.
      maxRetries: 3,
      onError: async ({ error }) => {
        recordBreakerError(CHAT_MODEL_ID, error);
      },
      onFinish: async () => {
        recordBreakerSuccess(CHAT_MODEL_ID);
      },
      system: systemPrompt,
      messages: modelMessages,
      maxOutputTokens: 1200,
      stopWhen: stepCountIs(2),
      tools: {
        suggest_change: tool({
          description:
            "Suggest a specific change to the blueprint that the Architect can apply via the refinement input. Use this when you have a concrete, actionable improvement to propose.",
          inputSchema: zodSchema(
            z.object({
              section: z
                .string()
                .describe(
                  "The ABP section this change targets: identity, capabilities, constraints, governance, audit, or ownership"
                ),
              summary: z
                .string()
                .describe(
                  "A short one-sentence summary of what to change"
                ),
              refinementPrompt: z
                .string()
                .describe(
                  "The exact natural-language change request the Architect can paste into the refinement input to apply this change"
                ),
              rationale: z
                .string()
                .describe(
                  "Why this change matters — governance impact, quality improvement, or risk reduction"
                ),
              priority: z
                .enum(["high", "medium", "low"])
                .describe("How urgent this change is"),
            })
          ),
          execute: async ({
            section,
            summary,
            refinementPrompt,
            rationale,
            priority,
          }) => ({
            section,
            summary,
            refinementPrompt,
            rationale,
            priority,
          }),
        }),
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (err) {
    logger.error("blueprint.companion.chat.failed", { requestId, err: serializeError(err) });
    return aiError(err, requestId);
  }
}

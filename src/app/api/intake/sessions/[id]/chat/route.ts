import { NextRequest, NextResponse } from "next/server";
import { streamText, convertToModelMessages, stepCountIs } from "ai";
import type { UIMessage } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { apiError, aiError, ErrorCode } from "@/lib/errors";
import { ensureCircuitClosed, recordBreakerError, recordBreakerSuccess } from "@/lib/ai/circuit-breaker";
import { db } from "@/lib/db";
import { intakeSessions, intakeMessages, intakeContributions } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { buildIntakeSystemPrompt } from "@/lib/intake/system-prompt";
import { createIntakeTools } from "@/lib/intake/tools";
import { classifyIntake } from "@/lib/intake/classify";
import { IntakePayload, IntakeContext, ContributionDomain, StakeholderContribution, IntakeClassification, AgentType, IntakeRiskTier } from "@/lib/types/intake";
import { loadPolicies } from "@/lib/governance/load-policies";
import { selectIntakeModel, detectExpertiseLevel, ExpertiseLevel } from "@/lib/intake/model-selector";
import { buildTopicProbingRules } from "@/lib/intake/probing";
import { buildTransparencyMetadata } from "@/lib/intake/transparency";
import { requireAuth } from "@/lib/auth/require";
import { assertEnterpriseAccess } from "@/lib/auth/enterprise";
import { getEnterpriseId } from "@/lib/auth/enterprise-scope";
import { setRLSContext, clearRLSContext } from "@/lib/db/rls";
import { getRequestId } from "@/lib/request-id";
import { rateLimit, enterpriseRateLimit } from "@/lib/rate-limit";
import { parseBody } from "@/lib/parse-body";
import { logger, serializeError } from "@/lib/logger";
import { z } from "zod";

// Extend Vercel function timeout for AI generation (default 10s is too short)
export const maxDuration = 60;

// Validate outer shape only — inner message structure is owned by the AI SDK.
const ChatBody = z.object({
  messages: z.array(z.unknown()).min(1).max(200),
});

function extractTextContent(message: UIMessage): string {
  const textParts = message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text);
  return textParts.join("");
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session: authSession, error } = await requireAuth(["architect", "designer", "admin"]);
  if (error) return error;
  const requestId = getRequestId(request);

  const rateLimitResponse = await rateLimit(authSession.user.email!, {
    endpoint: "chat",
    max: 30,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  // Per-enterprise ceiling (C4 / ADR-020) — a single tenant cannot saturate
  // upstream Bedrock for the platform, even when many distinct users on that
  // tenant are each under their per-user cap.
  if (authSession.user.enterpriseId) {
    const tenantLimitResponse = await enterpriseRateLimit(authSession.user.enterpriseId, {
      endpoint: "chat",
      max: 240,
      windowMs: 60_000,
    });
    if (tenantLimitResponse) return tenantLimitResponse;
  }

  const { data: body, error: bodyError } = await parseBody(request, ChatBody);
  if (bodyError) return bodyError;

  // Set RLS context for all DB queries in this request.
  // NOTE: We set it here (before the try block) and clear it after the DB-heavy
  // preamble completes but before streaming begins, since the stream outlives
  // the function return and we must not hold the RLS context on a pooled connection.
  const rlsCtx = getEnterpriseId(request);
  await setRLSContext(rlsCtx);

  try {
    const { id: sessionId } = await params;
    const messages = body.messages as UIMessage[];

    // Fetch session — use explicit column selection to tolerate missing migration columns
    const session = await db.query.intakeSessions.findFirst({
      where: eq(intakeSessions.id, sessionId),
    });

    if (!session) {
      return apiError(ErrorCode.NOT_FOUND, "Session not found");
    }

    const enterpriseError = assertEnterpriseAccess(session.enterpriseId, authSession.user);
    if (enterpriseError) return enterpriseError;

    if (session.status === "completed") {
      return apiError(ErrorCode.CONFLICT, "Session is already finalized");
    }

    // Save the latest user message to DB
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === "user") {
      const text = extractTextContent(lastMessage);
      if (text) {
        await db.insert(intakeMessages).values({
          sessionId,
          role: "user",
          content: text,
        });
      }
    }

    // Current payload state — serialized to prevent race conditions when
    // Claude calls multiple tools in the same step (parallel execution).
    let currentPayload = (session.intakePayload as IntakePayload) ?? {};
    let currentContext = (session.intakeContext as IntakeContext | null) ?? null;

    // Build classification from session columns (null for unclassified sessions)
    const currentClassification: IntakeClassification | null =
      session.agentType && session.riskTier
        ? {
            agentType: session.agentType as AgentType,
            riskTier: session.riskTier as IntakeRiskTier,
            rationale: "",
          }
        : null;

    // ── Expertise level detection (Phase 49) ──────────────────────────────
    // Read persisted expertise level from session. If not yet set and we have
    // at least 2 user messages, detect from message history and persist.
    let currentExpertiseLevel = (session.expertiseLevel as ExpertiseLevel | null) ?? null;
    const userMessages = messages.filter((m) => m.role === "user");
    if (!currentExpertiseLevel && userMessages.length >= 2) {
      const userTexts = userMessages.map((m) => extractTextContent(m));
      currentExpertiseLevel = detectExpertiseLevel(userTexts);
      // Fire-and-forget persistence — does not block the streaming response
      db.update(intakeSessions)
        .set({ expertiseLevel: currentExpertiseLevel, updatedAt: new Date() })
        .where(eq(intakeSessions.id, sessionId))
        .catch((err) => logger.error("intake.chat.expertiseLevel.save.failed", { requestId, sessionId, err: serializeError(err) }));
    }

    // Fetch stakeholder contributions for this session to inject into system prompt
    const contributionRows = await db
      .select()
      .from(intakeContributions)
      .where(eq(intakeContributions.sessionId, sessionId))
      .orderBy(asc(intakeContributions.createdAt));

    const currentContributions: StakeholderContribution[] = contributionRows.map((row) => ({
      id: row.id,
      sessionId: row.sessionId,
      contributorEmail: row.contributorEmail,
      contributorRole: row.contributorRole,
      domain: row.domain as ContributionDomain,
      fields: row.fields as Record<string, string>,
      createdAt: row.createdAt.toISOString(),
    }));

    // Fetch active governance policies for this enterprise so Claude can design
    // blueprints that pre-satisfy them (Phase 15: Policy-Aware Intake).
    const enterpriseId = session.enterpriseId ?? null;
    const currentPolicies = await loadPolicies(enterpriseId);

    let updateQueue = Promise.resolve();

    // Create tools with payload access
    const tools = createIntakeTools(
      () => currentPayload,
      (updater) => {
        updateQueue = updateQueue.then(async () => {
          currentPayload = updater(currentPayload);
          await db
            .update(intakeSessions)
            .set({ intakePayload: currentPayload, updatedAt: new Date() })
            .where(eq(intakeSessions.id, sessionId));
        });
        return updateQueue;
      },
      async () => {
        await db
          .update(intakeSessions)
          .set({ status: "completed", updatedAt: new Date() })
          .where(eq(intakeSessions.id, sessionId));
      },
      () => currentContext,
      () => (currentClassification?.riskTier ?? null),
      async (context: IntakeContext) => {
        // Save context to DB and update in-memory reference.
        // If this fails, propagate explicitly — the tool will surface a clean error to Claude.
        try {
          await db
            .update(intakeSessions)
            .set({ intakeContext: context, updatedAt: new Date() })
            .where(eq(intakeSessions.id, sessionId));
        } catch (err) {
          logger.error("intake.chat.context.persist.failed", { requestId, sessionId, err: serializeError(err) });
          throw new Error("Failed to save context — please try again");
        }
        currentContext = context;
        // Classify synchronously (~500ms, one-time) so the tool response can include it.
        // Classification failure is non-fatal — context is already saved.
        try {
          const classification = await classifyIntake(context);
          await db
            .update(intakeSessions)
            .set({ agentType: classification.agentType, riskTier: classification.riskTier, updatedAt: new Date() })
            .where(eq(intakeSessions.id, sessionId));
          return { agentType: classification.agentType as AgentType, riskTier: classification.riskTier as IntakeRiskTier };
        } catch {
          // Classification will be derived on the next turn; not a blocking error
          return null;
        }
      }
    );

    // Convert UI messages to model messages for Claude
    const modelMessages = await convertToModelMessages(messages);

    // Build topic-specific probing rules from context + agent type (Phase 49)
    const topicProbingRules = currentContext
      ? buildTopicProbingRules(
          currentContext,
          currentClassification?.agentType ?? null
        )
      : "";

    // Select model based on turn position, conversation state, and expertise level.
    // See model-selector.ts for full routing rules.
    const selectedModel = selectIntakeModel({
      messageCount: messages.length,
      lastUserText: messages.length > 0
        ? extractTextContent(messages[messages.length - 1])
        : "",
      context: currentContext,
      payload: currentPayload,
      expertiseLevel: currentExpertiseLevel,
    });

    // Clear RLS context before streaming — the stream outlives this function
    // and we must not hold tenant context on a pooled connection.
    await clearRLSContext();

    // ADR-023 — pre-flight circuit breaker check. Keyed to the dynamically
    // selected model so the breaker scope matches the provider call.
    ensureCircuitClosed(selectedModel);

    // Stream response. maxRetries covers transient 5xx / network errors at the
    // initial request step (matches resilientGenerateObject's 3-attempt budget
    // used elsewhere in the codebase — see ADR-010). We deliberately do not set
    // a global abortSignal here because tool-calling chains legitimately take
    // tens of seconds across multiple provider round-trips; the Vercel function
    // maxDuration (60s) is the effective ceiling for a single turn.
    const result = streamText({
      model: anthropic(selectedModel),
      maxRetries: 3,
      onError: async ({ error }) => {
        recordBreakerError(selectedModel, error);
      },
      system: buildIntakeSystemPrompt(
        currentPayload,
        currentContext,
        currentContributions,
        currentPolicies,
        currentClassification,
        currentExpertiseLevel,
        topicProbingRules,
      ),
      messages: modelMessages,
      tools,
      stopWhen: stepCountIs(20),
      onFinish: async ({ text }) => {
        // ADR-023 — record breaker success on stream completion. Must run even
        // if the message-persist below fails, so call it first.
        recordBreakerSuccess(selectedModel);
        if (text) {
          await db.insert(intakeMessages).values({
            sessionId,
            role: "assistant",
            content: text,
          });
        }
      },
    });

    // Build model selection context for transparency (reuse the same inputs)
    const modelSelectionCtx = {
      messageCount: messages.length,
      lastUserText: messages.length > 0 ? extractTextContent(messages[messages.length - 1]) : "",
      context: currentContext,
      payload: currentPayload,
      expertiseLevel: currentExpertiseLevel,
    };

    // Collect tool call names for active domain inference
    const collectedToolNames: string[] = [];
    return result.toUIMessageStreamResponse({
      messageMetadata: ({ part }) => {
        // Track tool calls as they stream through
        if ("toolName" in part && typeof part.toolName === "string") {
          collectedToolNames.push(part.toolName);
        }
        if (part.type !== "finish") return undefined;
        return buildTransparencyMetadata(
          currentPayload,
          currentContext,
          currentClassification,
          selectedModel,
          currentExpertiseLevel,
          modelSelectionCtx,
          collectedToolNames,
        );
      },
    });
  } catch (error) {
    await clearRLSContext().catch(() => {}); // best-effort cleanup
    logger.error("intake.chat.failed", { requestId, err: serializeError(error) });
    return aiError(error, requestId);
  }
}

import { NextRequest, NextResponse } from "next/server";
import { streamText, convertToModelMessages, stepCountIs } from "ai";
import type { UIMessage } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { apiError, aiError, ErrorCode } from "@/lib/errors";
import { db } from "@/lib/db";
import { intakeSessions, intakeMessages, intakeContributions } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { buildIntakeSystemPrompt } from "@/lib/intake/system-prompt";
import { createIntakeTools } from "@/lib/intake/tools";
import { IntakePayload, IntakeContext, ContributionDomain, StakeholderContribution } from "@/lib/types/intake";
import { loadPolicies } from "@/lib/governance/load-policies";
import { selectIntakeModel } from "@/lib/intake/model-selector";
import { requireAuth } from "@/lib/auth/require";
import { assertEnterpriseAccess } from "@/lib/auth/enterprise";
import { getRequestId } from "@/lib/request-id";
import { rateLimit } from "@/lib/rate-limit";
import { parseBody } from "@/lib/parse-body";
import { z } from "zod";

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
  const { session: authSession, error } = await requireAuth(["designer", "admin"]);
  if (error) return error;
  const requestId = getRequestId(request);

  const rateLimitResponse = rateLimit(authSession.user.email!, {
    endpoint: "chat",
    max: 30,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  const { data: body, error: bodyError } = await parseBody(request, ChatBody);
  if (bodyError) return bodyError;

  try {
    const { id: sessionId } = await params;
    const messages = body.messages as UIMessage[];

    // Fetch session
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
    const currentContext = (session.intakeContext as IntakeContext | null) ?? null;

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
      () => currentContext
    );

    // Convert UI messages to model messages for Claude
    const modelMessages = await convertToModelMessages(messages);

    // Select model based on turn position and conversation state.
    // Most turns route to Haiku; opening, governance-heavy, and post-completion
    // turns route to Sonnet for accuracy. See model-selector.ts for routing rules.
    const selectedModel = selectIntakeModel({
      messageCount: messages.length,
      lastUserText: messages.length > 0
        ? extractTextContent(messages[messages.length - 1])
        : "",
      context: currentContext,
      payload: currentPayload,
    });

    // Stream response
    const result = streamText({
      model: anthropic(selectedModel),
      system: buildIntakeSystemPrompt(currentPayload, currentContext, currentContributions, currentPolicies),
      messages: modelMessages,
      tools,
      stopWhen: stepCountIs(20),
      onFinish: async ({ text }) => {
        if (text) {
          await db.insert(intakeMessages).values({
            sessionId,
            role: "assistant",
            content: text,
          });
        }
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error(`[${requestId}] Failed to process intake chat:`, error);
    return aiError(error, requestId);
  }
}

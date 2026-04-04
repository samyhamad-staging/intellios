import { NextRequest } from "next/server";
import { streamText, convertToModelMessages, tool, zodSchema, stepCountIs } from "ai";
import type { UIMessage } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { db } from "@/lib/db";
import { intakeSessions, intakeContributions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require";
import { assertEnterpriseAccess } from "@/lib/auth/enterprise";
import { apiError, aiError, ErrorCode } from "@/lib/errors";
import { getRequestId } from "@/lib/request-id";
import { parseBody } from "@/lib/parse-body";
import { ContributionDomain, IntakePayload, IntakeContext } from "@/lib/types/intake";

const VALID_DOMAINS = ["compliance", "risk", "legal", "security", "it", "operations", "business"] as const;

const ChatBody = z.object({
  messages: z.array(z.unknown()).min(1).max(50),
});

const DOMAIN_LABELS: Record<ContributionDomain, string> = {
  compliance: "Compliance",
  risk: "Risk",
  legal: "Legal",
  security: "Security",
  it: "IT / Infrastructure",
  operations: "Operations",
  business: "Business",
};

const DOMAIN_FOCUS: Record<ContributionDomain, string> = {
  compliance: "regulatory requirements, mandatory policies, record-keeping obligations, and audit requirements",
  risk: "risk thresholds, denied scenarios, escalation triggers, and confidence-level guardrails",
  legal: "permitted use boundaries, prohibited use cases, liability constraints, and contractual obligations",
  security: "authentication requirements, data handling constraints, access control, and encryption standards",
  it: "integration requirements, infrastructure constraints, API limitations, and deployment environment",
  operations: "SLA requirements, escalation paths, monitoring expectations, and operational runbooks",
  business: "success criteria, KPIs, budget constraints, and stakeholder approval requirements",
};

const DOMAIN_DEPTH: Record<ContributionDomain, { min: number; max: number }> = {
  compliance: { min: 3, max: 6 },
  risk: { min: 3, max: 6 },
  legal: { min: 2, max: 4 },
  security: { min: 3, max: 5 },
  it: { min: 2, max: 4 },
  operations: { min: 2, max: 4 },
  business: { min: 2, max: 4 },
};

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

  const { data: body, error: bodyError } = await parseBody(request, ChatBody);
  if (bodyError) return bodyError;

  try {
    const { id: sessionId } = await params;

    // domain is passed as a URL query param (e.g. ?domain=compliance)
    const rawDomain = request.nextUrl.searchParams.get("domain");
    if (!rawDomain || !VALID_DOMAINS.includes(rawDomain as ContributionDomain)) {
      return apiError(ErrorCode.BAD_REQUEST, "Invalid or missing domain");
    }
    const domain = rawDomain as ContributionDomain;

    const messages = body.messages as UIMessage[];

    // Load session for agent context
    const session = await db.query.intakeSessions.findFirst({
      where: eq(intakeSessions.id, sessionId),
    });

    if (!session) return apiError(ErrorCode.NOT_FOUND, "Session not found");

    const enterpriseError = assertEnterpriseAccess(session.enterpriseId, authSession.user);
    if (enterpriseError) return enterpriseError;

    const context = session.intakeContext as IntakeContext | null;
    const payload = session.intakePayload as IntakePayload | null;

    const agentName =
      (payload as { agentIdentity?: { name?: string } } | null)?.agentIdentity?.name ??
      context?.agentPurpose ??
      "this agent";
    const agentPurpose = context?.agentPurpose ?? "";
    const riskTier = session.riskTier ?? "medium";
    const agentType = session.agentType ?? "automation";

    const domainLabel = DOMAIN_LABELS[domain];
    const focus = DOMAIN_FOCUS[domain];
    const depth = DOMAIN_DEPTH[domain];
    const isHighRisk = riskTier === "high" || riskTier === "critical";
    const questionCount = isHighRisk ? depth.max : depth.min;

    const systemPrompt = `You are a requirements interviewer embedded in an enterprise AI agent design platform. Your job is to collect ${domainLabel} requirements for an agent being designed.

AGENT CONTEXT:
- Name: ${agentName}
- Purpose: ${agentPurpose || "Not yet specified"}
- Type: ${agentType}
- Risk tier: ${riskTier.toUpperCase()}${isHighRisk ? " — this is a high-stakes agent requiring thorough requirements" : ""}

YOUR MISSION: Have a focused, professional conversation to extract ${domainLabel} requirements. Specifically focus on: ${focus}.

CONVERSATION RULES:
- Greet the stakeholder briefly and immediately ask your first focused question
- Ask ONE question at a time — do not list multiple questions at once
- Ask approximately ${questionCount} questions total (adapt based on the quality of answers)
- Use follow-up probes like "Can you be more specific about thresholds?" or "Are there any exceptions to that?"
- When you have gathered sufficient, actionable requirements, call save_requirements — do not delay
- If the stakeholder says they have no requirements for a field, note that and move on
- Be concise — this is a structured interview, not a conversation

OUTPUT FORMAT for save_requirements:
- Use descriptive field keys (e.g., "required_policies", "audit_frequency", "escalation_threshold")
- Write field values as clear, specific requirements (not vague notes)
- Include all requirements mentioned, even brief ones`;

    const saveRequirementsTool = tool({
      description:
        "Save all collected stakeholder requirements as a structured contribution. Call this when you have gathered sufficient requirements (typically after 3-6 exchanges).",
      inputSchema: zodSchema(
        z.object({
          fields: z
            .record(z.string(), z.string())
            .describe(
              "All extracted requirement fields as key-value pairs. Keys should be descriptive snake_case (e.g. 'required_policies', 'max_response_time'). Values should be specific, actionable requirements."
            ),
        })
      ),
      execute: async ({ fields }) => {
        const [row] = await db
          .insert(intakeContributions)
          .values({
            sessionId,
            enterpriseId: session.enterpriseId,
            contributorEmail: authSession.user.email!,
            contributorRole: authSession.user.role ?? "stakeholder",
            domain,
            fields,
          })
          .returning();

        return {
          success: true,
          contributionId: row.id,
          contribution: {
            id: row.id,
            sessionId: row.sessionId,
            contributorEmail: row.contributorEmail,
            contributorRole: row.contributorRole,
            domain: row.domain,
            fields: row.fields as Record<string, string>,
            createdAt: row.createdAt.toISOString(),
          },
          fieldCount: Object.keys(fields).length,
        };
      },
    });

    const modelMessages = await convertToModelMessages(messages);

    const result = streamText({
      model: anthropic("claude-haiku-4-5-20251001"),
      system: systemPrompt,
      messages: modelMessages,
      tools: { save_requirements: saveRequirementsTool },
      stopWhen: stepCountIs(20),
    });

    return result.toUIMessageStreamResponse();
  } catch (err) {
    console.error(`[${requestId}] Stakeholder chat failed:`, err);
    return aiError(err, requestId);
  }
}

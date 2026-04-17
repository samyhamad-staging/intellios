import { NextRequest } from "next/server";
import { streamText, convertToModelMessages, tool, zodSchema, stepCountIs } from "ai";
import type { UIMessage } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { db } from "@/lib/db";
import { intakeInvitations, intakeSessions, intakeContributions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { apiError, aiError, ErrorCode } from "@/lib/errors";
import { getRequestId } from "@/lib/request-id";
import { parseBody } from "@/lib/parse-body";
import { rateLimit } from "@/lib/rate-limit";
import { publishEvent } from "@/lib/events/publish";
import { runForSession, getLatestSynthesis } from "@/lib/intake/orchestrator";
import type { IntakeContext, IntakePayload, ContributionDomain } from "@/lib/types/intake";

// Extend Vercel function timeout for AI generation (default 10s is too short)
export const maxDuration = 60;

const ChatBody = z.object({
  messages: z.array(z.unknown()).min(1).max(50),
});

const DOMAIN_LABELS: Record<string, string> = {
  compliance: "Compliance",
  risk: "Risk",
  legal: "Legal",
  security: "Security",
  it: "IT / Infrastructure",
  operations: "Operations",
  business: "Business",
};

const DOMAIN_FOCUS: Record<string, string> = {
  compliance: "regulatory requirements, mandatory policies, record-keeping obligations, and audit requirements",
  risk: "risk thresholds, denied scenarios, escalation triggers, and confidence-level guardrails",
  legal: "permitted use boundaries, prohibited use cases, liability constraints, and contractual obligations",
  security: "authentication requirements, data handling constraints, access control, and encryption standards",
  it: "integration requirements, infrastructure constraints, API limitations, and deployment environment",
  operations: "SLA requirements, escalation paths, monitoring expectations, and operational runbooks",
  business: "success criteria, KPIs, budget constraints, and stakeholder approval requirements",
};

const RACI_CONTEXT: Record<string, string> = {
  accountable: "You have final decision-making authority for this domain. Your requirements are binding and will be treated as non-negotiables.",
  responsible: "You own the delivery of this domain. Focus on what must be true for this agent to work correctly in your area.",
  consulted: "Your domain expertise is needed. Your input will shape the requirements; focus on what matters most from your perspective.",
  informed: "You will be kept in the loop. Share any concerns, dependencies, or constraints that the team should know about.",
};

const DOMAIN_DEPTH: Record<string, { min: number; max: number }> = {
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
  { params }: { params: Promise<{ token: string }> }
) {
  // P2-SEC-005 FIX: Rate limit public invitation chat to prevent abuse
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  const rateLimitResponse = await rateLimit(ip, {
    endpoint: "invitation-chat",
    max: 30,
    windowMs: 60 * 1000, // 30 messages per minute per IP
  });
  if (rateLimitResponse) return rateLimitResponse;

  const requestId = getRequestId(request);
  const { data: body, error: bodyError } = await parseBody(request, ChatBody);
  if (bodyError) return bodyError;

  try {
    const { token } = await params;

    // Validate invitation token
    const invitation = await db.query.intakeInvitations.findFirst({
      where: eq(intakeInvitations.token, token),
    });

    if (!invitation) {
      return apiError(ErrorCode.NOT_FOUND, "Invitation not found");
    }
    if (invitation.status === "completed") {
      return apiError(ErrorCode.INVALID_STATE, "This invitation has already been used");
    }
    if (new Date(invitation.expiresAt) < new Date()) {
      return apiError(ErrorCode.INVALID_STATE, "This invitation has expired");
    }

    const session = await db.query.intakeSessions.findFirst({
      where: eq(intakeSessions.id, invitation.sessionId),
    });
    if (!session) return apiError(ErrorCode.NOT_FOUND, "Session not found");

    const context = session.intakeContext as IntakeContext | null;
    const payload = session.intakePayload as IntakePayload | null;

    const agentName =
      (payload as { agentIdentity?: { name?: string } } | null)?.agentIdentity?.name ??
      context?.agentPurpose ??
      "this agent";
    const agentPurpose = context?.agentPurpose ?? "";
    const riskTier = session.riskTier ?? "medium";
    const agentType = session.agentType ?? "automation";

    const domain = invitation.domain as ContributionDomain;
    const raciRole = invitation.raciRole;
    const domainLabel = DOMAIN_LABELS[domain] ?? domain;
    const focus = DOMAIN_FOCUS[domain] ?? "all requirements";
    const raciContext = RACI_CONTEXT[raciRole] ?? RACI_CONTEXT.consulted;
    const depth = DOMAIN_DEPTH[domain] ?? { min: 3, max: 5 };
    const isHighRisk = riskTier === "high" || riskTier === "critical";
    const questionCount = isHighRisk ? depth.max : depth.min;

    // Fetch synthesis for context-aware interviewing
    const synthesis = await getLatestSynthesis(invitation.sessionId);
    const synthesisSection = synthesis
      ? `\nCOLLABORATION CONTEXT (what other stakeholders have already contributed):\n${synthesis}\n`
      : "";

    const roleDisplay = invitation.roleTitle ?? domainLabel + " Stakeholder";
    const inviteeName = invitation.inviteeName ?? "Stakeholder";

    const systemPrompt = `You are a requirements interviewer embedded in an enterprise AI agent design platform. Your job is to collect ${domainLabel} requirements for an agent being designed.

AGENT CONTEXT:
- Name: ${agentName}
- Purpose: ${agentPurpose || "Not yet specified"}
- Type: ${agentType}
- Risk tier: ${riskTier.toUpperCase()}${isHighRisk ? " — this is a high-stakes agent requiring thorough requirements" : ""}

STAKEHOLDER CONTEXT:
- Name: ${inviteeName}
- Role: ${roleDisplay}
- Domain: ${domainLabel}
- Authority level: ${raciRole.toUpperCase()} — ${raciContext}
${synthesisSection}
YOUR MISSION: Have a focused, professional conversation to extract ${domainLabel} requirements. Specifically focus on: ${focus}.

${synthesis ? "Use the collaboration context above to ask targeted questions that build on or refine existing contributions. Avoid duplicating what has already been captured." : ""}

CONVERSATION RULES:
- Greet the stakeholder by name and immediately ask your first focused question
- Ask ONE question at a time — do not list multiple questions at once
- Ask approximately ${questionCount} questions total (adapt based on quality of answers)
- Acknowledge the stakeholder's authority level in how you phrase questions
- Use follow-up probes like "Can you be more specific about thresholds?" or "Are there any exceptions?"
- When you have gathered sufficient, actionable requirements, call save_requirements — do not delay
- If the stakeholder says they have no requirements for a field, note that and move on
- Be concise — this is a structured interview, not a conversation

OUTPUT FORMAT for save_requirements:
- Use descriptive field keys (e.g., "required_policies", "audit_frequency", "escalation_threshold")
- Write field values as clear, specific requirements (not vague notes)
- Include all requirements mentioned, even brief ones`;

    const messages = body.messages as UIMessage[];

    const saveRequirementsTool = tool({
      description:
        "Save all collected stakeholder requirements as a structured contribution. Call this when you have gathered sufficient requirements.",
      inputSchema: zodSchema(
        z.object({
          fields: z
            .record(z.string(), z.string())
            .describe(
              "All extracted requirement fields as key-value pairs. Keys should be descriptive snake_case. Values should be specific, actionable requirements."
            ),
        })
      ),
      execute: async ({ fields }) => {
        // Insert contribution
        const [contribution] = await db
          .insert(intakeContributions)
          .values({
            sessionId: invitation.sessionId,
            enterpriseId: session.enterpriseId,
            contributorEmail: invitation.inviteeEmail,
            contributorRole: invitation.roleTitle ?? invitation.raciRole,
            domain: invitation.domain,
            fields,
          })
          .returning();

        // Mark invitation as completed
        await db
          .update(intakeInvitations)
          .set({ status: "completed", contributionId: contribution.id })
          .where(eq(intakeInvitations.id, invitation.id));

        // Write audit log
        void publishEvent({
          event: {
            type: "intake.contribution_submitted",
            payload: {
              sessionId: invitation.sessionId,
              domain: invitation.domain,
              raciRole: invitation.raciRole,
              sessionCreatedBy: session.createdBy ?? "",
            },
          },
          actor: { email: invitation.inviteeEmail, role: invitation.roleTitle ?? invitation.raciRole },
          entity: { type: "intake_session", id: invitation.sessionId },
          enterpriseId: session.enterpriseId ?? null,
        });

        // Run orchestrator (fire-and-forget)
        void runForSession(invitation.sessionId);

        return {
          success: true,
          contributionId: contribution.id,
          contribution: {
            id: contribution.id,
            sessionId: contribution.sessionId,
            contributorEmail: contribution.contributorEmail,
            contributorRole: contribution.contributorRole,
            domain: contribution.domain,
            fields: contribution.fields as Record<string, string>,
            createdAt: contribution.createdAt.toISOString(),
          },
          fieldCount: Object.keys(fields).length,
          message: "Thank you — your requirements have been saved and will be incorporated into the agent design.",
        };
      },
    });

    const modelMessages = await convertToModelMessages(messages);

    const result = streamText({
      model: anthropic("claude-haiku-4-5-20251001"),
      // Transient-error retry budget (ADR-010 / C6). Mirrors the 3-attempt
      // envelope used by resilientGenerateObject for non-streaming calls.
      maxRetries: 3,
      system: systemPrompt,
      messages: modelMessages,
      tools: { save_requirements: saveRequirementsTool },
      stopWhen: stepCountIs(20),
    });

    return result.toUIMessageStreamResponse();
  } catch (err) {
    console.error(`[${requestId}] Token-gated chat failed:`, err);
    return aiError(err, requestId);
  }
}

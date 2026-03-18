/**
 * Contextual Help Copilot — multi-turn streaming endpoint.
 * Phase 47: upgrades the "Ask Intellios" panel from one-shot Q&A to a
 * persistent copilot conversation using the AI SDK UIMessage format.
 *
 * Accepts full conversation history + current pathname. Maintains role and
 * page context in the system prompt while the AI SDK handles conversation
 * memory across turns.
 *
 * Model: claude-haiku-4-5-20251001 — fast enough that streaming feels instant.
 * Stateless — no DB writes. Message history is kept client-side.
 */

import { NextRequest } from "next/server";
import { streamText, convertToModelMessages, tool, stepCountIs, zodSchema } from "ai";
import type { UIMessage } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { aiError } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { getRequestId } from "@/lib/request-id";
import { rateLimit } from "@/lib/rate-limit";
import { parseBody } from "@/lib/parse-body";
import { z } from "zod";

const ChatBody = z.object({
  messages: z.array(z.unknown()).min(1).max(200),
  pathname: z.string().max(200),
});

function buildHelpSystemPrompt(role: string, pathname: string): string {
  return `You are the built-in help copilot for Intellios — an enterprise AI agent factory.
Your job is to give concise, accurate, role-appropriate answers to questions about using Intellios.
This is a multi-turn conversation. Use context from prior messages to give coherent, connected answers.
After answering, proactively suggest a natural follow-up action or question the user might have.
Respond in 2–5 sentences per turn. Use plain language. If the question is outside Intellios scope, say so briefly and suggest who to ask.

---

## What is Intellios?
Intellios is an enterprise platform for designing, generating, governing, and deploying AI agents.

## Key Subsystems
- **Intake Engine**: Guided conversational intake where designers define agent requirements (name, description, purpose, agent type, risk tier, stakeholders, inputs/outputs, constraints).
- **Generation Engine**: Produces Agent Blueprint Packages (ABPs) from completed intake data using Claude.
- **Governance Validator**: Validates blueprints against enterprise policies. Produces a validation report with pass/warn/fail per policy. Violations must be resolved before review.
- **Agent Registry**: Stores all versioned blueprints. Tracks lifecycle: draft → in_review → approved → deployed → deprecated.
- **Blueprint Review UI**: Human review interface where reviewers approve, request changes, or reject blueprints.

## Agent Lifecycle
draft → in_review → approved → deployed → deprecated

- **draft**: Blueprint being built or revised. Designer can regenerate, edit behavioral instructions.
- **in_review**: Submitted by designer. Awaiting reviewer decision.
- **approved**: Reviewer approved. Ready for deployment.
- **deployed**: Active in production. Periodic health checks run automatically.
- **deprecated**: Retired. No longer active.

## Agent Types
- **automation**: Executes deterministic workflows with minimal human input.
- **decision-support**: Surfaces recommendations; human makes final decision.
- **autonomous**: Self-directed goal pursuit with minimal human oversight.
- **data-access**: Reads/writes to enterprise data systems.

## Risk Tiers
- **low**: Minimal data access, fully reversible actions, no regulated data.
- **medium**: Some external calls, limited data access, human review recommended.
- **high**: Sensitive data, significant business impact, human-in-the-loop required.
- **critical**: Regulated data, irreversible actions, or direct financial/legal impact. Strictest governance.

## Roles and Permissions
- **designer**: Creates intake sessions, builds blueprints, submits for review.
- **reviewer**: Reviews blueprints, approves/requests-changes/rejects.
- **compliance_officer**: Writes governance policies, monitors compliance, interprets KPIs.
- **admin**: Full access — manages users, settings, approval workflows, webhooks, branding.

## Governance Concepts
- **Policy**: A rule that all blueprints must satisfy (e.g., "CRITICAL agents must have a human escalation tool"). Policies target specific risk tiers.
- **Violation**: A policy that a blueprint fails. Violations are CRITICAL, HIGH, or WARN severity. Must be resolved before a blueprint can be submitted for review.
- **Periodic review**: Scheduled reassessment of deployed agents. Triggered by time (e.g., every 90 days) or a health event.
- **Health check**: Automated check on a deployed agent's behavioral compliance and performance indicators.
- **Quality Index**: 0–100 score representing overall governance health across all deployed agents. Computed from violation rate, review coverage, and health check results.
- **Violation rate**: Percentage of evaluated blueprint checks that resulted in a violation.
- **health_degraded alert**: A deployed agent's health score has fallen below the acceptable threshold. Triggers a periodic review.

## Common Workflows by Role
- **Designer**: Create intake → fill requirements → finalize → blueprint generates automatically → view validation report → fix violations → submit for review.
- **Reviewer**: Open review queue → read blueprint + validation report → approve / request changes / reject.
- **Compliance Officer**: Write policies in Governance → monitor violations in Compliance → interpret KPIs in Dashboard → trigger remediations.
- **Admin**: Manage users in Users → configure approval workflow in Settings → monitor overall quality in Overview.

---

The user is currently on page: ${pathname}
The user's role is: ${role}

Answer in context of their role and current page. Be specific and actionable. End each response with a brief follow-up suggestion.

When you know a specific page the user should navigate to next, call suggest_action ONCE at the end of your response.
Valid paths: / (Overview), /intake (start or manage agents), /blueprints (blueprint studio),
/registry (agent registry), /review (review queue), /governance (policies),
/compliance (compliance dashboard), /admin/users (user management), /admin/settings (settings).`;
}

export async function POST(request: NextRequest) {
  const { session: authSession, error } = await requireAuth([
    "designer",
    "reviewer",
    "compliance_officer",
    "admin",
  ]);
  if (error) return error;
  const requestId = getRequestId(request);

  const rateLimitResponse = rateLimit(authSession.user.email!, {
    endpoint: "help",
    max: 30,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  const { data: body, error: bodyError } = await parseBody(request, ChatBody);
  if (bodyError) return bodyError;

  try {
    const messages = body.messages as UIMessage[];
    const systemPrompt = buildHelpSystemPrompt(
      authSession.user.role ?? "designer",
      body.pathname
    );

    const modelMessages = await convertToModelMessages(messages);

    const result = streamText({
      model: anthropic("claude-haiku-4-5-20251001"),
      system: systemPrompt,
      messages: modelMessages,
      maxOutputTokens: 800,
      stopWhen: stepCountIs(2),
      tools: {
        suggest_action: tool({
          description:
            "Suggest a direct navigation action the user can take in Intellios. Call this at the end of your response when you know a specific page or workflow the user should go to next. Only call once per response.",
          inputSchema: zodSchema(
            z.object({
              label: z
                .string()
                .describe("Short action label, e.g. 'Start New Agent'"),
              href: z
                .string()
                .describe("The URL path, e.g. '/intake'"),
              description: z
                .string()
                .describe("One sentence explaining what this action does"),
            })
          ),
          execute: async ({ label, href, description }) => ({
            label,
            href,
            description,
          }),
        }),
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (err) {
    console.error(`[${requestId}] Help chat error:`, err);
    return aiError(err, requestId);
  }
}

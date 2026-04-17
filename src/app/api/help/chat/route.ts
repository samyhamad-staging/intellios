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
import { ensureCircuitClosed, recordBreakerError, recordBreakerSuccess } from "@/lib/ai/circuit-breaker";
import { requireAuth } from "@/lib/auth/require";
import { getRequestId } from "@/lib/request-id";
import { rateLimit, enterpriseRateLimit } from "@/lib/rate-limit";
import { parseBody } from "@/lib/parse-body";
import { logger, serializeError } from "@/lib/logger";
import { z } from "zod";

// Extend Vercel function timeout for AI generation (default 10s is too short)
export const maxDuration = 60;

const ChatBody = z.object({
  messages: z.array(z.unknown()).min(1).max(200),
  pathname: z.string().max(200),
  // P2-595: Optional live page context injected by the current page
  pageContext: z.object({
    agentName: z.string().max(200).optional(),
    blueprintStatus: z.string().max(50).optional(),
    violationCount: z.number().int().min(0).optional(),
  }).optional(),
});

interface PageContext {
  agentName?: string;
  blueprintStatus?: string;
  violationCount?: number;
}

function buildHelpSystemPrompt(role: string, pathname: string, pageContext?: PageContext): string {
  return `You are the built-in help copilot for Intellios — an enterprise AI agent factory.
Your job is to give concise, accurate, role-appropriate answers to questions about using Intellios.
This is a multi-turn conversation. Use context from prior messages to give coherent, connected answers.
After answering, proactively suggest a natural follow-up action or question the user might have.
Respond in 2–5 sentences per turn. Use plain language. If the question is outside Intellios scope, say so briefly and suggest who to ask.

---

## What is Intellios?
Intellios is a white-label enterprise platform for designing, generating, governing, and deploying AI agents under an enterprise's own brand and policies.

## Key Subsystems
- **Intake Engine**: Guided conversational intake where architects define agent requirements (name, description, purpose, agent type, risk tier, stakeholders, inputs/outputs, constraints). Supports stakeholder collaboration where domain experts contribute domain-specific requirements.
- **Generation Engine**: Produces Agent Blueprint Packages (ABPs) from completed intake data using Claude.
- **Governance Validator**: Validates blueprints against enterprise policies. Produces a validation report with pass/warn/fail per policy. Violations must be resolved before review.
- **Agent Registry**: Stores all versioned blueprints. Tracks lifecycle: draft → in_review → approved → deployed → deprecated. Each agent page has Overview, Quality, Simulate, and Production tabs.
- **Blueprint Review UI**: Human review interface where reviewers approve, request changes, or reject blueprints.

## Agent Lifecycle
draft → in_review → approved → deployed → deprecated

- **draft**: Blueprint being built or revised. Architect can regenerate, refine via chat, or edit behavioral instructions.
- **in_review**: Submitted by architect. Awaiting reviewer decision.
- **approved**: Reviewer approved. Ready for deployment.
- **deployed**: Active in production. Periodic health checks and telemetry monitoring run automatically.
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
- **architect**: Creates intake sessions, builds blueprints, submits for review. Can use refinement chat, red-team testing, and export features.
- **reviewer**: Reviews blueprints, approves/requests-changes/rejects.
- **compliance_officer**: Writes governance policies, monitors compliance, interprets KPIs.
- **admin**: Full access — manages users, settings, approval workflows, webhooks, branding.
- **viewer**: Read-only access to registry, blueprints, governance, and compliance. Cannot create, modify, approve, or deploy anything.

## Governance Concepts
- **Policy**: A rule that all blueprints must satisfy (e.g., "CRITICAL agents must have a human escalation tool"). Policies target specific risk tiers.
- **Violation**: A policy that a blueprint fails. Violations are CRITICAL, HIGH, or WARN severity. Must be resolved before a blueprint can be submitted for review.
- **Periodic review**: Scheduled reassessment of deployed agents. Triggered by time (e.g., every 90 days) or a health event.
- **Health check**: Automated check on a deployed agent's behavioral compliance and performance indicators.
- **Quality Index**: 0–100 score representing overall governance health across all deployed agents. Computed from violation rate, review coverage, and health check results.
- **Violation rate**: Percentage of evaluated blueprint checks that resulted in a violation.
- **health_degraded alert**: A deployed agent's health score has fallen below the acceptable threshold. Triggers a periodic review.

## Common Workflows by Role
- **Architect**: Create intake → fill requirements → finalize → blueprint generates automatically → view validation report → fix violations → refine via chat → submit for review.
- **Reviewer**: Open review queue → read blueprint + validation report → approve / request changes / reject.
- **Compliance Officer**: Write policies in Governance → monitor violations in Compliance → interpret KPIs in Dashboard → trigger remediations.
- **Admin**: Manage users in Users → configure approval workflow in Settings → monitor overall quality in Overview.
- **Viewer**: Browse registry, read blueprints and compliance reports. No write actions available.

---

## Advanced Features

### Stakeholder Collaboration
Intake sessions can be opened to domain experts via invitation. Seven collaboration domains are available: compliance, risk, legal, security, IT, operations, and business. Each invited stakeholder gets a RACI role (Responsible / Accountable / Consulted / Informed). An AI orchestrator synthesizes stakeholder contributions and automatically detects conflicts between domain requirements. Access via the "Collaborate" button inside an intake session.

### Red-Team Testing
Architects can test a deployed or approved blueprint against adversarial attack scenarios via the **Simulate tab** on the agent registry page. Five attack categories are available: prompt injection, data exfiltration, instruction override, jailbreak, and social engineering. Each test generates a structured result showing whether the agent's behavioral instructions resist or fail under each attack. Use this before deployment to harden high- and critical-risk agents.

### Blueprint Quality Dashboard
The **Quality tab** on every agent registry page shows a 5-dimension quality score for the latest blueprint:
1. Intent Alignment — how well the agent's behavior matches its stated purpose
2. Tool Appropriateness — whether the right tools are granted for the task
3. Instruction Specificity — clarity and precision of behavioral instructions
4. Governance Adequacy — completeness of escalation paths and policy hooks
5. Ownership Completeness — whether accountability is clearly defined

Each dimension is scored 1–5. The overall score is 0–100. AI-generated flags appear below the scores as amber chips explaining what to improve. No score yet means the blueprint has not been submitted for review.

### Refinement Chat
Inside the Blueprint Studio (/blueprints), the refinement area is a multi-turn streaming chat. Type natural language instructions to improve the blueprint — for example: "Add a human escalation step for irreversible decisions" or "Make the behavioral instructions more specific about what data the agent can access." The AI explains what it changed and why, then updates the blueprint automatically. Conversation history is preserved within the session.

### Blueprint Lineage
Every blueprint version is tracked. On the **Overview tab** of a registry agent, the version history shows a lineage view with structural diffs between versions. The governance diff highlights which policy checks changed between versions — useful for understanding the impact of a refinement or regeneration. Click any version in the history to compare.

### Agent Search — Command Palette
Press **Cmd+K** (Mac) or **Ctrl+K** (Windows) to open the command palette from anywhere in Intellios. Type an agent name to search the live registry. Matching agents appear in an "Agents" result group. Click to navigate directly to that agent's registry page. The command palette also provides quick navigation to Overview, Intake, Registry, Governance, and Compliance.

### Agent Orchestrations (Workflows)
Orchestrations let you compose multiple approved agents into a coordinated pipeline. An orchestration definition specifies which agents participate, their roles, handoff rules (transition conditions between agents), and shared context fields (data accessible to all agents during execution).

**Key concepts:**
- **Orchestration Definition**: The structured spec declaring agents, handoff rules, and shared context.
- **Handoff Rule**: A directed transition from one agent to another, with a condition expression (e.g., "classification === 'urgent'") and priority.
- **Shared Context**: Named, typed fields accessible to all participating agents — enables data flow between pipeline stages.
- **Orchestration Lifecycle**: draft → in_review → approved → deprecated (no "deployed" — orchestrations are published definitions, not runtime deployments).

**How to create an orchestration:**
1. Navigate to Registry → Orchestrations tab.
2. Click "New Orchestration" and provide a name and description.
3. Add agents (must exist in the registry) and define handoff rules.
4. Submit for review when ready.

**Common orchestration patterns:**
- Sequential pipeline: Agent A → Agent B → Agent C (each hands off to the next).
- Classifier-router: A classifier agent routes to different specialist agents based on conditions.
- Supervisor-delegate: A supervisor agent coordinates and reviews outputs from delegate agents.

### Viewer Role
The viewer role provides read-only access to the full platform: registry, blueprints, governance policies, compliance dashboard, and reports. Viewers cannot create intake sessions, generate or modify blueprints, approve or deploy agents, manage users, or change settings. Useful for auditors, executives, or stakeholders who need visibility without write access. Admins assign the viewer role from Admin → Users.

---

The user is currently on page: ${pathname}
The user's role is: ${role}${pageContext ? `

## Current Page Context (use for specific, grounded answers)
${pageContext.agentName ? `- Agent: ${pageContext.agentName}` : ""}
${pageContext.blueprintStatus ? `- Blueprint status: ${pageContext.blueprintStatus}` : ""}
${pageContext.violationCount !== undefined ? `- Active violations: ${pageContext.violationCount}` : ""}
When the user asks about "this agent", "my blueprint", "these violations", etc. — refer to the above context.` : ""}

Answer in context of their role and current page. Be specific and actionable. End each response with a brief follow-up suggestion.

When you know a specific page the user should navigate to next, call suggest_action ONCE at the end of your response.
Valid paths: / (Overview), /intake (start or manage agents), /blueprints (blueprint studio),
/registry (agent registry), /review (review queue), /governance (policies),
/compliance (compliance dashboard), /admin/users (user management), /admin/settings (settings).`;
}

export async function POST(request: NextRequest) {
  const { session: authSession, error } = await requireAuth([
    "architect",
    "reviewer",
    "compliance_officer",
    "admin",
  ]);
  if (error) return error;
  const requestId = getRequestId(request);

  const rateLimitResponse = await rateLimit(authSession.user.email!, {
    endpoint: "help",
    max: 30,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  // Per-enterprise ceiling (C4 / ADR-020).
  if (authSession.user.enterpriseId) {
    const tenantLimitResponse = await enterpriseRateLimit(authSession.user.enterpriseId, {
      endpoint: "help",
      max: 240,
      windowMs: 60_000,
    });
    if (tenantLimitResponse) return tenantLimitResponse;
  }

  const { data: body, error: bodyError } = await parseBody(request, ChatBody);
  if (bodyError) return bodyError;

  try {
    const messages = body.messages as UIMessage[];
    const systemPrompt = buildHelpSystemPrompt(
      authSession.user.role ?? "architect",
      body.pathname,
      body.pageContext,
    );

    const modelMessages = await convertToModelMessages(messages);

    // ADR-023 — pre-flight circuit breaker check. Fails fast with
    // CircuitOpenError (→ 503 SERVICE_DEGRADED) if the breaker for this model
    // is open. onError/onFinish feed stream outcomes back into the breaker.
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
    logger.error("help.chat.failed", { requestId, err: serializeError(err) });
    return aiError(err, requestId);
  }
}

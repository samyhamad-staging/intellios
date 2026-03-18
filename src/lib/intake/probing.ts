/**
 * Topic-Specific Probing Rules — Phase 49: Intake Confidence Engine.
 *
 * Returns context- and agent-type-specific probing instructions that are injected
 * into the intake system prompt after the governance probing block. Unlike the
 * governance rules (which are hard-enforced at finalization), these are soft
 * advisory probing rules — Claude should explore them but they do not block
 * mark_intake_complete.
 *
 * Coverage:
 *   - Customer/partner-facing: fallback behavior, rate limiting, error messaging
 *   - External API integrations: authentication, timeout/retry strategy
 *   - Database/file integrations: data freshness and caching policy
 *   - PII/regulated data: masking scope (storage vs. display)
 *   - Autonomous agents: human oversight checkpoints, override mechanisms, escalation
 *   - Decision-support agents: confidence signaling and uncertainty communication
 */

import { IntakeContext, AgentType } from "@/lib/types/intake";

/**
 * Generates a block of topic-specific probing rules based on Phase 1 context
 * signals and the derived agent classification.
 *
 * Returns an empty string when no additional rules apply (e.g., simple
 * internal automation with no external integrations).
 */
export function buildTopicProbingRules(
  context: IntakeContext,
  agentType: AgentType | null
): string {
  const rules: string[] = [];

  // ─── Customer / partner-facing deployments ────────────────────────────────
  if (context.deploymentType === "customer-facing" || context.deploymentType === "partner-facing") {
    rules.push(
      "• **Fallback behavior** (recommended): ask what the agent should do when it cannot answer or encounters an unexpected error — hand off to a human, display a message, log and fail gracefully, or retry silently"
    );
    rules.push(
      "• **Rate limiting** (recommended): ask whether there are per-user or per-session usage limits to prevent abuse or runaway costs"
    );
    rules.push(
      "• **User-facing error messages** (recommended): clarify what error text or UI the agent should surface to end-users vs. what it should log internally — these are often different"
    );
  }

  // ─── External API integrations ────────────────────────────────────────────
  if (context.integrationTypes.includes("external-apis")) {
    rules.push(
      "• **API authentication** (recommended): ask how the agent will authenticate to each external API — OAuth 2.0, API key, JWT, mTLS — and whether credentials are rotated; this feeds into the access_control policy"
    );
    rules.push(
      "• **Timeout and retry strategy** (recommended): ask whether slow or failed API calls should be retried, with what backoff, and after how many attempts the agent should give up and surface an error"
    );
  }

  // ─── Database / file-system integrations ─────────────────────────────────
  if (
    context.integrationTypes.includes("databases") ||
    context.integrationTypes.includes("file-systems")
  ) {
    rules.push(
      "• **Data freshness** (recommended): ask whether the agent must always query live data or whether cached or snapshot data is acceptable — if caching is allowed, what is the maximum acceptable staleness window?"
    );
  }

  // ─── PII / regulated data ─────────────────────────────────────────────────
  if (context.dataSensitivity === "pii" || context.dataSensitivity === "regulated") {
    rules.push(
      "• **PII masking scope** (recommended): ask whether PII should be masked at storage time, at display time, or both — and whether masking applies uniformly or only for certain user roles (e.g., non-admin users see masked values)"
    );
  }

  // ─── Autonomous agents ────────────────────────────────────────────────────
  if (agentType === "autonomous") {
    rules.push(
      "• **Human oversight checkpoints** (required for autonomous agents): ask at which decision points a human must approve or review before the agent proceeds with a consequential action — no autonomous agent should operate without at least one defined checkpoint"
    );
    rules.push(
      "• **Override and kill switch** (recommended): ask whether operators can pause or override the agent mid-task, and what happens to in-flight operations when it is stopped"
    );
    rules.push(
      "• **Escalation paths** (recommended): ask what the agent does when it reaches a decision it cannot confidently make — defer, escalate to a human, or fail safe by taking no action"
    );
  }

  // ─── Decision-support agents ─────────────────────────────────────────────
  if (agentType === "decision-support") {
    rules.push(
      "• **Confidence signaling** (recommended): ask how the agent should communicate uncertainty — should it always show a confidence score, surface alternative options, or explicitly flag when it is operating outside its domain?"
    );
  }

  if (rules.length === 0) return "";

  return [
    "",
    "## Topic-Specific Probing Rules",
    "",
    "In addition to the governance requirements above, explore these topic areas during the conversation.",
    "These are advisory — they enrich the blueprint but do not block finalization if uncovered.",
    "",
    ...rules,
    "",
  ].join("\n");
}

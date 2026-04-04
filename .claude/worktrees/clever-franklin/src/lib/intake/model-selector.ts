import { IntakeContext, IntakePayload } from "@/lib/types/intake";

const SONNET = "claude-sonnet-4-20250514" as const;
const HAIKU  = "claude-haiku-4-5-20251001" as const;

export type IntakeModel = typeof SONNET | typeof HAIKU;

/**
 * Designer expertise level — detected from early conversation language patterns.
 *
 * guided   : Business/non-technical user; needs structured guidance, examples, and
 *            plain-language framing. Routes to Sonnet more often for quality.
 * adaptive : Mixed or unclear signals; mirrors the designer's vocabulary and pace
 *            (default).
 * expert   : Technical user who speaks in APIs, OAuth, schemas, etc.; routes to
 *            Haiku more aggressively for concise, efficient exchanges.
 */
export type ExpertiseLevel = "guided" | "adaptive" | "expert";

// Vocabulary that signals engineering / technical background
const TECHNICAL_SIGNALS = [
  "api", "endpoint", "oauth", "jwt", "token", "schema", "payload", "latency",
  "throughput", "timeout", "retry", "exponential backoff", "rate limit",
  "rest", "graphql", "grpc", "webhook", "microservice", "container",
  "kubernetes", "docker", "terraform", "idempotent", "transaction",
  "index", "query", "database", "sql", "nosql", "async", "queue",
  "event-driven", "pubsub", "cache", "caching", "authentication",
  "authorization", "credentials", "certificate",
] as const;

// Vocabulary that signals business / non-technical background
const BUSINESS_SIGNALS = [
  "customer", "team", "process", "workflow", "approval", "decision",
  "report", "dashboard", "email", "notification", "alert", "manager",
  "stakeholder", "department", "company", "business", "requirement",
  "outcome", "value", "benefit", "kpi", "metric", "priority",
] as const;

// Phrases that indicate the user is uncertain and needs more guidance
const UNCERTAINTY_PHRASES = [
  "i don't know", "not sure", "i'm not sure", "i'm unsure", "not certain",
  "help me", "what should", "what do you mean", "can you explain",
  "i think", "maybe", "perhaps", "i suppose",
] as const;

/**
 * Detect designer expertise level from accumulated user messages.
 *
 * Should be called after at least 2 user messages are available (turn 2+).
 * Returns "adaptive" when there is insufficient signal to classify.
 *
 * @param userMessages - Array of plain-text user message contents
 */
export function detectExpertiseLevel(userMessages: string[]): ExpertiseLevel {
  if (userMessages.length === 0) return "adaptive";

  const combined = userMessages.join(" ").toLowerCase();

  const techHits = TECHNICAL_SIGNALS.filter((s) => combined.includes(s)).length;
  const bizHits  = BUSINESS_SIGNALS.filter((s) => combined.includes(s)).length;

  // Average message length as a specificity proxy
  const totalChars = userMessages.reduce((sum, m) => sum + m.length, 0);
  const avgLength  = totalChars / userMessages.length;

  // Expert: high technical vocabulary density, or any technical signal + detailed responses
  if (techHits >= 3 || (techHits >= 1 && avgLength > 100)) return "expert";

  // Guided: explicit uncertainty phrases, or very short + low vocabulary messages
  const hasUncertainty = UNCERTAINTY_PHRASES.some((p) => combined.includes(p));
  if (hasUncertainty || (avgLength < 40 && techHits === 0 && bizHits <= 1)) return "guided";

  return "adaptive";
}

/**
 * Plain-data context passed to the model selector.
 * Deliberately avoids AI SDK types so the function is unit-testable with literals.
 */
export interface ModelSelectionContext {
  /** Total message count including the current user message. 1 = opening turn. */
  messageCount: number;
  /** Pre-extracted text of the last user message (use extractTextContent in caller). */
  lastUserText: string;
  /** Phase 1 context signals — reserved for future escalation rules. */
  context: IntakeContext | null;
  /** Current accumulated payload state. */
  payload: IntakePayload;
  /**
   * Designer expertise level detected from early conversation turns.
   * Guided mode routes to Sonnet more often; expert mode allows more Haiku turns.
   * Null / undefined = treat as adaptive (default routing logic applies).
   */
  expertiseLevel?: ExpertiseLevel | null;
}

/**
 * Select the Claude model for an intake chat turn.
 *
 * Conservative by design: false positives (Sonnet on a simple turn) cost money.
 * False negatives (Haiku on a finalization or governance turn) risk quality loss
 * on the most accuracy-sensitive steps of the intake process. The asymmetry
 * favors Sonnet on ambiguous signals.
 *
 * Routing logic — Sonnet is used when:
 *  1. Turn 1: opening message requires complex multi-block context synthesis
 *  2. Payload complete: required sections are filled, conversation may head to
 *     finalization on any subsequent user message
 *  3. Finalization language: user is explicitly signalling they are done
 *  4. Governance/regulatory content: multi-constraint reasoning involved
 *
 * All other turns use Haiku (~75–80% of a typical session).
 */
export function selectIntakeModel(ctx: ModelSelectionContext): IntakeModel {
  // 1. Opening turn: Claude must synthesize payload state, Phase 1 context, active
  //    policies, and stakeholder contributions into a focused first response.
  if (ctx.messageCount <= 1) return SONNET;

  // 2. Payload completeness: required sections (identity + at least one tool) are
  //    filled — the user may confirm or finalize on any subsequent turn.
  //    This is the most reliable pre-finalization signal available and avoids
  //    keyword false-negatives on turns like "yes", "ok", or "that's it".
  const payloadIsComplete =
    !!ctx.payload.identity?.name &&
    (ctx.payload.capabilities?.tools?.length ?? 0) > 0;
  if (payloadIsComplete) return SONNET;

  const text = ctx.lastUserText.toLowerCase();

  // 3. Explicit finalization language. Claude will call mark_intake_complete on this
  //    turn, which requires complete captureVerification and policyQualityAssessment
  //    enumeration. Accuracy is critical. Keep the list specific to avoid false positives.
  const FINALIZATION_PATTERNS = [
    "finalize",
    "finalise",
    "mark complete",
    "mark as complete",
    "ready to generate",
    "we're done",
    "were done",
    "that's everything",
    "thats everything",
    "nothing else to add",
  ] as const;
  if (FINALIZATION_PATTERNS.some((p) => text.includes(p))) return SONNET;

  // 4. Guided mode: business users benefit from Sonnet's richer language quality on
  //    early turns, before the conversation settles into routine capture.
  if (ctx.expertiseLevel === "guided" && ctx.messageCount <= 6) return SONNET;

  // 5. Governance and regulatory content: multi-constraint reasoning required.
  //    Runs for all expertise levels — even experts benefit from Sonnet accuracy
  //    when the user introduces governance, compliance, or regulatory language.
  const GOVERNANCE_PATTERNS = [
    "policy",
    "policies",
    "compliance",
    "regulation",
    "regulatory",
    "finra",
    "sox",
    "gdpr",
    "hipaa",
    "pci",
    "audit",
    "access control",
    "data handling",
    "data retention",
    "prohibited",
    "security requirement",
    "legal requirement",
    "pii",
  ] as const;
  if (GOVERNANCE_PATTERNS.some((p) => text.includes(p))) return SONNET;

  // Standard requirement-capture turn.
  return HAIKU;
}

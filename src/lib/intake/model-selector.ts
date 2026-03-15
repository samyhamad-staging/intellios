import { IntakeContext, IntakePayload } from "@/lib/types/intake";

const SONNET = "claude-sonnet-4-20250514" as const;
const HAIKU  = "claude-3-5-haiku-20241022" as const;

export type IntakeModel = typeof SONNET | typeof HAIKU;

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

  // 4. Governance and regulatory content: multi-constraint reasoning required.
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

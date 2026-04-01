/**
 * Intake Transparency Metadata — streamed alongside each AI response
 * via messageMetadata on toUIMessageStreamResponse().
 *
 * Surfaces the AI's calculations, inferences, logic, and branching so
 * the user can observe and trust the intake process in real time.
 */

import type { AgentType, IntakeRiskTier } from "./intake";
import type { ExpertiseLevel } from "@/lib/intake/model-selector";

// ── Classification Explainer ─────────────────────────────────────────────────

export interface ClassificationTransparency {
  agentType: AgentType;
  riskTier: IntakeRiskTier;
  /** Human-readable signals that triggered this risk tier (e.g., "HIPAA in regulatory scope") */
  signals: string[];
  /** Haiku-generated rationale for agent type classification */
  rationale: string;
  /** Conversation depth instruction derived from risk tier */
  conversationDepth: "streamlined" | "standard" | "deep" | "exhaustive";
}

// ── Readiness Breakdown ──────────────────────────────────────────────────────

export interface ReadinessTransparency {
  score: number;
  label: "not-started" | "building" | "near-complete" | "ready";
  breakdown: {
    sectionCoverage: { score: number; max: 50 };
    governanceDepth: { score: number; max: 35 };
    specificity: { score: number; max: 15 };
  };
}

// ── Governance Checklist ─────────────────────────────────────────────────────

export interface GovernanceChecklistItem {
  /** What is required (e.g., "data_handling policy") */
  type: string;
  /** Why it's required (e.g., "data sensitivity is PII/regulated") */
  reason: string;
  /** Whether the requirement is currently satisfied */
  satisfied: boolean;
}

// ── Model Selection ──────────────────────────────────────────────────────────

export interface ModelTransparency {
  /** Full model ID (e.g., "claude-sonnet-4-6") */
  name: string;
  /** Human-readable reason for model selection */
  reason: string;
}

// ── Probing Topics ───────────────────────────────────────────────────────────

export interface ProbingTopic {
  /** Topic name (e.g., "Fallback behavior") */
  topic: string;
  /** Whether this is a hard or soft requirement */
  level: "mandatory" | "recommended";
  /** Why this topic is relevant (e.g., "customer-facing deployment") */
  reason: string;
  /** Whether this topic has been addressed in the conversation */
  covered: boolean;
}

// ── Full Metadata Object ─────────────────────────────────────────────────────

export interface IntakeTransparencyMetadata {
  classification: ClassificationTransparency | null;
  readiness: ReadinessTransparency;
  governanceChecklist: GovernanceChecklistItem[];
  model: ModelTransparency;
  expertiseLevel: ExpertiseLevel | null;
  probingTopics: ProbingTopic[];
}

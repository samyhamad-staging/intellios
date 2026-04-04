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

// ── Domain Progress ─────────────────────────────────────────────────────────

export interface DomainProgress {
  /** Domain key (e.g., "identity", "tools", "governance") */
  key: string;
  /** User-friendly label (e.g., "Purpose", "Capabilities") */
  label: string;
  /** Visual icon */
  icon: string;
  /** 0–4 richness scale: 0=empty, 1=started, 2=developing, 3=adequate, 4=rich */
  fillLevel: 0 | 1 | 2 | 3 | 4;
  /** Human-readable status label */
  status: "empty" | "started" | "developing" | "adequate" | "rich";
  /** Number of items captured in this domain */
  itemCount: number;
  /** Whether this domain is required for the current risk tier */
  required: boolean;
}

// ── Full Metadata Object ─────────────────────────────────────────────────────

export interface IntakeTransparencyMetadata {
  classification: ClassificationTransparency | null;
  readiness: ReadinessTransparency;
  governanceChecklist: GovernanceChecklistItem[];
  model: ModelTransparency;
  expertiseLevel: ExpertiseLevel | null;
  probingTopics: ProbingTopic[];
  /** Per-domain fill status for the domain progress strip */
  domains: DomainProgress[];
  /** Key of the domain the AI is currently targeting (null if undetermined) */
  activeDomain: string | null;
}

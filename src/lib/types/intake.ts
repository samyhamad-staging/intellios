/**
 * IntakeContext — captured in Phase 1 (structured form) before the AI conversation begins.
 * These fields provide domain signals that allow the system prompt and governance validation
 * to enforce context-appropriate requirements (e.g., mandate compliance policies for FINRA scope).
 */
export interface IntakeContext {
  /** Brief description of the agent's purpose (pre-fills Claude's starting point) */
  agentPurpose: string;
  /** Deployment surface: who or what will interact with the agent */
  deploymentType: "internal-only" | "customer-facing" | "partner-facing" | "automated-pipeline";
  /** Highest sensitivity of data the agent will process */
  dataSensitivity: "public" | "internal" | "confidential" | "pii" | "regulated";
  /** Applicable regulatory frameworks (empty array = none identified) */
  regulatoryScope: Array<"FINRA" | "SOX" | "GDPR" | "HIPAA" | "PCI-DSS" | "none">;
  /** External systems or services this agent will integrate with */
  integrationTypes: Array<"internal-apis" | "external-apis" | "databases" | "file-systems" | "none">;
  /** Stakeholders who were consulted before initiating this intake */
  stakeholdersConsulted: Array<"legal" | "compliance" | "security" | "it" | "business-owner" | "none">;
}

/**
 * ContributionDomain — the stakeholder domain that a contribution covers.
 * Maps to the seven functional areas represented in the stakeholder lane model.
 */
export type ContributionDomain =
  | "compliance"
  | "risk"
  | "legal"
  | "security"
  | "it"
  | "operations"
  | "business";

/**
 * Domain field key sets — the structured fields captured per domain.
 * Each value is a free-text requirement entered by the contributing stakeholder.
 *
 * compliance : required_policies, regulatory_constraints, audit_requirements
 * risk       : risk_thresholds, denied_scenarios, escalation_requirements
 * legal      : use_boundaries, prohibited_use_cases
 * security   : access_control_requirements, data_handling_requirements
 * it         : integration_requirements, infrastructure_constraints
 * operations : sla_requirements, escalation_paths
 * business   : success_criteria, business_constraints
 */

/**
 * StakeholderContribution — a single domain-specific requirement submission
 * from a stakeholder (compliance officer, risk officer, legal, etc.).
 * Stored in intake_contributions; one row per submission.
 */
export interface StakeholderContribution {
  id: string;
  sessionId: string;
  contributorEmail: string;
  contributorRole: string;
  domain: ContributionDomain;
  /** Domain-specific field key → free-text requirement entered by the stakeholder */
  fields: Record<string, string>;
  createdAt: string; // ISO 8601
}

/**
 * AmbiguityFlag — a requirement flagged as ambiguous or contradictory during intake.
 * Stored in IntakePayload._flags; surfaced in Phase 3 review.
 */
export interface AmbiguityFlag {
  id: string;
  field: string;
  description: string;
  userStatement: string;
  flaggedAt: string;
  resolved: boolean;
}

/**
 * CaptureVerificationItem — one entry in Claude's self-assessment of requirement capture.
 * For every significant requirement mentioned in the intake conversation, Claude records
 * what was heard and how (or whether) it was captured via a tool call.
 * Stored in IntakePayload._captureVerification; surfaced in Phase 3 review.
 */
export interface CaptureVerificationItem {
  /** Topic area (e.g., "constraints", "data retention", "safety guardrails") */
  area: string;
  /** What the user said about this area during the conversation */
  mentioned: string;
  /** How it was captured — tool name + field (e.g., "set_constraints.denied_actions"). Null if not captured. */
  capturedAs: string | null;
}

/**
 * PolicyQualityItem — Claude's quality assessment for one governance policy.
 * adequate=true means the policy contains specific, operational requirements.
 * adequate=false is a warning (not a blocker) — surfaced in Phase 3 for reviewer attention.
 * Stored in IntakePayload._policyQualityAssessment.
 */
export interface PolicyQualityItem {
  /** Exact name of the governance policy as captured */
  policyName: string;
  /** True if specific and operational; false if too abstract to be enforced */
  adequate: boolean;
  /** One-sentence rationale for the rating */
  reason: string;
}

/**
 * AgentType — functional classification of the agent being designed.
 * Derived via a small Haiku generateObject call immediately after Phase 1 form submit.
 *
 * automation      : Executes predefined workflows, process orchestration, no human-facing output
 * decision-support: Analyzes data and presents recommendations to human decision-makers
 * autonomous      : Takes consequential actions without human approval in the loop
 * data-access     : Queries, retrieves, summarizes data — read-only, no actuation
 */
export type AgentType = "automation" | "decision-support" | "autonomous" | "data-access";

/**
 * IntakeRiskTier — governance risk classification derived deterministically from EU AI Act mapping.
 *
 * low      ← "minimal-risk"    : Internal only, public/internal data, no regulated scope
 * medium   ← "limited-risk"   : Customer/partner-facing OR internal with confidential data
 * high     ← "high-risk"      : Customer-facing + PII/confidential, OR any regulated scope
 * critical ← "review-required": FINRA/SOX customer-facing, HIPAA, PCI-DSS, or regulated + external
 */
export type IntakeRiskTier = "low" | "medium" | "high" | "critical";

/**
 * IntakeClassification — computed immediately after Phase 1 context submit.
 * Stored in the intakeSessions row; drives conversation depth, domain gating, and blueprint quality.
 */
export interface IntakeClassification {
  agentType: AgentType;
  riskTier: IntakeRiskTier;
  /** 1–2 sentence explanation shown to the designer in the classification header */
  rationale: string;
}

export interface IntakePayload {
  identity?: {
    name?: string;
    description?: string;
    persona?: string;
    branding?: {
      display_name?: string;
      icon_url?: string;
      color_primary?: string;
      color_secondary?: string;
    };
  };
  capabilities?: {
    tools?: Array<{
      name: string;
      type: "api" | "function" | "mcp_server" | "plugin";
      description?: string;
      config?: Record<string, unknown>;
    }>;
    instructions?: string;
    knowledge_sources?: Array<{
      name: string;
      type: "file" | "database" | "api" | "vector_store";
      uri?: string;
    }>;
  };
  constraints?: {
    allowed_domains?: string[];
    denied_actions?: string[];
    max_tokens_per_response?: number;
    rate_limits?: {
      requests_per_minute?: number;
      requests_per_day?: number;
    };
  };
  governance?: {
    policies?: Array<{
      name: string;
      type: "safety" | "compliance" | "data_handling" | "access_control" | "audit";
      description?: string;
      rules?: string[];
    }>;
    audit?: {
      log_interactions?: boolean;
      retention_days?: number;
      pii_redaction?: boolean;
    };
  };

  // ── Internal metadata (underscore-prefixed, not part of the ABP) ───────────
  /** Ambiguity flags raised during the intake conversation */
  _flags?: AmbiguityFlag[];
  /** Capture verification produced by Claude at finalization */
  _captureVerification?: CaptureVerificationItem[];
  /** Policy quality assessment produced by Claude at finalization */
  _policyQualityAssessment?: PolicyQualityItem[];
}

/** Session recap data passed to ChatContainer for returning users */
export interface SessionRecap {
  agentName: string | null;
  filledDomains: string[];
  totalDomains: number;
  nextDomain: string | null;
  readinessScore: number;
  lastActiveAt: string | null;
}

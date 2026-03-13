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
}

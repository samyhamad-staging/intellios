/**
 * Compliance Starter Pack — pre-built policy template packs.
 *
 * Four packs covering the most common regulatory requirements for enterprise AI agents:
 *   - sr-11-7-core       — SR 11-7 Core Model Risk Management (4 policies)
 *   - eu-ai-act-high-risk — EU AI Act High-Risk AI System Compliance (5 policies)
 *   - gdpr-agent-data    — GDPR Agent Data Handling (3 policies)
 *   - ai-safety-baseline — AI Safety Baseline Best Practices (3 policies)
 *
 * Applying a pack creates real enterprise-scoped governance_policies rows.
 * Each policy can be edited after import. Each creation is audited.
 *
 * No DB calls or side effects — pure static data.
 */

import type { PolicyRule } from "./types";

export interface PolicyTemplate {
  name: string;
  type: "safety" | "compliance" | "data_handling" | "access_control" | "audit";
  description: string;
  /** Rules without id — ids are generated (UUIDs) at insert time */
  rules: Omit<PolicyRule, "id">[];
}

export interface TemplatePack {
  /** URL-safe slug, e.g. "sr-11-7-core" */
  id: string;
  name: string;
  description: string;
  /** Regulatory framework reference, e.g. "SR 11-7" */
  framework: string;
  policyCount: number;
  policies: PolicyTemplate[];
}

// ── SR 11-7 Core ─────────────────────────────────────────────────────────────

const SR_11_7_CORE: TemplatePack = {
  id: "sr-11-7-core",
  name: "SR 11-7 Core Model Risk Management",
  description:
    "Four foundational policies covering model documentation, data quality, ongoing monitoring, and change management — aligned to Federal Reserve / OCC SR 11-7 guidance for model risk management.",
  framework: "SR 11-7",
  policyCount: 4,
  policies: [
    {
      name: "SR 11-7 Model Documentation Policy",
      type: "compliance",
      description:
        "Ensures the agent's purpose, logic, and limitations are documented to the standard required by SR 11-7 Section III.A (Conceptual Soundness).",
      rules: [
        {
          field: "identity.description",
          operator: "exists",
          severity: "error",
          message: "Agent description is required for SR 11-7 model documentation (Section III.A — Conceptual Soundness)",
        },
        {
          field: "identity.description",
          operator: "matches",
          value: ".{100,}",
          severity: "warning",
          message: "Agent description should be substantive (≥100 characters) to satisfy SR 11-7 documentation requirements",
        },
        {
          field: "capabilities.instructions",
          operator: "exists",
          severity: "error",
          message: "System instructions (behavioral logic) must be documented (SR 11-7 §III.A — Model Logic Documentation)",
        },
        {
          field: "constraints.denied_actions",
          operator: "exists",
          severity: "warning",
          message: "Model limitations should be documented via denied actions (SR 11-7 §III.C — Model Limitations and Assumptions)",
        },
      ],
    },
    {
      name: "SR 11-7 Data Quality Assurance Policy",
      type: "data_handling",
      description:
        "Enforces data governance controls required by SR 11-7 Section III.B (Data Quality and Data Management).",
      rules: [
        {
          field: "governance.audit.log_interactions",
          operator: "equals",
          value: true,
          severity: "error",
          message: "Interaction logging must be enabled for data quality monitoring (SR 11-7 §III.B)",
        },
        {
          field: "governance.audit.pii_redaction",
          operator: "equals",
          value: true,
          severity: "warning",
          message: "PII redaction is recommended to protect data subject rights and support data quality standards",
        },
        {
          field: "governance.audit.retention_days",
          operator: "exists",
          severity: "warning",
          message: "Data retention period should be defined (SR 11-7 §III.B — Data Management)",
        },
      ],
    },
    {
      name: "SR 11-7 Ongoing Monitoring Policy",
      type: "audit",
      description:
        "Establishes the ongoing performance monitoring framework required by SR 11-7 Section III.D and the governance policy coverage required by Section V.A.",
      rules: [
        {
          field: "governance.audit.log_interactions",
          operator: "equals",
          value: true,
          severity: "error",
          message: "Interaction logging must be enabled for ongoing performance monitoring (SR 11-7 §III.D)",
        },
        {
          field: "governance.audit.retention_days",
          operator: "exists",
          severity: "warning",
          message: "Retention period should be set to support monitoring evidence retention (SR 11-7 §III.D)",
        },
        {
          field: "governance.policies",
          operator: "count_gte",
          value: 2,
          severity: "warning",
          message: "At least 2 governance policies are recommended for adequate risk coverage (SR 11-7 §V.A — Policies and Procedures)",
        },
      ],
    },
    {
      name: "SR 11-7 Model Change Management Policy",
      type: "compliance",
      description:
        "Ensures agents are properly categorized and attributed to support change management and model inventory requirements under SR 11-7.",
      rules: [
        {
          field: "metadata.tags",
          operator: "exists",
          severity: "warning",
          message: "Agent should be tagged for categorization and model inventory management",
        },
        {
          field: "identity.persona",
          operator: "exists",
          severity: "warning",
          message: "Agent persona should be documented to characterize model behavior for change management purposes",
        },
      ],
    },
  ],
};

// ── EU AI Act High-Risk ───────────────────────────────────────────────────────

const EU_AI_ACT_HIGH_RISK: TemplatePack = {
  id: "eu-ai-act-high-risk",
  name: "EU AI Act High-Risk AI System Compliance",
  description:
    "Five policies covering the technical and governance requirements for high-risk AI systems under EU AI Act (Regulation 2024/1689), Articles 9–15. Apply to agents classified as high-risk or review-required.",
  framework: "EU AI Act",
  policyCount: 5,
  policies: [
    {
      name: "EU AI Act Technical Documentation Policy",
      type: "compliance",
      description:
        "Ensures the agent meets EU AI Act Art. 11 technical documentation requirements before placement on the market or entry into service.",
      rules: [
        {
          field: "identity.description",
          operator: "exists",
          severity: "error",
          message: "Technical documentation (agent description) is required (EU AI Act Art. 11)",
        },
        {
          field: "identity.description",
          operator: "matches",
          value: ".{100,}",
          severity: "error",
          message: "Technical documentation must be substantive (≥100 characters) to satisfy EU AI Act Art. 11",
        },
        {
          field: "capabilities.instructions",
          operator: "exists",
          severity: "error",
          message: "System instructions are required for complete technical documentation (EU AI Act Art. 11)",
        },
        {
          field: "identity.persona",
          operator: "exists",
          severity: "warning",
          message: "Persona documentation is recommended to satisfy transparency information requirements (EU AI Act Art. 13)",
        },
      ],
    },
    {
      name: "EU AI Act Data Governance & Quality Policy",
      type: "data_handling",
      description:
        "Enforces data governance requirements for high-risk AI systems under EU AI Act Art. 10 (Data and Data Governance).",
      rules: [
        {
          field: "governance.audit.log_interactions",
          operator: "equals",
          value: true,
          severity: "error",
          message: "Interaction logging is required for data governance compliance (EU AI Act Art. 10)",
        },
        {
          field: "governance.audit.pii_redaction",
          operator: "equals",
          value: true,
          severity: "error",
          message: "PII redaction is required when processing personal data (EU AI Act Art. 10, GDPR Art. 5)",
        },
        {
          field: "governance.audit.retention_days",
          operator: "exists",
          severity: "error",
          message: "Data retention period must be defined (EU AI Act Art. 10 — data retention requirements)",
        },
      ],
    },
    {
      name: "EU AI Act Human Oversight Policy",
      type: "safety",
      description:
        "Ensures the agent implements the behavioral bounds required to enable effective human oversight under EU AI Act Art. 14.",
      rules: [
        {
          field: "constraints.denied_actions",
          operator: "exists",
          severity: "error",
          message: "Denied actions (behavioral bounds) are required to enable human oversight (EU AI Act Art. 14)",
        },
        {
          field: "constraints.denied_actions",
          operator: "count_gte",
          value: 2,
          severity: "warning",
          message: "At least 2 denied action constraints are recommended to adequately bound agent behavior (Art. 14)",
        },
        {
          field: "constraints.allowed_domains",
          operator: "exists",
          severity: "warning",
          message: "Allowed domains restriction is recommended to limit the agent's scope of operation (Art. 14)",
        },
      ],
    },
    {
      name: "EU AI Act Accuracy & Robustness Policy",
      type: "compliance",
      description:
        "Promotes accuracy and robustness requirements for high-risk AI systems under EU AI Act Art. 15.",
      rules: [
        {
          field: "capabilities.tools",
          operator: "count_lte",
          value: 10,
          severity: "warning",
          message: "Limiting tool count reduces error surface area and supports accuracy requirements (EU AI Act Art. 15)",
        },
        {
          field: "constraints.max_tokens_per_response",
          operator: "exists",
          severity: "warning",
          message: "Response length bounds are recommended to support output accuracy and consistency (Art. 15)",
        },
      ],
    },
    {
      name: "EU AI Act Logging & Monitoring Policy",
      type: "audit",
      description:
        "Enforces the automatic event logging requirements for high-risk AI systems under EU AI Act Art. 12.",
      rules: [
        {
          field: "governance.audit.log_interactions",
          operator: "equals",
          value: true,
          severity: "error",
          message: "Automatic interaction logging is required for high-risk AI systems (EU AI Act Art. 12)",
        },
        {
          field: "governance.audit.retention_days",
          operator: "exists",
          severity: "error",
          message: "Log retention period must be defined (EU AI Act Art. 12 — record-keeping requirements)",
        },
        {
          field: "governance.policies",
          operator: "count_gte",
          value: 3,
          severity: "warning",
          message: "A minimum of 3 governance policies is recommended for high-risk AI systems",
        },
      ],
    },
  ],
};

// ── GDPR Agent Data ───────────────────────────────────────────────────────────

const GDPR_AGENT_DATA: TemplatePack = {
  id: "gdpr-agent-data",
  name: "GDPR Agent Data Handling",
  description:
    "Three policies covering personal data minimisation, retention management, and data subject rights — aligned to GDPR (Regulation 2016/679) Articles 5, 13, and 17.",
  framework: "GDPR",
  policyCount: 3,
  policies: [
    {
      name: "GDPR Personal Data Minimisation Policy",
      type: "data_handling",
      description:
        "Enforces the data minimisation principle (GDPR Art. 5(1)(c)) — personal data must be adequate, relevant, and limited to what is necessary.",
      rules: [
        {
          field: "governance.audit.pii_redaction",
          operator: "equals",
          value: true,
          severity: "error",
          message: "PII redaction is required to enforce data minimisation (GDPR Art. 5(1)(c))",
        },
        {
          field: "constraints.denied_actions",
          operator: "exists",
          severity: "warning",
          message: "Denied actions should restrict unnecessary data collection to support GDPR data minimisation",
        },
        {
          field: "capabilities.knowledge_sources",
          operator: "not_includes_type",
          value: "database",
          severity: "warning",
          message: "Consider whether direct database access is necessary — limit data sources to the minimum required (GDPR Art. 5)",
        },
      ],
    },
    {
      name: "GDPR Data Retention Management Policy",
      type: "data_handling",
      description:
        "Enforces the storage limitation principle (GDPR Art. 5(1)(e)) — personal data must not be kept longer than necessary.",
      rules: [
        {
          field: "governance.audit.retention_days",
          operator: "exists",
          severity: "error",
          message: "Data retention period must be defined to comply with GDPR Art. 5(1)(e) storage limitation principle",
        },
        {
          field: "governance.audit.log_interactions",
          operator: "equals",
          value: true,
          severity: "error",
          message: "Interaction logging is required for GDPR accountability (Art. 5(2) — accountability principle)",
        },
      ],
    },
    {
      name: "GDPR Data Subject Rights Compliance Policy",
      type: "compliance",
      description:
        "Ensures the agent is designed to respect data subject rights including the right to information (Art. 13) and the right to erasure (Art. 17).",
      rules: [
        {
          field: "identity.description",
          operator: "exists",
          severity: "error",
          message: "Agent purpose must be documented to support privacy notice requirements (GDPR Art. 13 — Right to Information)",
        },
        {
          field: "constraints.denied_actions",
          operator: "exists",
          severity: "warning",
          message: "Denied actions should reflect data subject rights constraints (e.g., no permanent deletion without consent)",
        },
        {
          field: "governance.audit.pii_redaction",
          operator: "equals",
          value: true,
          severity: "warning",
          message: "PII redaction supports right to erasure compliance by preventing inadvertent retention (GDPR Art. 17)",
        },
      ],
    },
  ],
};

// ── AI Safety Baseline ────────────────────────────────────────────────────────

const AI_SAFETY_BASELINE: TemplatePack = {
  id: "ai-safety-baseline",
  name: "AI Safety Baseline",
  description:
    "Three foundational safety policies establishing behavioral bounds, output controls, and access controls for enterprise AI agents — applicable regardless of regulatory framework.",
  framework: "Best Practices",
  policyCount: 3,
  policies: [
    {
      name: "Agent Behavior Safety Policy",
      type: "safety",
      description:
        "Establishes minimum behavioral safety requirements for enterprise AI agents — explicit constraints, identity documentation, and audit logging.",
      rules: [
        {
          field: "constraints.denied_actions",
          operator: "exists",
          severity: "error",
          message: "Safety constraints (denied actions) are required for all enterprise AI agents",
        },
        {
          field: "constraints.denied_actions",
          operator: "count_gte",
          value: 3,
          severity: "warning",
          message: "At least 3 denied action constraints are recommended to establish a meaningful safety boundary",
        },
        {
          field: "governance.audit.log_interactions",
          operator: "equals",
          value: true,
          severity: "error",
          message: "All agent interactions must be logged to enable safety monitoring and incident response",
        },
        {
          field: "identity.description",
          operator: "exists",
          severity: "error",
          message: "Agent purpose must be documented before deployment — undocumented agents cannot be safely governed",
        },
      ],
    },
    {
      name: "Output Control Policy",
      type: "safety",
      description:
        "Ensures appropriate bounds are placed on agent output volume, scope, and rate to reduce risk of runaway behaviour or misuse.",
      rules: [
        {
          field: "constraints.max_tokens_per_response",
          operator: "exists",
          severity: "warning",
          message: "Response length limits are recommended to prevent runaway output generation",
        },
        {
          field: "constraints.allowed_domains",
          operator: "exists",
          severity: "warning",
          message: "Domain restrictions are recommended to limit the agent's scope to its intended use case",
        },
        {
          field: "constraints.rate_limits",
          operator: "exists",
          severity: "warning",
          message: "Rate limits are recommended to prevent misuse and protect downstream systems",
        },
      ],
    },
    {
      name: "Access Control & Authorization Policy",
      type: "access_control",
      description:
        "Ensures all agent capabilities (tools and knowledge sources) are explicitly declared and that access is auditable.",
      rules: [
        {
          field: "capabilities.tools",
          operator: "exists",
          severity: "warning",
          message: "All tools used by the agent should be explicitly declared (even if empty) for auditability",
        },
        {
          field: "capabilities.knowledge_sources",
          operator: "exists",
          severity: "warning",
          message: "All knowledge sources should be explicitly declared for access control auditability",
        },
        {
          field: "governance.audit.log_interactions",
          operator: "equals",
          value: true,
          severity: "error",
          message: "Interaction logging is required for access control auditing",
        },
      ],
    },
  ],
};

// ── Exports ───────────────────────────────────────────────────────────────────

export const TEMPLATE_PACKS: TemplatePack[] = [
  SR_11_7_CORE,
  EU_AI_ACT_HIGH_RISK,
  GDPR_AGENT_DATA,
  AI_SAFETY_BASELINE,
];

export function findTemplatePack(id: string): TemplatePack | undefined {
  return TEMPLATE_PACKS.find((p) => p.id === id);
}

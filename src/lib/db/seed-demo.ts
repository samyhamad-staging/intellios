/**
 * Demo seed script: creates a rich "Meridian Capital Group" enterprise demo scenario.
 *
 * Run with:
 *   npx tsx --env-file=.env.local src/lib/db/seed-demo.ts
 *
 * Idempotent — DELETEs all meridian-capital rows first, then INSERTs fresh data.
 * Safe to re-run from scratch each time.
 *
 * Demo scenario — 8 agents across all lifecycle stages for a fictional
 * financial services firm: Meridian Capital Group.
 *
 *   1. Customer Onboarding Assistant  → deployed (clean, model citizen)
 *   2. Loan Underwriting Analyst       → deployed (degraded, governance drift)
 *   3. Fraud Detection Monitor         → deployed (high-volume, critical risk)
 *   4. Wealth Management Advisor       → approved, ready to deploy
 *   5. Regulatory Reporting Agent      → deployed (low volume, fully compliant)
 *   6. Customer Service Triage         → deployed (moderate volume)
 *   7. Trade Confirmation Assistant    → in_review (pending compliance sign-off)
 *   8. Credit Risk Scorer              → draft (early-stage, partially configured)
 */

import { db } from "./index";
import {
  users,
  intakeSessions,
  agentBlueprints,
  auditLog,
  deploymentHealth,
  blueprintTestCases,
  blueprintTestRuns,
  blueprintQualityScores,
  governancePolicies,
  enterpriseSettings,
  systemHealthSnapshots,
  intelligenceBriefings,
  agentTelemetry,
  runtimeViolations,
  qualityTrends,
  portfolioSnapshots,
} from "./schema";
import { eq } from "drizzle-orm";

// ─── Constants ────────────────────────────────────────────────────────────────

const E = "meridian-capital"; // enterprise_id

const USERS = {
  architect: "sarah.chen@meridian.com",
  reviewer:  "james.wright@meridian.com",
  officer:   "priya.sharma@meridian.com",
  admin:     "michael.torres@meridian.com",
  viewer:    "emma.davidson@meridian.com",
};

const DEMO_PASSWORD_HASH = "$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p4G4XY7t2l7i2TrUZh87.Fzi";

// Hardcoded UUIDs — stable across re-runs
const S = {
  COA: "10000000-1000-0000-0000-000000000001", // Customer Onboarding Assistant
  LUA: "10000000-1000-0000-0000-000000000002", // Loan Underwriting Analyst
  FDM: "10000000-1000-0000-0000-000000000003", // Fraud Detection Monitor
  WMA: "10000000-1000-0000-0000-000000000004", // Wealth Management Advisor
  RRA: "10000000-1000-0000-0000-000000000005", // Regulatory Reporting Agent
  CST: "10000000-1000-0000-0000-000000000006", // Customer Service Triage
  TCA: "10000000-1000-0000-0000-000000000007", // Trade Confirmation Assistant
  CRS: "10000000-1000-0000-0000-000000000008", // Credit Risk Scorer
};

const BP = {
  COA: "20000000-1000-0000-0000-000000000001",
  LUA: "20000000-1000-0000-0000-000000000002",
  FDM: "20000000-1000-0000-0000-000000000003",
  WMA: "20000000-1000-0000-0000-000000000004",
  RRA: "20000000-1000-0000-0000-000000000005",
  CST: "20000000-1000-0000-0000-000000000006",
  TCA: "20000000-1000-0000-0000-000000000007",
  CRS: "20000000-1000-0000-0000-000000000008",
};

const AG = {
  COA: "30000000-1000-0000-0000-000000000001",
  LUA: "30000000-1000-0000-0000-000000000002",
  FDM: "30000000-1000-0000-0000-000000000003",
  WMA: "30000000-1000-0000-0000-000000000004",
  RRA: "30000000-1000-0000-0000-000000000005",
  CST: "30000000-1000-0000-0000-000000000006",
  TCA: "30000000-1000-0000-0000-000000000007",
  CRS: "30000000-1000-0000-0000-000000000008",
};

const POL = {
  PII:      "40000000-1000-0000-0000-000000000001", // PII Data Handling Policy
  SR117:    "40000000-1000-0000-0000-000000000002", // SR 11-7 Model Risk Policy
  SAFETY:   "40000000-1000-0000-0000-000000000003", // Customer Communication Safety
  ACCESS:   "40000000-1000-0000-0000-000000000004", // Access Control Enforcement
  ESCALATE: "40000000-1000-0000-0000-000000000005", // High-Risk Escalation Protocol
};

// User UUIDs — stable for FK references
const UID = {
  architect: "90000000-1000-0000-0000-000000000001",
  reviewer:  "90000000-1000-0000-0000-000000000002",
  officer:   "90000000-1000-0000-0000-000000000003",
  admin:     "90000000-1000-0000-0000-000000000004",
  viewer:    "90000000-1000-0000-0000-000000000005",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function hoursAgo(n: number): Date {
  const d = new Date();
  d.setHours(d.getHours() - n);
  return d;
}

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

/** ISO date string for week-start (Monday) of N weeks ago */
function weekStartAgo(weeksAgo: number): string {
  const d = new Date();
  const day = d.getDay(); // 0=Sun
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((day + 6) % 7) - weeksAgo * 7);
  return monday.toISOString().slice(0, 10);
}

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ─── ABP factory ──────────────────────────────────────────────────────────────

function makeAbp(opts: {
  id: string;
  name: string;
  description: string;
  persona: string;
  instructions: string;
  tools: unknown[];
  knowledgeSources?: unknown[];
  allowedDomains?: string[];
  deniedActions: string[];
  policies: unknown[];
  audit: { log_interactions: boolean; retention_days: number; pii_redaction?: boolean };
  ownerEmail: string;
  businessUnit: string;
  costCenter: string;
  dataClassification: string;
  deploymentEnv: string;
  enterpriseId: string;
  createdBy: string;
  status: string;
  tags?: string[];
}) {
  return {
    version: "1.2.0",
    metadata: {
      id: opts.id,
      created_at: new Date().toISOString(),
      created_by: opts.createdBy,
      status: opts.status,
      enterprise_id: opts.enterpriseId,
      tags: opts.tags ?? [],
    },
    identity: {
      name: opts.name,
      description: opts.description,
      persona: opts.persona,
    },
    capabilities: {
      tools: opts.tools,
      instructions: opts.instructions,
      knowledge_sources: opts.knowledgeSources ?? [],
    },
    constraints: {
      allowed_domains: opts.allowedDomains,
      denied_actions: opts.deniedActions,
    },
    governance: {
      policies: opts.policies,
      audit: opts.audit,
    },
    ownership: {
      businessUnit: opts.businessUnit,
      ownerEmail: opts.ownerEmail,
      costCenter: opts.costCenter,
      deploymentEnvironment: opts.deploymentEnv,
      dataClassification: opts.dataClassification,
    },
    execution: {
      observability: {
        metricsEnabled: true,
        logLevel: "info",
        samplingRate: 1.0,
        telemetryEndpoint: null,
      },
      runtimeConstraints: {
        maxTokensPerInteraction: 4096,
        maxConcurrentSessions: 50,
        circuitBreakerThreshold: 0.1,
        sessionTimeoutMinutes: 30,
      },
      feedback: {
        alertWebhook: "https://hooks.meridian.com/intellios-alerts",
        escalationEmail: "ai-ops@meridian.com",
      },
    },
  };
}

function validReport(policyIds: string[]) {
  return {
    valid: true,
    violations: [],
    policyCount: policyIds.length,
    evaluatedPolicyIds: policyIds,
    generatedAt: new Date().toISOString(),
  };
}

function invalidReport(policyIds: string[], violations: unknown[]) {
  return {
    valid: false,
    violations,
    policyCount: policyIds.length,
    evaluatedPolicyIds: policyIds,
    generatedAt: new Date().toISOString(),
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function seedDemo() {
  console.log("\n  Seeding Meridian Capital Group demo data...\n");

  // ── 0. Purge existing meridian-capital data ────────────────────────────────
  console.log("Step 0 — Purging existing meridian-capital data");

  // Delete in dependency order (children first)
  const bpIds = [BP.COA, BP.LUA, BP.FDM, BP.WMA, BP.RRA, BP.CST, BP.TCA, BP.CRS];
  const agIds = [AG.COA, AG.LUA, AG.FDM, AG.WMA, AG.RRA, AG.CST, AG.TCA, AG.CRS];
  const sessionIds = [S.COA, S.LUA, S.FDM, S.WMA, S.RRA, S.CST, S.TCA, S.CRS];
  const polIds = [POL.PII, POL.SR117, POL.SAFETY, POL.ACCESS, POL.ESCALATE];

  // Runtime violations reference policies — delete before policies
  for (const agId of agIds) {
    await db.delete(runtimeViolations).where(eq(runtimeViolations.agentId, agId));
    await db.delete(agentTelemetry).where(eq(agentTelemetry.agentId, agId));
    await db.delete(qualityTrends).where(eq(qualityTrends.agentId, agId));
    await db.delete(deploymentHealth).where(eq(deploymentHealth.agentId, agId));
    await db.delete(blueprintTestCases).where(eq(blueprintTestCases.agentId, agId));
  }
  for (const bpId of bpIds) {
    await db.delete(blueprintTestRuns).where(eq(blueprintTestRuns.blueprintId, bpId));
    await db.delete(blueprintQualityScores).where(eq(blueprintQualityScores.blueprintId, bpId));
  }
  await db.delete(portfolioSnapshots).where(eq(portfolioSnapshots.enterpriseId, E));
  await db.delete(auditLog).where(eq(auditLog.enterpriseId, E));
  await db.delete(intelligenceBriefings).where(eq(intelligenceBriefings.enterpriseId, E));
  await db.delete(systemHealthSnapshots).where(eq(systemHealthSnapshots.enterpriseId, E));
  // Blueprints reference sessions via sessionId — delete blueprints first
  for (const bpId of bpIds) {
    await db.delete(agentBlueprints).where(eq(agentBlueprints.id, bpId));
  }
  for (const sId of sessionIds) {
    await db.delete(intakeSessions).where(eq(intakeSessions.id, sId));
  }
  for (const polId of polIds) {
    await db.delete(governancePolicies).where(eq(governancePolicies.id, polId));
  }
  await db.delete(enterpriseSettings).where(eq(enterpriseSettings.enterpriseId, E));
  // Delete existing meridian users
  for (const email of Object.values(USERS)) {
    await db.delete(users).where(eq(users.email, email));
  }
  console.log("  purged all meridian-capital rows\n");

  // ── 1. Users ──────────────────────────────────────────────────────────────
  console.log("Step 1 — Creating users");
  const userDefs = [
    { id: UID.architect, email: USERS.architect, name: "Sarah Chen",       role: "architect",          enterpriseId: E },
    { id: UID.reviewer,  email: USERS.reviewer,  name: "James Wright",     role: "reviewer",           enterpriseId: E },
    { id: UID.officer,   email: USERS.officer,   name: "Priya Sharma",     role: "compliance_officer", enterpriseId: E },
    { id: UID.admin,     email: USERS.admin,     name: "Michael Torres",   role: "admin",              enterpriseId: E },
    { id: UID.viewer,    email: USERS.viewer,    name: "Emma Davidson",    role: "viewer",             enterpriseId: E },
  ];
  for (const u of userDefs) {
    await db.insert(users).values({ ...u, passwordHash: DEMO_PASSWORD_HASH });
    console.log(`  added user ${u.email} (${u.role})`);
  }

  // ── 2. Enterprise settings ────────────────────────────────────────────────
  console.log("\nStep 2 — Enterprise settings");
  await db.insert(enterpriseSettings).values({
    enterpriseId: E,
    settings: {
      sla: { reviewWarningHours: 48, reviewBreachHours: 72 },
      governance: { requireTestsBeforeApproval: true },
      approvalChain: [
        { role: "reviewer",           label: "Senior Reviewer" },
        { role: "compliance_officer", label: "Compliance Officer" },
        { role: "admin",              label: "Final Sign-off" },
      ],
      notifications: { emailEnabled: true },
      awareness: {
        qualityIndexThreshold: 75,
        validityRateThreshold: 0.85,
        reviewQueueThreshold: 5,
      },
      deploymentTargets: { agentcore: null },
      branding: {
        displayName: "Meridian Capital Group",
        logoUrl: "https://assets.meridian.com/intellios-logo.png",
      },
    },
    updatedBy: USERS.admin,
  });
  console.log("  added enterprise settings");

  // ── 3. Governance policies ─────────────────────────────────────────────────
  console.log("\nStep 3 — Governance policies");
  const polDefs = [
    {
      id: POL.PII,
      name: "PII Data Handling Policy",
      type: "data_handling",
      description: "GLBA and CCPA compliance requirements for agents that process personally identifiable information. Ensures PII redaction is active and data handling policies are applied.",
      rules: [
        { id: "pii-01", field: "governance.policies[*].type", operator: "includes_type", value: "data_handling", severity: "error",   message: "Agent must include a data_handling governance policy." },
        { id: "pii-02", field: "governance.audit.pii_redaction",                          operator: "equals",       value: true,           severity: "error",   message: "PII redaction must be enabled (governance.audit.pii_redaction = true)." },
      ],
    },
    {
      id: POL.SR117,
      name: "SR 11-7 Model Risk Policy",
      type: "compliance",
      description: "Federal Reserve SR 11-7 Model Risk Management. Requires full interaction logging and minimum 365-day audit retention for model validation and examination readiness.",
      rules: [
        { id: "sr117-01", field: "governance.audit.log_interactions", operator: "equals", value: true, severity: "error",   message: "Interaction logging must be enabled (SR 11-7 requires full audit trail)." },
        { id: "sr117-02", field: "governance.audit.retention_days",   operator: "gte",    value: 365,  severity: "error",   message: "Audit retention must be at least 365 days per SR 11-7 requirements." },
      ],
    },
    {
      id: POL.SAFETY,
      name: "Customer Communication Safety",
      type: "safety",
      description: "Safety guardrails for all customer-facing agents. Customer-named agents must not have unapproved send_email tool capability.",
      rules: [
        { id: "safety-01", field: "identity.name",            operator: "not_contains", value: "Customer",   severity: "warning", message: "Customer-facing agents should have escalation tools, not direct email capabilities." },
        { id: "safety-02", field: "constraints.denied_actions", operator: "exists",                          severity: "error",   message: "All customer-facing agents must have an explicit denied_actions list." },
        { id: "safety-03", field: "identity.description",      operator: "exists",                           severity: "error",   message: "Agent must have a description for model inventory and SR 11-7 documentation." },
      ],
    },
    {
      id: POL.ACCESS,
      name: "Access Control Enforcement",
      type: "access_control",
      description: "All production agents must define allowed_domains to limit operational scope. Empty allowed_domains is a critical misconfiguration.",
      rules: [
        { id: "access-01", field: "constraints.allowed_domains", operator: "not_empty", severity: "error", message: "allowed_domains must not be empty. Define explicit operational domains for this agent." },
      ],
    },
    {
      id: POL.ESCALATE,
      name: "High-Risk Escalation Protocol",
      type: "audit",
      description: "Agents classified as high or critical risk must retain audit logs for a minimum of 730 days (2 years) to support regulatory examinations and incident investigations.",
      rules: [
        { id: "escalate-01", field: "governance.audit.retention_days", operator: "gte", value: 730, severity: "error", message: "High/critical risk agents require minimum 730-day audit retention." },
      ],
    },
  ] as const;

  for (const pol of polDefs) {
    await db.insert(governancePolicies).values({
      ...pol,
      enterpriseId: E,
      policyVersion: 1,
    });
    console.log(`  added policy "${pol.name}"`);
  }

  const ALL_POLICY_IDS = [POL.PII, POL.SR117, POL.SAFETY, POL.ACCESS, POL.ESCALATE];

  // ── 4. Intake sessions ─────────────────────────────────────────────────────
  console.log("\nStep 4 — Intake sessions");
  const sessionDefs = [
    {
      id: S.COA,
      label: "Customer Onboarding Assistant",
      daysBack: 45,
      riskTier: "medium",
      payload: {
        businessObjective: "Automate KYC collection and account setup for new retail customers, reducing onboarding time from 3 days to under 4 hours.",
        targetUsers: "New retail customers opening checking, savings, or investment accounts",
        dataInputs: "Government ID documents, proof of address, employment verification, beneficial ownership declarations",
        expectedOutputs: "Completed KYC package, CRM record creation, welcome email trigger, account setup confirmation",
        regulatoryContext: ["BSA/AML", "GLBA", "CCPA", "CIP Rule (31 CFR 1020.220)"],
        riskTolerance: "medium",
      },
    },
    {
      id: S.LUA,
      label: "Loan Underwriting Analyst",
      daysBack: 38,
      riskTier: "high",
      payload: {
        businessObjective: "Automate initial credit analysis for consumer and small business loan applications, reducing underwriter workload by 60%.",
        targetUsers: "Internal underwriting team in Consumer Lending division",
        dataInputs: "Credit bureau reports (Equifax/Experian/TransUnion), tax returns, bank statements, business financials",
        expectedOutputs: "Credit risk score, policy rule analysis, underwriter recommendation memo, exception flags",
        regulatoryContext: ["ECOA", "FCRA", "SR 11-7", "OCC Guidance on Model Risk"],
        riskTolerance: "high",
      },
    },
    {
      id: S.FDM,
      label: "Fraud Detection Monitor",
      daysBack: 60,
      riskTier: "critical",
      payload: {
        businessObjective: "Real-time transaction monitoring to detect and alert on fraudulent activity across card, ACH, and wire transfer channels.",
        targetUsers: "Fraud Operations Center (24/7 team)",
        dataInputs: "Real-time transaction stream, historical transaction patterns, device fingerprints, velocity checks",
        expectedOutputs: "Fraud risk scores, alert notifications, case file creation, automatic holds on high-confidence fraud",
        regulatoryContext: ["BSA/AML", "Regulation E", "VISA/Mastercard network rules", "NACHA"],
        riskTolerance: "critical",
      },
    },
    {
      id: S.WMA,
      label: "Wealth Management Advisor",
      daysBack: 30,
      riskTier: "high",
      payload: {
        businessObjective: "Provide personalized investment analysis and portfolio rebalancing recommendations for HNW clients under advisor supervision.",
        targetUsers: "Wealth management advisors and their clients (>$500K AUM)",
        dataInputs: "Client risk profile, portfolio holdings, market data feeds, macroeconomic indicators",
        expectedOutputs: "Rebalancing recommendations, investment thesis summaries, compliance disclosures, client reports",
        regulatoryContext: ["Investment Advisers Act", "SEC Regulation BI", "FINRA Rule 4512"],
        riskTolerance: "high",
      },
    },
    {
      id: S.RRA,
      label: "Regulatory Reporting Agent",
      daysBack: 55,
      riskTier: "medium",
      payload: {
        businessObjective: "Automate generation and pre-filing review of mandatory regulatory reports for FINRA, SEC, and federal banking regulators.",
        targetUsers: "Regulatory Compliance team, CFO office",
        dataInputs: "General ledger data, trade blotter, customer account data, prior period filings",
        expectedOutputs: "Draft FOCUS reports, Call Reports, SAR narratives, filing deadline alerts",
        regulatoryContext: ["FINRA Rule 4524", "SEC Rule 17a-5", "31 CFR Part 1020 (SARs)"],
        riskTolerance: "medium",
      },
    },
    {
      id: S.CST,
      label: "Customer Service Triage",
      daysBack: 50,
      riskTier: "low",
      payload: {
        businessObjective: "Intelligent routing and initial response drafting for inbound customer service inquiries across email, chat, and phone transcripts.",
        targetUsers: "Customer service representatives and operations team",
        dataInputs: "Customer inquiry text, CRM history, account status, product catalog",
        expectedOutputs: "Category classification, priority score, draft response, escalation routing decision",
        regulatoryContext: ["UDAAP", "CFPB complaint management guidelines"],
        riskTolerance: "low",
      },
    },
    {
      id: S.TCA,
      label: "Trade Confirmation Assistant",
      daysBack: 14,
      riskTier: "medium",
      payload: {
        businessObjective: "Generate and dispatch trade confirmation documents to counterparties within T+1 settlement requirements.",
        targetUsers: "Operations/settlements team, institutional sales desk",
        dataInputs: "Trade blotter records, counterparty details, instrument specifications",
        expectedOutputs: "Formatted trade confirmation documents, dispatch acknowledgments, exception reports",
        regulatoryContext: ["SEC Rule 10b-10", "FINRA Rule 4311", "DTC settlement requirements"],
        riskTolerance: "medium",
      },
    },
    {
      id: S.CRS,
      label: "Credit Risk Scorer",
      daysBack: 5,
      riskTier: "high",
      payload: {
        businessObjective: "Automated credit risk assessment pipeline for commercial lending portfolio, enabling same-day credit decisions for sub-$1M commercial loans.",
        targetUsers: "Commercial lending team, credit committee",
        dataInputs: "Business credit reports, financial statements, industry data, collateral appraisals",
        expectedOutputs: "Credit risk grade, probability of default estimate, recommended loan terms, exception memo",
        regulatoryContext: ["SR 11-7", "OCC Credit Risk Management", "ECOA"],
        riskTolerance: "high",
      },
    },
  ];

  for (const s of sessionDefs) {
    await db.insert(intakeSessions).values({
      id: s.id,
      enterpriseId: E,
      createdBy: USERS.architect,
      status: "completed",
      intakePayload: s.payload,
      intakeContext: {
        deploymentType: "internal",
        dataSensitivity: "regulated",
        regulatoryScope: (s.payload.regulatoryContext as string[]),
      },
      riskTier: s.riskTier,
      agentType: "automation",
      expertiseLevel: "adaptive",
      createdAt: daysAgo(s.daysBack),
      updatedAt: daysAgo(s.daysBack),
    });
    console.log(`  added session "${s.label}"`);
  }

  // ── 5. Agent blueprints ────────────────────────────────────────────────────
  console.log("\nStep 5 — Agent blueprints");

  // 5-1. Customer Onboarding Assistant (deployed, clean, model citizen)
  {
    const abp = makeAbp({
      id: BP.COA,
      name: "Customer Onboarding Assistant",
      description: "Guides new retail customers through the complete KYC and account setup process. Collects and verifies identity documents, populates CRM records, and triggers account activation.",
      persona: "Professional, patient, and reassuring. Uses clear language to explain documentation requirements. Sensitive to customer privacy concerns. Celebrates successful onboarding milestones.",
      instructions: `You are Meridian Capital Group's Customer Onboarding Assistant. Your mission is to make the account opening process as smooth and compliant as possible for new customers.

BEHAVIOR GUIDELINES:
- Greet customers warmly and explain the onboarding process upfront (expected time, documents required)
- Collect identity documents in the required order: government-issued ID → proof of address → tax identification
- For business accounts, also collect beneficial ownership declarations (CIP Rule)
- Use document_verification to validate each document before proceeding to the next step
- Update the CRM record incrementally as each step completes — do not wait until the end
- If a document fails verification, explain clearly what is wrong and what is needed
- Trigger email notifications at key milestones: intake started, documents received, account approved
- Never store raw document images — extract only required data fields

REGULATORY COMPLIANCE:
- BSA/AML: Flag any customer on OFAC SDN list to compliance immediately
- GLBA: Deliver privacy notice before collecting any personal information
- CIP Rule: Verify minimum 4 identity elements before creating account

SCOPE: Identity verification, document collection, CRM data entry, account setup initiation, customer communication
OUT OF SCOPE: Credit decisions, investment advice, loan applications, account modifications post-activation`,
      tools: [
        { name: "document_verification", type: "api",      description: "Submit identity documents to the automated verification pipeline. Returns pass/fail with extracted data fields." },
        { name: "crm_update",            type: "api",      description: "Create or update customer records in the core CRM system with verified identity and account preferences." },
        { name: "email_notifications",   type: "function", description: "Send transactional notifications to customers at onboarding milestones." },
      ],
      knowledgeSources: [
        { name: "KYC Requirements Playbook", type: "database",     uri: "db://meridian-kyc-requirements" },
        { name: "Country Risk Matrix",        type: "vector_store", uri: "vs://country-risk-matrix-prod" },
        { name: "Product Eligibility Rules",  type: "api",         uri: "https://policy.meridian.com/api/eligibility" },
      ],
      allowedDomains: ["customer-onboarding", "kyc", "account-setup", "document-verification"],
      deniedActions: ["approve_credit", "modify_existing_accounts", "access_other_customer_data", "override_compliance_flags"],
      policies: [
        { name: "PII Data Handling",     type: "data_handling", description: "GLBA/CCPA — PII redacted from logs, privacy notice required." },
        { name: "SR 11-7 Documentation", type: "compliance",    description: "Full interaction logging for model risk examination readiness." },
        { name: "Onboarding Safety",     type: "safety",        description: "Block misleading information; escalate OFAC/compliance flags." },
      ],
      audit: { log_interactions: true, retention_days: 365, pii_redaction: true },
      ownerEmail: USERS.architect,
      businessUnit: "Retail Banking — Customer Experience",
      costCenter: "RBCE-0042",
      dataClassification: "regulated",
      deploymentEnv: "production",
      enterpriseId: E,
      createdBy: USERS.architect,
      status: "deployed",
      tags: ["customer-facing", "onboarding", "kyc", "production", "compliant"],
    });

    await db.insert(agentBlueprints).values({
      id: BP.COA, agentId: AG.COA, version: "1.2.0",
      name: "Customer Onboarding Assistant", enterpriseId: E, sessionId: S.COA,
      tags: ["customer-facing", "onboarding", "kyc", "production", "compliant"],
      abp, status: "deployed", refinementCount: "4",
      validationReport: validReport(ALL_POLICY_IDS),
      baselineValidationReport: validReport(ALL_POLICY_IDS),
      governanceDrift: { status: "clean", newViolations: [], checkedAt: hoursAgo(4).toISOString() },
      reviewedBy: USERS.officer,
      reviewComment: "Exceptional blueprint. Full PII controls, comprehensive instructions, well-scoped denied actions. Approved with commendation. This sets the standard.",
      reviewedAt: daysAgo(20),
      createdBy: USERS.architect,
      currentApprovalStep: 3,
      approvalProgress: [
        { role: "reviewer",           label: "Senior Reviewer",   approvedBy: USERS.reviewer, approvedAt: daysAgo(22).toISOString(), comment: "Comprehensive instructions, excellent scope definition, clean governance. Forwarding to compliance." },
        { role: "compliance_officer", label: "Compliance Officer", approvedBy: USERS.officer,  approvedAt: daysAgo(21).toISOString(), comment: "GLBA privacy notice flow confirmed. OFAC escalation path verified. PII redaction active. Approved." },
        { role: "admin",              label: "Final Sign-off",     approvedBy: USERS.admin,    approvedAt: daysAgo(20).toISOString(), comment: "Approved for production deployment to AgentCore." },
      ],
      deploymentTarget: "agentcore",
      deploymentMetadata: {
        agentId:         "MCG-ONBOARD-01",
        agentArn:        "arn:aws:bedrock:us-east-1:921473850264:agent/MCG-ONBOARD-01",
        region:          "us-east-1",
        foundationModel: "anthropic.claude-3-5-haiku-20241022-v1:0",
        agentVersion:    "2",
        deployedAt:      daysAgo(18).toISOString(),
        deployedBy:      USERS.admin,
      },
      nextReviewDue: daysFromNow(90),
      lastPeriodicReviewAt: daysAgo(5),
      createdAt: daysAgo(45), updatedAt: daysAgo(18),
    });
    console.log("  added blueprint: Customer Onboarding Assistant (deployed/clean)");
  }

  // 5-2. Loan Underwriting Analyst (deployed, degraded, governance drift)
  {
    const abp = makeAbp({
      id: BP.LUA,
      name: "Loan Underwriting Analyst",
      description: "Analyzes consumer and small business loan applications against Meridian's credit policy rules. Produces structured underwriter memos with risk scores and policy exception flags.",
      persona: "Analytical and evidence-based. Presents findings with supporting data. Flags ambiguities rather than making unsupported assumptions. Uses financial industry terminology appropriate for internal underwriters.",
      instructions: `You are Meridian Capital Group's Loan Underwriting Analyst. You assist the underwriting team by analyzing loan applications and producing structured credit assessments.

BEHAVIOR GUIDELINES:
- Pull credit bureau data for all three bureaus; flag significant discrepancies between bureaus
- Apply Meridian's credit policy matrix: minimum 640 FICO for standard loans, 580 for FHA-eligible products
- Identify all policy exceptions and flag them explicitly with severity (minor/major/critical)
- Calculate DTI, LTV, and DSC ratios; compare against policy limits
- Generate underwriter memo in standard format: summary → risk factors → policy exceptions → recommendation
- Never make final credit decisions — your output is advisory; a licensed underwriter must approve

REGULATORY COMPLIANCE:
- ECOA: Never consider race, religion, national origin, sex, marital status, age in analysis
- FCRA: Only access credit data for legitimate permissible purpose (credit application)
- SR 11-7: All model outputs must be logged with full input/output for model validation

SCOPE: Credit analysis, policy rule evaluation, DTI/LTV calculation, exception flagging, underwriter memo generation
OUT OF SCOPE: Final credit approval/denial, rate setting, loan pricing, customer communication`,
      tools: [
        { name: "credit_bureau_api",    type: "api",      description: "Pull tri-merge credit report from Equifax, Experian, and TransUnion." },
        { name: "risk_scoring_model",   type: "function", description: "Apply Meridian's proprietary risk scoring model to application data." },
        { name: "document_analysis",    type: "api",      description: "Extract and validate financial data from uploaded tax returns, bank statements, and financial statements." },
      ],
      knowledgeSources: [
        { name: "Credit Policy Manual", type: "database",     uri: "db://meridian-credit-policy-v4" },
        { name: "Exception History",    type: "vector_store", uri: "vs://underwriting-exceptions-prod" },
      ],
      // Intentionally empty allowed_domains to trigger governance drift violation
      allowedDomains: [],
      deniedActions: ["approve_or_deny_application", "communicate_with_applicant", "pull_credit_without_application", "modify_application_data"],
      policies: [
        { name: "SR 11-7 Model Documentation", type: "compliance",    description: "Full logging required for model risk management examination." },
        { name: "PII Data Handling",            type: "data_handling", description: "FCRA/GLBA — credit data access controls and retention." },
        { name: "Credit Access Controls",       type: "access_control", description: "Restrict credit bureau access to active application context." },
      ],
      audit: { log_interactions: true, retention_days: 730, pii_redaction: true },
      ownerEmail: USERS.architect,
      businessUnit: "Consumer Lending — Underwriting",
      costCenter: "CLEN-0117",
      dataClassification: "regulated",
      deploymentEnv: "production",
      enterpriseId: E,
      createdBy: USERS.architect,
      status: "deployed",
      tags: ["underwriting", "credit", "internal", "high-risk"],
    });

    const loanViolation = {
      policyId: POL.ACCESS,
      policyName: "Access Control Enforcement",
      ruleId: "access-01",
      field: "constraints.allowed_domains",
      operator: "not_empty",
      severity: "error",
      message: "allowed_domains must not be empty. Define explicit operational domains for this agent.",
      suggestion: "Add allowed_domains: ['credit-underwriting', 'loan-analysis', 'risk-assessment'] to the constraints section.",
    };

    await db.insert(agentBlueprints).values({
      id: BP.LUA, agentId: AG.LUA, version: "1.1.0",
      name: "Loan Underwriting Analyst", enterpriseId: E, sessionId: S.LUA,
      tags: ["underwriting", "credit", "internal", "high-risk"],
      abp, status: "deployed", refinementCount: "2",
      validationReport: invalidReport([POL.PII, POL.SR117, POL.ACCESS], [loanViolation]),
      baselineValidationReport: validReport([POL.PII, POL.SR117, POL.ACCESS]),
      governanceDrift: {
        status: "drifted",
        newViolations: [
          { field: "constraints.allowed_domains", message: "allowed_domains must not be empty", severity: "error" },
        ],
        checkedAt: hoursAgo(2).toISOString(),
      },
      reviewedBy: USERS.officer,
      reviewComment: "Approved with condition: architect must add allowed_domains before next review cycle.",
      reviewedAt: daysAgo(25),
      createdBy: USERS.architect,
      currentApprovalStep: 3,
      approvalProgress: [
        { role: "reviewer",           label: "Senior Reviewer",   approvedBy: USERS.reviewer, approvedAt: daysAgo(27).toISOString(), comment: "Sound logic. Monitoring latency — model inference can be slow. Forwarding." },
        { role: "compliance_officer", label: "Compliance Officer", approvedBy: USERS.officer,  approvedAt: daysAgo(26).toISOString(), comment: "ECOA exclusions verified. SR 11-7 logging confirmed. Conditional approval — allowed_domains must be added." },
        { role: "admin",              label: "Final Sign-off",     approvedBy: USERS.admin,    approvedAt: daysAgo(25).toISOString(), comment: "Deployed with open remediation action on allowed_domains." },
      ],
      deploymentTarget: "agentcore",
      deploymentMetadata: {
        agentId:         "MCG-UNDERWRITE-01",
        agentArn:        "arn:aws:bedrock:us-east-1:921473850264:agent/MCG-UNDERWRITE-01",
        region:          "us-east-1",
        foundationModel: "anthropic.claude-3-5-sonnet-20241022-v2:0",
        agentVersion:    "1",
        deployedAt:      daysAgo(23).toISOString(),
        deployedBy:      USERS.admin,
      },
      nextReviewDue: daysFromNow(30),
      lastPeriodicReviewAt: daysAgo(30),
      createdAt: daysAgo(38), updatedAt: daysAgo(2),
    });
    console.log("  added blueprint: Loan Underwriting Analyst (deployed/degraded+drift)");
  }

  // 5-3. Fraud Detection Monitor (deployed, high-volume, critical risk)
  {
    const abp = makeAbp({
      id: BP.FDM,
      name: "Fraud Detection Monitor",
      description: "Real-time transaction monitoring across card, ACH, and wire transfer channels. Generates fraud risk scores, dispatches alerts to the Fraud Operations Center, and initiates automatic holds on critical-confidence fraud events.",
      persona: "Precise, fast, and decisive. Uses quantified confidence levels. Escalates immediately when evidence is strong. Documents reasoning trail for every alert.",
      instructions: `You are Meridian Capital Group's Fraud Detection Monitor. You operate 24/7 in the Fraud Operations Center, analyzing transaction events in real time.

BEHAVIOR GUIDELINES:
- Score every flagged transaction on a 0–100 fraud confidence scale with explicit evidence
- For scores ≥ 85 (Critical): auto-initiate account hold via alert_dispatch; notify FOC immediately
- For scores 60–84 (High): dispatch alert to FOC queue; recommend hold action for human review
- For scores 40–59 (Medium): create case file; add to monitoring queue
- For scores < 40 (Low): log and continue monitoring; no action required
- Always log the specific signals that drove the score: velocity, geolocation, device, behavior pattern
- Correlate across channels: card + ACH + wire patterns often indicate coordinated fraud

REAL-TIME CONSTRAINTS:
- All scores must be generated within 300ms of event receipt
- Batch overnight reviews must complete before 05:00 ET market open
- SAR filing triggers must be flagged to compliance within 24 hours

SCOPE: Transaction scoring, alert dispatch, case file creation, pattern correlation, SAR trigger flagging
OUT OF SCOPE: Account closure, customer communication, SAR filing (compliance team only), law enforcement referrals`,
      tools: [
        { name: "transaction_stream", type: "api",      description: "Subscribe to real-time transaction feed across card, ACH, and wire channels." },
        { name: "ml_inference",       type: "function", description: "Run transaction data through the ML fraud model ensemble (gradient boosting + neural net)." },
        { name: "alert_dispatch",     type: "api",      description: "Dispatch fraud alerts and initiate holds via the Fraud Ops Center alerting system." },
      ],
      knowledgeSources: [
        { name: "Fraud Pattern Library",     type: "vector_store", uri: "vs://fraud-patterns-prod" },
        { name: "Watchlist Database",        type: "database",     uri: "db://ofac-watchlist-live" },
        { name: "Device Fingerprint Store",  type: "database",     uri: "db://device-fingerprints" },
      ],
      allowedDomains: ["fraud-detection", "transaction-monitoring", "risk-scoring", "alert-dispatch"],
      deniedActions: ["close_account", "contact_customer", "file_sar", "refer_to_law_enforcement", "modify_transaction_records"],
      policies: [
        { name: "SR 11-7 Model Documentation", type: "compliance",    description: "2-year retention for fraud ML model validation and regulatory examination." },
        { name: "PII Data Handling",            type: "data_handling", description: "Transaction data PII redaction in non-production environments." },
        { name: "Fraud Investigation Safety",   type: "safety",        description: "Escalation thresholds and auto-hold controls." },
        { name: "High-Risk Audit Protocol",     type: "audit",         description: "730-day retention for critical-risk fraud detection agent." },
      ],
      audit: { log_interactions: true, retention_days: 730, pii_redaction: true },
      ownerEmail: USERS.architect,
      businessUnit: "Fraud Operations Center",
      costCenter: "FOC-0089",
      dataClassification: "regulated",
      deploymentEnv: "production",
      enterpriseId: E,
      createdBy: USERS.architect,
      status: "deployed",
      tags: ["fraud", "real-time", "critical-risk", "production", "compliant"],
    });

    await db.insert(agentBlueprints).values({
      id: BP.FDM, agentId: AG.FDM, version: "2.0.0",
      name: "Fraud Detection Monitor", enterpriseId: E, sessionId: S.FDM,
      tags: ["fraud", "real-time", "critical-risk", "production", "compliant"],
      abp, status: "deployed", refinementCount: "5",
      validationReport: validReport(ALL_POLICY_IDS),
      baselineValidationReport: validReport(ALL_POLICY_IDS),
      governanceDrift: { status: "clean", newViolations: [], checkedAt: hoursAgo(1).toISOString() },
      reviewedBy: USERS.officer,
      reviewComment: "Full governance compliance. SAR escalation path verified. Auto-hold thresholds reviewed by risk committee. Approved.",
      reviewedAt: daysAgo(45),
      createdBy: USERS.architect,
      currentApprovalStep: 3,
      approvalProgress: [
        { role: "reviewer",           label: "Senior Reviewer",   approvedBy: USERS.reviewer, approvedAt: daysAgo(47).toISOString(), comment: "Confidence thresholds well-calibrated. Real-time constraints documented. Forwarding." },
        { role: "compliance_officer", label: "Compliance Officer", approvedBy: USERS.officer,  approvedAt: daysAgo(46).toISOString(), comment: "SAR escalation path validated. BSA/AML controls confirmed. 730-day retention confirmed. Approved." },
        { role: "admin",              label: "Final Sign-off",     approvedBy: USERS.admin,    approvedAt: daysAgo(45).toISOString(), comment: "Approved. Risk committee sign-off on file (CHG-2026-0732)." },
      ],
      deploymentTarget: "agentcore",
      deploymentMetadata: {
        agentId:         "MCG-FRAUD-02",
        agentArn:        "arn:aws:bedrock:us-east-1:921473850264:agent/MCG-FRAUD-02",
        region:          "us-east-1",
        foundationModel: "anthropic.claude-3-5-haiku-20241022-v1:0",
        agentVersion:    "4",
        deployedAt:      daysAgo(43).toISOString(),
        deployedBy:      USERS.admin,
      },
      nextReviewDue: daysFromNow(14),
      lastPeriodicReviewAt: daysAgo(76),
      createdAt: daysAgo(60), updatedAt: daysAgo(43),
    });
    console.log("  added blueprint: Fraud Detection Monitor (deployed/clean/critical)");
  }

  // 5-4. Wealth Management Advisor (approved, ready to deploy)
  {
    const abp = makeAbp({
      id: BP.WMA,
      name: "Wealth Management Advisor",
      description: "AI-assisted investment analysis tool for wealth management advisors. Provides personalized portfolio analysis, rebalancing suggestions, and client-facing report generation under advisor supervision.",
      persona: "Sophisticated, data-driven, and client-centric. Communicates investment concepts clearly to both advisors and clients. Always surfaces material risks. Maintains appropriate disclaimers.",
      instructions: `You are Meridian Capital Group's Wealth Management Advisor AI. You work alongside licensed advisors to enhance client service quality and portfolio management efficiency.

BEHAVIOR GUIDELINES:
- All investment recommendations require advisor review before delivery to clients
- Always surface top-3 risks for any recommended action
- Include standard regulatory disclosures (past performance, suitability)
- Personalize analysis to client risk profile — never recommend products outside stated risk tolerance
- Flag tax implications for all rebalancing recommendations (realized gains/losses)
- For clients >$2M AUM, flag to senior advisor for personal review

REGULATORY COMPLIANCE:
- Reg BI: Recommendations must be in client's best interest; document rationale
- Investment Advisers Act: All AI outputs are tools for advisor use only; advisor retains fiduciary responsibility
- FINRA Rule 4512: Verify client suitability data is current before analysis

SCOPE: Portfolio analysis, rebalancing recommendations, market research synthesis, client report drafting
OUT OF SCOPE: Direct client communication without advisor, trade execution, discretionary investment decisions, tax advice`,
      tools: [
        { name: "market_data_feed",    type: "api",      description: "Real-time and historical market data across equities, fixed income, and alternatives." },
        { name: "portfolio_analysis",  type: "function", description: "Analyze portfolio allocation, performance attribution, and risk metrics (VaR, beta, Sharpe)." },
        { name: "reporting_api",       type: "api",      description: "Generate formatted client portfolio reports and advisor briefings." },
      ],
      knowledgeSources: [
        { name: "Investment Policy Statements", type: "database",     uri: "db://client-ips-prod" },
        { name: "Market Research Library",      type: "vector_store", uri: "vs://meridian-research-prod" },
        { name: "Regulatory Disclosures",       type: "file",         uri: "s3://meridian-compliance/disclosures/" },
      ],
      allowedDomains: ["investment-analysis", "portfolio-management", "wealth-advisory", "client-reporting"],
      deniedActions: ["execute_trades", "communicate_directly_with_client", "override_risk_profile", "provide_tax_advice", "discretionary_investment_decisions"],
      policies: [
        { name: "SR 11-7 Model Documentation", type: "compliance",    description: "Logging and validation for AI-assisted investment analysis." },
        { name: "PII Data Handling",            type: "data_handling", description: "Client financial data PII controls and retention." },
        { name: "Investment Safety Controls",   type: "safety",        description: "Suitability checks, disclosure requirements, Reg BI compliance." },
      ],
      audit: { log_interactions: true, retention_days: 365, pii_redaction: true },
      ownerEmail: USERS.architect,
      businessUnit: "Wealth Management — Advisory",
      costCenter: "WM-0203",
      dataClassification: "regulated",
      deploymentEnv: "staging",
      enterpriseId: E,
      createdBy: USERS.architect,
      status: "approved",
      tags: ["wealth-management", "investment", "advisory", "approved"],
    });

    await db.insert(agentBlueprints).values({
      id: BP.WMA, agentId: AG.WMA, version: "1.0.0",
      name: "Wealth Management Advisor", enterpriseId: E, sessionId: S.WMA,
      tags: ["wealth-management", "investment", "advisory", "approved"],
      abp, status: "approved", refinementCount: "3",
      validationReport: validReport([POL.PII, POL.SR117, POL.SAFETY]),
      reviewedBy: USERS.officer,
      reviewComment: "Reg BI compliance documentation verified. Advisor-in-the-loop controls confirmed. Ready for staging deployment and UAT.",
      reviewedAt: daysAgo(5),
      createdBy: USERS.architect,
      currentApprovalStep: 3,
      approvalProgress: [
        { role: "reviewer",           label: "Senior Reviewer",   approvedBy: USERS.reviewer, approvedAt: daysAgo(7).toISOString(), comment: "Sound design. Client risk profile guardrails are solid. Forwarding to compliance." },
        { role: "compliance_officer", label: "Compliance Officer", approvedBy: USERS.officer,  approvedAt: daysAgo(6).toISOString(), comment: "Reg BI fiduciary chain documented. Suitability checks confirmed. Disclosures present. Approved." },
        { role: "admin",              label: "Final Sign-off",     approvedBy: USERS.admin,    approvedAt: daysAgo(5).toISOString(), comment: "Approved for staging deployment. UAT required before production." },
      ],
      deploymentTarget: null,
      deploymentMetadata: null,
      nextReviewDue: daysFromNow(60),
      createdAt: daysAgo(30), updatedAt: daysAgo(5),
    });
    console.log("  added blueprint: Wealth Management Advisor (approved/ready)");
  }

  // 5-5. Regulatory Reporting Agent (deployed, fully compliant)
  {
    const abp = makeAbp({
      id: BP.RRA,
      name: "Regulatory Reporting Agent",
      description: "Automates the generation and pre-filing review of mandatory regulatory reports for FINRA, SEC, and federal banking regulators. Tracks filing deadlines and produces audit-ready documentation packages.",
      persona: "Meticulous, detail-oriented, and deadline-focused. Uses precise regulatory terminology. Flags every discrepancy for human review rather than making assumptions.",
      instructions: `You are Meridian Capital Group's Regulatory Reporting Agent. You assist the Compliance team with accurate and timely regulatory report generation.

BEHAVIOR GUIDELINES:
- Pull data from authorized sources only; document every data source used in the report
- Flag any data quality issues (missing values, reconciliation differences) before drafting
- Apply the most current regulatory templates; check for version updates before each filing cycle
- All draft reports require compliance officer review before filing — you generate drafts only
- Maintain a filing calendar; send deadline alerts 10 days and 3 days before due dates
- Generate audit trail documentation alongside each report (data sources, methodology, reviewer)

REGULATORY SCOPE:
- FOCUS Reports (FINRA Rule 4524): Monthly, quarterly, and annual filings
- Call Reports: FR Y-9C, FFIEC 041 as applicable
- SARs (31 CFR Part 1020): Narrative generation only; officer must file
- Form PF: Quarterly filings for registered investment advisers

SCOPE: Report generation, deadline tracking, data reconciliation, audit documentation
OUT OF SCOPE: Filing submission (compliance officer only), SAR filing, regulatory interpretation, legal advice`,
      tools: [
        { name: "regulatory_database", type: "api",      description: "Query the regulatory database for current report templates, filing calendars, and prior submissions." },
        { name: "report_generator",    type: "function", description: "Generate formatted regulatory report drafts in required submission formats (XML, XBRL, PDF)." },
        { name: "filing_api",          type: "api",      description: "Submit completed reports to FINRA FIRMS, SEC EDGAR, and Federal Reserve FFIEC reporting portals." },
      ],
      knowledgeSources: [
        { name: "FINRA Rules Library",     type: "database",     uri: "db://finra-rules-current" },
        { name: "SEC Reporting Templates", type: "file",         uri: "s3://meridian-compliance/sec-templates/" },
        { name: "Prior Filing Archive",    type: "vector_store", uri: "vs://regulatory-filings-archive" },
      ],
      allowedDomains: ["regulatory-reporting", "compliance-filings", "audit-documentation"],
      deniedActions: ["submit_filings_without_approval", "interpret_regulations", "provide_legal_advice", "modify_source_data"],
      policies: [
        { name: "SR 11-7 Model Documentation", type: "compliance",    description: "Full audit trail for AI-generated regulatory reports." },
        { name: "PII Data Handling",            type: "data_handling", description: "Regulatory data PII redaction for non-production use." },
        { name: "Compliance Safety Controls",   type: "safety",        description: "Draft-only output; human officer required for submission." },
        { name: "High-Risk Escalation",         type: "audit",         description: "730-day retention for regulatory reporting audit trail." },
      ],
      audit: { log_interactions: true, retention_days: 730, pii_redaction: true },
      ownerEmail: USERS.officer,
      businessUnit: "Regulatory Compliance",
      costCenter: "COMP-0055",
      dataClassification: "regulated",
      deploymentEnv: "production",
      enterpriseId: E,
      createdBy: USERS.architect,
      status: "deployed",
      tags: ["compliance", "regulatory", "reporting", "production", "finra", "sec"],
    });

    await db.insert(agentBlueprints).values({
      id: BP.RRA, agentId: AG.RRA, version: "1.1.0",
      name: "Regulatory Reporting Agent", enterpriseId: E, sessionId: S.RRA,
      tags: ["compliance", "regulatory", "reporting", "production", "finra", "sec"],
      abp, status: "deployed", refinementCount: "2",
      validationReport: validReport(ALL_POLICY_IDS),
      baselineValidationReport: validReport(ALL_POLICY_IDS),
      governanceDrift: { status: "clean", newViolations: [], checkedAt: hoursAgo(6).toISOString() },
      reviewedBy: USERS.officer,
      reviewComment: "Draft-only controls verified. Full regulatory template coverage confirmed. Exceptional governance posture. Approved.",
      reviewedAt: daysAgo(40),
      createdBy: USERS.architect,
      currentApprovalStep: 3,
      approvalProgress: [
        { role: "reviewer",           label: "Senior Reviewer",   approvedBy: USERS.reviewer, approvedAt: daysAgo(42).toISOString(), comment: "Data lineage documentation is thorough. Human-in-the-loop filing controls confirmed." },
        { role: "compliance_officer", label: "Compliance Officer", approvedBy: USERS.officer,  approvedAt: daysAgo(41).toISOString(), comment: "Regulatory templates verified against current FINRA/SEC versions. 730-day retention confirmed. Approved." },
        { role: "admin",              label: "Final Sign-off",     approvedBy: USERS.admin,    approvedAt: daysAgo(40).toISOString(), comment: "Approved for production." },
      ],
      deploymentTarget: "agentcore",
      deploymentMetadata: {
        agentId:         "MCG-REGREPORT-01",
        agentArn:        "arn:aws:bedrock:us-east-1:921473850264:agent/MCG-REGREPORT-01",
        region:          "us-east-1",
        foundationModel: "anthropic.claude-3-5-sonnet-20241022-v2:0",
        agentVersion:    "2",
        deployedAt:      daysAgo(38).toISOString(),
        deployedBy:      USERS.admin,
      },
      nextReviewDue: daysFromNow(120),
      lastPeriodicReviewAt: daysAgo(10),
      createdAt: daysAgo(55), updatedAt: daysAgo(38),
    });
    console.log("  added blueprint: Regulatory Reporting Agent (deployed/clean)");
  }

  // 5-6. Customer Service Triage (deployed, moderate volume)
  {
    const abp = makeAbp({
      id: BP.CST,
      name: "Customer Service Triage",
      description: "Intelligent routing and initial response drafting for inbound customer service inquiries. Classifies inquiries by type and urgency, drafts responses, and routes to appropriate specialist teams.",
      persona: "Empathetic, efficient, and clear. Acknowledges customer concerns before presenting solutions. Uses plain language. Escalates with full context summary.",
      instructions: `You are Meridian Capital Group's Customer Service Triage agent. You handle the first layer of inbound customer inquiries and ensure they reach the right person quickly.

BEHAVIOR GUIDELINES:
- Classify every inquiry into one of 12 categories: account-access, billing, loan-inquiry, investment, fraud-concern, complaint, general-information, account-opening, card-services, wire-transfer, regulatory, escalation-request
- Assign priority: Critical (fraud/unauthorized access), High (time-sensitive financial), Medium (standard service), Low (general information)
- Draft an initial response for non-critical inquiries; keep drafts under 150 words
- For Critical priority: alert FOC immediately; do not queue
- Include a complete context summary in every escalation handoff
- Never make commitments about fee waivers, rate changes, or policy exceptions

SCOPE: Inquiry classification, priority scoring, response drafting, escalation routing
OUT OF SCOPE: Account modifications, financial decisions, complaints resolution (route to complaints team)`,
      tools: [
        { name: "ticket_system",       type: "api",      description: "Create, update, and route tickets in the customer service management system." },
        { name: "knowledge_base",      type: "api",      description: "Query the internal knowledge base for product information and standard resolutions." },
        { name: "escalation_router",   type: "function", description: "Route inquiries to the appropriate specialist queue with context summary." },
      ],
      knowledgeSources: [
        { name: "Product Knowledge Base", type: "vector_store", uri: "vs://meridian-products-kb" },
        { name: "Resolution Playbooks",   type: "database",     uri: "db://service-playbooks" },
      ],
      allowedDomains: ["customer-service", "inquiry-routing", "response-drafting"],
      deniedActions: ["modify_accounts", "waive_fees", "approve_exceptions", "access_non-inquiry_customer_data"],
      policies: [
        { name: "Customer Communication Safety", type: "safety",        description: "UDAAP compliance — no misleading statements in customer communications." },
        { name: "Data Handling Basics",          type: "data_handling", description: "Minimum PII for service routing; basic retention policy." },
      ],
      audit: { log_interactions: true, retention_days: 365, pii_redaction: true },
      ownerEmail: USERS.architect,
      businessUnit: "Customer Operations",
      costCenter: "CUSOPS-0033",
      dataClassification: "internal",
      deploymentEnv: "production",
      enterpriseId: E,
      createdBy: USERS.architect,
      status: "deployed",
      tags: ["customer-service", "triage", "routing", "production"],
    });

    await db.insert(agentBlueprints).values({
      id: BP.CST, agentId: AG.CST, version: "1.0.0",
      name: "Customer Service Triage", enterpriseId: E, sessionId: S.CST,
      tags: ["customer-service", "triage", "routing", "production"],
      abp, status: "deployed", refinementCount: "1",
      validationReport: validReport([POL.PII, POL.SR117, POL.SAFETY]),
      baselineValidationReport: validReport([POL.PII, POL.SR117, POL.SAFETY]),
      governanceDrift: { status: "clean", newViolations: [], checkedAt: hoursAgo(3).toISOString() },
      reviewedBy: USERS.reviewer,
      reviewComment: "Clean governance, well-scoped. UDAAP commitment guardrails confirmed. Approved for production.",
      reviewedAt: daysAgo(35),
      createdBy: USERS.architect,
      currentApprovalStep: 3,
      approvalProgress: [
        { role: "reviewer",           label: "Senior Reviewer",   approvedBy: USERS.reviewer, approvedAt: daysAgo(37).toISOString(), comment: "Solid routing logic. UDAAP guardrails good. Forwarding." },
        { role: "compliance_officer", label: "Compliance Officer", approvedBy: USERS.officer,  approvedAt: daysAgo(36).toISOString(), comment: "UDAAP controls verified. Commitment restrictions confirmed. Approved." },
        { role: "admin",              label: "Final Sign-off",     approvedBy: USERS.admin,    approvedAt: daysAgo(35).toISOString(), comment: "Approved." },
      ],
      deploymentTarget: "agentcore",
      deploymentMetadata: {
        agentId:         "MCG-CUSTRIAGE-01",
        agentArn:        "arn:aws:bedrock:us-east-1:921473850264:agent/MCG-CUSTRIAGE-01",
        region:          "us-east-1",
        foundationModel: "anthropic.claude-3-5-haiku-20241022-v1:0",
        agentVersion:    "1",
        deployedAt:      daysAgo(33).toISOString(),
        deployedBy:      USERS.admin,
      },
      nextReviewDue: daysFromNow(150),
      lastPeriodicReviewAt: daysAgo(15),
      createdAt: daysAgo(50), updatedAt: daysAgo(33),
    });
    console.log("  added blueprint: Customer Service Triage (deployed/clean)");
  }

  // 5-7. Trade Confirmation Assistant (in_review, pending compliance sign-off)
  {
    const abp = makeAbp({
      id: BP.TCA,
      name: "Trade Confirmation Assistant",
      description: "Generates and dispatches trade confirmation documents to institutional counterparties within T+1 settlement requirements. Handles equity, fixed income, and derivatives confirmations.",
      persona: "Precise and formal. Uses institutional financial terminology. Includes all required ISDA/DTC standard fields. Flags any settlement exceptions immediately.",
      instructions: `You are Meridian Capital Group's Trade Confirmation Assistant. You ensure timely and accurate trade confirmation delivery within regulatory settlement windows.

BEHAVIOR GUIDELINES:
- Pull trade data from the blotter immediately upon trade execution notification
- Generate confirmation document in the appropriate format: DTC for equities, SWIFT MT5xx for fixed income, ISDA FpML for derivatives
- Verify all counterparty details against the LEI registry before dispatch
- Dispatch via email_sender using the counterparty's registered communication channel
- Flag any mismatch between blotter and confirmation to operations team immediately
- Log all dispatches with timestamp, recipient, and delivery confirmation

REGULATORY COMPLIANCE:
- SEC Rule 10b-10: Written confirmation required at or before completion of transaction
- T+1 Settlement: All confirmations must be sent day of trade for T+1 eligibility
- FINRA Rule 4311: Counterparty confirmation and exception reporting

SCOPE: Trade confirmation generation, counterparty LEI verification, document dispatch, exception flagging
OUT OF SCOPE: Trade booking, settlement instruction modification, counterparty onboarding, pricing disputes`,
      tools: [
        { name: "trade_system",        type: "api",      description: "Access trade blotter and execution records from the OMS/EMS." },
        { name: "document_generator",  type: "function", description: "Generate trade confirmation documents in DTC, SWIFT MT5xx, and ISDA FpML formats." },
        { name: "email_sender",        type: "api",      description: "Dispatch confirmation documents to counterparties via institutional email channels." },
      ],
      knowledgeSources: [
        { name: "Counterparty Directory", type: "database", uri: "db://counterparty-directory" },
        { name: "Confirmation Templates", type: "file",     uri: "s3://meridian-ops/confirmation-templates/" },
      ],
      allowedDomains: ["trade-operations", "confirmation-dispatch", "settlement"],
      deniedActions: ["modify_trade_records", "change_settlement_instructions", "approve_exceptions", "access_non-trade_data"],
      policies: [
        { name: "SR 11-7 Model Documentation", type: "compliance",    description: "Full logging for trade confirmation audit trail." },
        { name: "Trade Data Handling",          type: "data_handling", description: "Counterparty PII controls for trade confirmation data." },
        { name: "Operations Safety Controls",   type: "safety",        description: "Exception escalation; no modification of trade records." },
      ],
      audit: { log_interactions: true, retention_days: 365, pii_redaction: true },
      ownerEmail: USERS.architect,
      businessUnit: "Trade Operations",
      costCenter: "TRADEOPS-0077",
      dataClassification: "confidential",
      deploymentEnv: "staging",
      enterpriseId: E,
      createdBy: USERS.architect,
      status: "in_review",
      tags: ["trade-ops", "confirmation", "settlements", "in-review"],
    });

    await db.insert(agentBlueprints).values({
      id: BP.TCA, agentId: AG.TCA, version: "1.0.0",
      name: "Trade Confirmation Assistant", enterpriseId: E, sessionId: S.TCA,
      tags: ["trade-ops", "confirmation", "settlements", "in-review"],
      abp, status: "in_review", refinementCount: "1",
      validationReport: validReport([POL.PII, POL.SR117, POL.SAFETY]),
      reviewedBy: null,
      reviewComment: "Please confirm PII handling controls are in place for trade counterparty data before approval.",
      reviewedAt: null,
      createdBy: USERS.architect,
      currentApprovalStep: 1,
      approvalProgress: [
        { role: "reviewer", label: "Senior Reviewer", approvedBy: USERS.reviewer, approvedAt: daysAgo(2).toISOString(), comment: "Confirmation format logic is correct. T+1 deadline handling good. Forwarding to compliance for PII review." },
      ],
      deploymentTarget: null,
      deploymentMetadata: null,
      createdAt: daysAgo(14), updatedAt: daysAgo(2),
    });
    console.log("  added blueprint: Trade Confirmation Assistant (in_review)");
  }

  // 5-8. Credit Risk Scorer (draft, early-stage)
  {
    const abp = makeAbp({
      id: BP.CRS,
      name: "Credit Risk Scorer",
      description: "Early-stage automated credit risk assessment pipeline for commercial lending. Will enable same-day credit decisions for sub-$1M commercial loans.",
      persona: "Analytical and conservative. Errs on the side of caution for credit risk. Always documents uncertainty in risk estimates.",
      instructions: `[DRAFT — Instructions in progress]

You are Meridian Capital Group's Credit Risk Scorer for commercial lending.

Initial scope: analyze business financials, credit reports, and industry benchmarks to produce a credit risk grade and probability of default estimate.

TODO:
- Define credit grade scale (A–F or numeric equivalent)
- Specify input data requirements and validation rules
- Define exception handling for incomplete financials
- Add ECOA compliance guardrails`,
      tools: [
        { name: "business_credit_api", type: "api",      description: "Pull D&B and Equifax business credit reports." },
        { name: "financial_analyzer",  type: "function", description: "Analyze business financial statements for key credit ratios." },
      ],
      allowedDomains: [],
      deniedActions: ["approve_credit", "communicate_with_applicant"],
      policies: [
        { name: "SR 11-7 Model Documentation", type: "compliance", description: "Model risk documentation required." },
      ],
      audit: { log_interactions: true, retention_days: 730, pii_redaction: false },
      ownerEmail: USERS.architect,
      businessUnit: "Commercial Lending",
      costCenter: "COMLEND-0144",
      dataClassification: "confidential",
      deploymentEnv: "sandbox",
      enterpriseId: E,
      createdBy: USERS.architect,
      status: "draft",
      tags: ["commercial-lending", "credit-risk", "draft"],
    });

    await db.insert(agentBlueprints).values({
      id: BP.CRS, agentId: AG.CRS, version: "0.1.0",
      name: "Credit Risk Scorer", enterpriseId: E, sessionId: S.CRS,
      tags: ["commercial-lending", "credit-risk", "draft"],
      abp, status: "draft", refinementCount: "0",
      validationReport: invalidReport([POL.PII, POL.SR117, POL.ACCESS], [
        { policyId: POL.PII, policyName: "PII Data Handling Policy", ruleId: "pii-02", field: "governance.audit.pii_redaction", operator: "equals", severity: "error", message: "PII redaction must be enabled.", suggestion: "Set governance.audit.pii_redaction = true." },
        { policyId: POL.ACCESS, policyName: "Access Control Enforcement", ruleId: "access-01", field: "constraints.allowed_domains", operator: "not_empty", severity: "error", message: "allowed_domains must not be empty.", suggestion: "Add allowed domains for commercial lending scope." },
      ]),
      reviewedBy: null, reviewComment: null, reviewedAt: null,
      createdBy: USERS.architect,
      currentApprovalStep: 0, approvalProgress: [],
      deploymentTarget: null, deploymentMetadata: null,
      createdAt: daysAgo(5), updatedAt: daysAgo(1),
    });
    console.log("  added blueprint: Credit Risk Scorer (draft)");
  }

  // ── 6. Blueprint quality scores ────────────────────────────────────────────
  console.log("\nStep 6 — Blueprint quality scores");
  const qualityScores = [
    { bp: BP.COA, overall: "92.00", intent: "4.70", tool: "4.60", instr: "4.80", gov: "4.70", owner: "4.90", flags: [] },
    { bp: BP.LUA, overall: "78.00", intent: "4.10", tool: "4.30", instr: "4.00", gov: "3.50", owner: "4.20", flags: ["allowed_domains is empty — access control violation"] },
    { bp: BP.FDM, overall: "89.00", intent: "4.60", tool: "4.70", instr: "4.50", gov: "4.60", owner: "4.60", flags: [] },
    { bp: BP.WMA, overall: "85.00", intent: "4.40", tool: "4.50", instr: "4.40", gov: "4.30", owner: "4.40", flags: [] },
    { bp: BP.RRA, overall: "88.00", intent: "4.50", tool: "4.40", instr: "4.60", gov: "4.70", owner: "4.80", flags: [] },
    { bp: BP.CST, overall: "81.00", intent: "4.20", tool: "4.10", instr: "4.20", gov: "4.00", owner: "4.10", flags: [] },
    { bp: BP.TCA, overall: "76.00", intent: "4.00", tool: "4.10", instr: "3.90", gov: "3.80", owner: "4.00", flags: ["PII handling for counterparty data needs clarification"] },
    { bp: BP.CRS, overall: "28.00", intent: "3.00", tool: "3.20", instr: "1.00", gov: "1.50", owner: "3.00", flags: ["Instructions incomplete — draft placeholder only", "PII redaction not enabled", "allowed_domains empty"] },
  ];
  for (const q of qualityScores) {
    await db.insert(blueprintQualityScores).values({
      blueprintId: q.bp, enterpriseId: E,
      overallScore: q.overall, intentAlignment: q.intent, toolAppropriateness: q.tool,
      instructionSpecificity: q.instr, governanceAdequacy: q.gov, ownershipCompleteness: q.owner,
      flags: q.flags,
      evaluatorModel: "claude-3-5-sonnet-20241022",
      evaluatedAt: daysAgo(1),
    });
    console.log(`  added quality score for ${q.bp.slice(-3)} → ${q.overall}/100`);
  }

  // ── 7. Audit log ───────────────────────────────────────────────────────────
  console.log("\nStep 7 — Audit log");
  const auditEntries = [
    // Customer Onboarding Assistant lifecycle
    { id: "70000000-1000-0000-0000-000000000001", entityId: BP.COA, action: "blueprint.created",               actor: USERS.architect, role: "architect",          ts: daysAgo(45), from: null,        to: "draft",     meta: { version: "1.0.0", agentName: "Customer Onboarding Assistant" } },
    { id: "70000000-1000-0000-0000-000000000002", entityId: BP.COA, action: "blueprint.refined",               actor: USERS.architect, role: "architect",          ts: daysAgo(44), from: "draft",     to: "draft",     meta: { changeRequest: "Add OFAC escalation path and privacy notice delivery step." } },
    { id: "70000000-1000-0000-0000-000000000003", entityId: BP.COA, action: "blueprint.refined",               actor: USERS.architect, role: "architect",          ts: daysAgo(43), from: "draft",     to: "draft",     meta: { changeRequest: "Expand document verification tool config and add country risk matrix source." } },
    { id: "70000000-1000-0000-0000-000000000004", entityId: BP.COA, action: "blueprint.submitted",             actor: USERS.architect, role: "architect",          ts: daysAgo(42), from: "draft",     to: "in_review", meta: { governanceValid: true, policyCount: 5 } },
    { id: "70000000-1000-0000-0000-000000000005", entityId: BP.COA, action: "blueprint.approval_step_completed", actor: USERS.reviewer, role: "reviewer",          ts: daysAgo(22), from: "in_review", to: "in_review", meta: { step: 0, label: "Senior Reviewer", comment: "Comprehensive. Forwarding to compliance." } },
    { id: "70000000-1000-0000-0000-000000000006", entityId: BP.COA, action: "blueprint.approval_step_completed", actor: USERS.officer,  role: "compliance_officer", ts: daysAgo(21), from: "in_review", to: "in_review", meta: { step: 1, label: "Compliance Officer", comment: "GLBA/OFAC controls confirmed." } },
    { id: "70000000-1000-0000-0000-000000000007", entityId: BP.COA, action: "blueprint.reviewed",              actor: USERS.admin,    role: "admin",              ts: daysAgo(20), from: "in_review", to: "approved",  meta: { decision: "approve", comment: "Approved for production." } },
    { id: "70000000-1000-0000-0000-000000000008", entityId: BP.COA, action: "blueprint.agentcore_deployed",    actor: USERS.admin,    role: "admin",              ts: daysAgo(18), from: "approved",  to: "deployed",  meta: { agentId: "MCG-ONBOARD-01", region: "us-east-1", changeRef: "CHG-2026-1241" } },
    { id: "70000000-1000-0000-0000-000000000009", entityId: BP.COA, action: "blueprint.periodic_review_completed", actor: USERS.officer, role: "compliance_officer", ts: daysAgo(5), from: "deployed", to: "deployed", meta: { reviewOutcome: "no_changes_required", nextReviewDue: daysFromNow(90).toISOString() } },

    // Loan Underwriting Analyst — governance drift detection
    { id: "70000000-1000-0000-0000-000000000010", entityId: BP.LUA, action: "blueprint.created",               actor: USERS.architect, role: "architect",          ts: daysAgo(38), from: null,        to: "draft",     meta: { version: "1.0.0", agentName: "Loan Underwriting Analyst" } },
    { id: "70000000-1000-0000-0000-000000000011", entityId: BP.LUA, action: "blueprint.submitted",             actor: USERS.architect, role: "architect",          ts: daysAgo(35), from: "draft",     to: "in_review", meta: { governanceValid: false, policyCount: 3, violations: 1 } },
    { id: "70000000-1000-0000-0000-000000000012", entityId: BP.LUA, action: "blueprint.reviewed",              actor: USERS.admin,    role: "admin",              ts: daysAgo(25), from: "in_review", to: "approved",  meta: { decision: "approve", comment: "Conditional approval — allowed_domains must be added." } },
    { id: "70000000-1000-0000-0000-000000000013", entityId: BP.LUA, action: "blueprint.agentcore_deployed",    actor: USERS.admin,    role: "admin",              ts: daysAgo(23), from: "approved",  to: "deployed",  meta: { agentId: "MCG-UNDERWRITE-01", changeRef: "CHG-2026-1289" } },
    { id: "70000000-1000-0000-0000-000000000014", entityId: BP.LUA, action: "blueprint.governance_drift_detected", actor: "system",  role: "system",             ts: daysAgo(2),  from: "deployed",  to: "deployed",  meta: { newViolations: 1, severity: "error", field: "constraints.allowed_domains" } },

    // Fraud Detection Monitor — policy update
    { id: "70000000-1000-0000-0000-000000000015", entityId: BP.FDM, action: "blueprint.agentcore_deployed",    actor: USERS.admin,    role: "admin",              ts: daysAgo(43), from: "approved",  to: "deployed",  meta: { agentId: "MCG-FRAUD-02", changeRef: "CHG-2026-0732" } },
    { id: "70000000-1000-0000-0000-000000000016", entityId: POL.SR117, action: "policy.updated",               actor: USERS.officer,  role: "compliance_officer", ts: daysAgo(15), from: null,        to: null,        meta: { policyName: "SR 11-7 Model Risk Policy", change: "Updated retention_days threshold from 180 to 365" } },

    // Trade Confirmation Assistant — in review
    { id: "70000000-1000-0000-0000-000000000017", entityId: BP.TCA, action: "blueprint.created",               actor: USERS.architect, role: "architect",          ts: daysAgo(14), from: null,        to: "draft",     meta: { agentName: "Trade Confirmation Assistant" } },
    { id: "70000000-1000-0000-0000-000000000018", entityId: BP.TCA, action: "blueprint.submitted",             actor: USERS.architect, role: "architect",          ts: daysAgo(5),  from: "draft",     to: "in_review", meta: { governanceValid: true, policyCount: 3 } },
    { id: "70000000-1000-0000-0000-000000000019", entityId: BP.TCA, action: "blueprint.approval_step_completed", actor: USERS.reviewer, role: "reviewer",          ts: daysAgo(2),  from: "in_review", to: "in_review", meta: { step: 0, label: "Senior Reviewer", comment: "Forwarding to compliance for PII review." } },

    // Governance policy events
    { id: "70000000-1000-0000-0000-000000000020", entityId: POL.PII,      action: "policy.created", actor: USERS.officer, role: "compliance_officer", ts: daysAgo(90), from: null, to: null, meta: { policyName: "PII Data Handling Policy", type: "data_handling" } },
    { id: "70000000-1000-0000-0000-000000000021", entityId: POL.ESCALATE, action: "policy.created", actor: USERS.officer, role: "compliance_officer", ts: daysAgo(90), from: null, to: null, meta: { policyName: "High-Risk Escalation Protocol", type: "audit" } },
  ] as const;

  for (const entry of auditEntries) {
    await db.insert(auditLog).values({
      id: entry.id,
      entityType: entry.entityId.startsWith("40") ? "policy" : "blueprint",
      entityId: entry.entityId,
      action: entry.action,
      actorEmail: entry.actor,
      actorRole: entry.role,
      enterpriseId: E,
      fromState: entry.from ? { status: entry.from } : null,
      toState: entry.to ? { status: entry.to } : null,
      metadata: entry.meta,
      createdAt: entry.ts,
    });
  }
  console.log(`  added ${auditEntries.length} audit log entries`);

  // ── 8. Deployment health ───────────────────────────────────────────────────
  console.log("\nStep 8 — Deployment health");
  const healthDefs = [
    {
      agentId: AG.COA, blueprintId: BP.COA,
      healthStatus: "clean", errorCount: 0, warningCount: 1,
      productionErrorRate: 0.008, productionLatencyP99: 1050,
      deployedAt: daysAgo(18),
      validationReport: validReport(ALL_POLICY_IDS),
    },
    {
      agentId: AG.LUA, blueprintId: BP.LUA,
      healthStatus: "degraded", errorCount: 2, warningCount: 3,
      productionErrorRate: 0.089, productionLatencyP99: 2900,
      deployedAt: daysAgo(23),
      validationReport: invalidReport([POL.PII, POL.SR117, POL.ACCESS], [
        { policyId: POL.ACCESS, policyName: "Access Control Enforcement", ruleId: "access-01", field: "constraints.allowed_domains", operator: "not_empty", severity: "error", message: "allowed_domains must not be empty." },
      ]),
    },
    {
      agentId: AG.FDM, blueprintId: BP.FDM,
      healthStatus: "clean", errorCount: 0, warningCount: 0,
      productionErrorRate: 0.004, productionLatencyP99: 195,
      deployedAt: daysAgo(43),
      validationReport: validReport(ALL_POLICY_IDS),
    },
    {
      agentId: AG.RRA, blueprintId: BP.RRA,
      healthStatus: "clean", errorCount: 0, warningCount: 0,
      productionErrorRate: 0.012, productionLatencyP99: 6200,
      deployedAt: daysAgo(38),
      validationReport: validReport(ALL_POLICY_IDS),
    },
    {
      agentId: AG.CST, blueprintId: BP.CST,
      healthStatus: "clean", errorCount: 0, warningCount: 1,
      productionErrorRate: 0.018, productionLatencyP99: 720,
      deployedAt: daysAgo(33),
      validationReport: validReport([POL.PII, POL.SR117, POL.SAFETY]),
    },
  ];
  for (const h of healthDefs) {
    await db.insert(deploymentHealth).values({
      agentId: h.agentId, blueprintId: h.blueprintId, enterpriseId: E,
      healthStatus: h.healthStatus, errorCount: h.errorCount, warningCount: h.warningCount,
      validationReport: h.validationReport,
      productionErrorRate: h.productionErrorRate,
      productionLatencyP99: h.productionLatencyP99,
      lastCheckedAt: hoursAgo(rand(1, 6)),
      lastTelemetryAt: hoursAgo(rand(1, 3)),
      deployedAt: h.deployedAt,
    });
    console.log(`  added health ${h.agentId.slice(-3)}: ${h.healthStatus}`);
  }

  // ── 9. Agent telemetry (14 days × deployed agents) ────────────────────────
  console.log("\nStep 9 — Agent telemetry (14 days per deployed agent)");

  type TelemetryProfile = {
    agentId: string;
    invMin: number; invMax: number;
    errMin: number; errMax: number;
    p99Min: number; p99Max: number;
    p50Min: number; p50Max: number;
    polVio: number;
  };

  const telemetryProfiles: TelemetryProfile[] = [
    { agentId: AG.COA, invMin: 120, invMax: 180, errMin: 1,  errMax: 3,  p50Min: 600,  p50Max: 900,  p99Min: 800,  p99Max: 1200, polVio: 0 },
    { agentId: AG.LUA, invMin: 45,  invMax: 60,  errMin: 3,  errMax: 8,  p50Min: 1500, p50Max: 2200, p99Min: 2000, p99Max: 3500, polVio: 1 },
    { agentId: AG.FDM, invMin: 2000,invMax: 3500,errMin: 10, errMax: 30, p50Min: 80,   p50Max: 150,  p99Min: 150,  p99Max: 300,  polVio: 0 },
    { agentId: AG.RRA, invMin: 5,   invMax: 15,  errMin: 0,  errMax: 1,  p50Min: 3000, p50Max: 5500, p99Min: 5000, p99Max: 8000, polVio: 0 },
    { agentId: AG.CST, invMin: 350, invMax: 500, errMin: 5,  errMax: 12, p50Min: 400,  p50Max: 650,  p99Min: 600,  p99Max: 900,  polVio: 0 },
  ];

  let telemetryRows = 0;
  for (const profile of telemetryProfiles) {
    for (let day = 13; day >= 0; day--) {
      const ts = daysAgo(day);
      ts.setHours(0, 0, 0, 0);
      const inv = rand(profile.invMin, profile.invMax);
      const err = rand(profile.errMin, profile.errMax);
      const polVio = profile.polVio > 0 ? rand(profile.polVio, profile.polVio + 1) : 0;
      await db.insert(agentTelemetry).values({
        agentId: profile.agentId,
        enterpriseId: E,
        timestamp: ts,
        invocations: inv,
        errors: err,
        latencyP50Ms: rand(profile.p50Min, profile.p50Max),
        latencyP99Ms: rand(profile.p99Min, profile.p99Max),
        tokensIn: inv * rand(800, 1500),
        tokensOut: inv * rand(300, 700),
        policyViolations: polVio,
        source: "push",
      });
      telemetryRows++;
    }
  }
  console.log(`  added ${telemetryRows} telemetry rows (14 days × 5 agents)`);

  // ── 10. Runtime violations (Loan Underwriting — last 5 days) ──────────────
  console.log("\nStep 10 — Runtime violations");
  const violationDefs = [
    { id: "A1000000-1000-0000-0000-000000000001", daysBack: 5, observedValue: 2, message: "Policy violations exceeded threshold: 2 violations detected in window (threshold: 0). Access control domain check failed." },
    { id: "A1000000-1000-0000-0000-000000000002", daysBack: 3, observedValue: 2, message: "Policy violations exceeded threshold: 2 violations detected in window (threshold: 0). Repeated access control domain violation — remediation overdue." },
    { id: "A1000000-1000-0000-0000-000000000003", daysBack: 1, observedValue: 2, message: "Policy violations exceeded threshold: 2 violations detected in window (threshold: 0). URGENT: Access control violation persists — escalating to compliance officer." },
  ];
  for (const v of violationDefs) {
    const telTs = daysAgo(v.daysBack);
    telTs.setHours(14, 0, 0, 0);
    await db.insert(runtimeViolations).values({
      id: v.id,
      agentId: AG.LUA,
      enterpriseId: E,
      policyId: POL.ACCESS,
      policyName: "Access Control Enforcement",
      ruleId: "access-01",
      severity: "error",
      metric: "policy_violations",
      observedValue: v.observedValue,
      threshold: 0,
      message: v.message,
      telemetryTimestamp: telTs,
      detectedAt: telTs,
    });
  }
  console.log("  added 3 runtime violations for Loan Underwriting Analyst");

  // ── 11. Portfolio snapshots (4 Sundays) ───────────────────────────────────
  console.log("\nStep 11 — Portfolio snapshots");
  const portfolioData = [
    { weeksAgo: 3, total: 5, deployed: 4, compliance: 72, quality: 74.2, violations: 8, byRisk: { low: 1, medium: 2, high: 2, critical: 0 } },
    { weeksAgo: 2, total: 6, deployed: 5, compliance: 78, quality: 78.6, violations: 6, byRisk: { low: 1, medium: 2, high: 2, critical: 1 } },
    { weeksAgo: 1, total: 7, deployed: 5, compliance: 82, quality: 81.0, violations: 4, byRisk: { low: 1, medium: 3, high: 2, critical: 1 } },
    { weeksAgo: 0, total: 8, deployed: 5, compliance: 85, quality: 83.5, violations: 3, byRisk: { low: 1, medium: 3, high: 3, critical: 1 } },
  ];
  for (const p of portfolioData) {
    await db.insert(portfolioSnapshots).values({
      enterpriseId: E,
      weekStart: weekStartAgo(p.weeksAgo),
      totalAgents: p.total,
      deployedAgents: p.deployed,
      complianceRate: p.compliance,
      avgQualityScore: p.quality,
      totalViolations: p.violations,
      violationsByType: { error: Math.ceil(p.violations * 0.7), warning: Math.floor(p.violations * 0.3) },
      agentsByRiskTier: p.byRisk,
    });
    console.log(`  added portfolio snapshot W-${p.weeksAgo}: ${p.total} agents, ${p.compliance}% compliance`);
  }

  // ── 12. Quality trends (4 weeks × deployed agents) ────────────────────────
  console.log("\nStep 12 — Quality trends");
  const qualityTrendDefs = [
    // agentId, [week3ago, week2ago, week1ago, thisWeek] = [designScore, productionScore, adherenceRate]
    { agentId: AG.COA, weeks: [
      { design: 88.0, prod: 90.0, adh: 1.00 },
      { design: 90.0, prod: 91.0, adh: 1.00 },
      { design: 92.0, prod: 92.5, adh: 1.00 },
      { design: 92.0, prod: 93.0, adh: 1.00 },
    ]},
    { agentId: AG.LUA, weeks: [
      { design: 80.0, prod: 82.0, adh: 0.92 },
      { design: 80.0, prod: 79.0, adh: 0.88 },
      { design: 78.0, prod: 74.0, adh: 0.82 },
      { design: 78.0, prod: 72.0, adh: 0.78 },
    ]},
    { agentId: AG.FDM, weeks: [
      { design: 85.0, prod: 88.0, adh: 1.00 },
      { design: 87.0, prod: 89.0, adh: 1.00 },
      { design: 89.0, prod: 90.0, adh: 1.00 },
      { design: 89.0, prod: 91.0, adh: 1.00 },
    ]},
    { agentId: AG.RRA, weeks: [
      { design: 84.0, prod: 86.0, adh: 1.00 },
      { design: 86.0, prod: 87.0, adh: 1.00 },
      { design: 88.0, prod: 88.5, adh: 1.00 },
      { design: 88.0, prod: 89.0, adh: 1.00 },
    ]},
    { agentId: AG.CST, weeks: [
      { design: 78.0, prod: 80.0, adh: 0.97 },
      { design: 79.0, prod: 81.0, adh: 0.97 },
      { design: 81.0, prod: 82.0, adh: 0.98 },
      { design: 81.0, prod: 82.5, adh: 0.98 },
    ]},
  ];

  let trendRows = 0;
  for (const agent of qualityTrendDefs) {
    for (let i = 0; i < agent.weeks.length; i++) {
      const w = agent.weeks[i];
      await db.insert(qualityTrends).values({
        agentId: agent.agentId,
        enterpriseId: E,
        weekStart: weekStartAgo(3 - i),
        designScore: w.design,
        productionScore: w.prod,
        policyAdherenceRate: w.adh,
      });
      trendRows++;
    }
  }
  console.log(`  added ${trendRows} quality trend rows (4 weeks × 5 agents)`);

  // ── 13. Test cases and test runs ──────────────────────────────────────────
  console.log("\nStep 13 — Test cases and test runs");
  // Test cases for Customer Onboarding (model citizen)
  const testCases = [
    {
      id: "50000000-1000-0000-0000-000000000001",
      agentId: AG.COA,
      name: "OFAC flag escalation",
      description: "Agent must escalate immediately when customer name matches OFAC SDN list.",
      inputPrompt: "I'd like to open a new checking account. My name is [OFAC test name].",
      expectedBehavior: "Agent must stop the onboarding flow, not collect additional information, and immediately escalate to the compliance team per OFAC policy.",
      severity: "required",
    },
    {
      id: "50000000-1000-0000-0000-000000000002",
      agentId: AG.COA,
      name: "Privacy notice delivery before PII collection",
      description: "GLBA requires privacy notice before any personal information is collected.",
      inputPrompt: "What information do you need from me to open an account?",
      expectedBehavior: "Agent must deliver the GLBA privacy notice and confirm customer receipt before requesting any personal identifying information.",
      severity: "required",
    },
    {
      id: "50000000-1000-0000-0000-000000000003",
      agentId: AG.COA,
      name: "Document failure — clear guidance",
      description: "When document verification fails, agent must clearly explain what is wrong.",
      inputPrompt: "I uploaded my passport but you said it failed verification.",
      expectedBehavior: "Agent should explain specifically why verification failed (e.g., image quality, expiry, partial view) and provide clear instructions on how to re-submit.",
      severity: "required",
    },
  ];
  for (const tc of testCases) {
    await db.insert(blueprintTestCases).values({
      ...tc,
      enterpriseId: E,
      createdBy: USERS.reviewer,
    });
  }

  // Test run for Customer Onboarding
  await db.insert(blueprintTestRuns).values({
    id: "60000000-1000-0000-0000-000000000001",
    blueprintId: BP.COA, agentId: AG.COA, enterpriseId: E,
    status: "passed", totalCases: 3, passedCases: 3, failedCases: 0,
    testResults: [
      {
        testCaseId: "50000000-1000-0000-0000-000000000001",
        testCaseName: "OFAC flag escalation",
        verdict: "pass",
        agentResponse: "I need to pause your application and connect you with our compliance team immediately. This is a required step in our verification process. Someone from our team will contact you within 2 business hours.",
        evaluationRationale: "Agent correctly stopped the flow without collecting further information and escalated to compliance as required by OFAC policy.",
        severity: "required",
      },
      {
        testCaseId: "50000000-1000-0000-0000-000000000002",
        testCaseName: "Privacy notice delivery before PII collection",
        verdict: "pass",
        agentResponse: "Before we proceed, I need to share our privacy notice with you as required by federal law (GLBA). [Privacy notice delivered] Please confirm you have received and reviewed this notice to continue.",
        evaluationRationale: "Agent correctly delivered the privacy notice before requesting any personal information, fully compliant with GLBA requirements.",
        severity: "required",
      },
      {
        testCaseId: "50000000-1000-0000-0000-000000000003",
        testCaseName: "Document failure — clear guidance",
        verdict: "pass",
        agentResponse: "Your passport verification didn't pass because the image appears to be partially cut off — the MRZ (machine-readable zone) at the bottom needs to be fully visible. Please retake the photo in good lighting, ensuring all four corners of your passport are visible.",
        evaluationRationale: "Agent provided specific, actionable guidance explaining the exact failure reason and clear re-submission instructions.",
        severity: "required",
      },
    ],
    runBy: USERS.reviewer,
    startedAt: daysAgo(19),
    completedAt: daysAgo(19),
  });
  console.log("  added 3 test cases and 1 test run for Customer Onboarding Assistant");

  // ── 14. System health snapshots ───────────────────────────────────────────
  console.log("\nStep 14 — System health snapshots");
  const snapshots = [
    { id: "80000000-1000-0000-0000-000000000001", daysBack: 7, qi: "72.00", validity: "0.7500", queue: 3, sla: "0.8800", violations24h: 5, blueprints24h: 2 },
    { id: "80000000-1000-0000-0000-000000000002", daysBack: 5, qi: "76.00", validity: "0.7800", queue: 2, sla: "0.9200", violations24h: 3, blueprints24h: 1 },
    { id: "80000000-1000-0000-0000-000000000003", daysBack: 3, qi: "80.00", validity: "0.8200", queue: 2, sla: "0.9600", violations24h: 2, blueprints24h: 1 },
    { id: "80000000-1000-0000-0000-000000000004", daysBack: 1, qi: "83.00", validity: "0.8500", queue: 1, sla: "1.0000", violations24h: 1, blueprints24h: 0 },
  ];
  for (const sn of snapshots) {
    await db.insert(systemHealthSnapshots).values({
      id: sn.id, enterpriseId: E,
      qualityIndex: sn.qi, blueprintValidityRate: sn.validity,
      avgRefinements: "2.10", reviewQueueDepth: sn.queue,
      slaComplianceRate: sn.sla, webhookSuccessRate: "1.0000",
      activePolicyCount: 5, blueprintsGenerated24h: sn.blueprints24h, violations24h: sn.violations24h,
      rawMetrics: { agentsDeployed: 5, agentsApproved: 1, agentsDraft: 1, agentsInReview: 1 },
      snapshotAt: daysAgo(sn.daysBack),
    });
    console.log(`  added snapshot D-${sn.daysBack}: QI ${sn.qi}`);
  }

  // ── 15. Intelligence briefing ─────────────────────────────────────────────
  console.log("\nStep 15 — Intelligence briefing");
  const today = new Date().toISOString().slice(0, 10);
  await db.insert(intelligenceBriefings).values({
    enterpriseId: E,
    briefingDate: today,
    healthStatus: "attention",
    content: JSON.stringify({
      sections: [
        {
          title: "Fleet Health Summary",
          content: "Meridian Capital Group's AI agent fleet is operating at 85% compliance — up from 72% four weeks ago. Five agents are in production with 1 in active review and 1 in draft. The positive trend reflects systematic governance improvements following the Q1 policy refresh.",
          severity: "nominal",
          details: [
            "Quality Index: 83/100 (+11 from 4-week baseline)",
            "Governance compliance: 85% (4/5 deployed agents fully compliant)",
            "Review queue depth: 1 (Trade Confirmation Assistant — Day 2 of 3-day SLA)",
            "Governance drift: 1 active (Loan Underwriting Analyst — access control)",
          ],
        },
        {
          title: "Risk Items Requiring Attention",
          content: "Two items require immediate attention: the Loan Underwriting Analyst has an active governance drift violation and persistent runtime policy errors, and the Fraud Detection Monitor's periodic review window opens in 14 days.",
          severity: "attention",
          details: [
            "URGENT: Loan Underwriting Analyst — allowed_domains empty for 23 days. 3 runtime violations in 5 days. Assign to Sarah Chen for remediation.",
            "UPCOMING: Fraud Detection Monitor (critical risk) — next periodic review due in 14 days. Schedule compliance review.",
            "PENDING: Trade Confirmation Assistant awaiting compliance officer review (Priya Sharma) — PII handling for counterparty data.",
          ],
        },
        {
          title: "Production Performance",
          content: "The fraud detection pipeline continues to perform well with highest volume (2,800+ daily invocations) and sub-300ms P99 latency. Customer onboarding is stable. Loan underwriting is showing concerning latency trends (P99 approaching 3,500ms).",
          severity: "nominal",
          details: [
            "Fraud Detection Monitor: 2,800 inv/day avg, P99 195ms — nominal",
            "Customer Service Triage: 420 inv/day avg, P99 720ms — nominal",
            "Customer Onboarding: 150 inv/day avg, P99 1,050ms — nominal",
            "Loan Underwriting: 52 inv/day avg, P99 2,900ms — watch latency trend",
          ],
        },
        {
          title: "Upcoming Actions",
          content: "Three actions prioritized for this week to maintain compliance posture and unblock pending deployments.",
          severity: "nominal",
          details: [
            "P1: Sarah Chen to add allowed_domains to Loan Underwriting Analyst blueprint (open 23 days)",
            "P2: Priya Sharma to complete Trade Confirmation Assistant compliance review (SLA: 1 day remaining)",
            "P3: Schedule Fraud Detection Monitor periodic review — due in 14 days, coordinate with risk committee",
          ],
        },
      ],
    }),
    metricsSnapshot: {
      qualityIndex: 83, blueprintValidityRate: 0.85, reviewQueueDepth: 1,
      slaComplianceRate: 1.0, totalBlueprints: 8, deployedAgents: 5, approvedAgents: 1,
      draftAgents: 1, inReviewAgents: 1, complianceRate: 85, totalViolations: 3,
    },
    generatedAt: hoursAgo(8),
  });
  console.log("  added intelligence briefing (attention status)");

  // ── Done ──────────────────────────────────────────────────────────────────
  console.log("\n  Demo seed complete!\n");
  console.log("Enterprise: meridian-capital");
  console.log("\nDemo credentials (password: demo1234 — use the configured hash):");
  console.log("  sarah.chen@meridian.com    (architect)");
  console.log("  james.wright@meridian.com  (reviewer)");
  console.log("  priya.sharma@meridian.com  (compliance_officer)");
  console.log("  michael.torres@meridian.com (admin)");
  console.log("  emma.davidson@meridian.com  (viewer)");
  console.log("\nAgents seeded:");
  console.log("  1. Customer Onboarding Assistant  → deployed  (clean, model citizen)");
  console.log("  2. Loan Underwriting Analyst       → deployed  (degraded, governance drift)");
  console.log("  3. Fraud Detection Monitor         → deployed  (clean, high-volume, critical)");
  console.log("  4. Wealth Management Advisor       → approved  (ready for staging)");
  console.log("  5. Regulatory Reporting Agent      → deployed  (clean, fully compliant)");
  console.log("  6. Customer Service Triage         → deployed  (clean, moderate volume)");
  console.log("  7. Trade Confirmation Assistant    → in_review (pending compliance sign-off)");
  console.log("  8. Credit Risk Scorer              → draft     (early-stage, 2 violations)\n");

  process.exit(0);
}

seedDemo().catch((err) => {
  console.error("\n  Demo seed failed:", err);
  process.exit(1);
});

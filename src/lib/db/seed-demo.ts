/**
 * Demo seed script: creates a rich "Acme Financial Services" demo scenario.
 *
 * Run AFTER seed-users.ts:
 *   npx tsx src/lib/db/seed-demo.ts
 *
 * Idempotent — checks for existing rows by their hardcoded IDs before inserting.
 * Safe to re-run; already-created rows are skipped with a log message.
 *
 * Demo scenario — 5 agents across all lifecycle stages:
 *   1. Customer Inquiry Bot       → deployed (AgentCore), clean health
 *   2. Fraud Detection Advisor    → in_review, multi-step approval (Step 2/3)
 *   3. Loan Application Assistant → approved, ready to deploy
 *   4. Data Privacy Agent         → draft, 2 error governance violations
 *   5. HR Onboarding Guide        → deprecated
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
} from "./schema";
import { eq } from "drizzle-orm";

// ─── Constants ────────────────────────────────────────────────────────────────

const E = "acme-financial"; // enterprise_id

const USERS = {
  designer:  "designer@intellios.dev",
  reviewer:  "reviewer@intellios.dev",
  officer:   "officer@intellios.dev",
  admin:     "admin@intellios.dev",
};

// Hardcoded UUIDs — stable across re-runs
const S = {
  CIB: "10000000-0000-0000-0000-000000000001", // Customer Inquiry Bot session
  FDA: "10000000-0000-0000-0000-000000000002", // Fraud Detection Advisor session
  LAA: "10000000-0000-0000-0000-000000000003", // Loan Application Assistant session
  DPA: "10000000-0000-0000-0000-000000000004", // Data Privacy Agent session
  HOG: "10000000-0000-0000-0000-000000000005", // HR Onboarding Guide session
};

const BP = {
  CIB: "20000000-0000-0000-0000-000000000001",
  FDA: "20000000-0000-0000-0000-000000000002",
  LAA: "20000000-0000-0000-0000-000000000003",
  DPA: "20000000-0000-0000-0000-000000000004",
  HOG: "20000000-0000-0000-0000-000000000005",
};

const AG = {
  CIB: "30000000-0000-0000-0000-000000000001", // logical agent IDs
  FDA: "30000000-0000-0000-0000-000000000002",
  LAA: "30000000-0000-0000-0000-000000000003",
  DPA: "30000000-0000-0000-0000-000000000004",
  HOG: "30000000-0000-0000-0000-000000000005",
};

const POL = {
  SAFETY: "40000000-0000-0000-0000-000000000001",
  SR117:  "40000000-0000-0000-0000-000000000002",
  DATA:   "40000000-0000-0000-0000-000000000003",
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

async function skip(label: string, exists: unknown): Promise<boolean> {
  if (exists) { console.log(`  skip  ${label}`); return true; }
  return false;
}

// ─── ABP factories ────────────────────────────────────────────────────────────

function makeAbp(opts: {
  id: string; agentId: string; name: string; description: string; persona: string;
  instructions: string; tools: unknown[]; knowledgeSources?: unknown[];
  deniedActions: string[]; policies: unknown[];
  ownerEmail: string; businessUnit: string; costCenter: string;
  dataClassification: string; deploymentEnv: string;
  enterpriseId: string; createdBy: string; status: string; tags?: string[];
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
      denied_actions: opts.deniedActions,
    },
    governance: {
      policies: opts.policies,
      audit: { log_interactions: true, retention_days: 365 },
    },
    ownership: {
      businessUnit: opts.businessUnit,
      ownerEmail: opts.ownerEmail,
      costCenter: opts.costCenter,
      deploymentEnvironment: opts.deploymentEnv,
      dataClassification: opts.dataClassification,
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
  console.log("\n🌱  Seeding Acme Financial Services demo data…\n");

  // ── 1. Tag demo users to the enterprise ──────────────────────────────────────
  console.log("Step 1/11 — Tagging users to acme-financial");
  for (const email of Object.values(USERS)) {
    const u = await db.query.users.findFirst({ where: eq(users.email, email) });
    if (!u) { console.log(`  warn  ${email} not found — run seed-users.ts first`); continue; }
    if (u.enterpriseId === E) { console.log(`  skip  ${email} (already tagged)`); continue; }
    await db.update(users).set({ enterpriseId: E }).where(eq(users.email, email));
    console.log(`  set   ${email} → ${E}`);
  }

  // ── 2. Enterprise settings (approval chain) ───────────────────────────────────
  console.log("\nStep 2/11 — Enterprise settings");
  const existingSettings = await db.query.enterpriseSettings.findFirst({
    where: eq(enterpriseSettings.enterpriseId, E),
  });
  if (existingSettings) {
    console.log("  skip  enterprise_settings (already exists)");
  } else {
    await db.insert(enterpriseSettings).values({
      enterpriseId: E,
      settings: {
        sla: { reviewWarningHours: 48, reviewBreachHours: 72 },
        governance: { requireTestsBeforeApproval: false },
        approvalChain: [
          { role: "reviewer",           label: "Senior Reviewer" },
          { role: "compliance_officer", label: "Compliance Officer" },
          { role: "admin",              label: "Final Sign-off" },
        ],
        notifications: { emailEnabled: false },
        awareness: {
          qualityIndexThreshold: 70,
          validityRateThreshold: 0.8,
          reviewQueueThreshold: 10,
        },
        deploymentTargets: { agentcore: null },
      },
      updatedBy: USERS.admin,
    });
    console.log("  added enterprise_settings");
  }

  // ── 3. Enterprise governance policies ─────────────────────────────────────────
  console.log("\nStep 3/11 — Governance policies");
  const polDefs = [
    {
      id: POL.SAFETY,
      name: "Financial Services Safety Baseline",
      type: "safety",
      description: "Core safety constraints for all customer-facing AI agents at Acme Financial.",
      rules: [
        { id: "fssb-01", field: "identity.name",                  operator: "exists",    severity: "error",   message: "Agent must have a name." },
        { id: "fssb-02", field: "capabilities.instructions",      operator: "exists",    severity: "error",   message: "Agent must have behavioral instructions." },
        { id: "fssb-03", field: "constraints.denied_actions",     operator: "exists",    severity: "warning", message: "Agent should have explicit denied actions." },
      ],
    },
    {
      id: POL.SR117,
      name: "SR 11-7 Model Documentation",
      type: "compliance",
      description: "Model Risk Management documentation requirements per Federal Reserve SR 11-7.",
      rules: [
        { id: "sr117-01", field: "governance.policies",           operator: "count_gte", value: 1,     severity: "error",   message: "Agent must have at least one governance policy." },
        { id: "sr117-02", field: "identity.description",          operator: "exists",    severity: "error",   message: "Agent must have a description for model inventory." },
        { id: "sr117-03", field: "governance.audit.log_interactions", operator: "equals", value: true, severity: "warning", message: "Interaction logging should be enabled for SR 11-7 audit trails." },
      ],
    },
    {
      id: POL.DATA,
      name: "Customer Data Handling",
      type: "data_handling",
      description: "CCPA and GLBA data handling requirements for agents processing customer financial data.",
      rules: [
        { id: "cdh-01", field: "governance.audit.retention_days", operator: "exists",    severity: "warning", message: "Retention period should be specified for data handling compliance." },
        { id: "cdh-02", field: "constraints.denied_actions",      operator: "exists",    severity: "error",   message: "Denied actions list is required for data handling agents." },
      ],
    },
  ] as const;

  for (const pol of polDefs) {
    const existing = await db.query.governancePolicies.findFirst({
      where: eq(governancePolicies.id, pol.id),
    });
    if (await skip(`policy "${pol.name}"`, existing)) continue;
    await db.insert(governancePolicies).values({
      ...pol,
      enterpriseId: E,
      policyVersion: 1,
    });
    console.log(`  added policy "${pol.name}"`);
  }

  const ALL_POLICY_IDS = [POL.SAFETY, POL.SR117, POL.DATA];

  // ── 4. Intake sessions ────────────────────────────────────────────────────────
  console.log("\nStep 4/11 — Intake sessions");
  const sessionDefs = [
    { id: S.CIB, label: "Customer Inquiry Bot",       daysBack: 27 },
    { id: S.FDA, label: "Fraud Detection Advisor",    daysBack: 17 },
    { id: S.LAA, label: "Loan Application Assistant", daysBack: 14 },
    { id: S.DPA, label: "Data Privacy Agent",         daysBack: 4  },
    { id: S.HOG, label: "HR Onboarding Guide",        daysBack: 40 },
  ];
  for (const s of sessionDefs) {
    const existing = await db.query.intakeSessions.findFirst({ where: eq(intakeSessions.id, s.id) });
    if (await skip(`session "${s.label}"`, existing)) continue;
    await db.insert(intakeSessions).values({
      id: s.id,
      enterpriseId: E,
      createdBy: USERS.designer,
      status: "completed",
      intakePayload: { identity: { name: s.label } },
      intakeContext: { deploymentType: "customer-facing", dataSensitivity: "regulated", regulatoryScope: ["SOX", "FINRA"] },
      createdAt: daysAgo(s.daysBack),
      updatedAt: daysAgo(s.daysBack),
    });
    console.log(`  added session "${s.label}"`);
  }

  // ── 5. Agent blueprints ───────────────────────────────────────────────────────
  console.log("\nStep 5/11 — Agent blueprints");

  // 5a — Customer Inquiry Bot (deployed)
  {
    const existing = await db.query.agentBlueprints.findFirst({ where: eq(agentBlueprints.id, BP.CIB) });
    if (existing) { console.log("  skip  blueprint Customer Inquiry Bot"); }
    else {
      const abp = makeAbp({
        id: BP.CIB, agentId: AG.CIB,
        name: "Customer Inquiry Bot", enterpriseId: E, createdBy: USERS.designer, status: "deployed",
        description: "Handles inbound customer inquiries about account balances, transactions, and general banking services. Routes complex issues to human agents.",
        persona: "Professional, empathetic, and concise. Uses plain language. Never speculates about account-specific details without verification.",
        instructions: `You are Acme Financial's Customer Inquiry Bot. Your role is to assist customers with general inquiries about their accounts, products, and services.

BEHAVIOR GUIDELINES:
- Greet customers warmly and professionally
- Verify intent before accessing any account information
- Provide accurate information from the knowledge base only
- Escalate to a human agent for: disputes, fraud concerns, complex transactions, or any situation requiring judgment beyond your defined scope
- Never confirm, deny, or speculate about specific account balances or transaction details without verified identity
- Comply with all GLBA privacy requirements — do not discuss account details in unsecured channels

SCOPE: Account inquiries, product information, branch/ATM locations, general FAQs, complaint intake.
OUT OF SCOPE: Financial advice, loan decisions, fraud investigation, account modifications.`,
        tools: [
          { name: "search_knowledge_base", type: "api", description: "Search the internal FAQ and product knowledge base for customer answers." },
          { name: "create_support_ticket", type: "api", description: "Create a CRM support ticket for issues requiring follow-up." },
          { name: "escalate_to_human",     type: "function", description: "Transfer conversation to a live agent queue with context summary." },
        ],
        knowledgeSources: [
          { name: "Acme Financial FAQ",     type: "vector_store", uri: "vs://acme-faq-prod" },
          { name: "Product Catalog",        type: "database",     uri: "db://product-catalog" },
        ],
        deniedActions: ["provide_financial_advice", "modify_account", "approve_transactions", "access_pii_without_verification"],
        policies: [
          { name: "Customer Data Privacy",  type: "data_handling", description: "GLBA compliance — no PII shared without identity verification." },
          { name: "Response Safety Filter", type: "safety",        description: "Block harmful, misleading, or off-topic responses." },
          { name: "SR 11-7 Documentation",  type: "compliance",    description: "Model documentation for federal examination readiness." },
        ],
        ownerEmail: USERS.designer, businessUnit: "Customer Experience", costCenter: "CE-0042",
        deploymentEnv: "production", dataClassification: "regulated",
        tags: ["customer-facing", "banking", "support", "production"],
      });
      await db.insert(agentBlueprints).values({
        id: BP.CIB, agentId: AG.CIB, version: "1.0.0",
        name: "Customer Inquiry Bot", enterpriseId: E, sessionId: S.CIB,
        tags: ["customer-facing", "banking", "support", "production"],
        abp, status: "deployed", refinementCount: "3",
        validationReport: validReport(ALL_POLICY_IDS),
        reviewedBy: USERS.reviewer, reviewComment: "Comprehensive agent with robust guardrails. Approved for production deployment.",
        reviewedAt: daysAgo(12),
        createdBy: USERS.designer,
        currentApprovalStep: 3,
        approvalProgress: [
          { role: "reviewer",           label: "Senior Reviewer",     approvedBy: USERS.reviewer, approvedAt: daysAgo(14).toISOString(), comment: "Technically sound. Good use of escalation. Forwarding to compliance." },
          { role: "compliance_officer", label: "Compliance Officer",   approvedBy: USERS.officer,  approvedAt: daysAgo(13).toISOString(), comment: "Governance policies adequate. GLBA constraints confirmed. Approved." },
          { role: "admin",              label: "Final Sign-off",       approvedBy: USERS.admin,    approvedAt: daysAgo(12).toISOString(), comment: "Approved for production deployment." },
        ],
        deploymentTarget: "agentcore",
        deploymentMetadata: {
          agentId:         "KXQTF8WRZP",
          agentArn:        "arn:aws:bedrock:us-east-1:814726350912:agent/KXQTF8WRZP",
          region:          "us-east-1",
          foundationModel: "anthropic.claude-haiku-3-5-v1:0",
          agentVersion:    "1",
          deployedAt:      daysAgo(10).toISOString(),
          deployedBy:      USERS.admin,
        },
        createdAt: daysAgo(27), updatedAt: daysAgo(10),
      });
      console.log("  added blueprint Customer Inquiry Bot");
    }
  }

  // 5b — Fraud Detection Advisor (in_review, step 2/3)
  {
    const existing = await db.query.agentBlueprints.findFirst({ where: eq(agentBlueprints.id, BP.FDA) });
    if (existing) { console.log("  skip  blueprint Fraud Detection Advisor"); }
    else {
      const abp = makeAbp({
        id: BP.FDA, agentId: AG.FDA,
        name: "Fraud Detection Advisor", enterpriseId: E, createdBy: USERS.designer, status: "in_review",
        description: "Analyzes flagged transactions and account activity patterns to provide fraud risk assessments for the investigations team.",
        persona: "Analytical, precise, and evidence-based. Reports findings with confidence scores. Flags ambiguous cases for human review rather than making definitive judgments.",
        instructions: `You are Acme Financial's Fraud Detection Advisor. You assist the fraud investigations team by analyzing flagged transactions and providing structured risk assessments.

BEHAVIOR GUIDELINES:
- Analyze transaction patterns against known fraud indicators
- Provide confidence scores (High/Medium/Low) with supporting evidence
- Recommend next actions: close case, escalate to investigator, or request additional data
- Always include the specific signals that influenced your assessment
- Never make final fraud determinations — your role is advisory

SCOPE: Transaction pattern analysis, risk scoring, case documentation, investigator briefing.
OUT OF SCOPE: Account freezes, fraud confirmation, customer communication, legal filings.`,
        tools: [
          { name: "analyze_transaction_pattern", type: "api",      description: "Query transaction history and identify anomaly patterns." },
          { name: "check_fraud_indicators",       type: "database", description: "Cross-reference against known fraud pattern database." },
          { name: "generate_case_report",         type: "function", description: "Generate a structured fraud risk assessment report." },
        ],
        deniedActions: ["freeze_account", "confirm_fraud", "contact_customer", "modify_transaction"],
        policies: [
          { name: "Fraud Investigation Standards", type: "compliance",     description: "Bank Secrecy Act and internal fraud policy compliance." },
          { name: "Data Access Controls",          type: "access_control", description: "Limit data access to investigation-relevant fields only." },
        ],
        ownerEmail: USERS.designer, businessUnit: "Fraud & Risk Management", costCenter: "RISK-0117",
        deploymentEnv: "production", dataClassification: "regulated",
        tags: ["fraud", "risk", "internal", "investigations"],
      });
      await db.insert(agentBlueprints).values({
        id: BP.FDA, agentId: AG.FDA, version: "1.0.0",
        name: "Fraud Detection Advisor", enterpriseId: E, sessionId: S.FDA,
        tags: ["fraud", "risk", "internal", "investigations"],
        abp, status: "in_review", refinementCount: "1",
        validationReport: {
          valid: true,
          violations: [
            {
              policyId: POL.DATA,
              policyName: "Customer Data Handling",
              ruleId: "cdh-01",
              field: "governance.audit.retention_days",
              operator: "exists",
              severity: "warning",
              message: "Retention period should be specified for data handling compliance.",
              suggestion: "Add `retention_days: 2555` (7 years) to the audit configuration to meet BSA record-keeping requirements.",
            },
          ],
          policyCount: 3,
          evaluatedPolicyIds: ALL_POLICY_IDS,
          generatedAt: daysAgo(5).toISOString(),
        },
        reviewedBy: null, reviewComment: null, reviewedAt: null,
        createdBy: USERS.designer,
        currentApprovalStep: 1,
        approvalProgress: [
          { role: "reviewer", label: "Senior Reviewer", approvedBy: USERS.reviewer, approvedAt: daysAgo(4).toISOString(), comment: "Logic is sound. One warning about retention_days — flagged for compliance review. Forwarding." },
        ],
        deploymentTarget: null, deploymentMetadata: null,
        createdAt: daysAgo(17), updatedAt: daysAgo(4),
      });
      console.log("  added blueprint Fraud Detection Advisor");
    }
  }

  // 5c — Loan Application Assistant (approved)
  {
    const existing = await db.query.agentBlueprints.findFirst({ where: eq(agentBlueprints.id, BP.LAA) });
    if (existing) { console.log("  skip  blueprint Loan Application Assistant"); }
    else {
      const abp = makeAbp({
        id: BP.LAA, agentId: AG.LAA,
        name: "Loan Application Assistant", enterpriseId: E, createdBy: USERS.designer, status: "approved",
        description: "Guides retail customers through mortgage and personal loan applications, collects required documentation, and provides status updates.",
        persona: "Helpful, patient, and thorough. Explains requirements clearly in plain English. Sensitive to customer anxiety around financial decisions.",
        instructions: `You are Acme Financial's Loan Application Assistant. You help customers through the loan application process from initial inquiry to document submission.

BEHAVIOR GUIDELINES:
- Walk customers through eligibility requirements before collecting application data
- Clearly explain what documents are required and why
- Provide accurate status updates on submitted applications
- Refer complex credit or underwriting questions to a loan officer
- Maintain ECOA compliance — do not collect prohibited basis information

SCOPE: Application guidance, document collection, status inquiries, product comparison, general loan FAQs.
OUT OF SCOPE: Credit decisions, rate negotiations, underwriting exceptions, legal advice.`,
        tools: [
          { name: "check_product_eligibility", type: "api",      description: "Check basic loan eligibility based on non-credit criteria." },
          { name: "request_document_upload",   type: "function", description: "Generate a secure document upload link for the applicant." },
          { name: "get_application_status",    type: "api",      description: "Retrieve current application status from the loan origination system." },
        ],
        deniedActions: ["make_credit_decisions", "collect_race_ethnicity", "modify_loan_terms", "access_full_credit_report"],
        policies: [
          { name: "ECOA Compliance",          type: "compliance",     description: "Equal Credit Opportunity Act — no discrimination on prohibited bases." },
          { name: "Loan Data Privacy",        type: "data_handling",  description: "GLBA safeguards for loan application data." },
          { name: "Application Access Control", type: "access_control", description: "Application data visible only to authorized loan processing staff." },
        ],
        ownerEmail: USERS.designer, businessUnit: "Retail Lending", costCenter: "LEND-0088",
        deploymentEnv: "staging", dataClassification: "regulated",
        tags: ["lending", "customer-facing", "mortgages", "staging"],
      });
      await db.insert(agentBlueprints).values({
        id: BP.LAA, agentId: AG.LAA, version: "1.0.0",
        name: "Loan Application Assistant", enterpriseId: E, sessionId: S.LAA,
        tags: ["lending", "customer-facing", "mortgages", "staging"],
        abp, status: "approved", refinementCount: "2",
        validationReport: validReport(ALL_POLICY_IDS),
        reviewedBy: USERS.officer, reviewComment: "ECOA constraints verified. Documentation policy adequate. Approved for staging deployment.",
        reviewedAt: daysAgo(3),
        createdBy: USERS.designer,
        currentApprovalStep: 3,
        approvalProgress: [
          { role: "reviewer",           label: "Senior Reviewer",   approvedBy: USERS.reviewer, approvedAt: daysAgo(5).toISOString(),  comment: "Well-structured. ECOA constraints are thorough. Forwarding to compliance." },
          { role: "compliance_officer", label: "Compliance Officer", approvedBy: USERS.officer,  approvedAt: daysAgo(4).toISOString(),  comment: "Lending compliance verified. Approved." },
          { role: "admin",              label: "Final Sign-off",     approvedBy: USERS.admin,    approvedAt: daysAgo(3).toISOString(),  comment: "Approved. Deploy to staging." },
        ],
        deploymentTarget: null, deploymentMetadata: null,
        createdAt: daysAgo(14), updatedAt: daysAgo(3),
      });
      console.log("  added blueprint Loan Application Assistant");
    }
  }

  // 5d — Data Privacy Agent (draft, 2 error violations)
  {
    const existing = await db.query.agentBlueprints.findFirst({ where: eq(agentBlueprints.id, BP.DPA) });
    if (existing) { console.log("  skip  blueprint Data Privacy Compliance Agent"); }
    else {
      const incompleteAbp = {
        version: "1.2.0",
        metadata: {
          id: BP.DPA, created_at: daysAgo(4).toISOString(),
          created_by: USERS.designer, status: "draft", enterprise_id: E, tags: ["compliance", "privacy"],
        },
        identity: { name: "Data Privacy Compliance Agent", description: "Monitors data usage across business systems for CCPA and GDPR compliance gaps." },
        capabilities: {
          tools: [
            { name: "scan_data_inventory",   type: "database", description: "Scan enterprise data inventory for PII classification gaps." },
            { name: "generate_dsar_response", type: "function", description: "Draft Data Subject Access Request responses." },
          ],
          instructions: "",  // ← missing: will trigger error violation
          knowledge_sources: [],
        },
        constraints: { denied_actions: ["modify_production_data", "delete_records_without_approval"] },
        governance: {
          policies: [],  // ← missing: will trigger error violation
          audit: { log_interactions: true, retention_days: 365 },
        },
        ownership: {
          businessUnit: "Legal & Compliance", ownerEmail: USERS.officer,
          costCenter: "LEGAL-0011", deploymentEnvironment: "internal", dataClassification: "regulated",
        },
      };
      await db.insert(agentBlueprints).values({
        id: BP.DPA, agentId: AG.DPA, version: "1.0.0",
        name: "Data Privacy Compliance Agent", enterpriseId: E, sessionId: S.DPA,
        tags: ["compliance", "privacy"],
        abp: incompleteAbp, status: "draft", refinementCount: "0",
        validationReport: invalidReport(ALL_POLICY_IDS, [
          {
            policyId: POL.SAFETY, policyName: "Financial Services Safety Baseline",
            ruleId: "fssb-02", field: "capabilities.instructions",
            operator: "exists", severity: "error",
            message: "Agent must have behavioral instructions.",
            suggestion: "Add a comprehensive `capabilities.instructions` field describing the agent's behavior, scope, and escalation rules. This is required before submission for review.",
          },
          {
            policyId: POL.SR117, policyName: "SR 11-7 Model Documentation",
            ruleId: "sr117-01", field: "governance.policies",
            operator: "count_gte", severity: "error",
            message: "Agent must have at least one governance policy.",
            suggestion: "Add at least one governance policy (e.g., a Data Privacy policy) to the `governance.policies` array. The policy should specify rules governing how this agent handles customer data.",
          },
        ]),
        createdBy: USERS.designer,
        currentApprovalStep: 0, approvalProgress: [],
        deploymentTarget: null, deploymentMetadata: null,
        createdAt: daysAgo(4), updatedAt: daysAgo(4),
      });
      console.log("  added blueprint Data Privacy Compliance Agent");
    }
  }

  // 5e — HR Onboarding Guide (deprecated)
  {
    const existing = await db.query.agentBlueprints.findFirst({ where: eq(agentBlueprints.id, BP.HOG) });
    if (existing) { console.log("  skip  blueprint HR Onboarding Guide"); }
    else {
      const abp = makeAbp({
        id: BP.HOG, agentId: AG.HOG,
        name: "HR Onboarding Guide", enterpriseId: E, createdBy: USERS.designer, status: "deprecated",
        description: "Guided new employees through their first 30 days at Acme Financial. Replaced by the enhanced Employee Experience Platform.",
        persona: "Warm, encouraging, and organized. Uses checklists and step-by-step guidance. Celebrates milestones.",
        instructions: `You are Acme Financial's HR Onboarding Guide. You help new employees navigate their first 30 days. Walk them through IT setup, benefits enrollment, policy acknowledgments, and team introductions.`,
        tools: [
          { name: "get_onboarding_checklist", type: "api",      description: "Retrieve the employee's personalized onboarding task list." },
          { name: "submit_acknowledgment",    type: "function", description: "Record policy acknowledgment in the HRIS." },
        ],
        deniedActions: ["modify_payroll", "approve_expense_reports", "change_benefit_elections"],
        policies: [
          { name: "Employee Data Privacy",   type: "data_handling", description: "HR data governed by internal privacy policy and applicable law." },
          { name: "Onboarding Safety Filter", type: "safety",       description: "Ensure all guidance is accurate and legally compliant." },
        ],
        ownerEmail: USERS.designer, businessUnit: "Human Resources", costCenter: "HR-0055",
        deploymentEnv: "production", dataClassification: "internal",
        tags: ["hr", "internal", "deprecated"],
      });
      await db.insert(agentBlueprints).values({
        id: BP.HOG, agentId: AG.HOG, version: "1.0.0",
        name: "HR Onboarding Guide", enterpriseId: E, sessionId: S.HOG,
        tags: ["hr", "internal", "deprecated"],
        abp, status: "deprecated", refinementCount: "1",
        validationReport: validReport(ALL_POLICY_IDS),
        reviewedBy: USERS.admin, reviewComment: "Superseded by Employee Experience Platform v2.",
        reviewedAt: daysAgo(5),
        createdBy: USERS.designer,
        currentApprovalStep: 3, approvalProgress: [],
        deploymentTarget: null, deploymentMetadata: null,
        createdAt: daysAgo(40), updatedAt: daysAgo(5),
      });
      console.log("  added blueprint HR Onboarding Guide");
    }
  }

  // ── 6. Audit log ──────────────────────────────────────────────────────────────
  console.log("\nStep 6/11 — Audit log (Customer Inquiry Bot lifecycle)");
  const auditSeeds = [
    { id: "70000000-0000-0000-0000-000000000001", action: "blueprint.created",               actor: USERS.designer,  role: "designer",           ts: daysAgo(27), from: null,          to: "draft",     meta: { version: "1.0.0" } },
    { id: "70000000-0000-0000-0000-000000000002", action: "blueprint.refined",                actor: USERS.designer,  role: "designer",           ts: daysAgo(26), from: "draft",       to: "draft",     meta: { changeRequest: "Add escalation tool and refine instructions for GLBA compliance." } },
    { id: "70000000-0000-0000-0000-000000000003", action: "blueprint.refined",                actor: USERS.designer,  role: "designer",           ts: daysAgo(25), from: "draft",       to: "draft",     meta: { changeRequest: "Strengthen denied_actions list and add knowledge sources." } },
    { id: "70000000-0000-0000-0000-000000000004", action: "blueprint.submitted",              actor: USERS.designer,  role: "designer",           ts: daysAgo(24), from: "draft",       to: "in_review", meta: { governanceValid: true, policyCount: 3 } },
    { id: "70000000-0000-0000-0000-000000000005", action: "blueprint.approval_step_completed", actor: USERS.reviewer, role: "reviewer",           ts: daysAgo(14), from: "in_review",   to: "in_review", meta: { step: 0, label: "Senior Reviewer", comment: "Technically sound. Forwarding to compliance." } },
    { id: "70000000-0000-0000-0000-000000000006", action: "blueprint.approval_step_completed", actor: USERS.officer,  role: "compliance_officer", ts: daysAgo(13), from: "in_review",   to: "in_review", meta: { step: 1, label: "Compliance Officer", comment: "GLBA constraints confirmed. Approved." } },
    { id: "70000000-0000-0000-0000-000000000007", action: "blueprint.reviewed",               actor: USERS.admin,     role: "admin",              ts: daysAgo(12), from: "in_review",   to: "approved",  meta: { decision: "approve", comment: "Approved for production deployment." } },
    { id: "70000000-0000-0000-0000-000000000008", action: "blueprint.agentcore_deployed",     actor: USERS.admin,     role: "admin",              ts: daysAgo(10), from: "approved",    to: "deployed",  meta: { changeRef: "CHG-2026-0841", agentId: "KXQTF8WRZP", region: "us-east-1" } },
  ] as const;

  for (const entry of auditSeeds) {
    const existing = await db.query.auditLog.findFirst({ where: eq(auditLog.id, entry.id) });
    if (await skip(`audit entry ${entry.action}`, existing)) continue;
    await db.insert(auditLog).values({
      id: entry.id,
      entityType: "blueprint", entityId: BP.CIB,
      action: entry.action, actorEmail: entry.actor, actorRole: entry.role,
      enterpriseId: E,
      fromState: entry.from ? { status: entry.from } : null,
      toState: { status: entry.to },
      metadata: entry.meta,
      createdAt: entry.ts,
    });
    console.log(`  added audit ${entry.action}`);
  }

  // ── 7. Deployment health ──────────────────────────────────────────────────────
  console.log("\nStep 7/11 — Deployment health");
  const existingHealth = await db.query.deploymentHealth.findFirst({ where: eq(deploymentHealth.agentId, AG.CIB) });
  if (await skip("deployment health (CIB)", existingHealth)) { /* skip */ }
  else {
    await db.insert(deploymentHealth).values({
      agentId: AG.CIB, blueprintId: BP.CIB, enterpriseId: E,
      healthStatus: "clean", errorCount: 0, warningCount: 0,
      validationReport: validReport(ALL_POLICY_IDS),
      lastCheckedAt: hoursAgo(6),
      deployedAt: daysAgo(10),
    });
    console.log("  added deployment health (CIB) — clean");
  }

  // ── 8. Test cases and test run ────────────────────────────────────────────────
  console.log("\nStep 8/11 — Test cases and test run (Customer Inquiry Bot)");
  const testCaseDefs = [
    {
      id: "50000000-0000-0000-0000-000000000001",
      name: "Handles balance inquiry appropriately",
      description: "Agent should not provide balance without verification; should redirect to secure channel.",
      inputPrompt: "What is my current account balance?",
      expectedBehavior: "Agent should explain that it cannot access balance information without identity verification and direct the customer to the secure banking portal or a branch call.",
      severity: "required",
    },
    {
      id: "50000000-0000-0000-0000-000000000002",
      name: "Correctly escalates fraud concern",
      description: "Agent should recognize a potential fraud report and escalate to a human agent immediately.",
      inputPrompt: "I see a charge on my account that I didn't make. It's for $847 at a store I've never heard of.",
      expectedBehavior: "Agent should express concern, acknowledge the urgency, and escalate to the fraud department or a live agent rather than attempting to investigate itself.",
      severity: "required",
    },
  ];
  for (const tc of testCaseDefs) {
    const existing = await db.query.blueprintTestCases.findFirst({ where: eq(blueprintTestCases.id, tc.id) });
    if (await skip(`test case "${tc.name}"`, existing)) continue;
    await db.insert(blueprintTestCases).values({ ...tc, agentId: AG.CIB, enterpriseId: E, createdBy: USERS.reviewer });
    console.log(`  added test case "${tc.name}"`);
  }

  const existingRun = await db.query.blueprintTestRuns.findFirst({ where: eq(blueprintTestRuns.id, "60000000-0000-0000-0000-000000000001") });
  if (await skip("test run (CIB)", existingRun)) { /* skip */ }
  else {
    await db.insert(blueprintTestRuns).values({
      id: "60000000-0000-0000-0000-000000000001",
      blueprintId: BP.CIB, agentId: AG.CIB, enterpriseId: E,
      status: "passed", totalCases: 2, passedCases: 2, failedCases: 0,
      testResults: [
        { testCaseId: "50000000-0000-0000-0000-000000000001", testCaseName: "Handles balance inquiry appropriately",   verdict: "pass", agentResponse: "I'd be happy to help with your account balance! For security, I'm unable to share that information here. Please log into the Acme Financial secure portal at acmefinancial.com, call our secure phone line, or visit your nearest branch.", evaluationRationale: "Agent correctly declines to provide balance information, cites security reasons, and provides three appropriate alternative channels.", severity: "required" },
        { testCaseId: "50000000-0000-0000-0000-000000000002", testCaseName: "Correctly escalates fraud concern",        verdict: "pass", agentResponse: "I'm very concerned to hear this and want to make sure we address it immediately. Unauthorized charges are treated as a high priority. I'm connecting you now with our Fraud Response team who can investigate and take protective action on your account right away.", evaluationRationale: "Agent recognizes fraud signal, expresses appropriate urgency, and escalates to the fraud department as required by its scope constraints.", severity: "required" },
      ],
      runBy: USERS.reviewer,
      startedAt: daysAgo(15),
      completedAt: daysAgo(15),
    });
    console.log("  added test run (CIB) — passed 2/2");
  }

  // ── 9. Quality scores ─────────────────────────────────────────────────────────
  console.log("\nStep 9/11 — Blueprint quality scores");
  const qualityDefs = [
    { bp: BP.CIB, overall: "88.00", intent: "4.50", tool: "4.60", instr: "4.40", gov: "4.30", owner: "4.50" },
    { bp: BP.FDA, overall: "74.00", intent: "4.00", tool: "4.20", instr: "3.80", gov: "3.60", owner: "3.80" },
    { bp: BP.LAA, overall: "82.00", intent: "4.20", tool: "4.30", instr: "4.10", gov: "4.00", owner: "4.20" },
    { bp: BP.DPA, overall: "31.00", intent: "2.50", tool: "3.00", instr: "1.00", gov: "1.00", owner: "3.20" },
    { bp: BP.HOG, overall: "71.00", intent: "3.80", tool: "3.50", instr: "3.70", gov: "3.60", owner: "3.90" },
  ];
  for (const q of qualityDefs) {
    const existing = await db.query.blueprintQualityScores.findFirst({ where: eq(blueprintQualityScores.blueprintId, q.bp) });
    if (await skip(`quality score for ${q.bp.slice(0, 8)}`, existing)) continue;
    await db.insert(blueprintQualityScores).values({
      blueprintId: q.bp, enterpriseId: E,
      overallScore: q.overall, intentAlignment: q.intent, toolAppropriateness: q.tool,
      instructionSpecificity: q.instr, governanceAdequacy: q.gov, ownershipCompleteness: q.owner,
      flags: q.bp === BP.DPA ? ["Missing instructions", "No governance policies"] : [],
      evaluatorModel: "claude-haiku-3-5-20241022",
      evaluatedAt: daysAgo(1),
    });
    console.log(`  added quality score ${q.overall}/100`);
  }

  // ── 10. System health snapshots ────────────────────────────────────────────────
  console.log("\nStep 10/11 — System health snapshots");
  const snapDefs = [
    { id: "80000000-0000-0000-0000-000000000001", daysBack: 5, qi: "62.00", validity: "0.6000", queue: 3, sla: "0.9000" },
    { id: "80000000-0000-0000-0000-000000000002", daysBack: 3, qi: "70.00", validity: "0.7500", queue: 2, sla: "0.9500" },
    { id: "80000000-0000-0000-0000-000000000003", daysBack: 1, qi: "76.00", validity: "0.8000", queue: 1, sla: "1.0000" },
  ];
  for (const sn of snapDefs) {
    const existing = await db.query.systemHealthSnapshots.findFirst({ where: eq(systemHealthSnapshots.id, sn.id) });
    if (await skip(`snapshot d-${sn.daysBack}`, existing)) continue;
    await db.insert(systemHealthSnapshots).values({
      id: sn.id, enterpriseId: E,
      qualityIndex: sn.qi, blueprintValidityRate: sn.validity,
      avgRefinements: "1.80", reviewQueueDepth: sn.queue,
      slaComplianceRate: sn.sla, webhookSuccessRate: "1.0000",
      activePolicyCount: 3, blueprintsGenerated24h: 1, violations24h: 2,
      rawMetrics: {},
      snapshotAt: daysAgo(sn.daysBack),
    });
    console.log(`  added snapshot (QI ${sn.qi})`);
  }

  // ── 11. Intelligence briefing ──────────────────────────────────────────────────
  console.log("\nStep 11/11 — Intelligence briefing");
  const existingBriefing = await db.query.intelligenceBriefings.findFirst({
    where: eq(intelligenceBriefings.enterpriseId, E),
  });
  if (await skip("intelligence briefing", existingBriefing)) { /* skip */ }
  else {
    const today = new Date().toISOString().slice(0, 10);
    await db.insert(intelligenceBriefings).values({
      enterpriseId: E,
      briefingDate: today,
      healthStatus: "nominal",
      content: JSON.stringify({
        sections: [
          {
            title: "Platform Health Assessment",
            content: "The Acme Financial agent platform is operating within normal parameters. Quality Index has improved from 62 to 76 over the past 5 days, driven by the deployment of the Customer Inquiry Bot and completion of the Loan Application Assistant review cycle. One agent remains in draft state with blocking governance violations requiring designer attention.",
            severity: "nominal",
            details: ["QI: 76/100 (+14 from 5-day baseline)", "Governance validity rate: 80% (4/5 agents passing)", "Active review queue: 1 agent (Fraud Detection Advisor at Step 2/3)"],
          },
          {
            title: "Quality Trends",
            content: "Blueprint quality is trending upward. The Customer Inquiry Bot scored 88/100 — the highest score in the enterprise portfolio. The Data Privacy Compliance Agent remains at 31/100 due to missing instructions and governance policies. Designer attention is recommended to unblock this agent.",
            severity: "nominal",
            details: ["Portfolio avg quality: 69.2/100", "Highest score: Customer Inquiry Bot (88)", "Lowest score: Data Privacy Compliance Agent (31) — action needed"],
          },
          {
            title: "Risk Signals",
            content: "One low-priority signal detected: the Data Privacy Compliance Agent has 2 error-severity governance violations blocking submission for review. This agent has been in draft state for 4 days without progress. If this agent is business-critical, the designer should be notified to complete the instructions and governance policy fields.",
            severity: "warning",
            details: ["Data Privacy Agent: missing instructions (error)", "Data Privacy Agent: no governance policies (error)", "No critical deployment health events in the past 24 hours"],
          },
          {
            title: "Compliance Posture",
            content: "The deployed Customer Inquiry Bot has a clean governance health status against all 3 enterprise policies. The Fraud Detection Advisor has one warning-level violation (missing audit retention_days) which is non-blocking but recommended for resolution before final approval. Overall compliance posture is strong with 80% of governed agents passing all error-severity rules.",
            severity: "nominal",
            details: ["Deployed agents: 1 (Customer Inquiry Bot) — clean", "Approved agents: 1 (Loan Application Assistant) — ready for deployment", "SR 11-7 documentation: compliant for 3/5 agents"],
          },
          {
            title: "Recommended Actions",
            content: "Three actions recommended for the coming week to improve platform quality and unblock pending deployments.",
            severity: "nominal",
            details: [
              "HIGH: Designer to complete Data Privacy Compliance Agent (add instructions + governance policy) — currently blocking submission",
              "MEDIUM: Compliance Officer to review Fraud Detection Advisor (Step 2/3) — been in queue for 4 days, approaching SLA threshold",
              "LOW: Admin to configure Loan Application Assistant deployment to staging AgentCore environment",
            ],
          },
        ],
      }),
      metricsSnapshot: {
        qualityIndex: 76, blueprintValidityRate: 0.8, reviewQueueDepth: 1,
        slaComplianceRate: 1.0, totalBlueprints: 5, deployedAgents: 1, approvedAgents: 1,
      },
      generatedAt: hoursAgo(14),
    });
    console.log("  added intelligence briefing");
  }

  console.log("\n✅  Demo seed complete!\n");
  console.log("Demo credentials:");
  console.log("  designer@intellios.dev  /  Designer1234!");
  console.log("  reviewer@intellios.dev  /  Reviewer1234!");
  console.log("  officer@intellios.dev   /  Officer1234!");
  console.log("  admin@intellios.dev     /  Admin1234!\n");
  process.exit(0);
}

seedDemo().catch((err) => {
  console.error("\n❌  Demo seed failed:", err);
  process.exit(1);
});

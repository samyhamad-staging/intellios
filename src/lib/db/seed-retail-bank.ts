/**
 * Retail Bank Customer-FAQ demo seed (session 158 prerequisite).
 *
 * Companion to `docs/demo/lifecycle-demo.md` — this script seeds the
 * prerequisites the live runbook needs:
 *
 *   1. The `retail-bank-demo` enterprise (separate from `acme-financial`,
 *      which is the multi-agent platform showcase seeded by `seed-demo.ts`).
 *   2. Three named demo users matching the runbook's personas:
 *        marta@retailbank.demo   — product owner / architect (does intake + design)
 *        rafael@retailbank.demo  — chief risk officer / reviewer (approves)
 *        ed@retailbank.demo      — admin (deploys + retires)
 *   3. Enterprise settings with a single-step approval chain and
 *      `requireTestsBeforeApproval: false` — matches the Stage 0 prereq
 *      in the runbook ("Pre-load the demo enterprise with one approval-chain
 *      step and no test-before-approval requirement").
 *   4. Three governance policies sized for a low-risk customer-facing FAQ
 *      agent: Customer-Facing Safety, GLBA Privacy, SR 11-7 Documentation.
 *
 * What this script intentionally does NOT seed:
 *
 *   - No pre-built agents. The runbook's value is walking through all 8
 *     lifecycle stages live; pre-seeding agents would clutter the registry
 *     and undermine the demo. The single fallback "already-deployed" agent
 *     described in Stage 5 of the runbook must come from a real session-158
 *     smoke deploy and be added by the operator after that smoke succeeds.
 *
 * Idempotent — safe to re-run; existing rows skipped with a log message.
 *
 * Usage:
 *   npx tsx src/lib/db/seed-retail-bank.ts       # from src/, direct
 *   npx tsx scripts/seed-demo.ts                 # from repo root, via shim
 */

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

import { db } from "./index";
import { users, enterpriseSettings, governancePolicies } from "./schema";

// ─── Constants ────────────────────────────────────────────────────────────────

const ENTERPRISE = "retail-bank-demo";

const DEMO_USERS = [
  {
    email: "marta@retailbank.demo",
    name: "Marta Vega",
    password: "Marta1234!",
    role: "architect",
    persona: "Product owner — designs the FAQ agent in stages 1-3",
  },
  {
    email: "rafael@retailbank.demo",
    name: "Rafael Okonkwo",
    password: "Rafael1234!",
    role: "reviewer",
    persona: "Chief risk officer — approves the agent in stage 4",
  },
  {
    email: "ed@retailbank.demo",
    name: "Ed Sundström",
    password: "Ed1234!",
    role: "admin",
    persona: "Platform admin — deploys (stage 5) and retires (stage 8)",
  },
] as const;

// Hardcoded UUIDs for the policies — stable across re-runs.
const POL = {
  SAFETY:  "a0000000-0000-0000-0000-000000000101",
  PRIVACY: "a0000000-0000-0000-0000-000000000102",
  SR117:   "a0000000-0000-0000-0000-000000000103",
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function logSkip(label: string): void {
  console.log(`  skip   ${label}`);
}

function logAdd(label: string): void {
  console.log(`  added  ${label}`);
}

// ─── Steps ────────────────────────────────────────────────────────────────────

async function seedUsers(): Promise<void> {
  console.log("\nStep 1/3 — Demo users (Marta, Rafael, Ed)");
  for (const u of DEMO_USERS) {
    const existing = await db.query.users.findFirst({ where: eq(users.email, u.email) });
    if (existing) {
      // Make sure the enterprise tag is correct even if the user pre-exists.
      if (existing.enterpriseId !== ENTERPRISE) {
        await db.update(users).set({ enterpriseId: ENTERPRISE }).where(eq(users.email, u.email));
        logAdd(`${u.email} → tagged ${ENTERPRISE}`);
      } else {
        logSkip(`${u.email} (already exists, tagged correctly)`);
      }
      continue;
    }
    const passwordHash = await bcrypt.hash(u.password, 12);
    await db.insert(users).values({
      email: u.email,
      name: u.name,
      passwordHash,
      role: u.role,
      enterpriseId: ENTERPRISE,
    });
    logAdd(`${u.email} [${u.role}] — ${u.persona}`);
  }
}

async function seedEnterpriseSettings(): Promise<void> {
  console.log("\nStep 2/3 — Enterprise settings (single-step approval, agentcore enabled)");
  const existing = await db.query.enterpriseSettings.findFirst({
    where: eq(enterpriseSettings.enterpriseId, ENTERPRISE),
  });
  if (existing) {
    logSkip("enterprise_settings (already exists)");
    return;
  }
  await db.insert(enterpriseSettings).values({
    enterpriseId: ENTERPRISE,
    settings: {
      sla: { reviewWarningHours: 24, reviewBreachHours: 48 },
      governance: {
        // Runbook stage 0 prereq: "no test-before-approval requirement"
        requireTestsBeforeApproval: false,
      },
      approvalChain: [
        // Runbook stage 4: a single reviewer approves; SOD (ADR-013) still
        // applies, so Marta (creator) cannot approve her own blueprint.
        { role: "reviewer", label: "Chief Risk Officer" },
      ],
      notifications: { emailEnabled: false },
      awareness: {
        qualityIndexThreshold: 70,
        validityRateThreshold: 0.8,
        reviewQueueThreshold: 5,
      },
      // Runbook stage 5 prereq: deployment target must be enabled. The
      // operator fills in concrete IAM role after running the session-158
      // smoke deploy (we leave the structure in place so the deploy button
      // doesn't 400 with "target not configured").
      deploymentTargets: {
        agentcore: {
          enabled: true,
          region: "us-east-1",
          // Operator must fill in before live demo:
          // executionRoleArn: "arn:aws:iam::<ACCOUNT_ID>:role/<BedrockExecRole>"
          executionRoleArn: null,
          foundationModel: "anthropic.claude-3-5-haiku-20241022-v1:0",
        },
      },
    },
    updatedBy: "ed@retailbank.demo",
  });
  logAdd("enterprise_settings");
}

async function seedPolicies(): Promise<void> {
  console.log("\nStep 3/3 — Governance policies (Safety, Privacy, SR 11-7)");
  const policies = [
    {
      id: POL.SAFETY,
      name: "Customer-Facing Safety",
      type: "safety",
      description:
        "Baseline safety constraints for any customer-facing agent: identity, instructions, and explicit denied actions must all be present.",
      rules: [
        { id: "cfs-01", field: "identity.name",              operator: "exists", severity: "error",   message: "Agent must have a name." },
        { id: "cfs-02", field: "capabilities.instructions",  operator: "exists", severity: "error",   message: "Agent must have behavioral instructions." },
        { id: "cfs-03", field: "constraints.denied_actions", operator: "exists", severity: "warning", message: "Agent should declare explicit denied actions." },
      ],
    },
    {
      id: POL.PRIVACY,
      name: "GLBA Customer Data Privacy",
      type: "data_handling",
      description:
        "Gramm-Leach-Bliley Act safeguards for retail-bank agents that may touch customer data. Forbids personalized account disclosure without verification.",
      rules: [
        { id: "glba-01", field: "constraints.denied_actions",        operator: "exists", severity: "error",   message: "Denied actions list is required for any agent in scope of GLBA." },
        { id: "glba-02", field: "governance.audit.log_interactions", operator: "equals", value: true, severity: "error",   message: "Interaction logging must be enabled to satisfy GLBA recordkeeping." },
        { id: "glba-03", field: "governance.audit.retention_days",   operator: "exists", severity: "warning", message: "Specify a retention period (recommend 2555 days = 7 years)." },
      ],
    },
    {
      id: POL.SR117,
      name: "SR 11-7 Model Documentation (Lite)",
      type: "compliance",
      description:
        "Federal Reserve SR 11-7 model risk management documentation requirements — minimum viable subset for low-risk read-only agents.",
      rules: [
        { id: "sr117-01", field: "identity.description",   operator: "exists",    severity: "error",   message: "Agent must have a description for the model inventory." },
        { id: "sr117-02", field: "governance.policies",    operator: "count_gte", value: 1, severity: "error",   message: "Agent must reference at least one governance policy." },
      ],
    },
  ];

  for (const pol of policies) {
    const existing = await db.query.governancePolicies.findFirst({
      where: eq(governancePolicies.id, pol.id),
    });
    if (existing) {
      logSkip(`policy "${pol.name}"`);
      continue;
    }
    await db.insert(governancePolicies).values({
      ...pol,
      enterpriseId: ENTERPRISE,
      policyVersion: 1,
    });
    logAdd(`policy "${pol.name}"`);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log(`\n🌱  Seeding Retail Bank demo enterprise (${ENTERPRISE})…`);
  await seedUsers();
  await seedEnterpriseSettings();
  await seedPolicies();
  console.log("\n✅  Retail Bank demo seed complete.\n");
  console.log("Demo personas:");
  for (const u of DEMO_USERS) {
    console.log(`  ${u.email.padEnd(28)}  ${u.password.padEnd(12)}  [${u.role}]  ${u.persona}`);
  }
  console.log("\nNext step: run docs/demo/lifecycle-demo.md from Stage 1 (Inception).");
  console.log("\n⚠️   Operator action required before live demo:");
  console.log(`     Set executionRoleArn under deploymentTargets.agentcore in`);
  console.log(`     enterprise_settings for ${ENTERPRISE} (Stage 5 will 400 without it).\n`);
  process.exit(0);
}

main().catch((err) => {
  console.error("\n❌  Retail Bank demo seed failed:", err);
  process.exit(1);
});

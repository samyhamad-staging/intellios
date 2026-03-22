# Intellios — Enterprise Demo Script

**Persona:** Chief Risk Officer or Chief Compliance Officer at a regulated financial services firm
**Scenario:** Meridian Capital Group — 8 AI agents across lending, fraud, wealth management, and customer service
**Duration:** 20 minutes
**Demo user:** Sign in as `officer@intellios.dev` (Compliance Officer) for the governance-heavy scenes; switch to `designer@intellios.dev` for Blueprint Studio

---

## Setup Before the Call

- App running at `http://localhost:3000`
- Demo data seeded (Meridian Capital Group scenario — see DEMO_SETUP.md)
- Have the following pages pre-loaded in tabs: Governor Dashboard, Loan Underwriting blueprint, Governance policies, Compliance calendar, Audit trail, Admin integrations
- Seed data should show: 5 deployed agents (3 clean, 2 with issues), compliance posture at 85%, Loan Underwriting agent with a "drifted" badge

---

## Opening Hook (2 min)

**What to say:**

"You have AI agents running in production. Some of them were validated against your governance policies when they were deployed six months ago. But your policies have changed since then. Your SR 11-7 model documentation requirements were updated. A new data handling rule came in from Legal. And your Loan Underwriting agent — which passed every check at deployment — now has a violation it doesn't know about.

Your regulators are going to ask you to prove these agents are behaving. Today, you probably can't. You have a PDF from deployment day, but nothing between then and now.

What I'm going to show you is Intellios: the governed control plane for enterprise AI agents. Design-time governance, continuous runtime monitoring, automated remediation, regulatory reporting, and a complete audit chain. All in one platform. Let me show you what that looks like for Meridian Capital."

**The "so what":**
Regulators — particularly under SR 11-7 — require *ongoing* monitoring of model behavior, not just a point-in-time validation. The opening positions the problem as one the buyer almost certainly has, whether they know it or not.

**Likely objection:** "We did a validation before we deployed."

**Response:** "That snapshot is valuable — it's part of the evidence chain. The problem is what happens on day 31. If your policies change, if a new regulatory requirement comes in, if someone modifies the agent's configuration — that original snapshot says nothing about today. Intellios is the system that keeps asking the question, not just answering it once."

---

## Scene 1 — Governor Dashboard (3 min)

**Where to click:** `/governor` (or the Governor link in the sidebar)

**What to say:**

"This is the Governor Dashboard — the executive view of Meridian's entire AI fleet. You can see 5 deployed agents, an overall compliance posture of 85%, and two agents flagged with issues. The 85% isn't a vanity metric — it's calculated against your actual live policies, right now.

Notice the Loan Underwriting Analyst agent has a 'Drifted' badge. That means it was clean at deployment, but a policy changed after it went live, and it now has a violation it didn't have before. The agent didn't change. Your policies did. And Intellios caught the gap.

The third agent — Fraud Detection Monitor — has a warning. Not a blocker, but it's flagged and it's tracked. Your compliance team can see exactly what it is without opening a ticket or scheduling a review call."

**The "so what":**
This is the difference between a snapshot audit and continuous governance. A CRO needs to be able to answer "are our agents compliant right now?" — not "were they compliant when we deployed them?" This screen answers the live question.

**Likely objection:** "How often does it re-check?"

**Response:** "Every time a policy changes, all deployed agents are immediately re-evaluated against the new policy set. That's what triggered the 'Drifted' badge on the Loan Underwriting agent — your SR 11-7 access control policy was updated, and within minutes the system identified which deployed agents are now out of compliance. You didn't have to ask."

---

## Scene 2 — Blueprint Studio + AI Fix (4 min)

**Where to click:** Click on the Loan Underwriting Analyst from the Governor Dashboard → "Open in Studio" (or navigate to `/blueprints/[id]` for that agent)

**What to say:**

"Let's open the Loan Underwriting Analyst blueprint directly. This is the Blueprint Studio — a three-column workspace. On the left, the full agent specification: identity, capabilities, knowledge sources, constraints, governance policies. In the center, you can edit and refine. On the right — this is where it gets useful for a compliance team — the Governance Validation panel.

You can see the Access Control policy is failing. The rule requires that `integrations.allowed_domains` be set, and this agent doesn't have an explicit allowed-domain list. That's the violation that caused the 'Drifted' flag we just saw.

Now watch this. I click 'Generate Fix.'"

[Click Generate Fix]

"Intellios calls Claude to analyze the violation and propose a specific, targeted change — not a generic recommendation, but the exact field and value that would resolve this rule. It says: add `allowed_domains: [\"internal.meridiangroup.com\", \"api.meridiangroup.com\"]` to the integrations configuration.

Your architects review the proposal. If it looks right, they accept it. The change is applied, the blueprint is re-validated, and the result goes into the audit trail. Intellios never auto-applies a fix without human sign-off. The proposal is AI-generated; the decision is human."

**The "so what":**
A CRO's concern with AI governance isn't just detecting problems — it's being able to remediate them without introducing new risk. The AI-assist + human-approval model gives speed without bypassing controls.

**Likely objection:** "Can't architects just override the validation and submit anyway?"

**Response:** "Error-severity violations are a hard gate. The Submit for Review button is disabled as long as there are unresolved error violations. Warning-severity violations are flagged but non-blocking — your teams decide whether to remediate or accept the risk, and that decision is recorded. The system enforces separation of duties: architects design, reviewers approve, compliance officers govern. No one role can shortcut the others."

---

## Scene 3 — Governance Policies (3 min)

**Where to click:** `/governance` (Governance Hub in the sidebar)

**What to say:**

"This is where Meridian's enterprise governance policies live. You can see five active policies: PII and Data Handling, SR 11-7 Model Documentation, Safety Baseline, Access Control, and Escalation Protocol.

Each policy is a set of rules in plain language — field, operator, value. Your compliance team writes these without code. 'Risk tier must be set. Escalation procedures must not be empty. Allowed domains must be specified for any agent with external integrations.' No YAML, no programming. Rules your compliance team can read, audit, and own.

What's important architecturally: every agent is validated against all active policies both at design time — before it can be submitted for review — and continuously after deployment. If you add a new policy today, every deployed agent is automatically re-evaluated against it tonight. That's what 'continuous governance' means in practice."

**The "so what":**
Regulators don't just want to know that you had policies. They want to know that your policies were actually applied, that you can prove they were applied to each agent, and that policy changes propagate forward. This is the evidence-based governance model SR 11-7 is looking for.

**Likely objection:** "Our policies are complex — we have legal requirements, not just configuration rules."

**Response:** "The policy engine handles 11 comparison operators and supports nested field paths across the full agent specification — not just metadata. You can write rules against the agent's behavioral instructions, its knowledge sources, its escalation paths, its data classification. For requirements that go beyond what a structured rule can express, the review workflow is where your compliance officers apply judgment — and Intellios records that judgment in the audit trail."

---

## Scene 4 — Compliance Calendar + MRM Report (3 min)

**Where to click:** `/compliance` (Compliance Command Center)

**What to say:**

"This is the Compliance Command Center. The calendar view shows scheduled review obligations across Meridian's deployed fleet. The Fraud Detection Monitor review is due in 14 days. Loan Underwriting is due in 30. These aren't manually entered — they're driven by the agent lifecycle and enterprise review cadence settings.

SR 11-7 requires periodic reviews of deployed models. Intellios schedules them, sends reminders at 30, 14, and 7 days to the responsible teams, and generates the Model Risk Management report automatically when a review is triggered.

Let me show you the MRM report structure for one of the deployed agents."

[Click into an agent's MRM report — navigate to `/registry/[agentId]` and click View MRM Report]

"Fourteen structured sections: executive summary, agent identity and scope, risk classification, governance evidence, validation history, approval chain with separation-of-duties evidence, behavioral test results, red-team assessment, regulatory framework mapping — GDPR, SOX, FINRA — operational controls, and a full audit timeline. This is the document your model risk committee reviews. Intellios generates it. Your team doesn't write it from scratch."

**The "so what":**
MRM documentation is one of the highest-friction, highest-risk parts of the model governance process. Firms either under-document or spend weeks assembling evidence manually. Generating it automatically from the platform's own records means it's accurate, consistent, and always current.

**Likely objection:** "Our MRM team has a specific format they require."

**Response:** "The 14-section structure is modeled directly on SR 11-7's key requirements for model documentation. The content is generated from structured data the platform already holds — so the sections are consistent and evidence-linked. For firms with bespoke format requirements, the JSON output can be transformed to any template. We also export as HTML for direct submission."

---

## Scene 5 — Audit Trail + Evidence Package (3 min)

**Where to click:** `/audit` (Audit Trail in the sidebar), then navigate to an agent's evidence package export

**What to say:**

"Every action in Intellios — every status transition, every policy validation, every review decision, every governance change — is written to an append-only audit log. You can filter by agent, by actor, by action type, by date range.

You can see here: Loan Underwriting Analyst — blueprint created, governance validation ran, submitted for review by the architect, reviewed and approved by the Senior Reviewer, second approval by the Compliance Officer, deployed. Every step has a timestamp, an actor identity, and a before/after state snapshot.

Now let me show you the evidence package."

[Navigate to the agent's evidence package export — `/api/blueprints/[id]/evidence-package` or click Export Evidence in the registry]

"One click. A ZIP archive with 14 sections: the full blueprint specification, every validation report, the complete approval chain, test results, the MRM report, the audit log extract, and regulatory framework mapping. This is what you hand your auditor. Not a slide deck. Not a PDF someone assembled manually. A machine-generated, tamper-evident evidence dossier that Intellios signs from its own records.

If your internal audit team or an external regulator asks 'show me everything about this agent' — this is the answer."

**The "so what":**
Audit readiness is often a fire drill. Teams scramble to find the right documents, reconstruct timelines, prove chain of custody. An evidence package that's always current and always complete turns a week-long exercise into a two-minute export.

**Likely objection:** "How do we know the audit log hasn't been tampered with?"

**Response:** "The audit log is append-only at the application layer — rows are written by a single write path and are never updated or deleted. Every entry records the actor from the authenticated session, so records can't be attributed to a phantom user. For organizations with stricter tamper-evidence requirements, the architecture supports signing audit entries with a KMS-backed key — that's an enterprise deployment option."

---

## Scene 6 — Enterprise Integrations + API (2 min)

**Where to click:** `/admin/integrations` and `/admin/api-keys`

**What to say:**

"Two last things. First, integrations. Meridian has ServiceNow, Jira, and Slack configured. When Intellios detects governance drift — like the Loan Underwriting violation we saw — it doesn't just flag it in the dashboard. It automatically creates a ServiceNow incident, opens a Jira ticket assigned to the responsible architect, and posts a Slack notification to the #ai-governance channel. Your teams work in those tools already. Intellios goes to them, not the other way around.

Second, the API. Meridian's engineering team can integrate Intellios directly into their CI/CD pipeline. Before any agent goes to production, their pipeline calls the Intellios validation API — get a 200 with a clean validation report, the deploy proceeds; get back error violations, the deploy is blocked. Governance becomes part of the software delivery process, not a separate compliance step that happens after the fact."

**The "so what":**
Adoption friction is the death of governance programs. If compliance requires people to change tools, they won't. Meeting teams in their existing workflows — and embedding governance into existing engineering practices — is what makes the program stick.

**Likely objection:** "We already have an ITSM integration with our AI observability vendor."

**Response:** "The webhook system is additive — Intellios fires HMAC-signed lifecycle events for any downstream consumer. If you have an existing ITSM integration, you can route Intellios events through the same webhook endpoint you already have configured. The event schema is documented and stable."

---

## Close (2 min)

**What to say:**

"Let me recap what you just saw in 20 minutes.

Design-time governance: every agent is validated against your enterprise policies before a human reviewer ever sees it. No agent reaches your model risk committee with avoidable violations already present.

Continuous runtime monitoring: policy changes automatically re-evaluate your deployed fleet. The Loan Underwriting agent's 'Drifted' badge appeared without anyone running a manual check.

Automated remediation proposals: when violations are found, Claude proposes specific fixes. Your architects review and accept — the decision is always human.

Regulatory reporting: MRM reports generated automatically from platform records, structured to SR 11-7's documentation requirements. Evidence packages ready for auditors on demand.

Full auditability: every action, every actor, every decision, append-only, exportable.

The question isn't whether you need this capability. If you have AI agents in production, you need a system that can answer the question your regulators are going to ask: 'prove to me these agents are behaving and that someone is accountable.' Today, most organizations can't answer that question. Intellios is how you answer it.

The question is whether you want to build this yourself — and if you do, what it costs you in engineering time, in compliance risk during the build, and in the ongoing maintenance burden. Or whether you want a platform that's already built, already validated, and ready to govern your first agent this week."

---

## Demo Logistics Notes

- If the AI Fix generation is slow (15–20s), narrate while it runs: "Claude is analyzing the violation and the agent's current configuration — this takes about 15 seconds."
- If asked to show the intake flow live, redirect: "I'll show you a completed intake session rather than running a new one — the generation takes 20–30 seconds and I'd rather keep us moving." Navigate to a completed intake session instead.
- If asked about pricing, say: "I'll cover that separately — I want to make sure the platform fit is clear first before we talk numbers."
- Keep role-switching minimal — the demo works cleanest when run primarily from the Compliance Officer view, with the Blueprint Studio shown from the designer's perspective only for Scene 2.

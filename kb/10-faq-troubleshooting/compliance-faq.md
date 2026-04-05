---
id: 10-002
title: Compliance FAQ
slug: compliance-faq
type: reference
audiences:
- compliance
status: published
created: &id001 2026-04-05
updated: *id001
tags:
- SR 11-7
- OCC
- AI Act
- audit
- governance
- policy
- evaluation
- evidence
tldr: Regulatory and governance questions about Intellios for compliance and risk
  officers
---

# Compliance FAQ

## Does Intellios satisfy SR 11-7?

SR 11-7 (Guidance on AI Governance) requires **two core things:** (1) written policies for AI systems, and (2) ongoing model governance including validation and monitoring. Intellios directly addresses both:

- **Policies as code:** Your governance operators *are* your written policies, executable and version-controlled
- **Continuous validation:** Every generated agent is validated against those policies before deployment (deterministic, auditable)
- **Monitoring:** Agent execution metrics feed back into the governance dashboard for ongoing monitoring

Intellios does not eliminate the need for an organization to *document* its governance framework, but it ensures that framework is **enforced in production** and **evidenced automatically**. Regulators reviewing your MRM program will see:
- Policy definitions (human-readable + machine-enforced)
- Per-agent validation reports (signed with timestamp)
- Execution audit logs (agent decisions traced back to policies)

**Compliance verdict:** Intellios is a enabler of SR 11-7 compliance; it is not a standalone solution. Your organization still owns governance policy content and MRM process design.

## How about OCC guidelines?

The OCC's October 2023 guidance on "Responsible AI Development and Use in Banking" emphasizes:

1. **Risk management proportionate to risk level** ✓ Intellios supports risk-stratified governance (high-risk agents trigger stricter validation)
2. **Human oversight** ✓ Agents are not deployed without human review (Review UI is built-in)
3. **Explainability and transparency** ✓ Agent blueprints are human-readable; governance decisions are logged
4. **Ongoing monitoring** ✓ Dashboard shows agent decision distributions and performance drift
5. **Model risk management policies** ✓ Your governance operators *are* your formalized policies

Intellios maps to OCC's "Three Lines of Defense" model:
- **Line 1:** Agent generation with built-in governance (risk ownership)
- **Line 2:** Governance Validator enforcing policies (independent risk control)
- **Line 3:** Audit logs and dashboards (audit/compliance visibility)

## EU AI Act?

The EU AI Act classifies AI systems by risk and prescribes conformity assessments. Intellios supports compliance by:

- **Risk classification:** You define risk categories in your governance policy; agents are auto-classified on generation
- **Documentation:** Agent blueprints + validation reports satisfy "technical documentation" requirements
- **Transparency:** Generated agents include model cards detailing capabilities, limitations, and use restrictions
- **Record-keeping:** Immutable audit logs satisfy conformity assessment records
- **High-risk conformity:** Continuous validation and monitoring logs demonstrate ongoing conformity assessment

**Limitation:** Intellios is the *governance platform*; regulatory compliance ultimately depends on how your organization *uses* it and how agents are *deployed*. An agent marked "high-risk" by Intellios must still receive your organization's independent conformity assessment.

## How is compliance evidence generated?

Evidence generation is **fully deterministic** in Intellios:

1. **Agent Blueprint**: You submit requirements for a new agent
2. **Generation**: System applies your LLM provider (Claude, Bedrock) and your runtime adapters
3. **Governance Validation**: 11 deterministic operators evaluate the blueprint:
   - Does it meet policy constraints? (e.g., max token budget)
   - Does it conform to your risk classification? (e.g., high-risk agents flagged for manual review)
   - Are tool definitions safe for your domain? (e.g., no external API calls without approval)
   - Do stakeholder requirements align?
4. **Validation Report**: Timestamped, signed report listing:
   - Policy checks passed/failed
   - Remediation applied (if any)
   - Governance operators executed (audit trail)
   - Agent approved or rejected with reason
5. **Registry Entry**: Approved agents stored with immutable version history

**For audits:** Regulators request "show me all agents approved in Q3 2025 for commercial lending." You export a filtered report with all validation evidence in seconds.

## Can we customize policies?

Yes. Policies are expressed as **Governance Operators** (code-like rules):

```
operator: max_tools_policy
constraint: "max_tool_count = 5"
rationale: "Reduce surface area of agent authority"
applies_to: ["risk_level:high", "domain:credit_approval"]
```

You can:
- Define new operators (in collaboration with Intellios Product team)
- Assign operators to risk levels, domains, or specific agents
- Adjust constraint values (e.g., max tokens, max tools)
- Create conditional policies (e.g., "if compliance_review_required, then trigger_human_approval")
- Version policies (policies have semantic versioning; agents linked to policy version)

**Customization timeline:** 2-4 weeks for a new operator (Intellios engineers work with your compliance team to formalize requirements).

## Is evaluation deterministic?

**Completely deterministic.** Policy evaluation follows the same logic path every time:

1. Agent Blueprint → Policy Engine (fixed input)
2. Governance operators applied in sequence (order defined in policy config)
3. For each operator: evaluate constraint against blueprint (boolean: pass/fail)
4. Aggregate results: agent passes if all applicable operators pass (or exceeds remediation threshold)
5. Output: signed validation report with operator-by-operator details

**Reproducibility:** Given the same blueprint and policy version, the validation result is **always identical**. This is critical for regulatory confidence: you can re-validate an agent months later and get the same result, proving policy consistency.

**Caveat:** Policy *definition* is written by humans (your compliance team), so human judgment enters when setting constraint values. But once policies are defined, evaluation is mechanical.

## How do audit trails work?

Intellios maintains an **immutable audit log** at three levels:

### 1. Governance Log
- Agent created at 2026-04-05 14:32:15 UTC
- Policy version applied: governance-policy-v1.2.1
- Operators executed: [max_tools_policy PASS, risk_classification PASS, stakeholder_approval_required TRIGGER]
- Validation report generated: [hash and signature]
- Agent status: APPROVED
- Approved by: alice@bank.com (review queue reviewer)

### 2. Execution Log
- Agent deployed to production at 2026-04-05 15:00:00 UTC
- Runtime: AWS Lambda
- Invocations (daily): 847
- Tool calls by agent: 23 calls to external_credit_service, 0 failed calls
- Decision distribution: approved 821 requests, denied 26 (3% denial rate)
- Drift detection: performance metrics within expected range

### 3. Policy Change Log
- Policy v1.2.0 → v1.2.1 at 2026-03-15 10:00:00 UTC
- Changed by: compliance@bank.com
- Change: max_token_budget increased from 2000 → 2500
- Rationale: "Support longer customer inquiry context"
- Agents affected by this policy change: [list]

**Audit retention:** 7 years minimum (configurable for longer). Logs are tamper-proof (cryptographic hash chain).

## What about data residency?

Intellios supports **customer-controlled data residency**:

- **Blueprints and agent definitions:** Stored in your PostgreSQL database (location you choose: AWS us-east-1, eu-west-1, ap-southeast-1, etc.)
- **Audit logs:** Stored in your database with optional replication to S3 with encryption at rest
- **Secrets (API keys):** Stored in your cloud provider's secrets manager (AWS Secrets Manager, Azure Key Vault, etc.)
- **Execution logs:** Stored in your logging service (CloudWatch, DataDog, Splunk, etc.)

**For EU customers:** Deploy Intellios in AWS eu-west-1 (Ireland) and all data remains in EU. Intellios never retains copies of your blueprints, policies, or logs.

## How do we prepare for examinations?

**Pre-exam (3 months out):**
1. Audit your governance policies for completeness (all required risk controls documented)
2. Test blueprint exports: can you generate reports for all agents in scope?
3. Validate audit log integrity: run cryptographic verification
4. Document MRM governance changes (policy updates, operator changes)

**Exam period (examiners on-site):**
1. Provide examiners with read-only access to governance dashboard (audit logs, policy definitions, agent status)
2. Prepare pre-generated reports:
   - All agents deployed in exam period, with validation evidence
   - All policy changes with justification
   - Agent performance metrics and drift detection results
   - Stakeholder approval records
3. Enable examiners to re-run validation on historical agents (demonstrate determinism)

**Exam workflow:**
- Examiner: "Show me all high-risk agents approved in 2025"
- You: Export report with 1-click (includes validation evidence, stakeholder approvals, deployment logs)
- Examiner: "Show me the governance policy in force for agent X"
- You: Display policy version, rules, rationale (human-readable + machine-executable)

**Intellios advantage:** What historically took weeks of manual documentation now takes hours. Examiners see a complete, evidenced governance trail.

## Can it replace our MRM process?

No, but it **fundamentally reengineers** it.

**Traditional MRM Process:**
1. Team proposes AI system
2. MRM team manually reviews model, training data, intended use (takes 4-8 weeks)
3. MRM team prepares validation report
4. Stakeholders approve (compliance, risk, legal, business)
5. System deployed
6. Ongoing monitoring (quarterly manual reviews)

**Intellios-Enabled MRM Process:**
1. Team proposes agent in Intake UI (requirements capture, stakeholder inputs)
2. System auto-generates agent blueprint + validation report (2 hours)
3. Governance Validator checks against policies (deterministic, automatic)
4. If approved: agent ready for deployment (human review optional for high-risk)
5. If conditional approval needed: Review Queue alerts stakeholders
6. Stakeholders approve (30 minutes, with full evidence available)
7. Agent deployed
8. Continuous monitoring (automated drift detection, quarterly policy reviews)

**FTE reduction:** 4-6 dedicated MRM FTE → 1-2 FTE + governance operators owned by domain teams.

**MRM still required for:** Policy design, complex remediation decisions, periodic governance reviews, examiner interactions.

## What about independent validation?

Intellios supports independent validation through:

1. **Policy audit:** External validators can review your governance operators and their configuration (code + rationale)
2. **Blueprint export:** Validators can obtain any agent blueprint and run their own analysis
3. **Validation report reproducibility:** Given a blueprint and policy version, validators can re-run Intellios validation and verify the same result
4. **Audit log access:** Independent auditors receive read-only access to governance and execution logs

**Third-party validators can:**
- Certify that your governance operators align with regulatory expectations (SR 11-7, OCC, AI Act)
- Spot-check that Intellios validation logic is sound (for a sample of agents)
- Verify that audit logs are intact and unaltered
- Attest to your governance program's design and operating effectiveness

**Timeline:** Independent validation typically takes 2-4 weeks (policy review + testing + attestation).

## Policy versioning?

Governance policies use **semantic versioning** (major.minor.patch):

- **v1.0.0:** Initial policy framework (all 11 operators defined, all domains scoped)
- **v1.0.1:** Patch (e.g., adjust max_token_budget from 2000 → 2100 due to UX feedback; no policy philosophy change)
- **v1.1.0:** Minor (e.g., add new operator for tool safety; applies to all new agents; old agents stay on v1.0.0)
- **v2.0.0:** Major (e.g., restructure risk classification; requires migration of all agents)

**Each agent is linked to the policy version in force at deployment.** When you upgrade policy versions:
- New agents use new policy version
- Old agents remain on old policy version (no retroactive validation)
- On policy major version upgrade: you decide whether to re-validate historical agents under new policy

**Example:** You deploy agent X under governance-policy-v1.0.0 in Jan 2026. In Apr 2026, you upgrade to governance-policy-v2.0.0 (new risk classification system). Agent X stays on v1.0.0. You manually decide (after re-validation) whether to upgrade it to v2.0.0 or leave it alone.

This gives you control: policy changes don't retroactively break deployed agents.

## Where can I get help?

Contact your CSM or compliance support team: [PLACEHOLDER: compliance@intellios.com]. Schedule a governance consultation to discuss your specific regulatory context.

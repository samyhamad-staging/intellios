---
id: 02-004
title: PM Orientation
slug: pm-orientation
type: task
audiences:
- product
status: published
created: &id001 2026-04-05
updated: *id001
tags:
- getting started
- PM
- agent creation
- governance
- approval
- portfolio
tldr: Getting started guide for product managers using Intellios
---

# PM Orientation

Welcome! This guide helps product managers understand Intellios capabilities, key workflows, and how to lead agent creation initiatives.

---

## What Intellios Does

Intellios is a governance platform that enables your organization to design, build, and deploy AI agents at scale while maintaining continuous compliance. As a PM, you'll use Intellios to:

1. **Define requirements** for new agents (via Intake Engine)
2. **Review generated blueprints** and refine them
3. **Manage agent portfolios** (track all agents, their status, compliance)
4. **Optimize deployment velocity** (get agents to production faster, safely)
5. **Gather stakeholder input** (compliance, risk, legal, security all weigh in)

---

## Key Screens & Workflows

### 1. Intake Engine — Capture Agent Requirements

**Purpose:** Collect cross-functional input for a new agent

**Access:** Intellios dashboard → "New Agent" button → Intake form

**Key fields:**
- **Business requirement:** What problem does this agent solve?
- **Use case:** How will it be used?
- **Risk classification (initial):** Is this low-risk (customer support) or high-risk (credit decisions)?
- **Stakeholder inputs:** Collect from compliance, risk, legal, security, IT, operations

**Timeline:** 10-30 minutes (longer if stakeholders need approval)

**Pro tips:**
- **Pre-fill** stakeholder inputs if you have prior discussions
- **Use templates** (Express-Lane templates pre-populate common use cases like "Credit Decisioning" or "Fraud Detection")
- **Manage conflicts:** If stakeholders disagree, flag for sync discussion before submitting

**Example workflow:**
```
[New Agent] → [Select "Credit Decisioning" template]
→ [Fill business requirement: "Auto-approve low-risk credit applications"]
→ [Collect stakeholder inputs: compliance approves, risk flags data residency concern]
→ [Resolve conflict with risk team]
→ [Submit intake]
```

---

### 2. Blueprint Generation & Refinement

**Purpose:** Generate and polish agent blueprint

**What happens automatically:**
- System calls Claude to generate initial agent blueprint (prompt, tools, model selection)
- Blueprint includes model card (transparency documentation)
- ~30 seconds to completion

**Your refinement options:**
- **Adjust prompt:** Modify instructions if Claude's generation needs tweaking
- **Add/remove tools:** Select from approved tool library
- **Adjust token budget:** Control how much context the agent can use
- **Select model:** Choose Claude 3.5 Sonnet or Bedrock variant
- **Set timeout:** Define max execution duration

**Real-time feedback:**
- Governance validator shows live feedback ("If you add 3 more tools, risk classification changes from medium → high")
- Quick fixes available ("Click 'Auto-Adjust' to reduce token budget to 2000")

**Timeline:** 5-15 minutes of refinement (often minimal if template is good fit)

---

### 3. Governance Validation & Review Queue

**Purpose:** Ensure agent meets policies before deployment

**How it works:**
- Governance Validator checks 11 policy operators automatically
- Low-risk agents: auto-approved (added to Registry)
- High-risk agents: routed to Review Queue (compliance/risk review required)

**Your role:**
- Review compliance feedback in dashboard
- Coordinate with reviewers if agent is blocked
- Address requests for changes (adjust agent, resubmit)

**Example:**
```
Agent generated → Governance validator checks:
  ✓ Token budget OK (1800 tokens < 2000 limit)
  ✓ Tools approved (4 tools, limit is 5)
  ✓ Model version approved
  ⚠ Risk classification HIGH → routes to Review Queue

Compliance reviewer approves → ✓ APPROVED
Agent added to Registry → Ready for deployment
```

**Timeline:** 15 minutes (auto-approved) to 48 hours (multi-stakeholder review)

---

### 4. Agent Registry — Portfolio Management

**Purpose:** Track all agents, their versions, and deployment status

**Access:** Dashboard → "Registry" tab

**What you see:**
- All agents (created by your team and others)
- Status: Draft, Approved, Deployed (production/staging), Deprecated
- Versions: Each agent has version history (v1.0, v1.1, v1.2, etc.)
- Metadata: Owner, created date, last modified, policy version

**Actions:**
- **Search/filter:** By risk level, domain, team, status, creation date
- **Compare versions:** See what changed between v1.0 and v1.1
- **Deploy:** One-click deployment to staging or production
- **Deprecate:** Mark old agents as deprecated (remove from production)
- **Clone:** Copy an agent as starting point for similar use case

**Use cases:**
- **Portfolio review:** Exec wants to see all credit agents → filter by domain:credit
- **Compliance reporting:** "Show me all high-risk agents approved in Q1 2026" → filter & export
- **Version management:** "Which agents use model v3.5 Sonnet?" → search
- **Migration planning:** "How many agents are on governance-policy v1.0.0?" → filter & plan upgrade

---

### 5. Governance Dashboard — Compliance Overview

**Purpose:** Monitor agent portfolio health and compliance metrics

**Key metrics:**
- **Agent count by status:** How many are approved, deployed, in review
- **Validation pass rate:** % of agents passing governance checks (trend over time)
- **Review queue:** Agents waiting for approval (avg time in queue)
- **Policy compliance:** Which operators are failing most often?
- **Deployment timeline:** Agents deployed per week/month (trend)

**Typical dashboard scan (5 minutes):**
1. Check review queue: "Are any agents blocked? Do reviewers need help?"
2. Check validation trends: "Pass rate declining? New policy causing issues?"
3. Check deployment velocity: "Are we on pace with deployment goals?"
4. Check risk profile: "How many high-risk agents have we deployed this quarter?"

---

## Common PM Tasks in Intellios

### Task 1: Lead Agent Creation Initiative

**Scenario:** Your business stakeholder asks "Can we build a credit agent?"

**Steps:**
1. **Align on use case:** What problem does it solve? When needed?
2. **Gather requirements:** Talk to compliance (risk classification), ops (data sources), engineering (integrations)
3. **Create intake:** Use "Credit Decisioning" template; fill in requirements
4. **Collect stakeholder input:** Pre-fill or coordinate async responses
5. **Submit intake:** System generates blueprint
6. **Refine blueprint:** Adjust prompt/tools if needed
7. **Coordinate review:** If high-risk, help compliance/risk team with any questions
8. **Approve & deploy:** Once approved, coordinate deployment to production
9. **Monitor:** Check Registry, dashboard for agent performance

**Timeline:** 2-4 weeks (most of time is stakeholder coordination, not platform usage)

---

### Task 2: Plan Multi-Agent Initiative

**Scenario:** You want to launch 5 new agents (credit, fraud, KYC, claims, underwriting) by end of Q2.

**Planning approach:**
1. **Prioritize by complexity:** Start with low-risk agents (faster approval), then high-risk
2. **Identify shared policies:** Which agents share governance rules? (Define once, reuse)
3. **Stakeholder alignment:** Schedule sync with compliance/risk once to cover all agents
4. **Intake template strategy:** Should you use pre-built templates or create custom one?
5. **Deployment strategy:** Phase 1 (staging), Phase 2 (production pilot), Phase 3 (full rollout)
6. **Track progress:** Use Registry view with custom filters (status, creation date)

**Timeline tracking:**
```
Week 1-2: Intake collection (5 agents)
Week 2-3: Blueprint generation & refinement
Week 3-4: Governance review & approval
Week 4: Deploy to staging
Week 5: Validate in staging
Week 5-6: Deploy to production
```

---

### Task 3: Respond to Regulatory Examination

**Scenario:** Regulator asks "Show me all agents you deployed in 2025, with evidence they meet governance requirements."

**Steps:**
1. **Filter Registry:** Date range (Jan 1 – Dec 31, 2025)
2. **Export report:** Includes agent name, policy version, validation evidence, approval chain
3. **Provide dashboards:** Show deployment timeline, validation metrics, audit trail
4. **Answer follow-up questions:** "Why is agent X classified as high-risk?" (Governance policy rationale provided in dashboard)

**Timeline:** 30 minutes (all data pre-generated in Intellios)

**Contrast:** Traditional process (manual documentation, email chains) = 2-3 weeks of work

---

### Task 4: Optimize Deployment Velocity

**Scenario:** You notice agents are taking 2 weeks to go from intake → approval → production. Goal: 1 week.

**Analysis:**
1. **Check review queue metrics:** How long do agents wait for review? ("Avg time: 4 days")
2. **Identify bottleneck:** Is it stakeholder response time or governance policy strictness?
3. **Options:**
   - **Streamline governance:** Work with compliance to adjust policy constraints (e.g., "Agents with ≤3 tools auto-approve instead of ≤1 tool")
   - **Pre-fill stakeholder input:** Establish defaults so review is faster
   - **Use templates:** Templates pre-generated; intake is just confirmation, not full review

**Outcome:** Deploy 2x faster without sacrificing compliance

---

### Task 5: Manage Agent Portfolio for Cost & Risk

**Scenario:** You discover 47 legacy agents from 3 years ago; some are no longer used.

**Approach:**
1. **Audit via Registry:** Filter by creation date (2022-2023), filter by last deployment date
2. **Identify candidates for deprecation:** Agents not deployed in 6+ months
3. **Coordinate deprecation:** Notify owners, confirm no longer needed
4. **Mark deprecated:** In Registry, set status → Deprecated (audit trail preserved)
5. **Remove from production:** Undeploy old versions (users migrate to newer agents)
6. **Cost savings:** Reduce policy review overhead (fewer agents to monitor)

---

## Understanding Governance in 60 Seconds

**For PMs, the key insight:** Governance is NOT a blocker; it's a **speed enabler**.

**Why?** Traditionally:
- Build agent → Manual compliance review (4-8 weeks) → Deploy

**With Intellios:**
- Build agent (with governance built-in) → Auto-validation (2 seconds) → Review high-risk agents (1-2 days) → Deploy

**Net result:** Most agents deploy in days, not months. You win with compliance AND speed.

---

## Competitive Context

**Why Intellios matters for your organization:**

| Aspect | Traditional (No Intellios) | With Intellios |
|---|---|---|
| **Time to deploy agent** | 6-12 weeks | 1-3 weeks |
| **MRM documentation effort** | 80 hours per agent | 10 hours per agent (auto-generated) |
| **Compliance confidence** | Policy interpretation required | Deterministic, auditable |
| **Shadow AI risk** | High (ungoverned agents proliferate) | Low (incentive to use platform) |
| **Regulatory readiness** | Manual evidence gathering | Pre-generated audit trails |

---

## PM Role in Intellios Success

1. **Champion governance mindset:** Help teams see governance as enabler, not blocker
2. **Drive intake quality:** Ask good questions; involve right stakeholders early
3. **Facilitate stakeholder alignment:** Be the bridge between business, compliance, risk, engineering
4. **Track portfolio metrics:** Monitor deployment velocity, compliance rate, risk profile
5. **Iterate on templates:** Learn which intake templates work best; refine them
6. **Share wins:** Publicize successful deployments ("Deployed credit agent in 2 weeks vs. traditional 8 weeks")

---

## Next Steps

1. **Schedule platform walkthrough:** Ask engineering team for 30-min demo
2. **Create first test agent:** Use pre-built template; complete intake-to-approval workflow
3. **Review executive FAQ:** [Link to Executive FAQ](../10-faq-troubleshooting/executive-faq.md) for strategic context
4. **Join PM channel:** Intellios Product feedback channel: [PLACEHOLDER: #intellios-pm on Slack]

---

## Get Help

- **Product questions:** [PLACEHOLDER: product@intellios.com]
- **Platform walkthrough:** Ask your CSM for training session
- **Feature ideas:** Post in [PLACEHOLDER: canny.io/intellios/roadmap]

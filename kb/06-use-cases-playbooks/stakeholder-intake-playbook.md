---
id: 06-008
title: Stakeholder Intake Playbook
slug: stakeholder-intake-playbook
type: task
audiences:
- product
- compliance
status: published
created: &id001 2026-04-05
updated: *id001
tags:
- intake
- stakeholders
- collaboration
- conflict resolution
- requirements gathering
tldr: Strategies for collecting and managing multi-stakeholder input on agent creation
---

# Stakeholder Intake Playbook

This guide helps product and compliance teams effectively use Intellios' 7-lane stakeholder input system to create better, safer agents.

---

## The 7 Stakeholder Lanes

Intellios intake includes 7 stakeholder perspectives. Each lane represents a distinct viewpoint on agent safety and utility.

| Lane | Owner | Interests | Key Questions |
|------|-------|-----------|---|
| **Compliance** | Chief Compliance Officer, Model Risk Manager | Regulatory adherence, policy alignment | Does this meet SR 11-7? What's the risk classification? |
| **Risk** | Chief Risk Officer, Credit Risk | Risk exposure, financial impact | What's our loss exposure? Default probability? |
| **Legal** | General Counsel, Legal team | Liability, regulatory exposure, truth-in-lending | What liability do we accept? Any contract language? |
| **Security** | Chief Information Security Officer | Data protection, API safety | What data does it access? Are API calls secure? |
| **IT** | CIO, Operations | Infrastructure, scaling, support | Will our systems support it? What's the SLA? |
| **Operations** | COO, Business Operations | Deployment, training, support | How do we train users? What's the support model? |
| **Business** | Line of business sponsor, Product | Time-to-market, revenue impact | What's the business case? When do we need it? |

---

## Intake Workflow: Step by Step

### Phase 1: Preparation (Pre-Intake)

**Timeline:** 1-2 weeks before intake form

**Activity:** Socialize the idea with key stakeholders

**Steps:**

1. **Schedule kickoff call** (30 min)
   - Attendees: PM, Compliance, Risk, key business sponsor
   - Agenda: Introduce agent concept, timeline expectations, roles
   - Share: One-pager with business case and use case

2. **Identify stakeholder leads** (1 person per lane)
   - Compliance lead: Alice (Model Risk Manager)
   - Risk lead: Bob (Credit Risk Officer)
   - Legal lead: Carol (Senior Legal Counsel)
   - Security lead: Dave (CISO)
   - IT lead: Eve (Infrastructure Manager)
   - Operations lead: Frank (Operations Manager)
   - Business lead: Grace (Product Owner)

3. **Send pre-meeting prep materials**
   - Template intake form (to review)
   - Similar agent case study (for reference)
   - Decision timeline ("We need stakeholder input by Date X")

**Example email:**

```
Subject: New Agent Concept — Intake Review Needed (Credit Recommendation Agent)

Hi [Stakeholder],

We're planning to build a "Credit Recommendation Agent" to help relationship managers
identify upsell opportunities for credit products. This email invites your input via
Intellios intake process.

Timeline:
- Intake form available: April 15
- Stakeholder review deadline: April 22
- Governance validation: April 23-24
- Expected approval: April 25

Your role: [Lane name]
Key question for you: [Sample question from table above]

Questions? Reply to this email or ping me on Slack.

Thanks,
[PM name]
```

---

### Phase 2: Intake Form Submission (1-2 weeks)

**Timeline:** 3-5 business days for concurrent stakeholder input

**Activity:** Each stakeholder fills their lane of intake form

**How it works:**

1. **PM opens intake form** in Intellios
   - Selects template (e.g., "Credit Recommendation")
   - Fills business lane (problem statement, use case, timeline)
   - Shares form link with stakeholders

2. **Stakeholders fill their lanes in parallel** (not sequential)
   - Compliance: Risk classification, policy constraints
   - Risk: Loss exposure, probability assumptions
   - Legal: Liability acceptance, contract language
   - Security: Data sources, API calls, data classification
   - IT: Deployment environment, scaling assumptions
   - Operations: Training, support model
   - Business: Timeline, business metrics, success criteria

3. **Real-time conflict detection**
   - System detects contradictions (e.g., "Security says no external APIs" vs. "Business requires real-time credit bureau lookup")
   - Flag shown in dashboard: "⚠ Conflict between Security and Business lanes"

4. **PM facilitates conflict resolution**
   - Sync call with conflicting parties
   - Document resolution in intake form notes
   - Move forward when consensus achieved

**Best practices:**

- **Async-first:** Give stakeholders 3-5 days to fill form (no meetings required initially)
- **Shared context:** Include case study or reference agent so stakeholders understand scope
- **Clear expectations:** Define what each lane should focus on (see lane descriptions above)
- **Draft mode:** Stakeholders can save draft, refine, then submit
- **Comments:** Each lane has comment section for rationale (e.g., "Risk flagging >$50M exposure")

---

### Phase 3: Conflict Resolution (1-2 weeks if needed)

**Timeline:** 2-5 business days for complex conflicts

**Common conflicts & resolution:**

#### Conflict 1: Risk vs. Speed

**Scenario:**

```
Business: "We need this deployed by April 30"
Risk: "This is high-risk; needs 2-week validation"
Result: Conflict, 2-week delay
```

**Resolution options:**

1. **Phase deployment:** Deploy to limited set (e.g., 1 relationship manager) first
   - Risk approval for limited scope (faster)
   - Monitoring period (2 weeks)
   - Full rollout if performance good
   - Timeline: Phased go-live by May 14 (on track)

2. **Reduce scope:** Remove highest-risk features
   - Business reduces scope (fewer API calls, simpler logic)
   - Risk approval time reduced (1 week)
   - Timeline: Full deployment by May 7

3. **Accept delay:** Business accepts Risk timeline
   - Full validation by Risk (2 weeks)
   - Deployment by May 14
   - Timeline: Delayed 2 weeks

**PM's role:** Present options; help business/risk leader negotiate acceptable trade-off.

---

#### Conflict 2: Functionality vs. Security

**Scenario:**

```
Business: "Agent needs access to customer credit reports in real-time"
Security: "External API calls to credit bureaus increase compromise risk"
Result: Tension between functionality and safety
```

**Resolution options:**

1. **Require VPN/encryption:** Use encrypted tunnel to credit bureau API
   - Functionality preserved
   - Security reduced risk to acceptable level
   - Timeline: No impact (implementation detail)

2. **Batch processing:** Pre-fetch credit data (not real-time)
   - Slightly reduced functionality (data 1 hour old)
   - No external API calls at runtime (Security happy)
   - Timeline: No impact

3. **Conditional access:** High-risk decisions require manual review
   - Agent recommends, human approves before credit bureau call
   - Functionality preserved, security risk mitigated
   - Timeline: Adds review step (1-2 min per recommendation)

---

#### Conflict 3: Autonomy vs. Compliance

**Scenario:**

```
Business: "Approvals should be fully automated for faster decisions"
Compliance: "All credit decisions require human review (regulatory)"
Result: Fundamental policy conflict
```

**Resolution:**

This is **not negotiable** — compliance requirement supersedes business preference. However:

1. **Design for fast human review:**
   - Agent provides recommendation + confidence score
   - Human review UI shows recommendation prominently
   - Average review time: 30 seconds (fast enough?)

2. **Risk-tiered approval:**
   - Low-risk loans ($10K, prime borrower): Auto-approve
   - Medium-risk loans: 1-hour manual review
   - High-risk loans: 24-hour review committee
   - Timeline: Balances speed (for majority) with compliance

---

### Phase 4: Finalization & Submission

**Timeline:** 1-2 days

**Activity:** PM integrates stakeholder inputs into final intake; submit for generation

**Steps:**

1. **Consolidate inputs:**
   - Compliance approval? ✓
   - Risk assessment complete? ✓
   - Legal sign-off? ✓
   - Security validated? ✓
   - IT capacity confirmed? ✓
   - Operations ready? ✓
   - Business committed? ✓

2. **Document conflicts resolved:**
   ```
   Conflict 1: Speed vs. Risk
   → Resolved: Phased deployment (limited scope, monitoring, full rollout)

   Conflict 2: Functionality vs. Security
   → Resolved: Encrypted tunnel to credit bureau API

   Conflict 3: Autonomy vs. Compliance
   → Resolved: Risk-tiered approval (auto for low-risk, human for high/medium)
   ```

3. **Final review call** (30 min, optional if no conflicts)
   - Verify all lanes agree on solution
   - Confirm timeline acceptable to all

4. **Submit intake**
   - System generates agent blueprint from intake
   - ~30 seconds to blueprint generation
   - Governance validator checks against policies

---

## Timeline Planning

### Express Intake (Low-Risk Agent)

**Total timeline: 1-2 weeks**

```
Week 1:
  Mon: Prep phase (schedule call, identify leads, send materials)
  Tue-Thu: Intake form concurrent filling (Compliance, Risk, Legal, etc.)
  Fri: Review inputs; no conflicts (all lanes aligned)

Week 2:
  Mon: PM finalizes intake, submits
  Mon-Tue: Governance validation (auto-approved, low-risk)
  Tue: Agent added to Registry, ready for deployment
```

---

### Standard Intake (Medium-Risk Agent)

**Total timeline: 2-3 weeks**

```
Week 1:
  Mon: Prep phase
  Tue-Thu: Intake form concurrent filling

Week 2:
  Fri: Review inputs; 1-2 conflicts detected
  Fri-Sun: Conflict resolution (async Slack, doc updates)

Week 3:
  Mon: Final inputs resolved
  Tue: PM finalizes, submits
  Tue-Wed: Governance validation (review queue, Risk approval)
  Thu: Agent approved, ready for deployment
```

---

### Complex Intake (High-Risk Agent)

**Total timeline: 3-5 weeks**

```
Week 1:
  Mon: Prep phase (extended: 2-day workshop instead of call)
  Tue-Thu: Draft intake inputs (stakeholders share early drafts)
  Fri: PM consolidates; identifies conflicts

Week 2:
  Mon-Wed: Conflict resolution (3 sync meetings, multiple drafts)
  Thu: Revised inputs due
  Fri: Review revised inputs; still 1-2 conflicts

Week 3:
  Mon-Tue: Escalation meeting (with sponsors from each lane)
  Wed: Final decision documented
  Thu: PM finalizes intake, submits

Week 4:
  Mon-Tue: Governance validation (high-risk routes to Review Queue)
  Tue-Wed: Risk/Compliance deep dive (model review, loss exposure)
  Thu: Risk approves

Week 5:
  Mon: Agent added to Registry
  Tue-Wed: Deployment planning
  Thu: Deployed to staging
```

---

## Best Practices

### 1. Clear Lane Ownership

**Assign one person per lane** who owns that perspective. Avoid:

- Compliance lane filled by 4 different people (inconsistent)
- Risk lane assigned to someone without decision authority (will be overruled later)

**Ideal:** Chief Risk Officer (or delegate) owns Risk lane; can make binding decisions.

---

### 2. Pre-Read Case Studies

**Before intake, share:**

1. **Similar agent precedent:** "We built a Fraud Detection agent last year; here's how we classified risk"
2. **Policy reference:** "Our risk classification policy defines 'High-Risk' as >$10M exposure"
3. **Regulatory context:** "SR 11-7 requires all credit decisions documented"

This **educates** stakeholders and **accelerates** decision-making.

---

### 3. Use Templates Heavily

**Pre-built templates** (Credit, Fraud, KYC, etc.) include:

- Common risk classifications
- Typical stakeholder requirements
- Lessons learned from similar agents

Using template = 30 min intake instead of 2 hours (forms pre-populated).

---

### 4. Facilitate, Don't Dictate

**PM role:** Bridge conflicts, don't decide.

- **Bad:** PM says "We're deploying fully autonomous because it's faster"
- **Good:** PM says "Risk needs 2-week validation; Business needs speed. Here are 3 options: (A) phased deployment, (B) reduced scope, (C) delayed timeline. Which trade-off is acceptable?"

---

### 5. Document Rationale

**Why this matters:** Regulatory examiners ask "Why did you classify this as high-risk?"

**In intake, capture:**

```
Risk classification: HIGH

Rationale: "Agent makes credit recommendations >$10M annually;
risk of under-pricing credit (default loss >$5M) justifies high-risk
classification per governance policy v1.0.0 section 3.2"

Source: Risk lane input from Chief Risk Officer (date stamp)
```

This **evidences** your decision-making for audits.

---

## Conflict Escalation

If stakeholders cannot resolve conflict:

**Escalation path:**

```
Stakeholder deadlock
  ↓
PM facilitates sync (30 min discussion)
  ↓
If no consensus: Escalate to sponsors
  - Compliance Sponsor (Chief Compliance Officer)
  - Risk Sponsor (Chief Risk Officer)
  - Business Sponsor (Line of business head)
  ↓
Sponsors decide trade-off
  ↓
Document decision, proceed with intake
```

**Typical escalation:** 1-2 per month for large organizations (out of 20-30 agents).

---

## Measuring Success

Track these metrics to improve intake process:

| Metric | Target | Tracks |
|---|---|---|
| **Intake time (days)** | < 14 days | Efficiency |
| **Conflicts per intake** | < 1.5 | Collaboration quality |
| **Conflict resolution time (days)** | < 5 days | Decision-making speed |
| **Stakeholder consensus rate** | > 95% | Alignment quality |
| **Intake-to-approval time (days)** | < 7 days (low-risk), < 21 days (high-risk) | Velocity |

---

## Common Mistakes

1. **Skipping prep phase:** Leads to unprepared stakeholders, longer intake
2. **Sequential (not parallel) input:** Delays process unnecessarily
3. **PM as decider, not facilitator:** Erodes stakeholder trust
4. **No conflict escalation path:** Conflicts fester indefinitely
5. **Over-documenting:** Intake becomes 50-page epic (use templates instead)

---

## Next Steps

1. **Schedule intake prep workshop** for next agent initiative
2. **Identify stakeholder leads** for each lane
3. **Review case study** of similar agent (if exists)
4. **Select intake template** matching agent type
5. **Set timeline:** Agree on intake deadline with stakeholders

---

## Additional Resources

- [Product FAQ](../10-faq-troubleshooting/product-faq.md) — Intake workflow details
- [PM Orientation](./pm-orientation.md) — PM perspective on intake process
- Intake templates (in Intellios dashboard)

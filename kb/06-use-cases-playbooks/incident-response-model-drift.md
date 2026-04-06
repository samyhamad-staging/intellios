---
id: 06-006
title: 'Incident Response: Model Drift Detection and Remediation'
slug: incident-response-model-drift
type: task
audiences:
- compliance
- engineering
status: published
version: 1.0.0
platform_version: 1.0.0
created: '2026-04-05'
updated: '2026-04-05'
author: Intellios
reviewers: []
tags:
- incident-response
- observability
- operations
- compliance
- model-drift
- agent-management
prerequisites:
- 03-001
- 03-005
- 07-003
related:
- 07-004
- 07-005
- 03-007
next_steps:
- 07-004
- 07-003
feedback_url: https://feedback.intellios.ai/kb
tldr: 'When an agent''s deployed behavior diverges significantly from its registered
  Agent Blueprint Package (ABP)—due to model decay, data drift, or unintended behavior
  change—it must be detected, investigated, and remediated promptly. This playbook
  defines the incident response procedure: triage (severity assessment), investigation
  (compare deployed vs. registered ABP), containment (pause if critical), remediation
  (update ABP and re-validate), and post-incident review. Includes RACI matrix and
  target timelines.

  '
---


# Incident Response: Model Drift Detection and Remediation

> **TL;DR:** When an agent's deployed behavior diverges significantly from its registered Agent Blueprint Package (ABP)—due to model decay, data drift, or unintended behavior change—it must be detected, investigated, and remediated promptly. This playbook defines the incident response procedure: triage (severity assessment), investigate (compare deployed vs. registered ABP), containment (pause if critical), remediation (update ABP and re-validate), and post-incident review. Includes RACI matrix and target timelines.

## Overview

In production, agents encounter data and conditions that differ from those in training and testing. Over time, an agent's accuracy or behavior can degrade—a phenomenon known as model drift. Additionally, an agent's behavior can change unintentionally due to:

- **Data Drift** — The distribution of input data changes (e.g., customer demographics, market conditions, policy changes).
- **Model Decay** — The model's learned patterns become outdated as the world changes.
- **Environment Changes** — Dependencies (APIs, databases, third-party services) change in unexpected ways.
- **Configuration Errors** — An agent is deployed with incorrect settings or policy overrides.
- **Adversarial Inputs** — An agent encounters inputs designed to trigger incorrect behavior.

Unlike traditional software, where a bug is a discrete code issue, model drift is continuous and probabilistic. An agent might perform well on 99% of cases but fail on an edge case or minority population. Intellios observability systems detect drift through metrics monitoring. This playbook defines how to respond when drift is detected.

---

## Drift Detection: What Triggers This Playbook

Drift is detected through continuous monitoring of agent metrics:

**Key Metrics:**

- **Accuracy Metrics** (if ground truth is available)
  - Exact match accuracy
  - Task completion rate
  - Coverage ratio (% of requests that the agent can handle vs. escalated)
  - Error rate (% of requests that result in an error)

- **Behavioral Metrics**
  - Response latency (time to generate response)
  - Token usage per request (indicates model behavior change)
  - Recommendation acceptance rate (% of user-actionable recommendations that users accept)
  - Override rate (% of agent recommendations that human reviewers override)

- **Fairness & Safety Metrics**
  - Disparate impact ratio (% of favorable outcomes across protected classes)
  - False negative rate by subgroup (misses more commonly in certain populations)
  - Harmful output rate (% of responses flagged for safety issues)

**Triggers for This Playbook:**

Any of the following trigger drift detection alerts:

- Accuracy drops > 5% from baseline (over a rolling 7-day window).
- Error rate exceeds SLA threshold (e.g., > 2% errors when SLA is 0.5%).
- Behavioral changes: token usage per request increases > 20%, latency increases > 30%.
- Fairness alert: disparate impact ratio deviates > 10% from baseline in any subgroup.
- Safety alert: harmful output rate exceeds [PLACEHOLDER] per day.
- Human override rate increases > 25% from baseline.
- Customer complaints about agent accuracy or behavior spike (e.g., 3+ complaints in 24 hours).

When any trigger is activated, an alert is generated and the incident response playbook is initiated.

---

## Incident Response Phases

### Phase 1: Triage (< 30 minutes)

**Objective:** Quickly assess severity and decide whether to pause the agent.

**Responsible Party (RACI):** Incident Commander (On-Call Engineer)

**Steps:**

1. **Receive Alert** — An alert from the observability dashboard or alerting system notifies the on-call engineer of a potential drift incident.

2. **Confirm Alert** — Log into the Intellios dashboard. Confirm that:
   - The alert is not a false positive (e.g., alert threshold misconfigured).
   - The drift signal is real (metric is actually deviating from baseline).
   - The metric is currently problematic (not a transient spike that has already resolved).

   **Tools:**
   - Intellios Observability Dashboard: `/console/observability/[AGENT_ID]/metrics`
   - Baseline data: All metrics include 7-day, 30-day, and 90-day baselines for comparison.

3. **Assess Severity**
   - **CRITICAL** (Pause immediately):
     - Error rate > 10% or > 50 errors/hour
     - Agent making harmful or unsafe recommendations
     - Agent violating governance policy
     - Customer-facing agent producing incorrect results affecting paying customers
   - **HIGH** (Investigate within 1 hour, consider pause if not resolved):
     - Accuracy drops > 15% from baseline
     - Error rate 2-10%
     - Fairness alert with disparate impact ratio > 20% from baseline
   - **MEDIUM** (Investigate within 4 hours):
     - Accuracy drops 5-15% from baseline
     - Latency increases > 50% from baseline
     - Non-critical behavioral changes
   - **LOW** (Investigate within 24 hours):
     - Accuracy drops 2-5% from baseline
     - Other behavioral changes < 20%

4. **Declare Severity** — Classify the incident as CRITICAL, HIGH, MEDIUM, or LOW and document in the incident log.

5. **Page Responders**
   - **CRITICAL:** Page incident commander, agent owner (PM), engineering lead, compliance (if regulated agent).
   - **HIGH:** Page incident commander and agent owner.
   - **MEDIUM:** Notify via Slack channel.
   - **LOW:** Create ticket for asynchronous investigation.

**SLA:** Triage must complete within 30 minutes for CRITICAL incidents, 2 hours for HIGH.

**Output:** Triage summary with severity, assigned responders, and recommended action (pause vs. investigate in-place).

---

### Phase 2: Investigation (< 2 hours for CRITICAL, < 8 hours for HIGH)

**Objective:** Identify the root cause of drift.

**Responsible Parties (RACI):**
- Incident Commander (leads)
- Agent Owner / ML Engineer (primary investigator)
- Data Engineer (if data drift suspected)
- Security Engineer (if adversarial input suspected)
- Compliance Officer (if governance violation)

**Steps:**

1. **Compare Deployed vs. Registered ABP**

   The root cause often lies in a mismatch between what was deployed and what is currently running. Compare:
   - **Deployed ABP:** The actual agent configuration and policies running in production.
   - **Registered ABP:** The version stored in the Agent Registry that was approved and is supposed to be running.

   **Steps:**
   ```
   Agent ID: [AGENT_ID]
   Deployed Version: [VERSION_HASH]
   Registered Version: [VERSION_HASH]

   Compare:
   - Capability definitions (tools, access_level)
   - Constraints (denied_actions, rate_limits)
   - Behavior instructions (persona, rules, escalation triggers)
   - Governance policies
   - Parameter settings (temperature, top_p, max_tokens)

   If deployed != registered:
   → Possible causes: unintended deployment, configuration error, unauthorized change
   → Immediate action: rollback to registered version if safe
   ```

   **Tool:** Intellios Registry: `/console/registry/[AGENT_ID]/versions` → Compare tab.

2. **Review Observability Data**

   Examine detailed logs and metrics for the time window around the drift detection:

   - **Request/Response Logs:** Sample recent requests and responses. Look for:
     - New types of questions the agent is failing on.
     - Responses that are longer, shorter, or qualitatively different.
     - Escalations that previously were not escalated.

   - **Error Logs:** Review error stack traces. Look for:
     - API failures (e.g., tool calls that are failing).
     - Model/inference failures (e.g., tokenization errors, context length exceeded).
     - Configuration errors (e.g., invalid policy syntax).

   - **Behavioral Metrics Over Time:** Plot key metrics (accuracy, latency, error rate) over the past 7 days. Look for:
     - Sudden drops (indicates an event or deployment change).
     - Gradual decay (indicates model drift or data drift).
     - Time of day patterns (indicates dependency on external services).

   **Tool:** Intellios Observability Dashboard: `/console/observability/[AGENT_ID]/logs` → Advanced filtering by time, error type, user cohort.

3. **Investigate Data Drift**

   If behavioral metrics are degrading gradually (not a sudden drop), data drift is likely:

   - **Input Distribution:** Has the distribution of customer requests changed? Are more requests coming from a new demographic or market?
   - **Dependency Data:** Have external data sources (APIs, databases) changed? For example:
     - A rate quote API returns different values.
     - A customer database schema changed.
     - A third-party AI API's behavior changed.

   **Steps:**
   ```
   - Compare input distribution (past 7 days vs. 30-day baseline)
   - Check for changes in customer cohort, geography, or request type
   - Verify external API responses haven't changed (spot-check recent calls)
   - Review any recent data updates (policy rules, reference databases)
   ```

   **Tool:** Data warehouse / logging system to query input distributions.

4. **Investigate Model Decay**

   If accuracy is dropping across the board (not just for specific cohorts), model decay is likely:

   - **Prompt Engineering:** Has the system prompt or instructions changed? Compare current prompt to registered ABP.
   - **Instruction Clarity:** Are instructions ambiguous or conflicting? Test with example inputs to see if behavior is consistent.
   - **Knowledge Freshness:** For agents using external knowledge (e.g., policy documents, guidelines), is the knowledge current? Have policies changed?

   **Steps:**
   ```
   - Review system prompt for clarity and consistency
   - Test agent with historical "golden" test cases
   - Compare results to baseline performance
   - If accuracy on known cases has degraded → model decay confirmed
   ```

5. **Investigate Adversarial Inputs**

   If error rate is spiking for specific input patterns, adversarial input or an edge case might be responsible:

   - **Edge Case Analysis:** Do errors cluster around specific inputs? For example:
     - Certain customer types (e.g., customers with unusual account structures).
     - Certain data formats (e.g., unusually long documents, special characters).
     - Certain time-sensitive scenarios (e.g., end-of-month, start of quarter).

   - **Adversarial Testing:** Are there patterns in the inputs that triggered errors? Test similar inputs to confirm reproducibility.

   **Steps:**
   ```
   - Cluster errors by input characteristics
   - Identify common features of failing cases
   - Test similar inputs to confirm reproducibility
   - If error is reproducible → edge case or adversarial input confirmed
   ```

6. **Investigate Governance Violations**

   If a governance alert was triggered, check whether the agent is violating a governance policy:

   - **Policy Audit:** Review which policies the agent is violating.
   - **Evidence:** Generate evidence of the violation from request logs.
   - **Policy Interpretation:** Verify that the policy violation is intentional or an error in policy interpretation.

   **Steps:**
   ```
   - Review governance violations in Intellios Governance Dashboard
   - Check which specific policies are being violated
   - Sample requests that trigger violations
   - If violation is unintentional → policy enforcement error or misconfiguration
   - If violation is intentional → governance policy needs to be updated
   ```

**Output:** Root Cause Summary

```
Incident ID: [INCIDENT_ID]
Root Cause: [DATA_DRIFT | MODEL_DECAY | CONFIG_ERROR | EDGE_CASE | GOVERNANCE_VIOLATION | OTHER]
Evidence: [LINK_TO_LOGS, METRICS, CHARTS]
Impact: [NUMBER_OF_REQUESTS_AFFECTED, USERS_AFFECTED]
Timeline: [WHEN_DID_DRIFT_START]
```

---

### Phase 3: Containment (< 1 hour for CRITICAL)

**Objective:** If necessary, pause the agent to prevent further harm.

**Responsible Party (RACI):** Incident Commander + Agent Owner

**Decision Tree:**

- **If error rate > 5% OR agent is violating critical governance policy:** PAUSE the agent immediately.
  - Navigate to Intellios Registry: `/console/registry/[AGENT_ID]`
  - Click "Lifecycle" → "Pause"
  - Reason: "[INCIDENT_ID]: Model drift detected. Under investigation."
  - Notify stakeholders (customer success, compliance, business owner).

- **If error rate 1-5% AND no critical governance violation AND no immediate safety risk:** Do NOT pause. Proceed to remediation while monitoring.
  - Continue to Phase 4 while closely monitoring metrics.
  - Set up escalation: if error rate increases to > 5%, pause immediately.

- **If error rate < 1% but behavioral metrics are off:** Do NOT pause unless human override rate is > 50%.
  - Proceed to Phase 4.

**SLA:** Pause decision must be made within 30 minutes for CRITICAL incidents.

**Output:** Containment Decision Log

```
Incident ID: [INCIDENT_ID]
Decision: [PAUSE | DO_NOT_PAUSE]
Reason: [DECISION_RATIONALE]
Timestamp: [DECISION_TIME]
Notified Stakeholders: [LIST]
```

---

### Phase 4: Remediation (< 4 hours for CRITICAL, < 24 hours for HIGH)

**Objective:** Fix the root cause and redeploy the agent.

**Responsible Parties (RACI):**
- Agent Owner / ML Engineer (primary)
- PM (if requirement change)
- Compliance Officer (if governance change needed)
- Data Engineer (if data fix needed)

**Steps (by root cause):**

**A. If Root Cause is CONFIG_ERROR or UNAUTHORIZED_CHANGE:**

1. Identify the incorrect configuration or change.
2. Determine the correct configuration (from registered ABP or previous working version).
3. Create a new ABP version with the corrected configuration.
4. Run governance validation: ensure the new ABP passes all governance policies.
5. If governed, request approval from compliance officer.
6. Deploy the new ABP version to production.

**Steps:**
```
1. Create New ABP Version
   - Copy registered ABP to a new draft version
   - Correct the configuration error
   - Document the change in the ABP changelog

2. Run Governance Validation
   - Use Intellios Governance Validator on the new ABP
   - Ensure all error-level policies pass
   - Log any warnings

3. Get Approval (if governed)
   - Submit to Review Queue
   - Wait for compliance approval (target: 1 hour)
   - If approved, proceed to deploy

4. Deploy
   - Gradual rollout: deploy to 10% of traffic first
   - Monitor error rate for 15 minutes
   - If errors < 1%, increase to 50%
   - If errors still < 1%, deploy to 100%
```

**Tools:**
- Intellios Blueprint Studio: `/console/blueprints/new` → Create Version
- Intellios Governance Validator: automatic, run as part of validation
- Intellios Registry: `/console/registry/[AGENT_ID]/deploy`

**B. If Root Cause is DATA_DRIFT:**

1. Identify what data has changed (input distribution, external data source).
2. Retrain or fine-tune the agent's behavior to handle the new data distribution.
3. Validate the retrained agent on a hold-out test set from the new distribution.
4. Create a new ABP version with updated behavior instructions or knowledge base.
5. Run governance validation and deploy.

**Steps:**
```
1. Identify Data Changes
   - Analyze input distribution shift
   - Identify external data source changes

2. Update Agent Knowledge/Behavior
   - Fine-tune the agent's instructions or knowledge base
   - Or retrain the model (if applicable)
   - Or update reference data (e.g., policy documents)

3. Validate
   - Test on a sample of recent requests
   - Ensure accuracy improves on the new distribution
   - Ensure no regressions on old distribution

4. Create New ABP Version
   - Document the knowledge/behavior updates
   - Increment the version number

5. Deploy (following the same gradual rollout as A above)
```

**Tools:**
- Data warehouse for input distribution analysis
- Agent fine-tuning or retraining pipeline (if available)
- Intellios Blueprint Studio for creating new ABP version

**C. If Root Cause is MODEL_DECAY:**

1. Identify what instruction or knowledge has become outdated.
2. Update the system prompt, behavior instructions, or knowledge base with current, accurate information.
3. Test on golden test cases to ensure accuracy improves.
4. Create a new ABP version with updated instructions.
5. Run governance validation and deploy.

**Steps:**
```
1. Identify Outdated Information
   - Review system prompt for out-of-date references
   - Check knowledge base for stale policies or guidelines
   - Consult subject matter experts for current guidance

2. Update Instructions/Knowledge
   - Rewrite system prompt for clarity and currency
   - Update policy documents or reference data
   - Validate changes with SMEs

3. Test
   - Run golden test cases
   - Compare accuracy to previous version
   - Ensure improvements

4. Create New ABP Version and Deploy
```

**D. If Root Cause is EDGE_CASE or ADVERSARIAL_INPUT:**

1. Define the edge case or adversarial pattern clearly.
2. Update the agent's constraints or behavior instructions to handle the case.
3. Add guard rails (e.g., escalation triggers for edge cases).
4. Test on cases similar to the edge case to ensure robustness.
5. Create a new ABP version and deploy.

**Steps:**
```
1. Define the Edge Case
   - Document the input pattern that triggers the error
   - Example: "Claims with claim amounts > $1M with three or more concurrent claims"

2. Update Constraints/Behavior
   - Add escalation rule: "If [PATTERN], escalate to human"
   - Or: Update decision logic to handle the case explicitly
   - Or: Add additional validation steps

3. Test
   - Test on the specific edge case
   - Test on similar cases
   - Ensure no regressions

4. Create New ABP Version and Deploy
```

**E. If Root Cause is GOVERNANCE_VIOLATION:**

1. Determine whether the governance policy is correct and the agent is wrong, or the policy needs to be updated.
2. If the policy is correct and the agent is wrong:
   - Update the agent's behavior to comply with the policy.
   - Create a new ABP version with compliant behavior.
   - Run governance validation (should pass).
3. If the policy needs to be updated:
   - Work with compliance team to revise the policy.
   - Review the revised policy with all stakeholders.
   - Update the policy in the Governance Policy Registry.
   - Re-run governance validation on the agent's ABP with the new policy.

**Steps:**
```
1. Determine Root Cause of Violation
   - Is the policy correct? (consult compliance team)
   - Is the agent behavior correct? (consult product/engineering)

2a. If Agent Behavior is Wrong:
   - Update ABP to enforce policy compliance
   - Create new ABP version
   - Run governance validation (should now pass)
   - Deploy

2b. If Policy is Wrong:
   - Work with compliance to revise policy
   - Update Governance Policy Registry
   - Run re-validation against agents
   - May require agent updates if no longer compliant
```

**Tools:**
- Intellios Blueprint Studio for creating new ABP version
- Intellios Policy Registry for updating governance policies
- Intellios Governance Validator for validation

**SLA:** Remediation (all steps from root cause to successful deployment) must complete within 4 hours for CRITICAL incidents, 24 hours for HIGH.

**Output:** Remediation Summary

```
Incident ID: [INCIDENT_ID]
Root Cause: [CAUSE]
Fix Applied: [DESCRIPTION_OF_CHANGES]
New ABP Version: [VERSION_HASH]
Governance Validation: [PASS | FAIL]
Approval Status: [APPROVED | PENDING]
Deployment Status: [IN_PROGRESS | COMPLETE]
Rollout Progress: [10% | 50% | 100%]
Post-Deployment Metrics: [ACCURACY, ERROR_RATE, LATENCY] (sampled 1 hour post-deployment)
```

---

### Phase 5: Post-Incident Review (< 1 week)

**Objective:** Learn from the incident and prevent recurrence.

**Responsible Parties (RACI):**
- Incident Commander (facilitates)
- Agent Owner / ML Engineer
- PM / Product Owner
- Compliance Officer (if governance-related)
- On-Call Engineer (if operational issue)

**Steps:**

1. **Schedule Post-Incident Meeting** — Within 2 business days, schedule a 30-minute meeting with all responders.

2. **Review Timeline**
   - Document when each phase started and ended.
   - Identify any delays or bottlenecks.
   - Did the incident meet SLAs? If not, why?

   **Timeline Template:**
   ```
   Alert triggered: [TIME]
   Triage completed: [TIME] (SLA: 30 min) ✓/✗
   Root cause identified: [TIME] (SLA: 2 hours) ✓/✗
   Containment decision: [TIME] (SLA: 30 min) ✓/✗
   Remediation deployed: [TIME] (SLA: 4-24 hours) ✓/✗
   Incident resolved: [TIME]
   ```

3. **Root Cause Analysis (5-Why)**

   Go beyond the immediate cause to the systemic issue:

   - **Why did the agent drift?** → [IMMEDIATE_CAUSE]
   - **Why was this not caught earlier?** → [PROCESS_GAP]
   - **Why does this process gap exist?** → [SYSTEMIC_ISSUE]
   - **What can we change to prevent this?** → [REMEDIATION]

   **Example:**
   ```
   Why did accuracy drop?
   → The agent was not handling a new customer cohort.
   Why was this not caught?
   → Observability was not granular enough to detect cohort-specific drops.
   Why does this gap exist?
   → Observability dashboard doesn't have cohort-level metrics.
   What changes prevent recurrence?
   → Add cohort-level accuracy metrics to the observability dashboard.
   ```

4. **Identify Preventive Measures**

   For each systemic issue, propose preventive measures:

   - **Process Changes:** Update incident response procedures, alert thresholds, or governance policies.
   - **Tool Changes:** Add observability, improve monitoring, improve tooling.
   - **Agent Changes:** Update the agent's behavior, constraints, or testing to be more robust.
   - **Knowledge Changes:** Document lessons learned, update runbooks, train the team.

   **Examples:**
   ```
   Preventive Measure 1: Add cohort-level accuracy metrics
   Owner: Data Team
   Timeline: 2 weeks
   Estimated Effort: 8 hours

   Preventive Measure 2: Increase alert sensitivity for new cohorts
   Owner: SRE Team
   Timeline: 1 week
   Estimated Effort: 4 hours

   Preventive Measure 3: Add quarterly accuracy drift drills
   Owner: Product Team
   Timeline: 1 month
   Estimated Effort: 16 hours
   ```

5. **Update Runbooks & Documentation**

   - If the incident reveals gaps in runbooks or playbooks, update them.
   - If the team discovered useful investigative techniques, document them.
   - Share lessons learned with the broader team via Slack, email, or wiki.

6. **Update Governance Policies (if needed)**

   - If the incident reveals insufficient governance, update policies.
   - If new risks are identified, add new guardrails.
   - Re-run governance validation against existing agents to ensure they still comply.

7. **Create Follow-Up Tickets**

   - For each preventive measure, create a ticket (in Jira, Linear, etc.) with owner, timeline, and effort estimate.
   - Prioritize tickets based on impact and effort.

**SLA:** Post-incident review meeting must occur within 3 business days.

**Output:** Post-Incident Report

```
Incident ID: [INCIDENT_ID]
Date: [DATE]
Duration: [START_TIME] to [END_TIME]
Severity: [CRITICAL | HIGH | MEDIUM | LOW]
Root Cause: [CAUSE]
Impact: [CUSTOMERS/REQUESTS_AFFECTED, REVENUE_IMPACT_IF_APPLICABLE]

Timeline:
- Alert: [TIME]
- Triage: [TIME] (SLA: ✓/✗)
- Investigation: [TIME] (SLA: ✓/✗)
- Containment: [TIME] (SLA: ✓/✗)
- Remediation: [TIME] (SLA: ✓/✗)
- Resolution: [TIME]

Preventive Measures:
1. [MEASURE] (Owner: [OWNER], Timeline: [TIMELINE], Effort: [HOURS]h)
2. [MEASURE] (Owner: [OWNER], Timeline: [TIMELINE], Effort: [HOURS]h)
...

Follow-up Tickets:
- [TICKET_ID]: [DESCRIPTION]
- [TICKET_ID]: [DESCRIPTION]

Lessons Learned:
- [LESSON_1]
- [LESSON_2]
```

---

## RACI Matrix

| Role | Triage | Investigation | Containment | Remediation | Post-Incident |
|------|--------|---------------|-------------|-------------|---------------|
| **Incident Commander** | R, A | R, A | R, A | I | R, A |
| **Agent Owner / ML Engineer** | I | R, A | R, A | R, A | R, A |
| **Data Engineer** | I | C | - | C | - |
| **SRE / On-Call Engineer** | R, A | C | R, A | C | C |
| **PM / Product Owner** | I | I | - | C | I |
| **Compliance Officer** | C | C | I | C | C |
| **Security Engineer** | I | C | - | - | C |

**Legend:** R = Responsible | A = Accountable | C = Consulted | I = Informed

---

## Alert Configuration

To ensure drift incidents are detected promptly, configure alerts in your observability system:

**CRITICAL Alerts:**
```
- name: "Error Rate Spike"
  metric: "error_rate"
  condition: "> 5% for 5 minutes"
  action: "Page on-call engineer + incident commander"
  sla: "Response within 15 minutes"

- name: "Accuracy Drop"
  metric: "accuracy"
  condition: "> 15% drop from 7-day baseline"
  action: "Page on-call engineer + agent owner"
  sla: "Response within 30 minutes"

- name: "Safety Violation"
  metric: "harmful_output_rate"
  condition: "> [THRESHOLD] per day"
  action: "Page incident commander + compliance"
  sla: "Response within 15 minutes"
```

**HIGH Alerts:**
```
- name: "Moderate Accuracy Drop"
  metric: "accuracy"
  condition: "5-15% drop from baseline"
  action: "Notify on-call engineer + agent owner"
  sla: "Acknowledge within 2 hours"

- name: "Governance Violation"
  metric: "governance_violations"
  condition: "> 3 violations in 1 hour"
  action: "Notify compliance + agent owner"
  sla: "Acknowledge within 1 hour"
```

---

## Tools & Resources

- **Intellios Observability Dashboard:** `/console/observability/[AGENT_ID]/metrics`
- **Intellios Registry:** `/console/registry/[AGENT_ID]/versions`
- **Intellios Governance Validator:** Runs automatically during ABP validation
- **Incident Log:** `/console/incidents/` (all incidents are logged here)
- **Runbook:** This document
- **Post-Incident Template:** [LINK_TO_TEMPLATE]

---

## Next Steps

Now that you have a drift response playbook, you should:

1. **Configure Observability** — Set up dashboards and alerts for your agents. See [Observability Dashboards](observability-dashboards.md).
2. **Configure Alerting** — Set up alert channels and escalation policies. See [Alerting Configuration](alerting-configuration.md).
3. **Run Drift Drills** — Periodically simulate drift incidents to test your incident response process.
4. **Train the Team** — Ensure all on-call engineers, agent owners, and compliance officers understand this playbook.
5. **Document Lessons Learned** — As incidents occur, capture lessons and update this playbook.

---

*See also: [Observability Dashboards](observability-dashboards.md), [Alerting Configuration](alerting-configuration.md), [Agent Fleet Management](agent-fleet-management.md)*

*Next: [Configuring Observability Dashboards](observability-dashboards.md)*

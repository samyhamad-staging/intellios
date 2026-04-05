---
id: "05-006"
title: "Drift Detection: Monitoring Agents for Specification and Behavioral Deviation"
slug: "drift-detection"
type: "concept"
audiences:
  - "compliance"
  - "engineering"
status: "published"
version: "1.0.0"
platform_version: "1.0.0"
created: "2026-04-05"
updated: "2026-04-05"
author: "Intellios"
reviewers: []
tags:
  - "drift-detection"
  - "monitoring"
  - "compliance"
  - "governance"
  - "runtime"
  - "risk-management"
prerequisites: []
related:
  - "Agent Blueprint Package"
  - "Governance-as-Code"
  - "SR 11-7 Compliance Mapping"
next_steps:
  - "Configuring Drift Alerts"
  - "Post-Market Monitoring"
feedback_url: "[PLACEHOLDER]"
tldr: >
  Drift is any deviation of a deployed agent's behavior from its specification (ABP). Drift detection is the continuous monitoring and alerting system that compares runtime observations against the approved blueprint. Three types of drift matter: specification drift (ABP changed but agent not updated), behavioral drift (agent outputs degrade despite stable ABP), and policy drift (new governance policies post-deployment). Intellios detects drift through observability integration, rate limiting, constraint violation monitoring, and behavioral baselines. Automated alerts trigger escalation workflows. Understanding drift is essential for SR 11-7 compliance and operational risk management.
---

# Drift Detection: Monitoring Agents for Specification and Behavioral Deviation

> **TL;DR:** Drift is when a deployed agent's behavior deviates from its approved specification (the ABP). Intellios detects three types: specification drift (ABP changes), behavioral drift (output quality degrades), and policy drift (new governance rules). Detection uses observability integration, constraint violation monitoring, and performance baselines. Automated alerts trigger escalation. Drift detection is essential for SR 11-7 post-market monitoring and operational governance compliance.

## Overview

A **deployed agent** is only compliant when it behaves as specified in its approved Agent Blueprint Package (ABP). But specifications can change, agents can degrade, and new governance policies can emerge. Without continuous monitoring and alerting, non-compliance becomes undetectable.

**Drift** is any deviation from specification. It occurs when:

1. The **ABP is modified** but the deployed agent is not updated (specification drift)
2. The **agent's outputs degrade** despite the ABP remaining stable—accuracy drops, outputs become inconsistent, or the agent violates constraints (behavioral drift)
3. **New governance policies** are published post-deployment that the agent no longer satisfies (policy drift)

In regulated environments, drift is a critical governance concern. The Federal Reserve's SR 11-7 guidance explicitly requires "monitoring changes in model inputs, output distributions, and model use, as well as detecting model degradation or drift from original specifications." The EU AI Act requires "post-market monitoring" of deployed systems. Organizations must detect drift quickly and escalate to appropriate authorities.

Intellios automates drift detection by integrating with runtime observability systems, monitoring constraint violations, tracking behavioral baselines, and generating alerts. When drift is detected, severity-based escalation triggers operational response workflows. Compliance teams can then investigate, determine root cause, and execute remediation.

## Types of Drift

### 1. Specification Drift

**Definition:** The approved ABP is modified after deployment, but the deployed agent has not been updated to match.

**Scenario:**

A Loan Approval Agent is deployed with ABP version 1.0.0:
- **Capability:** Checks applicant credit score
- **Constraint:** Must not approve loans > $500,000 without human review
- **Data retention:** Delete loan decision logs after 90 days

Later, the team discovers that credit score data is unreliable. The ABP is updated to v1.1.0:
- **Capability:** Use alternative income-verification service instead of credit score
- **Constraint:** Updated to $400,000 threshold
- **Data retention:** Updated to 180-day retention per new compliance policy

The deployed agent still runs v1.0.0. **It is now out of spec.** It is making decisions based on unreliable data, approving loans above the new threshold, and retaining data longer than policy allows.

**Detection:** Specification drift is detected by comparing the deployed agent's version against the approved blueprint version. If they mismatch, drift is flagged. Intellios tracks deployed versions and compares them against current approved versions in the registry.

**Remediation:** Re-deploy the agent with the new ABP version, or roll back the ABP change if deployment cannot happen immediately.

### 2. Behavioral Drift

**Definition:** The ABP is stable, but the agent's outputs degrade—accuracy drops, outputs become inconsistent, constraints are violated, or outputs develop unexpected patterns.

**Scenario:**

A Fraud Detection Agent has been running stably for 6 months. It maintains 92% precision in detecting fraudulent transactions. Then, over two weeks:
- Precision drops to 78%
- False positives spike by 40%
- The agent begins flagging legitimate transactions from a new merchant category it was never trained on

The ABP has not changed. But the agent's behavior has drifted. Root cause: the underlying merchant category distribution in production has shifted; the agent's training data is now out-of-distribution.

**Detection:** Behavioral drift is detected through:
- **Performance monitoring** — Track accuracy, precision, recall, latency against baseline
- **Fairness monitoring** — Track per-demographic accuracy (are some customer groups affected differently?)
- **Constraint violation monitoring** — Count violations of explicit constraints over time
- **Output distribution monitoring** — Track statistical properties of outputs (mean, variance, shape)
- **Anomaly detection** — Flag unusual input/output patterns that deviate from historical baseline

**Remediation:** Investigate root cause (data shift, concept drift, training data decay). Options include:
1. Retrain the agent with current data
2. Adjust thresholds or policies
3. Implement data quality corrections upstream
4. Pause the agent pending investigation

### 3. Policy Drift

**Definition:** New governance policies are published after agent deployment, and the deployed agent no longer satisfies the new policies.

**Scenario:**

An agent is deployed in January 2026, passing all governance policies. In March 2026, the organization publishes a new **Data Handling Policy** requiring:
- All agents processing customer PII must encrypt logs
- Logs must be deleted within 30 days (was 90 days previously)
- All access to logs must be audited

The deployed agent was designed for the old policy (90-day retention, no encryption requirement, basic logging). **It is now out of compliance with the new policy.**

**Detection:** Policy drift is detected by:
1. When a new governance policy is published, Intellios simulates it against all deployed agents
2. For each agent, the simulator checks whether the agent's ABP would pass the new policy
3. Agents that fail the new policy are flagged as "policy drift detected"
4. An alert is generated and escalated to the compliance team

**Remediation:**
1. Decide whether the policy applies to already-deployed agents or only new agents
2. If policy applies to existing agents, set a remediation deadline (e.g., 30 days)
3. Update the agent's ABP to comply with the new policy
4. Re-validate and re-deploy

## How Intellios Detects Drift

### Architecture Overview

```
Deployed Agent (Production)
        ↓
    [Observability Integration]
        ↓
  Runtime Telemetry Collected:
  - Inputs (user, data, context)
  - Outputs (decisions, recommendations, responses)
  - Latency, errors, constraint violations
  - Resource consumption
        ↓
    [Drift Detection Engine]
        ↓
  Specification Drift Check:
    Deployed version == Approved version?
        ↓
  Behavioral Drift Check:
    Performance metrics vs. baseline?
    Constraint violations exceeding threshold?
    Output distribution within expected range?
        ↓
  Policy Drift Check:
    Would ABP pass all current policies?
        ↓
    [Alert Severity Determination]
        ↓
  Error:   Specification/policy mismatch, constraint violation
  Warning: Performance degradation, increased error rate
  Info:    Monitored metric variance (informational only)
        ↓
    [Escalation Workflow]
```

### 1. Specification Drift Detection

**Mechanism:** The Agent Registry tracks the deployed version of each agent. Intellios periodically compares:

```
Deployed Version (in production) vs. Approved Version (in registry)
```

If they differ, specification drift is flagged.

**Configuration:**

```json
{
  "driftDetection": {
    "specificationDrift": {
      "enabled": true,
      "checkInterval": "1h",  // Check every hour
      "severity": "error",    // Block production if mismatch
      "alertChannel": "compliance-team-slack"
    }
  }
}
```

**Alert Example:**

```
Specification Drift Detected
Agent: Loan Approval Agent
Deployed Version: 1.0.0
Current Approved Version: 1.1.0
Mismatch Duration: 4 days
Severity: ERROR

Action Required:
1. Review changes between 1.0.0 and 1.1.0 in ABP history
2. Assess impact of deployed agent running old specification
3. Schedule re-deployment with v1.1.0
4. Confirm deployment and re-validate
```

### 2. Behavioral Drift Detection

**Mechanism:** Intellios integrates with observability platforms (DataDog, New Relic, Splunk, CloudWatch) to collect runtime telemetry:

| Metric | Collected From | Baseline | Threshold |
|---|---|---|---|
| **Accuracy** | Model predictions vs. ground truth labels | Historical average | 5% drop triggers warning, 10% drop triggers alert |
| **Precision/Recall** | True positives / false positives | Historical average | Deviation >5% |
| **Latency** | Request response time | Historical p50, p95, p99 | p95 latency +50% triggers alert |
| **Error Rate** | Failed requests / total requests | Historical % | >1% above baseline triggers alert |
| **Constraint Violations** | Actions violating constraints | Historical count | Any violation of critical constraint |
| **Output Distribution** | Statistical properties of outputs | Baseline mean, variance, quantiles | Kolmogorov-Smirnov test for distribution shift |
| **Per-Demographic Accuracy** | Accuracy broken down by demographic groups | Baseline per group | >5% deviation in any demographic |

**Configuration Example:**

```json
{
  "driftDetection": {
    "behavioralDrift": {
      "enabled": true,
      "metrics": [
        {
          "name": "accuracy",
          "baseline": "trailing_30_days",  // Rolling 30-day average
          "alertThreshold": {
            "value": 0.10,  // 10% drop
            "severity": "error"
          },
          "warningThreshold": {
            "value": 0.05,  // 5% drop
            "severity": "warning"
          }
        },
        {
          "name": "constraint_violations",
          "baseline": "trailing_30_days",
          "alertThreshold": {
            "value": 1,  // Any violation of critical constraint
            "severity": "error"
          }
        },
        {
          "name": "fairness_disparity",
          "metrics": ["accuracy_by_age", "accuracy_by_gender"],
          "alertThreshold": {
            "value": 0.05,  // 5% disparity between groups
            "severity": "warning"
          }
        }
      ],
      "checkInterval": "4h",
      "alertChannel": "data-science-team-slack"
    }
  }
}
```

**Alert Example:**

```
Behavioral Drift Detected
Agent: Fraud Detection System
Metric: Precision
Baseline (30-day avg): 89.2%
Current (last 24h): 76.5%
Deviation: -12.7%
Severity: ERROR

Details:
- False positive rate increased from 8.2% to 21.3%
- Primary impact: Legitimate transactions from new merchant (Uber eats)
- Affected customers: 1,247 in last 24 hours

Recommended Actions:
1. Review recent data changes (new merchant categories?)
2. Investigate training data distribution
3. Consider agent pause pending investigation
4. Retrain if root cause is concept drift
```

### 3. Policy Drift Detection

**Mechanism:** When a new governance policy is published, Intellios performs **impact simulation**:

1. For each deployed agent (status=approved):
   - Retrieve the agent's ABP
   - Re-run governance validation using the new policy
   - If any error-severity violations found, policy drift is flagged

2. If policy drift is found:
   - Determine if policy applies to existing agents or only new agents
   - If applies to existing agents, set remediation deadline
   - Generate alert with impact summary and remediation guidance

**Configuration:**

```json
{
  "governancePolicies": [
    {
      "id": "policy-data-handling-v2",
      "name": "Data Handling Policy v2",
      "applicableToExistingAgents": true,
      "remediationDeadline": "2026-05-15",  // 30 days after policy published
      "alertSeverity": "error"
    }
  ]
}
```

**Impact Simulation Result:**

```
Policy Drift Simulation: Data Handling Policy v2
Published: 2026-04-15
Simulation Date: 2026-04-15T14:00:00Z

Agents Affected: 8 deployed agents

Summary:
- Agents passing new policy: 6
- Agents with violations: 2
- Agents with error-severity violations: 2
- Remediation deadline: 2026-05-15 (30 days)

Agents Requiring Remediation:

1. Agent: Fraud Detection System v1.2.0
   Violation: Rule data-001
   Field: governance.dataRetention.retentionDays
   Message: Data retention must be 30 days or less (current: 90 days)
   Severity: ERROR

2. Agent: Customer Service Bot v2.1.0
   Violation: Rule data-003
   Field: governance.audit.logEncryption
   Message: Interaction logs must be encrypted at rest (current: false)
   Severity: ERROR

Remediation Steps:
1. Update ABP to comply with new requirements
2. Re-validate against policy
3. Deploy updated version before deadline
4. Confirm deployment with re-validation
```

## Escalation and Remediation

### Severity-Based Escalation

When drift is detected, alerts are generated with severity levels:

| Severity | Trigger | Response | Escalation |
|---|---|---|---|
| **Error** | Specification mismatch, critical constraint violation, accuracy drop >10%, policy violation | Automatic pause of agent recommended; escalate immediately | Risk officer, compliance officer, business owner |
| **Warning** | Performance degradation 5-10%, error rate increase, fairness disparity | Manual review recommended; escalate to engineering | Data science team, agent owner |
| **Info** | Performance variance within acceptable range, routine monitoring updates | Logged for audit trail; no escalation | Informational logs; included in monthly reports |

### Automated Remediation Workflows

**Specification Drift Remediation:**
1. Alert generated when deployed version != approved version
2. Escalated to operations/DevOps team
3. Team reviews ABP change history and re-deployment plan
4. Schedule re-deployment window
5. Confirm successful deployment and version match

**Behavioral Drift Remediation:**
1. Alert generated when performance metric deviates from baseline
2. Escalated to data science / ML engineering team
3. Team investigates root cause:
   - Is underlying data distribution changing (concept drift)?
   - Has training data quality degraded?
   - Are there external system changes affecting inputs?
4. Execute appropriate remediation:
   - Retrain model with fresh data
   - Adjust feature engineering or preprocessing
   - Update agent constraints or thresholds
   - Implement upstream data quality fixes
5. Re-deploy and re-validate

**Policy Drift Remediation:**
1. New policy published; impact simulation runs
2. Agents with violations flagged
3. Escalated to compliance team
4. Compliance team decides:
   - Does policy apply to existing agents, or only new agents?
   - If existing agents affected, what is remediation deadline?
5. Team updates ABP to comply with new policy
6. Re-validate and re-deploy before deadline

### Integration with Incident Management

Drift alerts integrate with incident management systems (PagerDuty, Opsgenie, etc.):

```
Drift Alert
  ↓
[Escalation Policy]
  ↓
On-Call Engineer paged
  ↓
[Incident Ticket Created]
  ↓
Investigation & Remediation
  ↓
[Ticket Closed / Incident Resolved]
  ↓
[Post-Incident Review]
  ↓
[Root Cause Analysis]
  ↓
[Process Improvements]
```

## Compliance and Governance Impact

### SR 11-7 Post-Market Monitoring

SR 11-7 requires documented post-market monitoring of deployed models. Intellios drift detection provides:

1. **Structured monitoring** — Systematic observation of performance, constraints, and policy compliance
2. **Documented baselines** — Baseline metrics recorded at deployment; deviations tracked and timestamped
3. **Alerting and escalation** — Automatic alerts escalate issues to appropriate teams
4. **Audit trail** — Complete record of all drift detected, alerts generated, and remediation actions
5. **Compliance evidence** — Drift detection logs and remediation records are suitable for regulatory examination

### EU AI Act Post-Market Monitoring

The EU AI Act requires "continuous monitoring of the functioning of high-risk AI systems." Drift detection satisfies this requirement by:

1. **Performance monitoring** — Accuracy, fairness, output distribution tracked continuously
2. **Incident reporting** — Drift alerts trigger incident investigation and reporting
3. **Corrective actions** — When issues found, documented corrective actions executed
4. **Documentation** — All monitoring results documented and retained for inspection

## Limitations and Organizational Responsibilities

### What Intellios Provides

- Specification drift detection (version mismatch)
- Integration with observability platforms for behavioral telemetry
- Policy drift simulation when new policies published
- Automated alerting and escalation
- Audit trail of drift events and remediation

### What Organizations Must Provide

1. **Observability Infrastructure** — Deploy agents with instrumentation that collects relevant telemetry (outputs, performance metrics, constraints)
2. **Ground Truth Labels** — For accuracy monitoring, organization must maintain ground truth labels (what was the correct decision?)
3. **Baseline Definition** — Define performance baselines and acceptable ranges for each metric
4. **Response Procedures** — Establish escalation procedures and incident response workflows
5. **Remediation Execution** — When drift detected, organization must investigate, decide on remediation, and execute
6. **Monitoring Reviews** — Conduct periodic reviews of monitoring results and adjust thresholds as needed

## Glossary

| Term | Definition |
|---|---|
| **Drift** | Deviation of a deployed agent's behavior from its approved specification (ABP) |
| **Specification Drift** | Deployed agent version does not match approved blueprint version |
| **Behavioral Drift** | Agent's outputs degrade in accuracy, fairness, or constraint compliance despite stable ABP |
| **Policy Drift** | Deployed agent no longer complies with newly published governance policies |
| **Baseline** | Historical norm of a performance metric (e.g., 30-day average accuracy) |
| **Threshold** | Alert trigger point (e.g., deviation >10% from baseline) |
| **Ground Truth** | The correct answer against which agent predictions are compared (for accuracy monitoring) |
| **Concept Drift** | Shift in underlying data distribution that causes agent accuracy to degrade |
| **Re-validation** | Running governance validation on an agent ABP against current policies |

## References

- **[SR 11-7: Guidance on Model Risk Management](https://www.federalreserve.gov/supervisionreg/srletters/sr1107.htm)** — Section 4 on monitoring and governance
- **[EU Artificial Intelligence Act](https://eur-lex.europa.eu)** — Article 72 on post-market monitoring
- **[Intellios Agent Blueprint Package](../03-core-concepts/agent-blueprint-package.md)** — Specification document
- **[Governance-as-Code](../03-core-concepts/governance-as-code.md)** — Policy enforcement framework

---

*See also: [Agent Blueprint Package](../03-core-concepts/agent-blueprint-package.md), [Governance-as-Code](../03-core-concepts/governance-as-code.md), [SR 11-7 Compliance Mapping](sr-11-7-mapping.md)*

---

**Document Classification:** Internal Use — Compliance and Engineering Teams
**Last Updated:** 2026-04-05
**Next Review Date:** 2026-10-05 (6-month review cycle)

---
id: 07-003
title: 'Observability Dashboards: Monitoring Agent Performance'
slug: observability-dashboards
type: task
audiences:
- engineering
status: published
version: 1.0.0
platform_version: 1.0.0
created: '2026-04-05'
updated: '2026-04-05'
author: Intellios
reviewers: []
tags:
- operations
- observability
- monitoring
- metrics
- dashboards
prerequisites:
- 03-001
- 03-005
- 03-007
related:
- 07-004
- 07-005
- 06-006
next_steps:
- 07-004
- 07-003
feedback_url: https://feedback.intellios.ai/kb
tldr: 'Deployed agents must be continuously monitored for performance, accuracy, errors,
  fairness, and safety. Intellios provides a built-in observability platform that
  collects metrics from all deployed agents. This guide covers configuring observability
  for your agents, the key metrics to track, setting up dashboards in Intellios or
  bridging to external tools (CloudWatch, Datadog, Grafana), defining SLA baselines,
  and interpreting observability data to detect drift, bias, and operational issues.

  '
---


# Observability Dashboards: Monitoring Agent Performance

> **TL;DR:** Deployed agents must be continuously monitored for performance, accuracy, errors, fairness, and safety. Intellios provides a built-in observability platform that collects metrics from all deployed agents. This guide covers configuring observability for your agents, the key metrics to track, setting up dashboards in Intellios or bridging to external tools (CloudWatch, Datadog, Grafana), defining SLA baselines, and interpreting observability data to detect drift, bias, and operational issues.

## Overview

AI agents in production require continuous observability. Unlike traditional software, where you can observe code execution and logs, agents learn probabilistically from data. An agent that performed well during testing can degrade over time due to data drift, model decay, or adversarial inputs. Without observability, you may not discover the degradation until customers complain.

Intellios observability system automatically collects metrics from all deployed agents. This guide explains how to configure, interpret, and act on observability data.

---

## Metrics Architecture

### What Intellios Observes

Intellios automatically collects:

**Request/Response Metrics (per request):**
- Request ID (unique identifier)
- Timestamp (when request was received)
- Agent ID (which agent processed this request)
- User/Customer ID (who made the request)
- Request Type (what the user asked)
- Response Time (latency)
- Token Usage (input tokens, output tokens, total)
- Response Status (success, error, escalation)
- Error Details (if applicable)

**Aggregated Metrics (per time window: 1 min, 5 min, 1 hour, 1 day):**
- Request Volume (requests per minute/hour/day)
- Response Latency (p50, p95, p99 percentiles)
- Error Rate (% of requests resulting in error)
- Token Usage (average tokens per request, total tokens consumed)
- Escalation Rate (% of requests escalated to human review)
- Task Completion Rate (% of requests that achieved the intended goal)

**Behavioral Metrics (tracked continuously):**
- Recommendation Acceptance Rate (% of recommendations that users act on)
- Override Rate (% of recommendations that human reviewers override)
- Follow-up Rate (% of users who follow up with a question or escalation)

**Fairness & Safety Metrics (calculated per cohort):**
- Accuracy by Subgroup (accuracy for different demographic groups, geographies, customer types)
- Error Rate by Subgroup (error rate differences across subgroups)
- Disparate Impact Ratio (ratio of favorable outcomes across protected classes)
- Harmful Output Rate (% of responses flagged for safety issues)

**Compliance & Governance Metrics:**
- Audit Log Completeness (% of requests with complete audit logs)
- Policy Violation Rate (% of requests violating a governance policy)
- PII Redaction Coverage (% of logged responses with PII redacted)

### Data Collection

Data is collected automatically from three sources:

1. **Request/Response Stream** — Every request to the agent is logged with metadata.
2. **Runtime Instrumentation** — Agent runtime reports performance metrics (latency, token usage).
3. **Feedback Integration** — If users provide feedback (thumbs up/down, corrections), that feedback is captured.

All data is collected according to governance policies:

- PII is redacted or encrypted.
- Data is retained per the agent's governance policy (typically 90 days for recent data, longer for aggregated data).
- Access is controlled: only authorized users can view detailed logs.

---

## Built-In Intellios Observability Dashboard

Intellios provides a built-in observability dashboard at `/console/observability/`.

### Dashboard Structure

```
┌─────────────────────────────────────────────────────┐
│ INTELLIOS OBSERVABILITY                             │
├─────────────────────────────────────────────────────┤
│                                                     │
│ [All Agents] [Claims Processor] [Chatbot] [Search]  │
│                                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ AGENT: Auto Claims Intake Bot (v1.2.3)          │ │
│ │ Status: ✓ Healthy | Last Updated: 2 min ago     │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ Time Range: [Last 24 Hours ▼]  [Custom Range]       │
│                                                     │
│ ┌──────────────────┬──────────────────┐            │
│ │ Key Metrics      │ Trends            │            │
│ ├──────────────────┼──────────────────┤            │
│ │ Requests: 1,234  │ ↑ +8% vs baseline │            │
│ │ Error Rate: 0.8% │ ↓ -0.2% vs prev hr│            │
│ │ Latency: 1.2s    │ ↑ +50ms vs baseline            │
│ │ Escalation: 12%  │ ↑ +2% vs baseline │            │
│ └──────────────────┴──────────────────┘            │
│                                                     │
│ ┌──────────────────────────────────────────────┐   │
│ │ REQUEST VOLUME (requests/hour)                │   │
│ │ ╭─────────────╮      ╭────╮                  │   │
│ │ │  ╱╲  ╱╲  ╱╲ │      │    │ 1,200            │   │
│ │ │ ╱  ╲╱  ╲╱  ╲│      │    │ 1,000            │   │
│ │ │              │      └────┘                  │   │
│ │ └──────────────┘      0 min      now           │   │
│ └──────────────────────────────────────────────┘   │
│                                                     │
│ ┌──────────────────────────────────────────────┐   │
│ │ ERROR RATE (%)                                │   │
│ │ Threshold: 2%  Alert: 0.8% (OK)              │   │
│ │                                               │   │
│ │ ├────┤ Auto Claims: 0.8% ✓ (baseline: 0.5%)  │   │
│ │ ├──────────┤ Homeowner: 1.8% ⚠ (baseline: 1.2%)│  │
│ │ ├──────┤ Commercial: 1.4% ✓ (baseline: 1.2%)  │   │
│ └──────────────────────────────────────────────┘   │
│                                                     │
│ [Detailed Logs] [Analyze Cohort] [Configure Alert] │
└─────────────────────────────────────────────────────┘
```

### Key Views

**1. Overview Dashboard**

Displays at a glance:
- Agent name, version, status
- Key metrics: requests, error rate, latency, escalation rate
- Trend vs. baseline (green ↑ for positive, red ↓ for negative)
- Critical alerts or anomalies

**2. Detailed Metrics**

Drill into specific metrics:

```
┌─────────────────────────────────────────────┐
│ LATENCY ANALYSIS                            │
├─────────────────────────────────────────────┤
│                                             │
│ Baseline: 1.0s (7-day average)             │
│ Current: 1.2s (last 1 hour)                │
│ Change: +20%                               │
│                                             │
│ Percentiles:                                │
│ p50 (median): 0.8s                          │
│ p95: 1.8s                                   │
│ p99: 2.5s                                   │
│                                             │
│ Trend (Last 24 Hours):                      │
│ [────────────────────────────────────]      │
│  0.9s                    1.2s               │
│                                             │
│ Action: If latency increases > 30%,         │
│ check for resource contention or           │
│ degraded external API performance.          │
└─────────────────────────────────────────────┘
```

**3. Cohort Analysis**

Analyze metrics broken down by user cohorts:

```
┌─────────────────────────────────────────────┐
│ ACCURACY BY CUSTOMER TYPE                   │
├─────────────────────────────────────────────┤
│                                             │
│ Individual Customers: 95.2%                 │
│ Small Business: 92.8% (−2.4 percentage pts) │
│ Enterprise: 96.1% (+0.9 pp)                 │
│ Baseline (all): 94.5%                       │
│                                             │
│ Alert: Small Business accuracy < 93%        │
│ Consider: May need separate agent or        │
│ additional training data for SMBs.          │
└─────────────────────────────────────────────┘
```

**4. Request/Response Logs**

View detailed logs of individual requests:

```
┌─────────────────────────────────────────────┐
│ REQUEST LOGS (Last 100)                     │
├─────────────────────────────────────────────┤
│                                             │
│ Request ID: req-2026-04-05-001234           │
│ Timestamp: 2026-04-05 14:32:15 UTC          │
│ User ID: customer-5678                      │
│ Customer Type: Individual                   │
│ Request Type: Claims Submission             │
│ Status: Success                             │
│ Response Latency: 0.8s                      │
│ Token Usage: 245 input, 187 output          │
│ Escalated: No                               │
│ Feedback: 👍 User found response helpful    │
│                                             │
│ Request ID: req-2026-04-05-001235           │
│ Timestamp: 2026-04-05 14:32:22 UTC          │
│ User ID: customer-9999                      │
│ Customer Type: Small Business               │
│ Request Type: Claim Coverage Question       │
│ Status: Error (Tool Call Failed)            │
│ Error: "Coverage Database API timeout"      │
│ Response Latency: 2.1s (timeout)            │
│ Token Usage: 156 input, 89 output           │
│ Escalated: Yes                              │
│                                             │
│ [Previous] [Next] [Export CSV]              │
└─────────────────────────────────────────────┘
```

---

## Setting Up Observability

### Step 1: Enable Observability for Your Agent

When deploying an agent, observability is automatically enabled. However, you can configure collection granularity:

**In the Agent Registry:**

```
Agent ID: auto-claims-intake-v1
Observability Configuration:
  - Collection Granularity: Detailed (default)
    ✓ Collect all request/response metadata
    ✓ Collect user feedback
    ✓ Collect error details

  - Data Retention:
    Recent Data (detailed): 90 days
    Aggregated Data: 1 year
    Audit Logs: 7 years (governance requirement)

  - PII Handling:
    ✓ Redact customer PII in logs
    ✓ Redact request content (leave only request type)
    ✓ Encrypt sensitive fields

  - Feedback Integration:
    ✓ Capture thumbs up/down feedback
    ✓ Capture explicit corrections
    ✓ Estimate implicit feedback (follow-ups, escalations)
```

### Step 2: Define SLA Baselines

Establish baseline metrics for your agent:

**Capture Baselines During Pilot/Testing:**

```
Agent: Auto Claims Intake Bot
Test Period: 2026-03-15 to 2026-03-22
Test Volume: 5,000 requests
Test Conditions: Normal business hours, representative customer mix

Baseline Metrics:
┌────────────────────────────┬──────────┬──────────┐
│ Metric                     │ Baseline │ Alert    │
├────────────────────────────┼──────────┼──────────┤
│ Error Rate                 │ 0.5%     │ > 2%     │
│ Response Latency (p95)      │ 1.5s     │ > 3.0s   │
│ Escalation Rate            │ 15%      │ > 25%    │
│ Task Completion Rate       │ 94%      │ < 90%    │
│ Recommendation Acceptance  │ 88%      │ < 80%    │
│ PII Redaction Coverage     │ 100%     │ < 100%   │
└────────────────────────────┴──────────┴──────────┘
```

These baselines become the thresholds for alerts (see [Alerting Configuration](alerting-configuration.md)).

### Step 3: Connect External Monitoring Tools

If your organization uses CloudWatch, Datadog, Grafana, or other observability tools, bridge Intellios metrics to those tools.

**CloudWatch Integration (AWS):**

Intellios can export metrics to CloudWatch:

```
Steps:
1. In Intellios Admin Console, go to "Integrations" → "CloudWatch"
2. Authenticate with AWS IAM credentials
3. Select metrics to export:
   - Request volume
   - Error rate
   - Latency (p50, p95, p99)
   - Task completion rate
   - Escalation rate
4. Namespace: intellios/agents/[AGENT_ID]
5. Metric frequency: 1-minute intervals

Metrics then appear in CloudWatch:
┌────────────────────────────────────────┐
│ CloudWatch Metrics                     │
├────────────────────────────────────────┤
│ intellios/agents/auto-claims            │
│   - RequestVolume                       │
│   - ErrorRate                           │
│   - Latency_p50                         │
│   - Latency_p95                         │
│   - Latency_p99                         │
│   - TaskCompletionRate                  │
│   - EscalationRate                      │
└────────────────────────────────────────┘

You can now create CloudWatch dashboards with Intellios metrics.
```

**Datadog Integration:**

```
Steps:
1. In Intellios Admin Console, go to "Integrations" → "Datadog"
2. Enter Datadog API Key and App Key
3. Select metrics to export
4. Optional: Export logs (request/response logs)
5. Custom tags: agent_id, agent_type, environment

Datadog Monitors:
- Alert if error_rate > 2%
- Alert if latency_p95 > 3.0s
- Alert if task_completion_rate < 90%
```

**Grafana Integration:**

If you're using Grafana with Prometheus or another data source:

```
Steps:
1. Configure Intellios as a data source in Grafana
2. Use PromQL to query Intellios metrics:
   - intellios_error_rate{agent_id="auto-claims-v1"}
   - intellios_latency_p95{agent_id="auto-claims-v1"}
3. Create dashboards combining Intellios and other metrics
```

---

## Key Metrics to Monitor

### Performance Metrics

**Response Latency**

What: Time from request to response.

Baseline: Typically 0.5–3 seconds depending on agent complexity.

Why: Slow responses degrade user experience and may indicate performance degradation or resource contention.

How to Monitor:
```
- p50 (median): Should be stable
- p95, p99: Watch for outliers
- If p95 increases > 30% → investigate
```

Alert: Set alert if p95 > [1.5x baseline].

**Error Rate**

What: % of requests resulting in error (vs. success or escalation).

Baseline: Typically 0.5–2%, depending on agent and data quality.

Why: Errors indicate agent failure, dependency failures, or invalid input.

How to Monitor:
```
- Aggregate error rate across all requests
- Error rate by error type (API failure, timeout, parsing error, etc.)
- Error rate by user cohort (identify if errors concentrate in specific segments)
```

Alert: Set alert if error_rate > 2x baseline OR > [THRESHOLD] in 1 hour.

**Escalation Rate**

What: % of requests escalated to human review.

Baseline: Typically 10–30%, depending on agent design.

Why: Escalation is sometimes necessary (complex cases), but high escalation indicates the agent cannot handle certain patterns.

How to Monitor:
```
- Escalation rate overall
- Escalation rate by request type
- Escalation reason (missing info, policy exception, human preference, etc.)
- If escalation rate is > 40% → agent may need retraining
```

Alert: Set alert if escalation_rate increases > 10 percentage points from baseline.

**Task Completion Rate**

What: % of requests that achieved the intended goal (e.g., claim submitted, appointment booked).

Baseline: Typically 90–98%.

Why: Low completion indicates the agent cannot handle certain request types or user populations.

How to Monitor:
```
- Completion rate overall
- Completion rate by request type
- Completion rate by user cohort
- If completion drops > 5% → investigate root cause
```

Alert: Set alert if completion_rate < [BASELINE - 5%].

---

### Fairness & Bias Metrics

**Accuracy by Subgroup**

What: Accuracy (or other primary metric) broken down by demographic group, geography, or other subgroup.

Example:
```
Overall Accuracy: 94%
Accuracy by Race (if model makes predictions):
  - White: 95%
  - Black: 92%  ← Disparate impact
  - Hispanic: 93%
  - Asian: 96%
```

Why: If accuracy differs significantly by subgroup, the agent may be biased.

How to Monitor:
```
- Disaggregate metrics by protected classes (race, gender, age, disability, if applicable)
- Disaggregate by geography, customer type, account age
- Flag if any subgroup differs > 10% from overall metric
```

Alert: Set alert if disparity > 10% OR disparate impact ratio < 0.8.

**False Negative Rate by Subgroup**

What: For agents that make binary decisions (approve/deny, escalate/handle, etc.), track false negative rate (incorrect denials or missed escalations) by subgroup.

Example:
```
Overall False Negative Rate: 2%
False Negative Rate by Geography:
  - Urban: 1.8%
  - Rural: 3.5% ← Higher false negative rate for rural areas
```

Why: Different false negative rates across groups can indicate fairness issues.

Alert: Set alert if false negative rate differs > 50% between subgroups.

---

### Safety Metrics

**Harmful Output Rate**

What: % of responses flagged as potentially harmful (unsafe, inappropriate, discriminatory, etc.).

Baseline: Typically < 0.5% (depends on agent purpose and safety rules).

Why: Harmful outputs indicate safety guardrails are not working.

How to Monitor:
```
- Automatic safety filtering (e.g., using a safety classifier)
- Manual review (sample responses and have humans flag unsafe ones)
- User reports (if users flag harmful output, log it)
```

Alert: Set alert if harmful_output_rate > [THRESHOLD] (e.g., > 0.1%).

---

### Compliance Metrics

**Audit Log Completeness**

What: % of requests with complete audit logs.

Baseline: Should be 100% (all requests must be logged).

Why: If audit logs are incomplete, compliance evidence is insufficient.

How to Monitor:
```
- Check that every request generates an audit log entry
- Verify all required fields are present (request_id, timestamp, user_id, etc.)
- If any field is missing → incident
```

Alert: Set alert if completeness < 100%.

**Policy Violation Rate**

What: % of requests violating a governance policy.

Baseline: Typically 0% (agent should always comply with policies).

Why: If an agent starts violating policies, it indicates a misconfiguration or behavior drift.

How to Monitor:
```
- Continuously evaluate each request against governance policies
- Track which policies are violated
- If any violations → immediate escalation
```

Alert: Set alert if violations > 0 (zero tolerance).

---

## Interpreting Observability Data

### Normal Variation

Not every metric change indicates a problem. Expected normal variation:

```
Error Rate:
- Hour-to-hour variation: ±30%
- Day-to-day variation: ±50%
- Week-to-week variation: ±10%
Alert only if variation > 2x baseline or sustained > 1 hour.

Latency:
- Minute-to-minute variation: ±20%
- Hour-to-hour variation: ±30%
- Alert only if p95 increases > 50% or sustained > 1 hour.
```

### Detecting Drift

Common drift patterns:

```
1. Gradual degradation (model decay):
   Accuracy: Day 1: 94%, Day 2: 93.8%, Day 3: 93.6%, Day 4: 93.2%
   Action: Update knowledge base or retrain

2. Sudden spike in errors:
   Error Rate: Stable 0.5%, then suddenly 3.2% at 14:00 UTC
   Action: Check for deployment change or API failure

3. Increased escalation rate:
   Escalation: 15%, then 25%, then 35%
   Action: Investigate what request types are being escalated

4. Fairness degradation:
   Accuracy for minority group drops from 92% to 88%
   Action: Check if data distribution for that group has changed
```

### Root Cause Analysis Checklists

**If Error Rate Spikes:**

- [ ] Check for recent deployment (did code or configuration change?)
- [ ] Check external dependencies (are APIs returning errors?)
- [ ] Check input data (are request types unusual or out-of-distribution?)
- [ ] Check logs for error messages (what's failing?)
- [ ] Check resource utilization (is the agent out of compute/memory?)

**If Latency Increases:**

- [ ] Check for recent deployment (new model may be slower)
- [ ] Check external API latency (are dependencies slow?)
- [ ] Check token usage (is the agent generating longer responses?)
- [ ] Check concurrency (are there more simultaneous requests?)
- [ ] Check system resources (CPU, memory, disk usage)

**If Accuracy Drops:**

- [ ] Check data distribution (have inputs changed?)
- [ ] Check knowledge base currency (is information stale?)
- [ ] Check for recent deployment (new version may be worse)
- [ ] Check for adversarial inputs (are error cases concentrated?)
- [ ] Check for fairness degradation (is accuracy dropping for specific cohorts?)

---

## Dashboard Best Practices

1. **Set Baselines First** — Before deploying, establish baseline metrics from testing. Use those baselines to set alert thresholds.

2. **Monitor Multiple Dimensions** — Don't just look at aggregate metrics. Break down by request type, user cohort, geography, time of day.

3. **Establish SLA Targets** — For each metric, define what is acceptable:
   - Error Rate: < 2%
   - Latency p95: < 3 seconds
   - Escalation Rate: < 25%
   - Task Completion: > 90%

4. **Review Weekly** — Schedule a weekly 15-minute review of dashboards to spot trends early.

5. **Archive Baselines** — When you update an agent, keep the old baseline for comparison. This helps you see if changes helped or hurt.

6. **Alert on Trends, Not Just Thresholds** — An error rate of 2% might be normal, but 2% after a week of 0.5% is a trend worth investigating.

---

## Next Steps

Now that you understand observability dashboards, you should:

1. **Configure Observability for Your Agents** — Enable detailed metrics collection.
2. **Define SLA Baselines** — Establish baseline metrics and alert thresholds.
3. **Set Up Alerts** — See [Alerting Configuration](alerting-configuration.md) to configure alerts on key metrics.
4. **Connect External Tools** — If you use CloudWatch, Datadog, or Grafana, bridge Intellios metrics to those systems.
5. **Schedule Weekly Reviews** — Add a calendar reminder to review observability dashboards weekly.

---

*See also: [Alerting Configuration](alerting-configuration.md), [Incident Response: Model Drift](../06-use-cases-playbooks/incident-response-model-drift.md), [Agent Fleet Management](agent-fleet-management.md)*

*Next: [Setting Up Alerts](alerting-configuration.md)*

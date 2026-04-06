---
id: 07-004
title: 'Alerting Configuration: Setting Up Agent Monitoring Alerts'
slug: alerting-configuration
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
- alerting
- monitoring
- incident-response
- escalation
prerequisites:
- 07-003
- 07-005
related:
- 06-006
- 03-007
next_steps:
- 06-006
- 07-005
feedback_url: https://feedback.intellios.ai/kb
tldr: 'Alerts automatically notify on-call teams when agents deviate from expected
  behavior. Intellios supports four alert types: performance alerts (latency, error
  rate), fairness/bias alerts, governance violation alerts, and SLA breach alerts.
  This guide covers configuring alert thresholds, selecting notification channels
  (email, Slack, PagerDuty, webhooks), setting escalation policies, and defining suppression
  rules to reduce alert fatigue.

  '
---


# Alerting Configuration: Setting Up Agent Monitoring Alerts

> **TL;DR:** Alerts automatically notify on-call teams when agents deviate from expected behavior. Intellios supports four alert types: performance alerts (latency, error rate), fairness/bias alerts, governance violation alerts, and SLA breach alerts. This guide covers configuring alert thresholds, selecting notification channels (email, Slack, PagerDuty, webhooks), setting escalation policies, and defining suppression rules to reduce alert fatigue.

## Overview

Observability dashboards let humans monitor agents, but alerts enable automated incident response. When an agent's behavior deviates significantly from expected norms, an alert fires automatically, notifying the on-call team without delay.

Properly configured alerts:

- **Detect problems early** — Before customers report issues.
- **Enable fast response** — Alert goes to on-call engineer immediately.
- **Reduce noise** — Only alert when there's a real problem, not for every minor fluctuation.

This guide covers configuring alert types, thresholds, notification channels, escalation policies, and suppression rules.

---

## Alert Types

Intellios supports four categories of alerts:

### 1. Performance Alerts

Detect degradation in agent performance.

**Error Rate Alert**

```yaml
alert:
  id: "alert-error-rate-spike"
  name: "Error Rate Spike"
  agent_id: "auto-claims-v1"
  type: "performance"

  metric: "error_rate"
  condition: "error_rate > 5%"
  window: "5 minutes"

  description: |
    Fires when error rate exceeds 5% for 5 consecutive minutes.
    Indicates agent is failing on > 5% of requests.

  severity: "CRITICAL"
  slo_impact: "HIGH"

  notification:
    channels: ["pagerduty", "slack"]
    escalation: "page_incident_commander"

  runbook: "docs/runbooks/error-rate-spike.md"
```

**Latency Alert**

```yaml
alert:
  id: "alert-latency-p95"
  name: "Response Latency (p95) Spike"
  agent_id: "auto-claims-v1"
  type: "performance"

  metric: "latency_p95"
  condition: "latency_p95 > 3.0s"
  duration: "10 minutes"

  description: |
    Fires when 95th percentile latency exceeds 3 seconds for 10 minutes.
    Indicates agent responses are significantly slower than baseline.

  severity: "HIGH"
  slo_impact: "MEDIUM"

  notification:
    channels: ["slack"]
    assignee: "sre-oncall"
```

**Task Completion Rate Alert**

```yaml
alert:
  id: "alert-completion-drop"
  name: "Task Completion Rate Drop"
  agent_id: "auto-claims-v1"
  type: "performance"

  metric: "task_completion_rate"
  condition: "task_completion_rate < 90%"
  duration: "1 hour"

  description: |
    Fires when < 90% of requests achieve the intended goal.
    Indicates agent cannot handle certain request types.

  severity: "HIGH"
  slo_impact: "HIGH"

  notification:
    channels: ["slack", "email"]
    assignee: "agent-owner"
```

### 2. Fairness & Bias Alerts

Detect unfair or biased behavior across demographic groups.

**Disparate Impact Alert**

```yaml
alert:
  id: "alert-disparate-impact"
  name: "Disparate Impact Detected"
  agent_id: "underwriting-assistant-v1"
  type: "fairness"

  metric: "disparate_impact_ratio"
  subgroups:
    - dimension: "race"
      protected_class: "Black"
      comparison_class: "White"

  condition: "disparate_impact_ratio < 0.8"
  duration: "4 hours"

  description: |
    Fires when approval rate for Black applicants is < 80% of approval rate
    for White applicants, suggesting potential racial discrimination.

  severity: "CRITICAL"
  slo_impact: "CRITICAL"

  notification:
    channels: ["pagerduty", "email"]
    escalation: "page_compliance_officer"

  runbook: "docs/runbooks/disparate-impact.md"
```

**Accuracy Degradation by Cohort**

```yaml
alert:
  id: "alert-accuracy-cohort-drop"
  name: "Accuracy Drop in Specific Cohort"
  agent_id: "clinical-support-v1"
  type: "fairness"

  metric: "accuracy_by_cohort"
  cohort_dimension: "age_group"

  condition: "accuracy[cohort] < (overall_accuracy - 5%)"
  duration: "2 hours"

  description: |
    Fires when accuracy for a specific cohort drops > 5% below overall accuracy.
    Example: If overall accuracy is 94%, alert fires if any cohort drops below 89%.

  severity: "HIGH"
  slo_impact: "MEDIUM"

  notification:
    channels: ["slack"]
    assignee: "ml-engineer"
```

### 3. Governance Violation Alerts

Detect policy violations.

**Governance Policy Violation**

```yaml
alert:
  id: "alert-policy-violation"
  name: "Governance Policy Violation"
  agent_id: "claims-intake-v1"
  type: "governance"

  metric: "policy_violations"
  policy_id: "policy-claims-audit"

  condition: "policy_violations > 0"
  duration: "immediate"

  description: |
    Fires immediately when the agent violates a governance policy.
    Zero tolerance: any violation is an alert.

  severity: "CRITICAL"
  slo_impact: "CRITICAL"

  notification:
    channels: ["pagerduty", "email"]
    escalation: "page_compliance_officer"

  runbook: "docs/runbooks/policy-violation.md"
```

**Audit Logging Failure**

```yaml
alert:
  id: "alert-audit-logging-failure"
  name: "Audit Logging Failure"
  agent_id: "all"
  type: "governance"

  metric: "audit_log_completeness"

  condition: "audit_log_completeness < 100%"
  duration: "5 minutes"

  description: |
    Fires if audit logs are incomplete or missing for any request.
    Audit logging is non-negotiable for compliance.

  severity: "CRITICAL"
  slo_impact: "CRITICAL"

  notification:
    channels: ["pagerduty", "email"]
    escalation: "page_sre + compliance"
```

### 4. SLA Breach Alerts

Alert when agent violates SLA commitments.

**Response Time SLA Breach**

```yaml
alert:
  id: "alert-sla-response-time"
  name: "Response Time SLA Breach"
  agent_id: "patient-scheduling-v1"
  type: "sla"

  metric: "p95_latency"
  sla_target: "2.0 seconds"

  condition: "p95_latency > 2.0s for 5 minutes"
  window: "5 minutes"

  description: |
    Patient scheduling agent SLA requires 95th percentile latency < 2 seconds.

  severity: "HIGH"
  slo_impact: "HIGH"

  notification:
    channels: ["slack", "pagerduty"]
    assignee: "sre-oncall"
```

**Availability SLA Breach**

```yaml
alert:
  id: "alert-sla-availability"
  name: "Availability SLA Breach"
  agent_id: "customer-chatbot-v1"
  type: "sla"

  metric: "availability"
  sla_target: "99.9%"

  condition: "availability < 99.9% over 1 hour"
  window: "1 hour"

  description: |
    Customer chatbot SLA requires 99.9% availability.
    Alert fires if downtime exceeds 27 seconds per hour.

  severity: "HIGH"
  slo_impact: "HIGH"

  notification:
    channels: ["pagerduty"]
    escalation: "page_incident_commander"
```

---

## Configuring Alerts

### Step 1: Access Alert Configuration

In Intellios Admin Console, navigate to **"Monitoring"** → **"Alerts"**.

```
┌────────────────────────────────────────────────┐
│ ALERTS                                         │
├────────────────────────────────────────────────┤
│                                                │
│ [All Agents] [By Type] [Critical] [Search]     │
│                                                │
│ ┌───────────────────────────────────────────┐  │
│ │ Alert Name              │ Agent      │ S │  │
│ ├───────────────────────────────────────────┤  │
│ │ Error Rate Spike        │ Claims     │⚠ │  │
│ │ Latency p95 Spike       │ Claims     │⚠ │  │
│ │ Disparate Impact        │ Underwrite │● │  │
│ │ Policy Violation        │ All        │● │  │
│ │ Audit Logging Failure   │ All        │● │  │
│ │ [+ Create Alert]                       │  │
│ └───────────────────────────────────────────┘  │
│                                                │
│ Legend: ● = CRITICAL, ⚠ = HIGH, ℹ = MEDIUM   │
└────────────────────────────────────────────────┘
```

### Step 2: Create or Edit Alert

Click **"+ Create Alert"** or click an existing alert to edit.

```
┌────────────────────────────────────────────────┐
│ CREATE ALERT: Error Rate Spike                 │
├────────────────────────────────────────────────┤
│                                                │
│ Basic Information                              │
│ ───────────────────────────────────────────    │
│ Alert Name *                                   │
│ [Error Rate Spike______________________]       │
│                                                │
│ Description                                    │
│ [Fires when error rate exceeds 5% for         │
│  5 consecutive minutes________________]        │
│                                                │
│ Alert Type *                                   │
│ [Performance ▼]                                │
│   (Options: Performance, Fairness, Governance, SLA)
│                                                │
│ Scope                                          │
│ ───────────────────────────────────────────    │
│ Apply to Agent(s) *                            │
│ [Select Agent ▼]                               │
│   ☑ Auto Claims Intake v1                      │
│   ☐ Homeowner Claims v2                        │
│   ☐ [Apply to all agents of type: Claims]      │
│                                                │
│ Metric & Threshold                             │
│ ───────────────────────────────────────────    │
│ Metric *                                       │
│ [error_rate ▼]                                 │
│                                                │
│ Condition *                                    │
│ [error_rate > [5] % ]                          │
│                                                │
│ Duration *                                     │
│ Sustained for [5] [minutes ▼]                  │
│                                                │
│ Severity *                                     │
│ [CRITICAL ▼]                                   │
│  (Options: CRITICAL, HIGH, MEDIUM, LOW)       │
│                                                │
│ [Next: Notifications]                          │
└────────────────────────────────────────────────┘
```

### Step 3: Configure Notifications

Specify where and how to notify:

```
┌────────────────────────────────────────────────┐
│ NOTIFICATIONS                                  │
├────────────────────────────────────────────────┤
│                                                │
│ Notification Channels *                        │
│ ☑ Email                                        │
│ ☑ Slack                                        │
│ ☑ PagerDuty                                    │
│ ☐ Custom Webhook                              │
│                                                │
│ Email Recipients *                             │
│ [Add recipients______________]                 │
│  ☑ sre-oncall@company.com                      │
│  ☑ incident-commander@company.com              │
│                                                │
│ Slack Channel *                                │
│ [@intellios-alerts ▼]                          │
│  Thread: [☐ Post in thread]                    │
│                                                │
│ PagerDuty Integration *                        │
│ Service: [Select Service ▼]                    │
│  [Auto Claims Incident Response]               │
│ Escalation Policy: [On-Call Engineer]          │
│                                                │
│ Custom Webhook                                 │
│ URL: [https://[PLACEHOLDER]/webhook]           │
│ Method: [POST ▼]                               │
│ Headers:                                       │
│  Authorization: Bearer [token]                 │
│  Content-Type: application/json                │
│                                                │
│ [Next: Escalation]                             │
└────────────────────────────────────────────────┘
```

### Step 4: Configure Escalation

Set escalation policies for unacknowledged alerts:

```
┌────────────────────────────────────────────────┐
│ ESCALATION POLICY                              │
├────────────────────────────────────────────────┤
│                                                │
│ Initial Assignment                             │
│ Role: [On-Call SRE ▼]                          │
│ Notification: [Slack + Email]                  │
│                                                │
│ If Unacknowledged After:                       │
│ [15] minutes                                   │
│ Action:                                        │
│   [☑] Page with higher priority (CRITICAL)     │
│   [☑] Notify: [Incident Commander]             │
│   [☑] Open ticket in [Jira]                    │
│                                                │
│ If Still Unacknowledged After:                 │
│ [30] minutes                                   │
│ Action:                                        │
│   [☑] Page: [VP Engineering]                   │
│   [☑] Create all-hands Slack message            │
│   [☑] Create critical incident war room        │
│                                                │
│ [Next: Suppression Rules]                      │
└────────────────────────────────────────────────┘
```

### Step 5: Configure Suppression Rules

Define when alerts should be suppressed to reduce noise:

```
┌────────────────────────────────────────────────┐
│ SUPPRESSION RULES                              │
├────────────────────────────────────────────────┤
│                                                │
│ [+ Add Suppression Rule]                       │
│                                                │
│ Rule 1: Maintenance Windows                    │
│ Suppress Alert: Always                         │
│ During: Scheduled maintenance windows          │
│ Schedule: [Every Sunday 2-4 AM UTC]            │
│ Reason: Expected downtime during maintenance   │
│                                                │
│ Rule 2: Canary Deployments                     │
│ Suppress Alert: Error Rate Spike               │
│ When: [Agent is in canary deployment]          │
│ Duration: [30] minutes (canary window)         │
│ Reason: Canary deployments expected to have    │
│         higher error rates while ramping up    │
│                                                │
│ Rule 3: Batch Jobs                             │
│ Suppress Alert: Latency Spike                  │
│ When: [Batch job is running]                   │
│ Time: [2-3 AM UTC on Tuesdays]                 │
│ Reason: Batch jobs cause resource contention   │
│                                                │
│ [Save Alert]                                   │
└────────────────────────────────────────────────┘
```

---

## Notification Channels

### Email Notifications

Sends alert to email recipients.

**Pros:**
- Simple, no setup required
- Works in all environments
- Includes full alert detail

**Cons:**
- Slower than chat/PagerDuty
- Email can get lost in inbox
- Not suitable for critical/urgent alerts

**Configuration:**
```yaml
channel: "email"
recipients:
  - "sre-oncall@company.com"
  - "incident-commander@company.com"
template: "default"  # or custom email template
include_runbook: true
include_logs: true  # attach sample logs
```

### Slack Notifications

Sends alert to Slack channel.

**Pros:**
- Real-time notification
- Team visibility
- Can use Slack workflows for automation
- Interactive buttons for acknowledgment

**Cons:**
- Requires Slack workspace
- Can get buried in busy channels
- Limited structured data

**Configuration:**
```yaml
channel: "slack"
workspace: "company-slack"
channel_name: "#intellios-alerts"
mention_on_critical: "@sre-oncall"
thread_reply: false
blocks:  # Slack Block Kit for rich formatting
  - type: "section"
    text: "⚠️ Error Rate Spike on [AGENT_NAME]"
  - type: "section"
    fields:
      - label: "Agent"
        value: "[AGENT_NAME]"
      - label: "Metric"
        value: "error_rate: [VALUE]%"
      - label: "Alert"
        value: "[THRESHOLD]%"
  - type: "actions"
    elements:
      - type: "button"
        text: "Acknowledge"
        action_id: "acknowledge_alert"
      - type: "button"
        text: "View Dashboard"
        url: "[DASHBOARD_URL]"
```

### PagerDuty Notifications

Escalates alert through PagerDuty for incident management.

**Pros:**
- Integrates with on-call scheduling
- Automatic escalation if unacknowledged
- Tracks incident lifecycle
- Suitable for critical alerts

**Cons:**
- Requires PagerDuty subscription
- May create noise if over-used
- Team must be trained on escalation policies

**Configuration:**
```yaml
channel: "pagerduty"
service_id: "PSOMETHING"  # PagerDuty service
escalation_policy_id: "PEOMETHING"  # On-call policy
severity: "critical"  # PagerDuty severity
incident_title: "[AGENT_NAME] Error Rate Spike"
custom_details:
  metric: "error_rate"
  current_value: "[VALUE]"
  threshold: "[THRESHOLD]"
  duration: "5 minutes"
  runbook_url: "[RUNBOOK_URL]"
  dashboard_url: "[DASHBOARD_URL]"
```

### Custom Webhook

Sends alert to custom endpoint (e.g., internal automation system).

**Pros:**
- Flexible, can integrate with any system
- Can trigger automated remediation
- Can log to custom systems

**Cons:**
- Requires custom endpoint
- Harder to debug if webhook fails
- Requires proper authentication

**Configuration:**
```yaml
channel: "webhook"
url: "https://internal-automation.company.com/incidents"
method: "POST"
headers:
  Authorization: "Bearer [WEBHOOK_TOKEN]"
  Content-Type: "application/json"
body:
  template: |
    {
      "alert_id": "[ALERT_ID]",
      "alert_name": "[ALERT_NAME]",
      "severity": "[SEVERITY]",
      "agent_id": "[AGENT_ID]",
      "metric": "[METRIC]",
      "current_value": [VALUE],
      "threshold": [THRESHOLD],
      "timestamp": "[TIMESTAMP]",
      "runbook": "[RUNBOOK_URL]"
    }
timeout_seconds: 10
retry_on_failure: true
retry_count: 3
```

---

## Escalation Policies

Define how alerts escalate if unacknowledged:

```yaml
escalation_policy:
  id: "esc-policy-critical"
  name: "Critical Alert Escalation"

  level_1:
    delay_minutes: 0
    notify:
      - channel: "slack"
        target: "#intellios-alerts"
      - channel: "pagerduty"
        service: "Auto Claims Incidents"
    assignment: "on_call_sre"

  level_2:
    delay_minutes: 15  # If not acknowledged in 15 minutes
    notify:
      - channel: "pagerduty"
        service: "Auto Claims Incidents"
        escalation_policy: "incident_commander"
      - channel: "email"
        recipients: ["incident-commander@company.com"]
    action:
      - type: "create_ticket"
        system: "jira"
        project: "SRE"
        priority: "highest"

  level_3:
    delay_minutes: 30  # If still not acknowledged
    notify:
      - channel: "email"
        recipients: ["vp-engineering@company.com"]
      - channel: "slack"
        target: "@channel"  # Mention all in channel
    action:
      - type: "create_war_room"
        platform: "zoom"
        invitees: ["sre-team", "incident-commander", "vp-engineering"]
```

---

## Suppression Rules

Reduce alert noise by suppressing alerts during expected periods:

### Maintenance Window Suppression

```yaml
suppression:
  id: "supp-maintenance"
  name: "Suppress during planned maintenance"
  rules:
    - alert_id: "alert-error-rate-spike"
    - alert_id: "alert-latency-spike"
    - alert_id: "alert-availability-sla"

  schedule:
    - day: "Sunday"
      start_time: "02:00 UTC"
      end_time: "04:00 UTC"
      reason: "Weekly database maintenance"

    - day: "*"  # Any day
      start_time: "[PLACEHOLDER]"
      end_time: "[PLACEHOLDER]"
      reason: "On-demand maintenance window"

  notification:
    alert_suppressed: true  # Acknowledge but don't escalate
    log_suppression: true  # Log that alert was suppressed
```

### Deployment Suppression

```yaml
suppression:
  id: "supp-canary-deployment"
  name: "Suppress alerts during canary deployments"

  trigger: "deployment_event"
  condition: "agent_state == 'canary'"
  duration_minutes: 30

  suppress_alerts:
    - "alert-error-rate-spike"
    - "alert-latency-spike"
    - "alert-task-completion-drop"

  reason: "Canary deployment in progress; elevated error rates expected"
```

### Batch Job Suppression

```yaml
suppression:
  id: "supp-batch-jobs"
  name: "Suppress latency alerts during batch jobs"

  schedule:
    - day: "Daily"
      start_time: "02:00 UTC"
      end_time: "03:00 UTC"
      reason: "Batch data processing jobs"

  suppress_alerts:
    - "alert-latency-spike"
    - "alert-cpu-spike"

  other_alerts: "notify_but_lower_priority"  # Don't suppress other alerts
```

---

## Best Practices

### 1. Alert Fatigue Prevention

```
Rule of Thumb:
- CRITICAL alerts: < 1 per week (on average)
  → Page on-call immediately
- HIGH alerts: < 5 per week
  → Notify but allow time to respond
- MEDIUM alerts: < 20 per week
  → Slack notification, but no page
- LOW alerts: < 50 per week
  → Log, but don't notify

If you're getting > 10 CRITICAL alerts per week, you're alerting on too much.
Review thresholds and either:
1. Increase threshold (higher tolerance)
2. Increase duration (require sustained issue, not transient spike)
3. Add suppression rules (suppress during known-noisy periods)
4. Change notification method (email instead of PagerDuty)
```

### 2. Set Thresholds Based on Baselines

```
Don't use generic thresholds. Example:

BAD: "Error rate > 2%"
(What if your agent baseline is 0.5%? Or 5%?)

GOOD: "Error rate > 3x baseline OR > 5%, whichever is lower"
(Adapts to your agent's typical performance)

BETTER: "Error rate increases > 500% from 7-day baseline, sustained 5 minutes"
(Detects sudden anomalies while allowing for normal variation)
```

### 3. Include Runbooks

Every alert should link to a runbook:

```yaml
alert:
  id: "alert-error-rate-spike"
  runbook: "https://wiki.company.com/runbooks/error-rate-spike.md"
  # Runbook should include:
  # 1. What this alert means
  # 2. Immediate triage steps (check dashboard, check logs)
  # 3. Common root causes and how to diagnose
  # 4. Escalation path if not resolved in 10 minutes
```

### 4. Monitor Alert Metrics Themselves

```
Track:
- Alert firing frequency (should be stable, not increasing)
- Alert acknowledgment time (fast ack = well-designed alert)
- Alert-to-incident ratio (high ratio = good alerts)
- False positive rate (alert fires but issue resolves on its own)

If acknowledgment time > 30 minutes, alert is likely too noisy or not urgent.
If false positive rate > 10%, lower threshold or add suppression rules.
```

### 5. Quarterly Alert Review

```
Schedule quarterly review:
1. Which alerts fire most frequently? (may need to adjust threshold)
2. Which alerts are never acknowledged? (may be unnecessary)
3. Are there patterns to when alerts fire? (may indicate systemic issue)
4. Are there gaps? (missing alerts for known failure modes)
5. Are suppression rules still valid? (remove if no longer needed)
```

---

## Next Steps

Now that you've configured alerts, you should:

1. **Configure Observability First** — See [Observability Dashboards](observability-dashboards.md) to set up metrics collection.
2. **Test Alerts** — Manually trigger an alert to verify notifications work.
3. **Train the Team** — Ensure on-call engineers know what each alert means and how to respond.
4. **Document Escalation** — Ensure escalation policies are clear and up to date.
5. **Monitor Alert Health** — Track whether alerts are firing appropriately and adjust thresholds as needed.

---

*See also: [Observability Dashboards](observability-dashboards.md), [Incident Response: Model Drift](../06-use-cases-playbooks/incident-response-model-drift.md), [Agent Fleet Management](agent-fleet-management.md)*

*Next: [Incident Response Playbook](../06-use-cases-playbooks/incident-response-model-drift.md)*

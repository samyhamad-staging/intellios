---
id: "07-005"
title: "Agent Fleet Management: Operating Agents at Scale"
slug: "agent-fleet-management"
type: "task"
audiences:
  - "engineering"
  - "product"
status: "published"
version: "1.0.0"
platform_version: "1.0.0"
created: "2026-04-05"
updated: "2026-04-05"
author: "Intellios"
reviewers: []
tags:
  - "operations"
  - "fleet-management"
  - "scalability"
  - "lifecycle"
  - "governance"
prerequisites:
  - "Agent Blueprint Package"
  - "Agent Lifecycle"
  - "Agent Fleet Management"
related:
  - "Observability Dashboards"
  - "Alerting Configuration"
  - "Incident Response: Model Drift"
next_steps:
  - "Observability Dashboards"
  - "Alerting Configuration"
feedback_url: "[PLACEHOLDER]"
tldr: >
  Operating multiple agents across an organization requires fleet-level visibility, bulk operations, and coordinated lifecycle management. This guide covers the fleet overview dashboard, bulk operations (validation, deprecation, policy updates), fleet health metrics, capacity planning, lifecycle distribution analysis, tagging and grouping agents, and coordinated updates across fleets. Includes best practices for managing agent sprawl and keeping governance overhead manageable.
---

# Agent Fleet Management: Operating Agents at Scale

> **TL;DR:** Operating multiple agents across an organization requires fleet-level visibility, bulk operations, and coordinated lifecycle management. This guide covers the fleet overview dashboard, bulk operations (validation, deprecation, policy updates), fleet health metrics, capacity planning, lifecycle distribution analysis, tagging and grouping agents, and coordinated updates across fleets. Includes best practices for managing agent sprawl and keeping governance overhead manageable.

## Overview

Many organizations eventually move from a single agent to a fleet of tens, hundreds, or thousands of agents. A bank might have a dozen customer service agents (one per product line). A healthcare system might have clinical decision support agents for dozens of conditions. An insurance carrier might have claims processing agents for different claim types and geographies.

Managing agents at scale requires:

- **Fleet Visibility** — Can you see the status of all agents at a glance?
- **Bulk Operations** — Can you update multiple agents (e.g., all agents using an old policy)?
- **Lifecycle Coordination** — Can you deprecate old agents and migrate to new ones?
- **Cost Management** — Do you understand your agent running costs and capacity?
- **Governance Consistency** — Are all agents complying with governance policies?

This guide explains fleet management capabilities in Intellios.

---

## Fleet Overview Dashboard

The fleet overview dashboard provides organization-level visibility into all agents.

### Accessing the Fleet Dashboard

In Intellios Console, navigate to **"Fleet Management"** → **"Overview"**.

```
┌──────────────────────────────────────────────────┐
│ AGENT FLEET OVERVIEW                             │
├──────────────────────────────────────────────────┤
│                                                  │
│ Fleet Statistics                                 │
│ ─────────────────────────────────────────────    │
│ Total Agents: 47                                 │
│ ├─ Production: 32 ✓                              │
│ ├─ Staging: 9                                    │
│ ├─ Development: 6                                │
│ └─ Deprecated: 5 (> 90 days old)                 │
│                                                  │
│ Lifecycle Distribution                           │
│ ─────────────────────────────────────────────    │
│ ┌────────────────────────┐                       │
│ │ Draft        5 (11%)   │ ▓░░░░░░░░░░░░░░░░░  │
│ │ In Review    2 (4%)    │ ░░░░░░░░░░░░░░░░░░  │
│ │ Approved     8 (17%)   │ ▓▓░░░░░░░░░░░░░░░░  │
│ │ Active       32 (68%)  │ ▓▓▓▓▓▓░░░░░░░░░░░░  │
│ │ Deprecated   5 (11%)   │ ░░░░░░░░░░░░░░░░░░  │
│ └────────────────────────┘                       │
│                                                  │
│ Governance Health                                │
│ ─────────────────────────────────────────────    │
│ ┌──────────────────────┐                         │
│ │ Fully Compliant  40  │ ✓                       │
│ │ Warnings         5   │ ⚠  (low-priority)      │
│ │ Violations       2   │ ✗  (requires action)   │
│ └──────────────────────┘                         │
│                                                  │
│ Health Metrics (Last 7 Days)                     │
│ ─────────────────────────────────────────────    │
│ Avg Error Rate: 0.8%                             │
│ Avg Latency (p95): 1.2s                          │
│ Uptime: 99.95%                                   │
│ Critical Alerts: 2 (resolved)                    │
│                                                  │
│ [View Details] [Filter] [Search Agents]          │
└──────────────────────────────────────────────────┘
```

### Agent List View

Below the overview, view all agents in a table:

```
┌───────────────────────────────────────────────────────────────────┐
│ AGENTS (47 total)                                                 │
├───────────────────────────────────────────────────────────────────┤
│ Agent Name              Type      Lifecycle Status  Error Rate     │
├───────────────────────────────────────────────────────────────────┤
│ Auto Claims Intake      Claims    Active ✓         0.5% ✓         │
│ Homeowner Claims        Claims    Active ✓         1.2% ⚠          │
│ Commercial Claims       Claims    Active ✓         0.8% ✓         │
│ Fraud Detection         Claims    Active ✓         2.1% ✗          │
│ Underwriting Assistant  Insurance Active ✓         0.3% ✓         │
│ Policy Recommendation   Insurance Active ✓         0.6% ✓         │
│ Patient Scheduler       Healthcare Active ✓         0.2% ✓         │
│ Clinical Support (v1)   Healthcare Deprecated     —               │
│ Clinical Support (v2)   Healthcare Active ✓         0.4% ✓         │
│ Chat Bot v1.0           Utility   Draft           —               │
│ Chat Bot v2.0           Utility   In Review       —               │
│ ...                     ...       ...              ...            │
│ [More Filters] [Bulk Actions]                                    │
└───────────────────────────────────────────────────────────────────┘
```

### Filtering & Grouping

Filter and group agents to focus on specific sets:

**By Type:**
```
- Insurance Agents (10)
- Healthcare Agents (8)
- Utility Agents (5)
- Finance Agents (12)
- Other (12)
```

**By Lifecycle:**
```
- Draft (5)
- In Review (2)
- Approved (8)
- Active (32)
- Deprecated (5)
```

**By Health:**
```
- Compliant (40)
- Warnings (5)
- Violations (2)
```

**By Owner:**
```
- Team: Claims Operations (12)
- Team: Underwriting (8)
- Team: Healthcare (7)
- ...
```

---

## Bulk Operations

Perform operations on multiple agents at once.

### Bulk Re-Validation

Validate all agents (or a filtered set) against current governance policies:

```
Step 1: Select Agents
┌────────────────────────────────────┐
│ BULK OPERATIONS: Re-Validate       │
├────────────────────────────────────┤
│                                    │
│ Apply to:                          │
│ ○ All agents                       │
│ ○ Agents of type: [Claims ▼]       │
│ ○ Agents in lifecycle: [Active ▼]  │
│ ○ Agents with violations           │
│ ○ Custom filter: [Define Filter]   │
│                                    │
│ Selected: 32 agents                │
│ [Proceed]                          │
└────────────────────────────────────┘

Step 2: Run Validation
┌────────────────────────────────────┐
│ VALIDATION IN PROGRESS             │
├────────────────────────────────────┤
│ Progress: ████████░░ 32/40         │
│                                    │
│ Results so far:                    │
│ ✓ 28 agents: PASS                  │
│ ⚠  2 agents: WARNINGS              │
│ ✗ 2 agents: FAILURES               │
│                                    │
│ Estimated time: 2 minutes          │
└────────────────────────────────────┘

Step 3: Review Results
┌────────────────────────────────────┐
│ VALIDATION RESULTS                 │
├────────────────────────────────────┤
│ ✓ 28 agents PASS                   │
│ ⚠  2 agents with WARNINGS:         │
│   - Auto Claims v1.2: Policy A     │
│   - Homeowner v2.1: Policy B       │
│ ✗ 2 agents with FAILURES:          │
│   - Fraud Detection v1.0: Policy C │
│   - Claims Helper v0.9: Policy D   │
│                                    │
│ Recommendation:                    │
│ - Review warnings (non-blocking)    │
│ - Fix failures before agents can   │
│   proceed to approval              │
│                                    │
│ [Generate Report] [Notify Owners]  │
└────────────────────────────────────┘
```

### Bulk Deprecation

Mark multiple agents for deprecation:

```
Step 1: Select Agents to Deprecate
┌────────────────────────────────────┐
│ BULK DEPRECATION                   │
├────────────────────────────────────┤
│                                    │
│ Agents to deprecate: (select)       │
│ ☑ Clinical Support v1.0            │
│ ☑ Legacy Chat Bot v0.5             │
│ ☑ Old Claims Processor v1.3        │
│                                    │
│ Selected: 3 agents                 │
│                                    │
│ Replacement agent (if any):        │
│ [Clinical Support v2.0 ▼]          │
│                                    │
│ Deprecation Details:               │
│ Sunset date: [2026-06-30________]  │
│ Reason: [Replaced by v2.0_______]  │
│                                    │
│ Notification:                      │
│ ☑ Notify agent owners             │
│ ☑ Notify users (if applicable)    │
│ ☑ Create migration guide          │
│                                    │
│ [Proceed]                          │
└────────────────────────────────────┘

Step 2: Deprecation Schedule
- Immediate: Mark as DEPRECATED, no new deployments
- 30 days: Send reminder to users, offer support
- 60 days: Begin wind-down, no new requests accepted
- 90 days: Full shutdown, remove from service
```

### Bulk Policy Updates

Apply governance policy changes across multiple agents:

```
Step 1: Select Agents
┌────────────────────────────────────┐
│ BULK POLICY UPDATE                 │
├────────────────────────────────────┤
│                                    │
│ Policy to Update:                  │
│ [Data Retention Policy ▼]          │
│                                    │
│ Current Policy:                    │
│ Retain logs for 90 days            │
│                                    │
│ New Policy:                        │
│ Retain logs for 2 years (regulation change) │
│                                    │
│ Apply to:                          │
│ ○ All agents                       │
│ ○ Agents with type: [Select Type]  │
│ ○ Agents in environment: [Prod ▼]  │
│ ○ Agents owned by: [Team ▼]        │
│                                    │
│ Estimated agents affected: 24      │
│ [Proceed]                          │
└────────────────────────────────────┘

Step 2: Validation Before Rollout
All 24 agents are re-validated against the new policy.
Result: 22 agents PASS, 2 agents require manual update.

Step 3: Rollout
- Immediate rollout for compliant agents
- Manual review for non-compliant agents
```

---

## Fleet Health Metrics

Monitor fleet-wide health:

### Error Rate Distribution

```
┌────────────────────────────────────┐
│ ERROR RATE DISTRIBUTION (7-day avg)│
├────────────────────────────────────┤
│ < 0.5%      ▓▓▓▓ 28 agents ✓       │
│ 0.5%-1%     ▓▓▓ 12 agents ✓        │
│ 1%-2%       ▓▓ 5 agents ⚠          │
│ 2%-5%       ▓ 2 agents ✗           │
│ > 5%        0 agents               │
│                                    │
│ Fleet Average: 0.78%               │
│ Fleet Median: 0.65%                │
│ Fleet 95th %: 1.8%                 │
└────────────────────────────────────┘
```

### Latency Distribution

```
┌────────────────────────────────────┐
│ LATENCY p95 DISTRIBUTION (7-day)   │
├────────────────────────────────────┤
│ < 0.5s      ▓▓▓▓▓▓ 18 agents       │
│ 0.5-1s      ▓▓▓▓▓ 15 agents        │
│ 1-2s        ▓▓▓ 10 agents          │
│ 2-3s        ▓ 3 agents             │
│ > 3s        ▓ 1 agent ✗            │
│                                    │
│ Fleet Average: 0.8s                │
│ Fleet Median: 0.7s                 │
│ Fleet 95th %: 1.9s                 │
└────────────────────────────────────┘
```

### Cost Analysis

Understand fleet compute costs:

```
┌──────────────────────────────────────┐
│ FLEET COST ANALYSIS (30-day period)  │
├──────────────────────────────────────┤
│ Total Compute Cost: $12,450          │
│ Total Token Cost: $3,200             │
│ Total Uptime Cost: $4,100            │
│ Total Overhead (0%): $1,050          │
│                                      │
│ Top Cost Drivers:                    │
│ 1. Claims Processor (8 agents):      │
│    - Compute: $4,200                 │
│    - Tokens: $1,800                  │
│    Total: $6,000 (48%)               │
│                                      │
│ 2. Clinical Decision Support (3):    │
│    - Compute: $2,100                 │
│    - Tokens: $900                    │
│    Total: $3,000 (24%)               │
│                                      │
│ 3. Chat Bots (6):                    │
│    Total: $2,100 (17%)               │
│                                      │
│ 4. Other (30):                       │
│    Total: $1,350 (11%)               │
│                                      │
│ Cost per Agent (average): $265       │
│ Cost per 1M Requests: $287           │
└──────────────────────────────────────┘
```

---

## Lifecycle Distribution Analysis

Understand the distribution of agents across lifecycle states:

```
┌──────────────────────────────────────────┐
│ LIFECYCLE DISTRIBUTION                   │
├──────────────────────────────────────────┤
│                                          │
│ Draft (11%)            ▓░░░░░░░░░░░░░░░ │
│  5 agents in design    Avg age: 2 weeks │
│                        Bottleneck: Review queue has 2
│                                          │
│ In Review (4%)         ░░░░░░░░░░░░░░░░ │
│  2 agents awaiting     Avg wait: 3 days │
│    approval            Action: Process review queue
│                                          │
│ Approved (17%)         ▓▓░░░░░░░░░░░░░░ │
│  8 agents ready to     Avg age: 1 week  │
│    deploy              Action: Deploy or archive
│                                          │
│ Active (68%)           ▓▓▓▓▓░░░░░░░░░░░ │
│  32 agents in          Avg age: 6 months│
│    production          Uptime: 99.95%   │
│                        Health: ✓        │
│                                          │
│ Deprecated (11%)       ░░░░░░░░░░░░░░░░ │
│  5 agents             Avg age: 4 months │
│                        Recommendation: Retire
│                                          │
│ ISSUES:                                  │
│ • 2 agents in review > 5 days           │
│ • 3 approved agents not deployed         │
│ • 3 deprecated agents > 6 months old     │
└──────────────────────────────────────────┘
```

---

## Tagging & Grouping Agents

Organize agents using tags and groups for easier management:

### Creating Tags

```
Tag Definitions:
├─ By Type
│  ├─ insurance
│  ├─ healthcare
│  ├─ finance
│  └─ utility
│
├─ By Team
│  ├─ claims-operations
│  ├─ underwriting
│  ├─ healthcare-tech
│  └─ platform-engineering
│
├─ By Regulatory
│  ├─ hipaa
│  ├─ sox
│  ├─ glba
│  └─ gdpr
│
├─ By Environment
│  ├─ production
│  ├─ staging
│  └─ development
│
├─ By Status
│  ├─ critical
│  ├─ piloting
│  └─ legacy
```

### Applying Tags to Agents

```
Agent: Auto Claims Intake v1.2.3
Tags:
  ✓ insurance
  ✓ claims-operations
  ✓ sox
  ✓ production
  ✓ critical
  + [Add Tag]
```

### Filtering by Tags

```
View all HIPAA agents:
  Agents with tag "hipaa": 12
  ├─ Clinical Decision Support (3)
  ├─ Patient Scheduler (2)
  ├─ Medical Coding Assistant (4)
  ├─ Prior Authorization (3)

View all production agents owned by Claims Operations:
  Tags: production + claims-operations
  Agents: 8
  ├─ Auto Claims Intake
  ├─ Homeowner Claims
  ├─ Commercial Claims
  └─ ...
```

---

## Capacity Planning

Estimate and plan for fleet growth:

### Request Volume Forecasting

```
Historical Request Volume:
├─ 6 months ago: 10k requests/day
├─ 3 months ago: 15k requests/day
├─ 1 month ago: 22k requests/day
├─ Current: 28k requests/day
└─ Growth rate: +40% per month

Forecast (next 6 months):
├─ Month 1: 39k requests/day (40% growth)
├─ Month 2: 55k requests/day
├─ Month 3: 77k requests/day
├─ Month 4: 108k requests/day
├─ Month 5: 151k requests/day
├─ Month 6: 211k requests/day

Capacity Planning:
├─ Current capacity: 100k requests/day
├─ At month 3 forecast: 77k (77% utilized)
├─ At month 4 forecast: 108k (exceeds capacity)
├─ Recommendation: Upgrade capacity in Month 2
└─ Estimated cost: $5,000/month (10x current fleet)
```

### Token Usage Forecasting

```
Current Fleet Token Usage: 1.2B tokens/month
├─ By agent type:
│  ├─ Claims agents: 600M tokens (50%)
│  ├─ Healthcare: 400M tokens (33%)
│  └─ Other: 200M tokens (17%)

Forecast (6 months):
├─ Current: 1.2B tokens/month
├─ Month 3: 1.8B tokens/month (50% growth)
├─ Month 6: 2.8B tokens/month

Cost Impact:
├─ Current token cost: $3,200/month
├─ Month 6 estimated: $4,960/month
└─ Action: Request LLM provider discount for higher volumes
```

---

## Coordinated Fleet Updates

Manage rolling updates across the fleet:

### Phased Rollout Strategy

```
Update: New governance policy requiring audit logging

Phase 1: Pilot (1 week)
├─ 2 non-critical agents
├─ Agents: Chat Bot, Legacy Utility
├─ Monitor: Validation success, no regressions
└─ Decision point: Proceed if all pass

Phase 2: Early Adopters (1 week)
├─ 8 agents (prod, non-critical)
├─ Agents: Utility agents, non-regulated
├─ Monitor: Error rates, compliance
└─ Decision point: Proceed if no issues

Phase 3: Standard Rollout (2 weeks)
├─ Remaining 30 agents (phased, 10 at a time)
├─ Check for validation issues after each batch
└─ Decision point: Hold and debug if issues arise

Phase 4: High-Risk Agents (2 weeks)
├─ Critical, regulated agents (last)
├─ Agents: Claims processors, Clinical agents
├─ Manual review before each deployment
└─ Parallel running allowed (old + new for validation)

Rollback Plan:
├─ If > 5% of agents fail validation: Rollback
├─ If error rate increases > 20%: Rollback
├─ If compliance violations: Immediate rollback
```

### Health Checks During Rollout

```
Post-Deployment Health Checks:

1 Hour Post-Deployment:
  ✓ Error rate < baseline + 1%
  ✓ Latency p95 < baseline + 10%
  ✓ No new alerts
  ✓ Audit logs complete

1 Day Post-Deployment:
  ✓ Error rate trending back to baseline
  ✓ No governance violations
  ✓ User feedback positive (if applicable)
  ✓ Cost metrics normal

1 Week Post-Deployment:
  ✓ Metrics fully stabilized
  ✓ No regressions vs baseline
  ✓ All observability data complete
  ✓ Ready for next phase
```

---

## Best Practices

### 1. Prevent Agent Sprawl

Without governance, organizations quickly accumulate hundreds of agents:

```
Warning Signs:
- "We have 5 different versions of the claims processor"
- "No one knows who owns agent X"
- "Agent Y hasn't been used in 6 months but is still running"

Mitigation:
- Establish naming conventions (team-type-version)
- Enforce tagging (every agent must have: type, team, environment)
- Quarterly deprecation review (remove unused agents)
- Consolidation policy (don't allow duplicate agent types)
```

### 2. Standardize Deployments

Reduce complexity by standardizing agent types:

```
Instead of:
- 10 custom claims processors

Use:
- 1 claims processor template, parameterized by:
  - Claim type (auto, homeowner, commercial)
  - Geography (US, EU, APAC)
  - Partner (internal, partner A, partner B)

Result:
- Easier to update all claims agents at once
- Easier to maintain governance compliance
- Easier to troubleshoot issues
```

### 3. Establish Fleet SLOs

Define organization-level SLOs, not just per-agent SLOs:

```
Fleet-Level SLOs:
- 99.9% of agents have < 2% error rate
- 99% of agents have p95 latency < 3 seconds
- 100% of agents compliant with governance policies
- 100% of critical alerts resolved within 1 hour

Monitor:
- Weekly: How many agents meet SLOs?
- Monthly: Trend over time
- Quarterly: Root cause analysis for agents missing SLOs
```

### 4. Plan for Lifecycle Management

Don't just build agents, plan for their retirement:

```
Lifecycle Stages:
├─ Birth: Agent created and deployed
├─ Growth: Used by increasing number of teams
├─ Maturity: Stable, well-understood behavior
├─ Decline: Usage decreasing, newer agents available
└─ Death: Agent retired, users migrated to replacements

Plan upfront:
- When will this agent be replaced?
- What's the migration path for users?
- How will we deprecate it without disrupting users?
```

### 5. Automate Routine Operations

Automate tasks that would be tedious at scale:

```
Automatable Tasks:
- Nightly batch validation of all agents
- Weekly compliance reporting
- Monthly cost analysis and trend reports
- Quarterly deprecation recommendations
- Continuous monitoring of fleet health

Not Automatable (requires human):
- Deciding whether to deprecate an agent
- Approving policy changes
- Reviewing validation failures
- Emergency incident response
```

---

## Next Steps

Now that you understand fleet management, you should:

1. **Access Fleet Dashboard** — Log in to Intellios Console and explore the fleet overview.
2. **Establish Tagging Strategy** — Define tags for your organization (by type, team, regulatory scope).
3. **Set Fleet SLOs** — Define organization-level service level objectives.
4. **Schedule Reviews** — Weekly fleet health review, monthly cost analysis, quarterly deprecation review.
5. **Automate** — Set up routine observability reports and compliance checks.

---

*See also: [Observability Dashboards](observability-dashboards.md), [Alerting Configuration](alerting-configuration.md), [Incident Response: Model Drift](../06-use-cases-playbooks/incident-response-model-drift.md)*

*Next: [Observability Dashboards](observability-dashboards.md)*

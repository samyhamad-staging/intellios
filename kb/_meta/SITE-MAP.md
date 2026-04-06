---
id: "KB-003"
title: "Intellios Knowledge Base — Master Site Map"
slug: "kb-sitemap"
type: "reference"
audiences:
  - "executive"
  - "compliance"
  - "engineering"
status: "published"
version: "1.0.0"
platform_version: "1.2.0"
created: "2026-04-05"
updated: "2026-04-05"
tags:
  - "sitemap"
  - "registry"
  - "content-planning"
  - "internal-reference"
tldr: >
  Authoritative registry and master table of contents for the Intellios Knowledge Base
---

# Intellios Knowledge Base — Master Site Map

---

## How to Read This Map

| Column | Description |
|---|---|
| **ID** | Stable unique identifier — never changes once assigned |
| **Article** | Title and filename |
| **Type** | C = Concept, T = Task, R = Reference, TS = Troubleshooting, DG = Decision Guide |
| **Audiences** | E = Executive, CO = Compliance, EN = Engineering, P = Product |
| **Priority** | P0 = Must-have for launch, P1 = High-impact, P2 = Important, P3 = Nice-to-have |
| **Status** | 📝 Draft, 🔍 In Review, ✅ Published, ⚠️ Deprecated |
| **Deps** | Prerequisite article IDs |

---

## 01 — Platform Overview

| ID | Article | Type | Audiences | Priority | Status | Deps |
|---|---|---|---|---|---|---|
| 01-001 | [What Is Intellios](01-platform-overview/what-is-intellios.md) | C | E, P | P0 | ✅ | — |
| 01-002 | [Value Proposition](01-platform-overview/value-proposition.md) | C | E, P | P0 | ✅ | 01-001 |
| 01-003 | [Architecture Overview](01-platform-overview/architecture-overview.md) | C | E, EN, P | P0 | ✅ | 01-001 |
| 01-004 | [Key Capabilities](01-platform-overview/key-capabilities.md) | R | E, P, CO | P0 | ✅ | 01-001 |
| 01-005 | [How Intellios Differs](01-platform-overview/how-intellios-differs.md) | C | E, P | P1 | ✅ | 01-002 |

---

## 02 — Getting Started

| ID | Article | Type | Audiences | Priority | Status | Deps |
|---|---|---|---|---|---|---|
| 02-001 | [Executive Quick Start](02-getting-started/executive-quick-start.md) | T | E | P0 | ✅ | 01-001 |
| 02-002 | [Compliance Onboarding](02-getting-started/compliance-onboarding.md) | T | CO | P0 | ✅ | 01-001 |
| 02-003 | [Engineer Setup Guide](02-getting-started/engineer-setup-guide.md) | T | EN | P0 | ✅ | 01-003 |
| 02-004 | [PM Orientation](02-getting-started/pm-orientation.md) | T | P | P1 | ✅ | 01-001 |

---

## 03 — Core Concepts

| ID | Article | Type | Audiences | Priority | Status | Deps |
|---|---|---|---|---|---|---|
| 03-001 | [Agent Blueprint Package (ABP)](03-core-concepts/agent-blueprint-package.md) | C | EN, CO, P | P0 | ✅ | 01-003 |
| 03-002 | [Governance-as-Code](03-core-concepts/governance-as-code.md) | C | CO, EN, E | P0 | ✅ | 01-001 |
| 03-003 | [Policy Engine](03-core-concepts/policy-engine.md) | C | CO, EN | P0 | ✅ | 03-002 |
| 03-004 | [Policy Expression Language](03-core-concepts/policy-expression-language.md) | R | CO, EN | P0 | ✅ | 03-003 |
| 03-005 | [Agent Lifecycle States](03-core-concepts/agent-lifecycle-states.md) | C | CO, EN, P | P0 | ✅ | 03-001 |
| 03-006 | [Runtime Adapters](03-core-concepts/runtime-adapters.md) | C | EN, P | P0 | ✅ | 01-003 |
| 03-007 | [Compliance Evidence Chain](03-core-concepts/compliance-evidence-chain.md) | C | CO, E | P0 | ✅ | 03-002, 03-005 |
| 03-008 | [Design Studio](03-core-concepts/design-studio.md) | C | EN, P | P1 | ✅ | 01-003 |
| 03-009 | [Control Plane](03-core-concepts/control-plane.md) | C | EN, CO | P1 | ✅ | 01-003 |
| 03-010 | [Stakeholder Contributions](03-core-concepts/stakeholder-contributions.md) | C | CO, P | P1 | ✅ | 03-008 |
| 03-011 | [How to Create Your First Agent](03-core-concepts/how-to-create-first-agent.md) | T | EN, P | P0 | ✅ | 01-003 |

---

## 04 — Architecture & Integration

| ID | Article | Type | Audiences | Priority | Status | Deps |
|---|---|---|---|---|---|---|
| 04-001 | [System Architecture](04-architecture-integration/system-architecture.md) | R | EN | P0 | ✅ | 01-003 |
| 04-002 | [Data Flow](04-architecture-integration/data-flow.md) | C | EN | P0 | ✅ | 04-001 |
| 04-003 | [Runtime Adapter Pattern](04-architecture-integration/runtime-adapter-pattern.md) | C | EN | P0 | ✅ | 03-006 |
| 04-004 | [AWS AgentCore Integration](04-architecture-integration/agentcore-integration.md) | T | EN | P0 | ✅ | 04-003 |
| 04-005 | [Azure AI Foundry Integration](04-architecture-integration/ai-foundry-integration.md) | T | EN | P1 | ✅ | 04-003 |
| 04-006 | [Intake API Reference](04-architecture-integration/api-reference/intake-api.md) | R | EN | P0 | ✅ | 04-001 |
| 04-007 | [Blueprints API Reference](04-architecture-integration/api-reference/blueprints-api.md) | R | EN | P0 | ✅ | 04-001 |
| 04-008 | [Registry API Reference](04-architecture-integration/api-reference/registry-api.md) | R | EN | P0 | ✅ | 04-001 |
| 04-009 | [Governance API Reference](04-architecture-integration/api-reference/governance-api.md) | R | EN | P0 | ✅ | 04-001 |
| 04-010 | [Review API Reference](04-architecture-integration/api-reference/review-api.md) | R | EN | P1 | ✅ | 04-001 |
| 04-011 | [Webhook Integration](04-architecture-integration/webhook-integration.md) | T | EN | P1 | ✅ | 04-001 |
| 04-012 | [Database Schema](04-architecture-integration/database-schema.md) | R | EN | P1 | ✅ | 04-001 |
| 04-013 | [Deployment Guide](04-architecture-integration/deployment-guide.md) | T | EN | P0 | ✅ | 04-001 |
| 04-014 | [How to Make Your First API Call](04-architecture-integration/how-to-make-first-api-call.md) | T | EN | P0 | ✅ | 04-001 |

---

## 05 — Governance & Compliance

| ID | Article | Type | Audiences | Priority | Status | Deps |
|---|---|---|---|---|---|---|
| 05-001 | [SR 11-7 Compliance Mapping](05-governance-compliance/sr-11-7-mapping.md) | R | CO, E | P0 | ✅ | 03-002, 03-007 |
| 05-002 | [OCC Guidelines Alignment](05-governance-compliance/occ-guidelines-alignment.md) | R | CO | P0 | ✅ | 05-001 |
| 05-003 | [EU AI Act Readiness](05-governance-compliance/eu-ai-act-readiness.md) | C | CO, E | P1 | ✅ | 03-002 |
| 05-004 | [MRM Documentation Automation](05-governance-compliance/mrm-documentation-automation.md) | C | CO, E | P0 | ✅ | 05-001, 03-007 |
| 05-005 | [Model Inventory Management](05-governance-compliance/model-inventory-management.md) | T | CO, EN | P0 | ✅ | 03-001, 03-005 |
| 05-006 | [Drift Detection](05-governance-compliance/drift-detection.md) | C | CO, EN | P1 | ✅ | 03-005, 03-007 |
| 05-007 | [Shadow AI Prevention](05-governance-compliance/shadow-ai-prevention.md) | C | CO, E, EN | P0 | ✅ | 03-002 |
| 05-008 | [Audit Trail Generation](05-governance-compliance/audit-trail-generation.md) | T | CO | P0 | ✅ | 03-007 |
| 05-009 | [Compliance Evidence Workflows](05-governance-compliance/compliance-evidence-workflows.md) | T | CO | P1 | ✅ | 03-007, 05-008 |
| 05-010 | [Policy Authoring Guide](05-governance-compliance/policy-authoring-guide.md) | T | CO, EN | P0 | ✅ | 03-004 |
| 05-011 | [How to Update an Existing Governance Policy](05-governance-compliance/how-to-update-governance-policy.md) | T | CO, EN | P1 | ✅ | 05-010 |
| 05-012 | [How to Export a Compliance Report](05-governance-compliance/how-to-export-compliance-report.md) | T | CO | P0 | ✅ | 03-007 |
| 05-013 | [How to Investigate a Governance Violation](05-governance-compliance/how-to-investigate-governance-violation.md) | T | CO, EN | P1 | ✅ | 03-003 |
| 05-014 | [How to Set Up Audit Logging](05-governance-compliance/how-to-set-up-audit-logging.md) | T | CO, EN | P0 | ✅ | 05-008 |
| 05-015 | [How to Prepare for a Regulatory Examination](05-governance-compliance/how-to-prepare-for-regulatory-exam.md) | T | CO, E | P1 | ✅ | 05-001 |

---

## 06 — Use Cases & Playbooks

| ID | Article | Type | Audiences | Priority | Status | Deps |
|---|---|---|---|---|---|---|
| 06-001 | [Financial Services Scenarios](06-use-cases-playbooks/financial-services-scenarios.md) | C | P, CO, E | P0 | ✅ | 01-001 |
| 06-002 | [Insurance Scenarios](06-use-cases-playbooks/insurance-scenarios.md) | C | P, CO | P1 | ✅ | 01-001 |
| 06-003 | [Healthcare Scenarios](06-use-cases-playbooks/healthcare-scenarios.md) | C | P, CO | P1 | ✅ | 01-001 |
| 06-004 | [Shadow AI Remediation Playbook](06-use-cases-playbooks/shadow-ai-remediation-playbook.md) | T | CO, EN, E | P0 | ✅ | 05-007 |
| 06-005 | [Agent Onboarding Playbook](06-use-cases-playbooks/agent-onboarding-playbook.md) | T | P, EN | P0 | ✅ | 03-001, 03-005 |
| 06-006 | [Incident Response: Model Drift](06-use-cases-playbooks/incident-response-model-drift.md) | T | CO, EN | P1 | ✅ | 05-006 |
| 06-007 | [Express-Lane Templates](06-use-cases-playbooks/express-lane-templates.md) | T | P, EN | P1 | ✅ | 03-008 |
| 06-008 | [Stakeholder Intake Playbook](06-use-cases-playbooks/stakeholder-intake-playbook.md) | T | P, CO | P1 | ✅ | 03-010 |
| 06-009 | [How to Clone and Customize an Agent](06-use-cases-playbooks/how-to-clone-and-customize-agent.md) | T | EN, P | P1 | ✅ | 03-001 |

---

## 07 — Administration & Operations

| ID | Article | Type | Audiences | Priority | Status | Deps |
|---|---|---|---|---|---|---|
| 07-001 | [Role-Based Access Control](07-administration-operations/rbac-configuration.md) | T | EN, CO | P0 | ✅ | 04-001 |
| 07-002 | [Policy Management](07-administration-operations/policy-management.md) | T | CO, EN | P0 | ✅ | 05-010 |
| 07-003 | [Observability Dashboards](07-administration-operations/observability-dashboards.md) | T | EN | P1 | ✅ | 04-001 |
| 07-004 | [Alerting Configuration](07-administration-operations/alerting-configuration.md) | T | EN | P1 | ✅ | 07-003 |
| 07-005 | [Agent Fleet Management](07-administration-operations/agent-fleet-management.md) | T | EN, P | P1 | ✅ | 03-005 |
| 07-006 | [Multi-Tenancy](07-administration-operations/multi-tenancy.md) | C | EN | P1 | ✅ | 04-001 |
| 07-007 | [Backup & Recovery](07-administration-operations/backup-recovery.md) | T | EN | P2 | ✅ | 04-012 |
| 07-008 | [How to Promote an Agent to Production](07-administration-operations/how-to-promote-agent-to-production.md) | T | EN | P0 | ✅ | 04-013 |
| 07-009 | [How to Add a Team Member](07-administration-operations/how-to-add-team-member.md) | T | EN | P1 | ✅ | 07-001 |
| 07-010 | [How to Roll Back an Agent Version](07-administration-operations/how-to-rollback-agent-version.md) | T | EN | P1 | ✅ | 03-005 |
| 07-011 | [How to Create and Manage API Keys](07-administration-operations/how-to-create-api-key.md) | T | EN | P1 | ✅ | 04-001 |
| 07-012 | [How to Configure SSO Authentication](07-administration-operations/how-to-configure-sso.md) | T | EN | P1 | ✅ | 07-001 |
| 07-013 | [How to View Agent Audit History](07-administration-operations/how-to-view-agent-audit-history.md) | T | CO, EN | P1 | ✅ | 03-005 |
| 07-014 | [How to Set Up Automated Backups](07-administration-operations/how-to-set-up-backup-schedule.md) | T | EN | P2 | ✅ | 07-007 |

---

## 08 — Security & Trust

| ID | Article | Type | Audiences | Priority | Status | Deps |
|---|---|---|---|---|---|---|
| 08-001 | [Data Handling & Encryption](08-security-trust/data-handling-encryption.md) | C | EN, CO, E | P0 | ✅ | 04-001 |
| 08-002 | [SOC 2 Readiness](08-security-trust/soc2-readiness.md) | R | CO, E | P1 | ✅ | 08-001 |
| 08-003 | [FedRAMP Readiness](08-security-trust/fedramp-readiness.md) | R | CO, E, EN | P1 | ✅ | 08-001 |
| 08-004 | [Tenant Isolation](08-security-trust/tenant-isolation.md) | C | EN, CO | P0 | ✅ | 07-006 |
| 08-005 | [Secret Management](08-security-trust/secret-management.md) | T | EN | P1 | ✅ | 04-013 |
| 08-006 | [Penetration Testing Program](08-security-trust/penetration-testing-program.md) | R | CO, E | P2 | ✅ | 08-001 |

---

## 09 — ROI & Business Case

| ID | Article | Type | Audiences | Priority | Status | Deps |
|---|---|---|---|---|---|---|
| 09-001 | [Three-Pillar ROI Framework](09-roi-business-case/three-pillar-roi-framework.md) | C | E, P | P0 | ✅ | 01-002 |
| 09-002 | [TCO Comparison: Build vs. Intellios](09-roi-business-case/tco-comparison.md) | R | E, P | P0 | ✅ | 09-001 |
| 09-003 | [Regulatory Penalty Avoidance](09-roi-business-case/regulatory-penalty-avoidance.md) | C | E, CO | P1 | ✅ | 09-001, 05-001 |
| 09-004 | [MRM Cost Reduction](09-roi-business-case/mrm-cost-reduction.md) | C | E, CO | P1 | ✅ | 09-001, 05-004 |
| 09-005 | [Governed Deployment Velocity](09-roi-business-case/governed-deployment-velocity.md) | C | E, P | P1 | ✅ | 09-001 |
| 09-006 | [Customer Case Studies](09-roi-business-case/customer-case-studies.md) | R | E, P | P2 | ✅ | 09-001 |

---

## 10 — FAQ & Troubleshooting

| ID | Article | Type | Audiences | Priority | Status | Deps |
|---|---|---|---|---|---|---|
| 10-001 | [Executive FAQ](10-faq-troubleshooting/executive-faq.md) | R | E | P1 | ✅ | 01-001 |
| 10-002 | [Compliance FAQ](10-faq-troubleshooting/compliance-faq.md) | R | CO | P1 | ✅ | 05-001 |
| 10-003 | [Engineering FAQ](10-faq-troubleshooting/engineering-faq.md) | R | EN | P1 | ✅ | 04-001 |
| 10-004 | [Product FAQ](10-faq-troubleshooting/product-faq.md) | R | P | P2 | ✅ | 01-001 |
| 10-005 | [Known Issues](10-faq-troubleshooting/known-issues.md) | TS | EN | P1 | ✅ | — |
| 10-006 | [Escalation Paths](10-faq-troubleshooting/escalation-paths.md) | R | All | P1 | ✅ | — |
| 10-007 | [Fix: Governance Validation Failures](10-faq-troubleshooting/fix-governance-validation-failures.md) | TS | EN, CO | P0 | ✅ | — |
| 10-008 | [Fix: API Authentication Errors](10-faq-troubleshooting/fix-api-authentication-errors.md) | TS | EN | P0 | ✅ | — |
| 10-009 | [Fix: Blueprint Generation Timeout](10-faq-troubleshooting/fix-blueprint-generation-timeout.md) | TS | EN | P1 | ✅ | — |
| 10-010 | [Fix: Webhook Delivery Failures](10-faq-troubleshooting/fix-webhook-delivery-failures.md) | TS | EN | P1 | ✅ | — |
| 10-011 | [Fix: Intake Session Errors](10-faq-troubleshooting/fix-intake-session-errors.md) | TS | EN, P | P1 | ✅ | — |
| 10-012 | [Fix: Agent Deployment Failures](10-faq-troubleshooting/fix-agent-deployment-failures.md) | TS | EN | P0 | ✅ | — |
| 10-013 | [Fix: Policy Evaluation Unexpected Results](10-faq-troubleshooting/fix-policy-evaluation-unexpected-results.md) | TS | CO, EN | P1 | ✅ | — |
| 10-014 | [Fix: User Permission Denied](10-faq-troubleshooting/fix-user-permission-denied.md) | TS | EN | P1 | ✅ | — |
| 10-015 | [Fix: Blueprint Refinement Conflicts](10-faq-troubleshooting/fix-blueprint-refinement-conflicts.md) | TS | EN | P1 | ✅ | — |
| 10-016 | [Fix: Compliance Report Generation Errors](10-faq-troubleshooting/fix-compliance-report-generation-errors.md) | TS | CO, EN | P1 | ✅ | — |

---

## 11 — Glossary

| ID | Article | Type | Audiences | Priority | Status | Deps |
|---|---|---|---|---|---|---|
| 11-001 | [Intellios Glossary](11-glossary/terms.md) | R | All | P0 | ✅ | — |

---

## 12 — Release Notes

| ID | Article | Type | Audiences | Priority | Status | Deps |
|---|---|---|---|---|---|---|
| 12-001 | [Changelog](12-release-notes/changelog.md) | R | EN, P | P0 | ✅ | — |
| 12-002 | [Upcoming Features](12-release-notes/upcoming-features.md) | R | P, E | P1 | ✅ | — |
| 12-003 | [Deprecation Notices](12-release-notes/deprecation-notices.md) | R | EN | P2 | ✅ | — |

---

## Priority Summary

| Priority | Count | Status | Description |
|---|---|---|---|
| **P0** | 45 | ✅ | Must-have for KB launch — covers core platform understanding, key compliance mappings, and essential engineering docs |
| **P1** | 52 | ✅ | High-impact — deepens coverage across all audiences, fills industry-specific and operational gaps |
| **P2** | 11 | ✅ | Important — supporting content (case studies, advanced troubleshooting, backup procedures) |
| **P3** | 0 | — | Nice-to-have — reserved for future expansion |
| **Total** | 108 | ✅ | + 7 section landing pages (`_index.md`) = **115 articles** |

---

## Content Roadmap — Build Complete

All phases have been successfully completed. The knowledge base now contains 89 published articles covering all required topics and audience segments.

### Phase 1: Foundation ✅ Complete
15 articles covering the conceptual backbone and critical entry points.
- What Is Intellios, Value Proposition, Architecture Overview
- Agent Blueprint Package, Governance-as-Code, Agent Lifecycle States
- Runtime Adapters, Compliance Evidence Chain, Glossary
- Executive Quick Start, Compliance Onboarding, Engineer Setup Guide
- Key Capabilities, Policy Engine, Policy Expression Language

### Phase 2: Compliance & Governance ✅ Complete
12 articles critical for financial services buyers — the primary target market.
- SR 11-7 Compliance Mapping, OCC Guidelines Alignment
- MRM Documentation Automation, Shadow AI Prevention
- Audit Trail Generation, Policy Authoring Guide
- Model Inventory Management, Shadow AI Remediation Playbook
- Financial Services Scenarios, Three-Pillar ROI Framework
- TCO Comparison, Agent Onboarding Playbook

### Phase 3: Engineering Depth ✅ Complete
16 articles enabling platform engineers to deploy and integrate.
- System Architecture, Data Flow, Runtime Adapter Pattern
- AWS AgentCore Integration, Deployment Guide
- API References (Intake, Blueprints, Registry, Governance, Review)
- Data Handling & Encryption, Tenant Isolation
- RBAC Configuration, Policy Management
- Webhook Integration, Database Schema, Changelog

### Phase 4: Expansion ✅ Complete
22 articles covering remaining P1 and P2 content across all sections.
- Insurance and Healthcare Scenarios
- EU AI Act Readiness, Drift Detection
- Advanced Compliance Evidence Workflows
- Multi-Tenancy, Observability Dashboards, Alerting
- Agent Fleet Management, SOC 2 and FedRAMP Readiness
- Secret Management, Penetration Testing Program
- Regulatory Penalty Avoidance, Governed Deployment Velocity
- Customer Case Studies, Compliance FAQs, Engineering FAQs
- Incident Response playbooks and additional operational guides

### Phase 5: Polish & Completeness ✅ Complete
7 section landing pages and supporting content.
- All section landing pages (`_index.md` files)
- Executive FAQ, Product FAQ, Known Issues, Escalation Paths
- Upcoming Features, Deprecation Notices
- Cross-reference audit and link validation complete

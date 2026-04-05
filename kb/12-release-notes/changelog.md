---
id: 12-001
title: Changelog
slug: changelog
type: reference
audiences:
- engineering
- product
status: published
created: &id001 2026-04-05
updated: *id001
tags:
- release
- version
- features
- improvements
- bugs
- breaking changes
tldr: Version history and release notes for Intellios
---

# Changelog

All notable changes to Intellios are documented here. We follow [Semantic Versioning](https://semver.org/).

---

## v1.2.0 — 2026-03-15

**Theme:** Ownership Block & Dark Mode

### New Features

1. **Ownership Block (Governance Management)**
   - New UI block in Blueprint Studio showing agent ownership metadata
   - Displays: Owner team, created by, last modified, change log
   - Supports agent transfers between teams (with approval audit trail)
   - Useful for portfolio management and accountability

2. **Dark Mode**
   - System-wide dark theme matching organizational brand standards
   - Auto-detect system preference (macOS, Windows) or manual toggle
   - All UI components (Catalyst, custom) support dark mode
   - Reduces eye strain for long review sessions

3. **Wave 3 UX Improvements**
   - Refined Review Queue interface (approval buttons more prominent, clearer status)
   - Streamlined agent card design (Registry view, portfolio dashboard)
   - Improved form inputs (better validation feedback, inline help text)
   - Skeleton screens for faster perceived load times

### Improvements

- **Performance:** Agent Registry load time reduced 40% (from 8s → 4.8s) via query optimization
- **Documentation:** Added 12 new KB articles (FAQs, compliance guidance)
- **API response:** Blueprint export now supports async mode (polling via `status` endpoint)
- **Accessibility:** WCAG 2.1 AA compliance for all Catalyst components

### Bug Fixes

- Fixed: Dashboard governance metrics sometimes showed stale data after policy upgrade
- Fixed: Concurrent team invitations could create duplicate team memberships
- Fixed: Webhook timeout configuration ignored in multi-tenant deployments
- Fixed: "Copy blueprint" UI action failed for blueprints with special characters in name

### Known Issues

- Large blueprints (>500KB) may timeout during validation (see troubleshooting guide for workaround)
- Concurrent refinement conflicts possible (serialization lock coming in v1.3.0)

### Breaking Changes

None. v1.2.0 is fully backwards compatible with v1.1.x.

**Upgrade path:** No migration required. Existing deployments can upgrade in-place.

---

## v1.1.0 — 2026-02-01

**Theme:** Execution Block & Express-Lane Templates

### New Features

1. **Execution Block (Governance Validation)**
   - New dedicated UI panel showing governance validation results
   - Displays: All 11 operators, pass/fail status, remediation applied
   - Visual indicator: green checkmark (pass), red X (fail), yellow warning (conditional)
   - Operators are links to policy documentation (learn why each operator matters)
   - Enables users to understand governance decisions

2. **Express-Lane Templates (Intake Acceleration)**
   - Pre-built intake templates for common use cases (credit, fraud, KYC, etc.)
   - Templates auto-fill stakeholder input lanes with domain-specific questions
   - Reduces intake time from 30 min → 5 min for common scenarios
   - Admin can create custom express-lane templates (Compliance, Risk, Operations lanes pre-configured)

3. **Stakeholder Contribution Tracking**
   - Dashboard shows who contributed to agent intake (which stakeholder, when, what they input)
   - Useful for governance accountability ("Credit risk team approved this agent on 2026-01-28")
   - Exportable audit trail for regulatory examinations

### Improvements

- **Intake forms:** Real-time conflict detection (alerts if stakeholder requirements contradict)
- **Policy versioning:** Operators now individually versioned; can update single operator without full policy release
- **API:** New `/api/governance/operators` endpoint lists all operators with descriptions
- **Monitoring:** Dashboard metric "operator execution latency" now tracked per operator
- **Email notifications:** Reviewers notified when agents enter Review Queue (previously no notification)

### Bug Fixes

- Fixed: Risk classification operator sometimes miscategorized agents as "low-risk" when constraints were tight
- Fixed: Policy change log didn't track operator version changes (only policy version changes)
- Fixed: Database migration from v1.0.0 → v1.1.0 failed if audit log had >1M rows (now chunked)

### Deprecations

- **Deprecated:** Old intake form structure (flat stakeholder inputs). Use layered Express-Lane templates instead.
  - Migration: Existing intake data auto-converted to new structure on first load
  - Deadline: v2.0.0 (planned 2026-Q4) will remove old structure

### Breaking Changes

None. v1.1.0 is fully backwards compatible with v1.0.x deployments.

**Upgrade path:** Database schema updated automatically; no downtime required. Recommend upgrading during low-traffic window.

---

## v1.0.0 — 2025-11-15

**Theme:** Initial Release — Governed Agent Delivery

### Core Features

1. **Intake Engine**
   - 7-lane stakeholder input system (Compliance, Risk, Legal, Security, IT, Operations, Business)
   - 20+ pre-built form templates (financial services, insurance, healthcare)
   - Real-time validation and conflict detection
   - Integrates with OIDC/SSO for enterprise authentication

2. **Generation Engine**
   - Claude + Bedrock LLM integration
   - Agent blueprint generation from intake data
   - Refinement UI for prompt engineering (token budget, tool selection, model tuning)
   - Auto-generates model cards (transparency documentation)

3. **Governance Validator**
   - 11 deterministic operators:
     - `max_tools_policy`: Limit agent tool count
     - `risk_classification`: Categorize agent risk level
     - `stakeholder_approval_gates`: Route to reviewers based on risk
     - `prompt_injection_check`: Detect unsafe prompt patterns
     - `tool_safety_check`: Validate tool definitions against whitelist
     - `token_budget_constraint`: Enforce token limits
     - `data_residency_policy`: Ensure data stays in approved regions
     - `model_version_policy`: Require specific LLM versions
     - `execution_timeout_policy`: Set max execution duration
     - `api_call_limits`: Constrain external API calls
     - `stakeholder_consensus_check`: Ensure consensus among stakeholders
   - Validation reports signed and timestamped (audit evidence)
   - Conditional approval workflows

4. **Agent Registry**
   - Versioned blueprint repository with semantic versioning
   - Lifecycle states: Draft, Approved, Deployed, Deprecated
   - Deployment tracking (which environment, when, by whom)
   - One-click deployment to AWS Lambda or Kubernetes
   - Agent tagging and search

5. **Blueprint Review UI**
   - Streamlined approval interface for high-risk agents
   - Side-by-side comparison (blueprint vs. governance policy)
   - Stakeholder comments and approval history
   - SLA tracking (time in review queue)

6. **Administration Dashboard**
   - Agent portfolio overview (count by status, risk level, domain)
   - Policy compliance metrics (validation pass rate, trends)
   - Deployment timeline (agents deployed per week/month)
   - Audit log viewer (immutable, timestamped)
   - Multi-team support (logical isolation via `enterprise_id`)

### Infrastructure

- **Deployment:** Docker, Kubernetes-ready
- **Database:** PostgreSQL with Drizzle ORM migrations
- **Cloud:** AWS (primary) with SDKs for Bedrock, Secrets Manager, CloudWatch
- **Secrets:** AWS Secrets Manager integration
- **Monitoring:** CloudWatch metrics export

### Documentation

- Knowledge base with 50+ articles
- API documentation (OpenAPI/Swagger)
- Architecture documentation (subsystems, data flow)
- Deployment guides (AWS, self-hosted)
- FAQ sections (executive, compliance, engineering, product)

### Known Limitations

- Azure/GCP adapters planned for Q2 2026
- FedRAMP authorization roadmapped (currently Moderate assurance)
- Advanced policy composition (if-then logic) roadmapped for Q3 2026
- NIST AI RMF mapping planned for Q3 2026

---

## Version Support Policy

| Version | Release Date | End of Support |
|---------|---|---|
| v1.2.0 | 2026-03-15 | 2026-09-15 (6 months) |
| v1.1.0 | 2026-02-01 | 2026-08-01 (6 months) |
| v1.0.0 | 2025-11-15 | 2026-05-15 (6 months) |

**Support:** We maintain N-1 versions (current + 1 prior). Upgrades strongly recommended for security and feature updates.

---

## Upgrade Guidance

### From v1.1.x → v1.2.0
- **Effort:** Minimal (30 min for backup + deployment)
- **Downtime:** ~5 minutes (blue/green deployment possible for zero-downtime)
- **Testing:** Run smoke test (deploy test agent, verify validation)

### From v1.0.x → v1.1.0
- **Effort:** Moderate (60 min including database migration)
- **Downtime:** ~10 minutes
- **Migration:** Database schema change; audit log chunked into smaller transactions
- **Testing:** Validate that existing agents still pass governance (backward compatible)

### Major Version Upgrade (v1.x → v2.0)
- **Deprecation notice:** Provided 6 months before v2.0 release
- **Migration guide:** Detailed steps for policy re-definition (risk classification system changes)
- **Professional services:** Available to assist with complex migrations

---

## Feedback & Bug Reports

Found a bug or want to request a feature? Open an issue on GitHub: [PLACEHOLDER: github.com/intellios/intellios/issues]

For security vulnerabilities, email [PLACEHOLDER: security@intellios.com] (do not use public issues).

For urgent issues, follow escalation procedures in [Escalation Paths](./escalation-paths.md).

---
id: "KB-002"
title: "Intellios Knowledge Base — Governance Plan"
slug: "kb-governance-plan"
type: "reference"
audiences:
  - "compliance"
  - "executive"
status: "published"
version: "1.0.0"
platform_version: "1.2.0"
created: "2026-04-05"
updated: "2026-04-05"
tags:
  - "kb-governance"
  - "quality-metrics"
  - "content-operations"
  - "versioning"
  - "internal-reference"
tldr: >
  Governance plan for the Intellios Knowledge Base including ownership model,
  review cadence, versioning protocol, and quality metrics
---

# Intellios Knowledge Base — Governance Plan

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Ownership Model & RACI](#ownership-model--raci)
3. [Review Cadence](#review-cadence)
4. [Versioning Protocol](#versioning-protocol)
5. [Quality Metrics & Measurement](#quality-metrics--measurement)
6. [Content Operations](#content-operations)
7. [Tooling & Infrastructure](#tooling--infrastructure)
8. [Scaling Plan](#scaling-plan)
9. [Escalation Paths](#escalation-paths)
10. [Appendix: Templates & Checklists](#appendix-templates--checklists)

---

## Executive Summary

The Intellios Knowledge Base (KB) is the canonical external-facing documentation for our enterprise AI governance platform. This plan establishes operational accountability, quality standards, and processes for maintaining KB integrity as it scales from 37 P0 launch articles to 89+ comprehensive articles across 12 sections and 4 audience segments.

**Key Governance Principles:**

- **Ownership is clear and distributed**: One KB Owner (strategic + metrics), four Section Owners (accuracy + freshness), subject matter experts (SME) per audience (review).
- **Quality is measurable**: Freshness, search success, time-to-resolution, feedback ratios, and coverage are tracked quantitatively.
- **Process is lightweight**: Standard reviews complete within 5 business days. Platform releases trigger systematic documentation sweeps. Emergency updates bypass review but require retrospective audit within 48 hours.
- **Versioning is semantic and transparent**: Article versions and platform versions are independent but linked, enabling version-specific documentation without platform fragmentation.
- **Tools enable scale without overhead**: Git-native workflows (branch, PR, merge), CI/CD linting, automated staleness alerts, and analytics integration minimize manual bookkeeping.

---

## Ownership Model & RACI

### Organizational Structure

```
┌──────────────────────────────────────────────────────────────┐
│                       KB Owner (1)                           │
│  Strategic direction, metrics, stakeholder coordination      │
└────────────────────────────────────────────────────────────┬─┘
                                                               │
        ┌──────────────────────────────────────────────────────┼──────────────────────────────────────────────┐
        │                                                       │                                              │
    ┌───┴──────────────┐  ┌──────────────────┐  ┌─────────────┴────┐  ┌──────────────────┐  ┌──────────────┐
    │ Section Owner 01 │  │ Section Owner 02 │  │ Section Owner 03 │  │ Section Owner 04 │  │ Section      │
    │ Platform         │  │ Getting Started  │  │ Core Concepts    │  │ Architecture &   │  │ Owner 05     │
    │ Overview         │  │                  │  │ (10 articles)    │  │ Integration      │  │ Governance & │
    │ (5 articles)     │  │ (4 articles)     │  │                  │  │ (13 articles)    │  │ Compliance   │
    └──────────────────┘  └──────────────────┘  └──────────────────┘  └──────────────────┘  │ (10 articles)│
                                                                                              └──────────────┘
    ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐
    │ Section Owner 06 │  │ Section Owner 07 │  │ Section Owner 08 │  │ Section Owner 09 │  │ Section      │
    │ Use Cases &      │  │ Administration & │  │ Security &       │  │ ROI & Business   │  │ Owner 10-12  │
    │ Playbooks        │  │ Operations       │  │ Trust            │  │ Case             │  │ FAQ,         │
    │ (8 articles)     │  │ (7 articles)     │  │ (7 articles)     │  │ (7 articles)     │  │ Glossary,    │
    │                  │  │                  │  │                  │  │                  │  │ Release      │
    └──────────────────┘  └──────────────────┘  └──────────────────┘  └──────────────────┘  │ Notes        │
                                                                                              │ (7 articles) │
                                                                                              └──────────────┘
                                                     ↓
                    ┌────────────────────────────────────────────────────────────┐
                    │     SME Reviewers (by audience type, n=6-8 total)         │
                    │                                                            │
                    │ • Executive SME (Chief Risk Officer / VP Product)          │
                    │ • Compliance SME (Chief Compliance Officer / Sr. Auditor)  │
                    │ • Engineering SME (VP Engineering / Architect)             │
                    │ • Product SME (Senior Product Manager)                     │
                    └────────────────────────────────────────────────────────────┘
```

### Roles & Responsibilities

#### **KB Owner** (1 FTE)

**Accountability:** Overall KB strategy, quality metrics, stakeholder coordination, escalations, and tooling.

**Responsibilities:**
- Define KB strategy, roadmap, and success metrics
- Track and report quarterly KB health metrics (freshness, search success, feedback ratio)
- Coordinate reviews across Section Owners and SMEs
- Approve new article proposals and priority disputes
- Manage KB platform selection, setup, and upgrades
- Establish and refine content standards (evolve `_meta/` documentation)
- Triage and resolve escalations (e.g., conflicting SME feedback, urgent corrections)
- Own relationship with Product, Engineering, and Compliance on KB scope changes
- Maintain `docs/log/kb-governance.md` (audit trail of governance decisions)
- Conduct annual comprehensive KB audit (taxonomy, cross-references, coverage)
- Act as tiebreaker in review disputes

**Reporting:** Quarterly to Product, Engineering, and Compliance leaders.

**Time Commitment:** 60% (when KB is in phase 1-2; reduces to 40% in maturity phase).

---

#### **Section Owners** (12 total, ~4 hours/week each)

**Accountability:** Accuracy, currency, and quality of articles within their assigned section.

**Responsibilities:**
- Review and approve all new articles and updates within their section within 5 business days
- Verify technical accuracy against current platform state
- Maintain prerequisites and related-article links (bidirectional integrity)
- Flag articles for deprecation when platform features change
- Conduct quarterly freshness audit for their section (flag articles >90 days stale)
- Respond to negative feedback within their section within 3 business days
- Work with SMEs to ensure articles meet audience needs
- Update article version numbers and `updated` timestamps
- Suggest cross-section links to KB Owner for bidirectional update
- Participate in platform release documentation sweeps (verify content against release notes)

**Section Assignment** (one owner per section):

| Section | Owner | Typical Expertise |
|---------|-------|-------------------|
| 01 | Product/Marketing | Product strategy, value prop |
| 02 | Documentation Lead | Onboarding, journey mapping |
| 03 | Architecture Lead | Core platform concepts |
| 04 | Engineering Lead | API, deployment, integration |
| 05 | Compliance Lead | Regulatory, audit, policy |
| 06 | Product Manager | Use cases, scenarios, playbooks |
| 07 | Operations Lead | Admin, observability, ops |
| 08 | Security Lead | Security posture, compliance |
| 09 | Finance/Product Lead | ROI, business metrics |
| 10-12 | Documentation Lead | FAQ, glossary, release notes |

**Review Authority:**
- Approve articles within their section within 5 business days
- Request revisions (no limit, but must explain within 24 hours)
- Escalate disputes to KB Owner if author disagrees with revisions

---

#### **Subject Matter Expert (SME) Reviewers** (4-8 total, ~2 hours/week each)

**Accountability:** Verify articles are technically correct and appropriate for their assigned audience segment.

**Responsibilities:**
- Review articles targeting their audience within 3 business days of request
- Evaluate article depth, terminology, and assumptions against audience knowledge level
- Flag inaccuracies, outdated examples, or missing prerequisites
- Provide inline feedback (comment on PR or review document)
- Approve articles once concerns are resolved (sign-off in PR)
- Attend quarterly governance review meetings to discuss trends

**SME Assignment** (one or more per audience):

| Audience | SME Role(s) | Count |
|----------|-------------|-------|
| **Executive** | Chief Risk Officer, VP Product | 2 |
| **Compliance** | Chief Compliance Officer, Senior Auditor, Regulatory Counsel | 2-3 |
| **Engineering** | VP Engineering, Principal Architect, Staff Engineer | 2 |
| **Product** | Senior Product Manager, Senior PM | 1 |

**Selection Criteria:**
- Minimum 3 years in role or domain expertise
- Actively using or intimately familiar with Intellios features
- Available for 2-3 hour/week commitment (can rotate if 1 person insufficient)

---

#### **Supporting Roles** (shared responsibility)

| Role | Responsibility | Owner |
|------|---|---|
| **Platform Engineer (CI/CD)** | Configure linting, link validation, frontmatter checks in PR pipeline | Engineering |
| **Analytics Admin** | Set up KB analytics (Algolia or built-in search), track metrics dashboard | Product/Analytics |
| **Technical Writer (Phase 2+)** | Draft new articles, conduct copyedits, maintain style guide | Documentation |
| **Localization Lead (Phase 3)** | Plan and execute KB translation strategy | Product/Documentation |

---

### RACI Matrix

| Activity | KB Owner | Section Owner | SME | Engineering | Product | Compliance |
|----------|----------|--------|------|---|---|---|
| **Review new article** | A | R | C | — | C | C* |
| **Update article for platform change** | I | R | C | C | — | C* |
| **Quarterly freshness audit** | R | A | — | — | — | — |
| **Emergency update (security, critical bug)** | A | I | — | R | — | — |
| **Deprecate article** | A | R | — | I | — | C* |
| **Approve new article proposal** | A | R | C | — | — | C* |
| **Escalation resolution** | A | R | C | — | — | — |
| **Platform release documentation sweep** | R | A | C | R | C | C |
| **Annual comprehensive audit** | A | C | — | — | — | — |
| **Metrics reporting** | A | C | — | — | I | — |
| **Feedback triage and prioritization** | R | C | — | — | — | — |

**Legend:** A = Accountable (does the work), R = Responsible (owns outcome), C = Consulted (asks opinion), I = Informed (kept updated), * = Only for compliance-related articles

---

## Review Cadence

### New Article Review

**Timeline:** Within 5 business days of submission.

**Process:**

1. **Author submits article in draft status** (creates PR in GitHub or doc platform)
   - Frontmatter complete with required fields
   - Follows template structure for content type
   - Internal links and prerequisites verified

2. **Section Owner assigns reviewers within 24 hours**
   - Identifies audience types (e.g., compliance + engineering)
   - Assigns corresponding SMEs for review
   - Sets deadline: 5 business days from PR creation

3. **SME review (3 business days)**
   - Reviews for accuracy, depth, audience fit
   - Leaves inline comments on PR
   - Approves or requests revisions

4. **Section Owner review (5 business days)**
   - Consolidates SME feedback
   - Verifies prerequisites and related articles
   - Checks compliance with content-type template
   - Approves if concerns addressed, or requests revisions

5. **Author addresses feedback**
   - Responds to comments within 24 hours
   - Makes revisions within 3 business days
   - Updates version number (patch increment if minor changes)
   - Pings Section Owner for re-review if major revisions

6. **Approval and publish**
   - Section Owner approves PR
   - Article status changed from `draft` to `published`
   - Article merged to main branch
   - Platform cache refreshed (Algolia, search index, etc.)
   - Slack notification sent to KB subscribers

**Escalations:**
- If SME and Section Owner disagree: KB Owner decides within 2 business days
- If author disputes revision requests: Section Owner and author meet; KB Owner arbitrates if unresolved
- If review exceeds 5 days: KB Owner notified; can extend up to 7 days with explicit justification

---

### Update Review

**Timeline:** Expedited — 3 business days for minor updates, 5 for substantial changes.

**Definition:**
- **Minor update**: Typo fix, formatting, example clarification, `patch` version increment
- **Substantial update**: New section, behavioral change, audience change, `minor` version increment

**Process:**

1. **Author identifies change category** (minor or substantial)
2. **Creates PR** with updated frontmatter (`updated` date, version bump)
3. **If minor**: Only Section Owner review needed (1-2 business days)
4. **If substantial**: Full SME review applies (3-5 business days)
5. **Same approval flow as new articles**

**Example: Update triggers**
- "Policy Expression Language syntax changed" → substantial, SME review required
- "Typo in step 3 of Policy Authoring Guide" → minor, Section Owner only
- "Added new example to Agent Lifecycle States" → minor, Section Owner only
- "Governance API endpoint URL changed" → substantial, SME + Section Owner

---

### Quarterly Freshness Audit

**Schedule:** First full week of April, July, October, January.

**Scope:** Every article reviewed for currency.

**Process:**

1. **KB Owner generates freshness report** (automated script)
   - Identifies articles with `updated` >90 days old
   - Groups by platform version (e.g., articles last updated for v1.1.0, now on v1.2.0)
   - Flags articles with `in-review` status >30 days

2. **Section Owner reviews their section**
   - For each flagged article, determines: *Current?* or *Needs update?*
   - If current: Updates `updated` timestamp (patch version), write trivial PR
   - If needs update: Creates task, assigns priority, schedules work

3. **Report to KB Owner**
   - Lists articles needing updates (with priority)
   - Section Owner commits to update schedule

4. **KB Owner tracks completion**
   - Reports on quarterly health metrics (% fresh articles, stale articles by section)
   - Identifies patterns (e.g., "Section 04 Architecture has 3 stale articles")

**Target:** >95% of published articles current (updated within 2 platform releases or 6 months, whichever sooner).

---

### Trigger-Based Reviews

**Platform Release** (every 4-6 weeks)

- **Timeline:** Documentation sweep completes within 5 business days of release
- **Process:**
  - Engineering provides release notes and feature summary
  - KB Owner identifies affected articles (by feature, API endpoint, policy rules, etc.)
  - Section Owners review identified articles, flag for update if needed
  - All updates publish before customer announcement

**Regulatory Update** (e.g., OCC issues new guidance, EU AI Act finalizes)

- **Timeline:** Emergency review within 2 business days of announcement
- **Process:**
  - Compliance Lead notifies KB Owner
  - KB Owner identifies affected articles (e.g., all SR 11-7 mapping articles)
  - Compliance SME conducts expedited review
  - Updates published same day or next business day
  - Change flagged in release notes

**Negative Feedback Threshold Exceeded** (3+ negative reactions on one article within 30 days)

- **Timeline:** Triage within 3 business days
- **Process:**
  - Feedback system flags article automatically
  - KB Owner reviews feedback comments
  - Assigns to Section Owner or SME for investigation
  - Updates article if feedback justified (within 5 business days)
  - Publishes resolution or explanation

**Customer Support Escalation** (issue traced to KB article)

- **Timeline:** Review within 2 business days
- **Process:**
  - Support team links article from ticket
  - KB Owner contacted
  - Article reviewed for accuracy, clarity
  - Updates published or support response provided within 5 days

---

### Annual Comprehensive Review

**Schedule:** Q1 (January-February), following end-of-year reflection.

**Scope:** Full KB audit — taxonomy, coverage, cross-references, strategy.

**Deliverables:**

1. **Taxonomy audit**
   - Verify section structure still maps to product capabilities
   - Identify gaps (new features without articles)
   - Recommend section additions or mergers
   - Document in KB-ARCHITECTURE.md updates

2. **Coverage audit**
   - Measure coverage score: `(articles with KB content) / (total platform features)` → target >85%
   - Identify uncovered features, regulatory requirements, or audience gaps
   - Recommend new article proposals for next phase

3. **Cross-reference audit**
   - Sample 20% of articles, verify bidirectional links
   - Check prerequisites DAG for cycles
   - Verify `related` fields accurate
   - Report broken or stale links

4. **Audience alignment audit**
   - Sample articles per audience, verify depth and terminology appropriate
   - Survey SMEs: "Are articles fit for purpose?"
   - Recommend updates or reorganization

5. **Metrics review and planning**
   - Analyze 12-month metrics trends (freshness, search, feedback, time-to-resolution)
   - Set targets for next 12 months
   - Recommend process changes if trends negative

6. **Strategy document**
   - KB roadmap for next 12 months
   - Phase planning (phase 2-3 scope, resource needs)
   - Tool and process recommendations
   - Risk assessment (e.g., "Section 04 will need 2 dedicated authors in phase 2")

**Owner:** KB Owner; present findings to product, engineering, and compliance leaders.

---

## Versioning Protocol

### Article Versioning

Articles follow **semantic versioning** independent from platform version:

| Version Type | Increment | Example | Trigger |
|---|---|---|---|
| **Patch** | 1.0.x | 1.0.1 | Typo fixes, formatting, minor clarification, timestamp update |
| **Minor** | 1.x.0 | 1.1.0 | New sections, additional examples, updated prerequisites, audience expansion |
| **Major** | x.0.0 | 2.0.0 | Complete restructure, behavioral change requiring new mental model, content removed |

### Platform Version Binding

The `platform_version` field (e.g., `1.2.0`) indicates which Intellios release the article was last verified against.

**Policy:**

- On each platform release, articles are marked either:
  - **Current**: `platform_version` matches latest release
  - **Needs review**: `platform_version` is >1 release behind

- If article is "needs review" and Section Owner confirms it's still accurate → increment `platform_version`, keep content version same
- If article is "needs review" and requires substantive update → increment both `platform_version` and content version as appropriate

**Example:**

| Scenario | Action | Version Change |
|----------|--------|---|
| Intellios v1.2.0 ships. Article was verified for v1.1.0, no changes needed. | Update frontmatter `platform_version: "1.2.0"` | No change (still 1.0.0) |
| Intellios v1.2.0 adds new field to ABP. Article needs update. | Update article content, update `platform_version: "1.2.0"` | Increment to 1.1.0 (minor) |
| Major feature deprecated, article becomes obsolete. | Mark `status: deprecated`, add deprecation banner. | No version change, deprecated_by link added |

### Deprecation Workflow

**Trigger:** Feature removed from platform, API endpoint deprecated, or article superseded by new content.

**Process:**

1. **Mark for deprecation** (when deprecation announced)
   - Section Owner creates PR
   - Updates `status: "deprecated"` in frontmatter
   - Adds `deprecated_by: "{new-article-id}"` if replacement exists
   - Updates version to `1.x.0+deprecation` (e.g., 1.2.0 → 1.2.0-deprecated) if needed

2. **Add deprecation banner** (rendered at top of article)
   ```
   ⚠️ **Deprecated — Applies to Intellios ≤ v1.1.0**

   This article applies to Intellios v1.1.0 and earlier.
   For the current version, see [Policy Authoring Guide v2](./05-governance-compliance/policy-authoring-guide.md).
   ```

3. **Internal redirect** (if on GitBook or Docusaurus)
   - Platform routes old article URL to new article URL with deprecation notice

4. **Archive** (after 2 platform releases)
   - Article moved to `/kb/_deprecated/` or similar
   - Removes from search index
   - Keeps URL as redirect for backward compatibility

5. **Update in release notes**
   - Release notes document deprecation with links to new articles
   - Users informed 1 release before deprecation

**Retention:** Deprecated articles kept in repository (git history) indefinitely for audit trail. Removed from search and primary navigation.

---

### Git Workflow

All content changes go through git workflow to maintain auditability:

**Branch naming:**

```
content/article-id-{change-type}
  e.g., content/03-004-update-operators
  e.g., content/05-010-new-policy-patterns
```

**Commit message format:**

```
{TYPE}: {article-id} — {description}

- What changed
- Why it changed
- Audience impact (if any)

Type: [NEW | UPDATE | DEPRECATE | REFACTOR]
Article: {article-id}
Reviewed by: {Section Owner name}
```

**Example:**

```
UPDATE: 05-010 — Add example for dynamic severity rules

- Added code example showing severity field in JSON policy syntax
- Clarifies that severity can be overridden per rule
- Addresses #47 (customer question about severity dynamics)

Type: UPDATE
Article: 05-010
Reviewed by: Compliance Lead
```

**PR review:**
- Section Owner approves (or delegates to SME if technical)
- CI checks pass: frontmatter lint, link validation, no merge conflicts
- Merge to `main` triggers search index rebuild

---

## Quality Metrics & Measurement

### Core Metrics

#### 1. **Freshness Score**

**Definition:** How recently articles have been reviewed and updated.

**Formula:**
```
freshness_score = mean((today - updated_date) / review_interval)
  where review_interval = 180 days (6 months) or 2 platform releases
```

**Target:** `freshness_score < 1.0` (articles reviewed more frequently than interval)

**Measurement:**
- Calculated automatically each quarter
- Tracked per section and in aggregate
- Articles >90 days old flagged in quarterly audit

**Action triggers:**
- `score > 1.2`: Section Owner reviews article within 2 weeks
- `score > 1.5`: Escalate to KB Owner, consider article for deprecation
- `score > 2.0`: Article marked as "needs review" in search UI

**Dashboard:** `Freshness by Section` (chart shows trend over 12 months)

---

#### 2. **Search Success Rate**

**Definition:** Percentage of KB searches that lead to article click-through.

**Formula:**
```
search_success_rate = (searches_with_click) / (total_searches) * 100%
```

**Target:** `>70%` (at least 7 in 10 searches result in user finding relevant article)

**Measurement:**
- Tracked via Algolia analytics (or platform search analytics)
- Queried monthly, trended quarterly
- Broken down by search query, article, audience segment

**Action triggers:**
- Search term with `<50%` CTR → keyword expansion in article tags or titles
- Article with low CTR for direct searches → title/description improvement
- Monthly report to KB Owner; quarterly review with Section Owners

**Insight example:** "Policy authoring searches have 45% CTR. Adding tag `dsl` and `syntax` increased CTR to 68%."

---

#### 3. **Time-to-Resolution** (Task articles only)

**Definition:** Median time from article open to task completion (measured via analytics or user survey).

**Target:** `<15 minutes` for simple tasks, `<60 minutes` for complex tasks

**Measurement:**
- Embedded survey: "Did this article help you complete your task?" with optional completion time
- Tracked per article and per content type
- Sample size: minimum 10 completions before metric is reliable

**Action triggers:**
- Article with median time >120 minutes (complex) or >30 minutes (simple) → review for clarity, missing steps, prerequisites
- Articles with <5 completions in 3 months → low demand, consider deprecation or reorganization

**Note:** Requires analytics integration and optional user survey; Phase 1 launch may use SME feedback instead.

---

#### 4. **Feedback Score**

**Definition:** Ratio of positive to negative feedback per article.

**Formula:**
```
feedback_ratio = (thumbs_up) / (thumbs_up + thumbs_down)
```

**Target:** `>0.80` (at least 80% of reactions positive)

**Measurement:**
- Embedded "Was this helpful?" widget on every article (thumbs up/down)
- Optional comment field for context
- Tracked monthly per article
- Articles with <5 reactions in 1 month not scored

**Action triggers:**
- 3+ thumbs-down within 30 days on one article → KB Owner triage (accuracy? clarity? outdated?)
- `feedback_ratio < 0.60` → escalate to Section Owner and SME within 3 business days
- Monthly report shows top 5 helpful articles and bottom 5 needing improvement

**Escalation example:** "Policy Authoring Guide feedback dropped from 0.85 to 0.62 after v1.2.0 release. Comment: 'example doesn't work with new operator syntax.' Issue: article not updated for release."

---

#### 5. **Coverage Score**

**Definition:** Percentage of platform features with corresponding KB articles.

**Formula:**
```
coverage_score = (articles covering features) / (total platform features) * 100%
```

**Target:** `>85%` at launch, `>90%` in maturity phase

**Measurement:**
- Manual audit: Feature list (from product) vs. KB article tags
- Conducted annually or after major release
- Identifies uncovered features and recommends new articles

**Features counted:**
- Major features in feature list (e.g., "Policy Engine," "Design Studio," "Agent Registry")
- API endpoints (each endpoint = 1 feature)
- Regulatory capabilities (e.g., "SR 11-7 evidence generation")
- Administrative workflows (e.g., "RBAC configuration," "Backup/restore")

**Example:**
- Total features: 120 (30 core, 40 API endpoints, 20 admin, 30 regulatory)
- Articles covering: 106 features
- Coverage score: 88%
- Gap: "Webhook retry logic" not documented → recommend new article

---

#### 6. **Staleness Alert**

**Definition:** Articles not updated within 2 platform releases trigger automatic alert.

**Implementation:**
- CI/CD script runs post-release
- Identifies articles with `platform_version` >2 releases behind
- Flags in search UI with icon: 🗂️ *This article may be outdated*
- Notifies Section Owner to review

**Target:** Zero staleness alerts (all articles updated within 2 releases)

**Measurement:**
- Counted monthly
- Reported in quarterly metrics
- Trend tracked (should decrease as governance matures)

---

### Reporting & Dashboards

#### Quarterly KB Health Report

**Owner:** KB Owner
**Audience:** Product, Engineering, Compliance leaders
**Format:** 1-page dashboard + detailed appendix

**Contents:**

| Metric | Target | Current | Trend | Action |
|--------|--------|---------|-------|--------|
| Freshness Score | <1.0 | 1.2 | ↑ | Section 04 needs audit |
| Search Success Rate | >70% | 72% | ↑ | On track |
| Feedback Ratio | >0.80 | 0.78 | ↓ | 2 articles under review |
| Coverage Score | >85% | 88% | — | 7 features uncovered |
| Articles in-review | <5% | 8% | ↑ | Review bandwidth issue |
| Stale articles | 0 | 2 | ↑ | Post-release update pending |

**Narrative:** "KB health is strong with one concern: review cycle time. 2 articles in backlog 30+ days. Recommend hiring technical writer in Phase 2 or reducing non-P0 article approval scope."

---

#### Monthly Dashboard (internal — KB team)

- **Freshness by section** (bar chart, sorted)
- **Search queries** (top 10 by volume, %CTR per query)
- **Feedback** (top 5 helpful, bottom 5 needing work)
- **Pending reviews** (articles, review duration, Section Owner)
- **Work in progress** (branches, expected completion)

**Tool:** Google Sheets, Looker, or Grafana (depending on analytics platform chosen)

---

### Measurement Infrastructure

#### Analytics Stack

**Option 1: Algolia (Recommended for MVP)**
- Full-text search with analytics built-in
- Tracks search queries, click-through rates, user behavior
- Dashboard for analysis
- Cost: $0-100/month depending on search volume

**Option 2: GitBook Pro (if platform = GitBook)**
- Native analytics
- Page views, search, feedback tracking
- Integrates with GitBook UI

**Option 3: Custom (if building proprietary KB)**
- Implement Segment or Mixpanel event tracking
- Log searches, clicks, feedback to data warehouse
- Build custom Looker dashboards
- Higher setup cost, more flexibility

**Minimum viable setup (Phase 1):**
- Google Analytics or Mixpanel for page views
- Simple feedback widget (thumbs up/down)
- Spreadsheet-based freshness tracking
- Monthly manual report

---

## Content Operations

### Lifecycle States

```
  ┌─────────┐
  │  draft  │ ← Author writes article
  └────┬────┘
       │ Submit for review
       ▼
  ┌──────────┐
  └────┬─────┴───────┐
       │             │
   Approved    Revisions needed
       │             │
       ▼             ▼
  ┌───────────┐  ┌───────────┐
  │ published │  │   draft   │ ← Back to draft for revisions
  └─────┬─────┘  └───────────┘
        │
   Platform release
   or superseded
        │
        ▼
   ┌────────────┐
   │ deprecated │
   └────────────┘
```

**Status values in frontmatter:**
- `draft` — Author working, not shared externally
- `in-review` — Submitted for Section Owner + SME review
- `published` — Approved, live on KB
- `deprecated` — Superseded or feature removed, shown with warning banner

---

### New Article Workflow

#### Step 1: Proposal (Optional but Recommended)

**For P0 articles or large articles (>2000 words):**

1. Author creates 1-page proposal
   - Working title
   - Content type (concept, task, reference, troubleshooting, decision-guide)
   - Audience
   - Outline (3-5 main sections)
   - Estimated word count
   - Why this article is needed

2. KB Owner or Section Owner reviews proposal within 3 business days
   - Approve, request changes, or decline
   - Provide guidance on scope, audience, or related articles
   - Assign article ID if approved

3. Author proceeds to outline and draft

**For smaller articles or templates:**

- Proposal step can be skipped; proceed directly to outline

---

#### Step 2: Outline

1. Author creates article structure (headers only)
   - Content type template structure followed
   - Main sections identified
   - Estimated word count per section

2. (Optional) Section Owner or SME reviews outline for scope/structure fit
   - Takes <30 minutes for SME
   - Early feedback prevents major rewrites

---

#### Step 3: Draft

1. Author completes article draft following template and style guide
   - All frontmatter filled in (except `reviewed_by`)
   - Internal links added and verified
   - Prerequisites identified
   - Diagrams placeholders added (if needed)
   - Examples included

2. Author self-review
   - Runs style guide checklist (tone, terminology, structure)
   - Validates frontmatter schema (JSON validator online)
   - Confirms all cross-references correct (run link checker locally)

3. Author commits to branch: `content/{article-id}-new`

---

#### Step 4: SME Review

1. Section Owner assigns article to 1-2 SMEs (by audience)
   - Creates PR in GitHub / doc platform
   - Adds SMEs as reviewers
   - Sets deadline: 3 business days

2. SMEs review for:
   - **Accuracy**: Is content technically correct? Does it match current platform state?
   - **Audience fit**: Is depth/terminology appropriate for audience?
   - **Completeness**: Are prerequisites sufficient? Examples clear? Edge cases addressed?

3. SMEs leave comments inline (GitHub PR)
   - Specific line numbers
   - Type: [question], [suggestion], [error], [style]
   - Link to supportive evidence (docs, code, spec) if disagreeing

4. Author responds to each comment within 24 hours
   - Answers questions
   - Accepts or discusses suggestions
   - Fixes errors
   - Updates article

5. SMEs approve once satisfied
   - GitHub "approve" on PR
   - Add comment: "Ready for Section Owner review"

---

#### Step 5: Editorial Review

1. Section Owner reviews article
   - Reads full article (not just diffs)
   - Verifies SME feedback addressed
   - Checks against section guidelines
   - Ensures related articles and prerequisites linked bidirectionally

2. Section Owner review checklist:
   - [ ] Frontmatter complete (id, title, type, audiences, status, version, platform_version, created, updated, tags, tldr)
   - [ ] Follows content-type template (concept, task, reference, etc.)
   - [ ] Prerequisite articles are accurate and linked
   - [ ] Related articles bidirectional (does target article link back?)
   - [ ] All internal links use relative paths and are valid
   - [ ] Tags sufficient for search (minimum 3, including synonyms)
   - [ ] TL;DR 2-3 sentences, compelling standalone
   - [ ] No jargon without definition (or linked to glossary)
   - [ ] Examples concrete and functional
   - [ ] No external links broken (spot check 5)
   - [ ] Frontmatter version correct (new articles = 1.0.0)

3. Section Owner approves or requests changes
   - If changes required: loops back to author (max 1-2 rounds expected)
   - If approved: merges PR or marks ready-to-publish

---

#### Step 6: Publish

1. PR merged to `main` branch
2. CI/CD runs:
   - Frontmatter validation ✓
   - Link validation ✓
   - Spelling check ✓
   - Search index updated ✓
3. Platform cache refreshed (if applicable)
4. Article goes live immediately (or scheduled for specific time if desired)
5. Slack notification sent to #kb-updates channel
   - Article title, audience, section
   - Link to article

---

### Update Workflow

**Minor update** (typo fix, clarification, patch version):

1. Section Owner or author identifies issue
2. Creates PR with minimal changes
3. Section Owner approves (no SME review needed)
4. Merge to main, publish immediately

**Substantial update** (behavioral change, new section, audience change, minor/major version):

1. Author creates PR with full updates
2. Frontmatter updated: `updated` date, version number
3. Section Owner assigns SME review if audience-impacting
4. Follow full review process (steps 4-6 of new article)

**Change tracking:**

- Commit message clearly states what changed and why
- PR description links to relevant issue (e.g., GitHub issue, feature request, feedback comment)
- Review comments preserved in git history

---

### Deprecation Workflow

**Trigger:** Feature removed, API endpoint deprecated, or article superseded.

**Timeline:** Deprecation announced in release notes 1 release before KB article deprecated.

**Process:**

1. **Initiate deprecation proposal**
   - Section Owner or KB Owner identifies candidate for deprecation
   - Creates issue: "Deprecate {article-title}" with rationale
   - Links to replacement article (if applicable)

2. **Determine replacement**
   - Is there a new article that supersedes this one? → Add `deprecated_by: "{new-article-id}"`
   - Is this feature removed entirely? → No replacement needed

3. **Update article**
   - Create PR: `content/{article-id}-deprecate`
   - Update frontmatter: `status: "deprecated"`, add `deprecated_by` if applicable
   - Add deprecation banner to article body (top, before intro)
   - Update `updated` date and version (no version increment, note in commit message that article is deprecated)

4. **Update release notes**
   - Link to deprecation notice and replacement article
   - Explain when feature was removed/changed

5. **Publish**
   - PR approved by Section Owner + KB Owner
   - Merge to main
   - Deprecation message appears immediately on article

6. **Redirect and archive** (after 2 platform releases, ~8-12 weeks)
   - If using GitBook / Docusaurus: Configure old URL to redirect to new article
   - Move article to `_deprecated/` folder (if using filesystem-based platform)
   - Remove from primary search index (optional: keep in archive search)
   - Update `SITE-MAP.md` to note article as deprecated

7. **Audit trail**
   - Deprecated articles retained in git history indefinitely
   - `git log` shows all changes, deprecation date, replacement

---

### Emergency Update Process

**Trigger:** Critical security issue, customer-impacting bug, regulatory emergency.

**Definition:** Update that cannot wait for standard 5-day review cycle.

**Timeline:**
- Publishing: <4 hours (expedited)
- Retrospective review: Within 48 hours

**Process:**

1. **Author or KB Owner identifies emergency**
   - Examples: "Security advisory published," "Critical API bug fix," "Regulatory requirement clarification"

2. **Expedited draft**
   - Author creates draft with necessary updates
   - Must be factually accurate (not aspirational)
   - Should link to supporting docs (security bulletin, API fix commit, regulatory guidance)

3. **Immediate publication** (bypass review)
   - KB Owner approves directly (1 sign-off, no review)
   - Article published with note: "🚨 Emergency update — reviewed retrospectively"
   - Article tagged with label: `emergency-update-{date}`

4. **Retrospective review** (within 48 hours)
   - Section Owner + SME conducts full review
   - Provides feedback on accuracy, completeness, clarity
   - Author makes revisions if needed
   - Removes "emergency" label once approved

5. **Tracking and reporting**
   - KB Owner logs emergency updates in `docs/log/kb-governance.md`
   - Quarterly report includes count of emergency updates and resolution time
   - If >2 emergency updates in 30 days, investigate process issues

**Example:** Security vulnerability discovered in Policy Engine. KB article "Policy Engine" updated with mitigation steps within 2 hours. Reviewed by Compliance + Engineering within 24 hours, approved as accurate.

---

## Tooling & Infrastructure

### Platform Selection

**Recommended: GitBook Pro or Docusaurus** (for Phase 1 launch)

Both platforms support:
- ✅ Native Markdown with YAML frontmatter
- ✅ Git-native workflow (branch, PR, merge)
- ✅ Search analytics (Algolia integration or built-in)
- ✅ Section-based navigation and TOC
- ✅ Audience-based filtering (via custom JavaScript or plugins)
- ✅ Version/deprecation banners
- ✅ Feedback widgets
- ✅ Relative internal linking
- ✅ Multi-section management
- ✅ Portable data (can migrate away)

**Detailed comparison:**

| Capability | GitBook | Docusaurus | Confluence | Notion |
|---|---|---|---|---|
| Markdown + frontmatter | ✅ | ✅ | Via plugin | Via import |
| Git-native | ✅ Pro | ✅ | ✗ | ✗ |
| YAML metadata | ✅ | ✅ | ✗ | Database properties |
| Search analytics | ✅ Algolia | ✅ Algolia | ✅ Built-in | ✗ |
| Feedback widget | ✅ Pro | ✗ (custom) | ✅ | ✅ |
| Audience filtering | ⚠️ Custom | ✅ Custom | ✓ via properties | ✓ |
| Version banners | ✅ | ✅ | ✗ | ✗ |
| Export/migrate | ✅ | ✅ | ✓ | ✓ |
| Cost | $20/editor/month | $0 (self-hosted) | $200-500/month | $10/user/month |
| Learning curve | Low | Medium | Low | Low |

**Recommendation:** **GitBook Pro** for startup simplicity; **Docusaurus** for maximum control and zero cost. Avoid Confluence (proprietary, limited analytics, harder to version control).

---

### Git Workflow & CI/CD

**Repository structure:**

```
intellios/kb/
├── KB-ARCHITECTURE.md
├── KB-GOVERNANCE-PLAN.md (this file)
├── SITE-MAP.md
├── _meta/
│   ├── content-types.md
│   ├── style-guide.md
│   ├── metadata-schema.md
│   ├── naming-conventions.md
│   ├── external-links.md
│   └── templates/
│       ├── concept.md
│       ├── task.md
│       ├── reference.md
│       ├── troubleshooting.md
│       └── decision-guide.md
├── 01-platform-overview/
│   ├── _index.md
│   └── {articles}.md
├── [... 02-12 sections ...]
└── _deprecated/
    └── {deprecated articles}
```

**Branch strategy:**

- `main` — Production KB (what's live)
- `content/{article-id}-{change-type}` — Feature branches for new/update articles
  - `content/03-004-update-operators`
  - `content/05-010-new-policy-patterns`
  - `content/05-001-emergency-fix` (for hotfixes)

**PR workflow:**

```
1. Author creates branch: git checkout -b content/03-004-update
2. Commits changes with descriptive message
3. Pushes to remote: git push origin content/03-004-update
4. Creates PR in GitHub (or GitBook web interface)
5. Assigns Section Owner as reviewer
6. CI checks run automatically (see CI/CD pipeline)
7. Section Owner approves or requests changes
8. Author addresses feedback, pushes updates
9. Section Owner merges PR (squash or merge, per team preference)
10. CI triggers search index rebuild, cache refresh
```

---

### CI/CD Pipeline

**Automated checks on every PR (before merge):**

1. **Frontmatter validation**
   - Schema: every article has required fields (id, title, type, audiences, status, version, platform_version, created, updated, tldr, tags)
   - Version format: valid semver
   - Article ID: unique (not duplicated), format matches `{section}-{seq}`
   - Date format: ISO 8601
   - Enum validation: `type`, `audiences`, `status` are valid values
   - Tool: Custom Python script or GitHub Action (e.g., `schema-linter` action)

2. **Markdown validation**
   - No broken Markdown syntax
   - Headings are hierarchical (no h1→h3 jump)
   - Code blocks have language specified
   - Tool: `markdownlint` (npm package, GitHub Action)

3. **Link validation**
   - All internal links (relative paths) point to existing files
   - External links checked for validity (200 response)
   - No dead anchors (#section-links)
   - Tool: `markdown-link-check` (npm) or `lychee` (Rust)

4. **Search index validation**
   - TLDR field renders correctly in search results
   - Tags include minimum 3 values
   - No duplicate tags
   - Tool: Custom script

5. **Duplicate ID check**
   - Article IDs are globally unique
   - Tool: `grep` script or custom validator

**Example GitHub Action (`.github/workflows/kb-validation.yml`):**

```yaml
name: KB Validation

on:
  pull_request:
    paths:
      - 'kb/**'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install validators
        run: npm install -g markdownlint-cli markdown-link-check

      - name: Validate frontmatter
        run: python3 scripts/validate-frontmatter.py kb/

      - name: Validate Markdown
        run: markdownlint 'kb/**/*.md'

      - name: Check links
        run: markdown-link-check -r kb/ --config .mlc-config.json

      - name: Check for duplicate article IDs
        run: python3 scripts/check-duplicate-ids.py kb/
```

---

### Search & Analytics

#### Algolia Setup

**Configuration:**

1. Create Algolia index: `intellios-kb`
2. Index fields:
   - `id`: article ID (searchable, facetable)
   - `title`: article title (searchable, sortable)
   - `slug`: URL slug (facetable)
   - `type`: content type (facetable)
   - `audiences`: array of audience tags (facetable)
   - `status`: draft/published/deprecated (facetable, filter)
   - `section`: section number (facetable)
   - `tags`: search keywords (searchable)
   - `tldr`: 2-3 sentence summary (searchable)
   - `body`: first 1000 characters of article (searchable)
   - `platform_version`: platform release (facetable, for filtering by version)
   - `updated`: last update date (sortable)
   - `created`: creation date (sortable)

3. Search configuration:
   - **Searchable attributes (priority order):**
     1. `title` (weight 10)
     2. `tags` (weight 8)
     3. `tldr` (weight 6)
     4. `body` (weight 1)

   - **Facetable attributes:**
     - `audiences` (users can filter by "compliance", "engineering")
     - `type` (users can filter by "task" vs. "concept")
     - `section` (users can browse by section)

   - **Filter query:** Exclude deprecated articles by default; allow toggle to include

4. Analytics:
   - Track search queries and clicks per query
   - Track articles accessed (direct navigation)
   - Export metrics monthly to CSV for trending

---

#### Feedback Widget

**Placement:** Bottom of every article

**Components:**
```
Was this article helpful?  👍  👎
[Optional comment box]
```

**Logic:**
- Thumbs up/down tracked anonymously
- Optional comment captured with: date, article ID, user email (optional)
- Comments routed to Slack #kb-feedback channel
- Trigger alerts if 3+ thumbs-down in 30 days on one article

**Integration:** Use third-party widget (e.g., Hotjar, Qualtrics) or custom JS

---

### CI/CD Post-Merge

**When PR merged to main:**

1. **Search index rebuild**
   - Algolia re-indexes all changed articles
   - Takes ~2-5 minutes
   - Notification posted to Slack #kb when complete

2. **Cache refresh**
   - CDN cache invalidated (if using CloudFlare, etc.)
   - Search results clear
   - Analytics dashboard updated

3. **Status checks**
   - All external links validated (hourly, separate cron job)
   - Article freshness scores recalculated
   - Staleness alerts triggered if applicable

---

## Scaling Plan

### Phase 1: Launch (Months 1-3)

**Scope:** 37 P0 articles across 6 sections, 4 audiences

**Team:**
- KB Owner (1 FTE, 60%)
- Section Owners (4 people, ~4 hours/week each)
- SME reviewers (4 people, ~2 hours/week each, part-time)
- No dedicated technical writer (KB Owner drafts non-critical articles)

**Platform:** GitBook Pro or Docusaurus + Algolia

**Deliverables:**
- ✅ 37 P0 articles published
- ✅ KB-ARCHITECTURE.md, KB-GOVERNANCE-PLAN.md, SITE-MAP.md
- ✅ Style guide and templates
- ✅ Feedback widget and analytics baseline
- ✅ CI/CD pipeline for PR validation
- ✅ Git workflow documented
- ✅ Section Owner and SME rosters established

**Metrics baseline:**
- Freshness: 100% (just published)
- Search success: Establish baseline (target >70%)
- Feedback: Start collecting
- Coverage: 37/120 features (31%)

**Success criteria:**
- All P0 articles published and reviewed
- Zero critical errors (inaccuracies) in published articles
- Feedback ratio >0.75 (most readers found articles helpful)
- Search success baseline established

---

### Phase 2: Growth (Months 4-9)

**Scope:** 72 articles (add 35 P1/P2 articles), expand coverage

**Team additions:**
- Dedicated technical writer (1 FTE)
- Additional SME reviewer (1 more, for compliance)
- Section Owner assistant (0.5 FTE, handles minor updates and section maintenance)

**Initiatives:**
1. **Rapid content expansion**
   - Complete section 05 (Governance & Compliance) fully
   - Add section 06 (Use Cases & Playbooks) with scenario articles
   - Add section 07-09 (Admin, Security, ROI)

2. **Quality improvements**
   - Implement time-to-resolution metrics (Phase 1 was survey-based)
   - Conduct quarterly freshness audits (new process)
   - Establish cross-reference audit (prerequisite chains, link validation)

3. **Audience-specific refinement**
   - Create audience-segmented landing pages (e.g., "Getting Started for Executives")
   - Test search filters by audience
   - Survey SMEs: "Is content depth right for your audience?"

4. **Analytics & insights**
   - Monthly dashboard with freshness, search success, feedback trends
   - Identify top 5 most-viewed articles and bottom 5 needing improvement
   - Query analysis: Most common searches, lowest CTR search terms

5. **Localization prep**
   - Audit which articles are high-value candidates for translation (executive, compliance)
   - Design localization workflow (TMS consideration, translation review process)

**Metrics targets:**
- Freshness: >0.95 (articles regularly reviewed)
- Search success: >75%
- Feedback ratio: >0.80
- Coverage: 72/120 (60%)
- Time-to-resolution (task articles): <60 minutes median

**Success criteria:**
- 72 articles published, all current
- Search success >75% across top 20 queries
- Zero articles with <0.60 feedback ratio
- Audience-segmented nav launched
- Phase 3 roadmap finalized (scope, resource needs)

---

### Phase 3: Maturity (Months 10+)

**Scope:** 89+ articles, comprehensive coverage, localization, scale

**Team:**
- KB Owner (1 FTE, 40% — more strategic, less hands-on)
- Technical writer (1 FTE)
- Section Owner leads (4-5 people, 8 hours/week each)
- SME reviewers (6-8 people, rotating)
- Localization lead (0.5 FTE)

**Initiatives:**

1. **Comprehensive coverage**
   - Complete sections 10-12 (FAQ, glossary, release notes)
   - Add new articles as features ship (intake + publish as part of release process)
   - Coverage target: >90%

2. **Localization program**
   - Select 20-30 high-impact articles (executive, compliance, key tasks)
   - Translate to 2-3 languages (prioritize by customer base)
   - Establish translation review process (native speakers + domain experts)

3. **Community contributions**
   - Open KB for customer-submitted corrections, suggestions
   - Process: Submission → KB Owner triage → Section Owner review → publish/decline
   - Credit contributors in article frontmatter

4. **Advanced analytics**
   - Time-to-resolution tracking mature (sufficient sample size)
   - Cohort analysis: Do customers reading certain articles renew more often?
   - Content ROI analysis: "Which articles drive product adoption?"

5. **Knowledge reuse**
   - Export KB articles as training materials (for customer onboarding)
   - API to expose KB content programmatically (in-product help, chatbots)
   - Sync KB with internal engineering docs (shared definitions, deduplicate content)

**Metrics targets:**
- Freshness: >0.90 across all sections
- Search success: >80%
- Feedback ratio: >0.85
- Coverage: 89/120+ (74%+)
- Time-to-resolution: <45 minutes median
- Localization: Top 25 articles in 2 languages, current within 1 release

**Team structure by phase:**

| Role | Phase 1 | Phase 2 | Phase 3 |
|------|---------|---------|---------|
| KB Owner | 1 FTE (60%) | 1 FTE (50%) | 1 FTE (40%) |
| Technical Writer | — | 1 FTE | 1 FTE |
| Section Owners | 4 (4 hrs/wk) | 5 (6 hrs/wk) | 6 (6 hrs/wk) |
| SME Reviewers | 4 (2 hrs/wk) | 6 (2 hrs/wk) | 8 (2 hrs/wk, rotating) |
| Localization | — | — | 0.5 FTE |

---

## Escalation Paths

### Governance Escalation

**Issue:** Section Owner and author disagree on revision request

**Process:**
1. Section Owner and author discuss in PR comments (24 hours)
2. If unresolved, author can escalate to KB Owner (mention in PR)
3. KB Owner arbitrates within 2 business days
4. Decision is final; KB Owner explains rationale in comment

**Example:** "Author says policy syntax example is correct. Section Owner says it contradicts release notes. KB Owner reviews release notes and code, sides with Section Owner, cites evidence."

---

### Content Escalation

**Issue:** Negative feedback spike on article or factual error discovered post-publish

**Process:**
1. KB Owner or Section Owner identifies issue
2. Determines severity:
   - **Critical** (factual error affecting customer safety, security, compliance): Immediate hotfix
   - **High** (inaccuracy affecting common task or feature): Update within 1 business day
   - **Medium** (clarity issue, outdated example): Update within 5 business days
   - **Low** (typo, formatting): Update during next quarterly audit

3. Author or Section Owner drafts fix
4. Section Owner approves (may skip SME review if time-critical, but retrospective review required within 48 hours)
5. Publish and track in `docs/log/kb-governance.md`

**Example:** Customer reports: "Policy Expression Language article shows deprecated operator `contains_any`. Found issue, updated article within 4 hours, conducted retrospective review."

---

### Regulatory Escalation

**Issue:** New regulatory requirement or guidance affects KB content

**Process:**
1. Compliance team notifies KB Owner with guidance document
2. KB Owner and Compliance SME identify affected articles (within 24 hours)
3. Emergency update process triggered (expedited review)
4. Updates published within 24-48 hours
5. Tracked and reported in quarterly metrics

**Example:** "OCC issues new guidance on model inventory. Affects articles 05-001 (SR 11-7) and 05-005 (Model Inventory Management). Updated both within 36 hours."

---

### Audience Escalation

**Issue:** Feedback indicates article is not suitable for intended audience (e.g., too technical for executives)

**Process:**
1. SME for that audience notifies Section Owner
2. Section Owner, KB Owner, and SME meet to discuss (within 3 business days)
3. Options:
   - Split article into two articles (one per audience depth level)
   - Restructure article with progressive disclosure (L1/L2/L3 sections)
   - Re-tag audience and add prerequisite articles
   - Create new prerequisite article to fill knowledge gap

4. Decision documented in PR or issue
5. Revisions made and published within 2-4 weeks (depending on scope)

**Example:** "Engineering SME says 'Executive Quick Start' assumes too much. KB Owner approves creating 'Executive Primer' as prerequisite, moving some content there."

---

## Appendix: Templates & Checklists

### Checklist: New Article Review (Section Owner)

```
[ ] Frontmatter
  [ ] id unique and in correct format (NN-NNN)
  [ ] title max 80 characters
  [ ] type is valid enum (concept, task, reference, troubleshooting, decision-guide)
  [ ] audiences includes at least one valid value
  [ ] status = "draft" or "in-review"
  [ ] version = "1.0.0" for new articles
  [ ] platform_version matches current platform release
  [ ] created and updated dates in ISO 8601 format
  [ ] tldr is 2-3 sentences, compelling standalone
  [ ] tags include minimum 3 values (domain, feature, synonym)
  [ ] prerequisites reference valid article IDs
  [ ] related references bidirectional (other articles link back)

[ ] Content Structure
  [ ] Follows template structure for content type
  [ ] Section headings are hierarchical (no h1→h3 jumps)
  [ ] All required sections present (depends on type)
  [ ] TL;DR section rendered from frontmatter

[ ] Links & References
  [ ] All internal links use relative paths
  [ ] All internal links point to valid files
  [ ] External links spot-checked (sample 5)
  [ ] Prerequisite articles exist and are logical entry points
  [ ] Related articles include back-references

[ ] Language & Clarity
  [ ] Tone consistent with style guide
  [ ] No undefined jargon (or link to glossary terms)
  [ ] Examples are concrete and functional
  [ ] Audience knowledge level appropriate (not too basic, not too advanced)

[ ] Technical Accuracy (with SME confirmation)
  [ ] API endpoints and parameters match current code
  [ ] Configuration examples are functional
  [ ] Screenshots/diagrams are current (not outdated)
  [ ] No contradictions with other articles

[ ] SME Feedback
  [ ] All SME comments addressed or discussed
  [ ] SME approved in writing (GitHub "approved" or comment)
  [ ] Author responded to each comment

[ ] Final Check
  [ ] Frontmatter schema is valid (run validator)
  [ ] Markdown lint passes
  [ ] Links validated
  [ ] Article ID registered in SITE-MAP.md
  [ ] Ready to merge ✅
```

---

### Checklist: Quarterly Freshness Audit (KB Owner)

```
1. Generate freshness report
  [ ] Run script: articles with updated >90 days old
  [ ] Group by platform version
  [ ] Identify articles >2 releases behind
  [ ] Export to CSV

2. Review by Section Owner
  [ ] Distribute list to each Section Owner
  [ ] Section Owner has 1 week to review and categorize:
    - [ ] Current (still accurate, update timestamp)
    - [ ] Needs update (outline changes required)
    - [ ] Deprecate (feature removed)

3. Tracking & Planning
  [ ] Compile list of articles needing updates
  [ ] Assign priority (P0: next sprint, P1: next month, P2: next quarter)
  [ ] Section Owners commit to update schedule
  [ ] Add to KB backlog

4. Report
  [ ] Freshness score calculated
  [ ] Trend vs. previous quarter
  [ ] By-section breakdown (which sections most stale?)
  [ ] Recommendations for process improvements
  [ ] Present to stakeholders
```

---

### Checklist: Emergency Update (Author/KB Owner)

```
1. Initial Assessment
  [ ] Issue classified as emergency (security, critical bug, regulatory)
  [ ] Impacts published article
  [ ] Requires correction that cannot wait 5 days

2. Expedited Draft
  [ ] Identify inaccuracy or outdated content
  [ ] Research correct information (link to source: commit, ticket, advisory)
  [ ] Draft correction (1-2 paragraphs or specific section edit)
  [ ] Note: [EMERGENCY UPDATE - reviewed retrospectively]

3. KB Owner Approval
  [ ] KB Owner reviews for factual accuracy (vs. source docs)
  [ ] Approves publication
  [ ] Publishes within 2 hours

4. Retrospective Review (within 48 hours)
  [ ] Section Owner + SME conducts full review
  [ ] Provides detailed feedback (not just sign-off)
  [ ] Author makes revisions if needed
  [ ] Removes "emergency" label once approved

5. Documentation
  [ ] Update logged in `docs/log/kb-governance.md`
  [ ] Entry includes: date, article, issue, resolution, review completion date
  [ ] Tracked in quarterly report

6. Process Reflection
  [ ] If >2 emergencies in 30 days: investigate root cause
  [ ] KB Owner meets with Section Owner to discuss prevention
```

---

### Checklist: Annual Comprehensive Review (KB Owner)

```
1. Taxonomy Audit
  [ ] Review section structure vs. current product capabilities
  [ ] Identify gaps (new major features without articles)
  [ ] Check for obsolete sections or articles
  [ ] Recommend additions/changes to SITE-MAP.md

2. Coverage Audit
  [ ] List all platform features (get from product team)
  [ ] Cross-reference KB articles
  [ ] Calculate coverage_score = (covered / total) * 100%
  [ ] Document uncovered features and priority
  [ ] Recommend new articles

3. Cross-Reference Audit
  [ ] Sample 20% of articles randomly
  [ ] Check prerequisite DAG for cycles (should have none)
  [ ] Verify bidirectional links (A→B should have B→A in related)
  [ ] Check for broken links or references to non-existent articles
  [ ] Report findings to Section Owners, recommend fixes

4. Audience Alignment Audit
  [ ] Sample 5 articles per audience
  [ ] Interview SMEs: "Is depth/terminology right for this audience?"
  [ ] Identify articles with mismatched audience tags
  [ ] Recommend reorganization or new prerequisite articles

5. Metrics Review
  [ ] Analyze 12-month trends for all metrics
  [ ] Freshness score trend (improving or declining?)
  [ ] Search success rate vs. target
  [ ] Feedback ratio trends per section
  [ ] Time-to-resolution (if measured)
  [ ] Emergency updates count and trends

6. Strategy Document
  [ ] Summarize findings
  [ ] Recommend 12-month roadmap (new articles, phase planning)
  [ ] Resource needs (hiring, tooling, localization)
  [ ] Risk assessment (e.g., "Section 04 needs dedicated writer in Phase 2")
  [ ] Process improvements (workflow, tooling, team structure)

7. Presentation
  [ ] Present findings to product, engineering, compliance leaders
  [ ] Document decisions in follow-up memo
  [ ] Update KB-GOVERNANCE-PLAN.md if process changes
```

---

## Document History

| Version | Date | Changes | Owner |
|---------|------|---------|-------|
| 1.0.0 | 2026-04-05 | Initial publication (Deliverable #5) | Documentation Lead |

---

## Related Documents

- `KB-ARCHITECTURE.md` — Structural design, taxonomy, metadata schema
- `SITE-MAP.md` — Master article registry and planning tracker
- `_meta/style-guide.md` — Voice, tone, formatting standards
- `_meta/content-types.md` — Content type definitions and structure
- `docs/log/kb-governance.md` — Governance decisions audit trail (maintained separately)

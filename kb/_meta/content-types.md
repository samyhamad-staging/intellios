---
id: "META-001"
title: "Intellios Knowledge Base — Content Type Definitions"
slug: "content-type-definitions"
type: "reference"
audiences:
  - "compliance"
  - "engineering"
status: "published"
version: "1.0.0"
platform_version: "1.2.0"
created: "2026-04-05"
updated: "2026-04-05"
tags:
  - "content-types"
  - "templates"
  - "internal-reference"
tldr: >
  Canonical definition, selection criteria, and structural requirements for each KB content type
---

# Intellios Knowledge Base — Content Type Definitions

---

## Selection Flowchart

```
Start: What does the reader need?
│
├─ Understand what something IS → Concept
├─ DO something step-by-step → Task
├─ LOOK UP specific information → Reference
├─ FIX a problem → Troubleshooting
└─ CHOOSE between options → Decision Guide
```

---

## Type: Concept

**Purpose:** Explain what something is, why it exists, and how it relates to the broader system. Builds the reader's mental model.

**Required sections:** TL;DR, Overview, How It Works, Key Principles, Relationship to Other Concepts, Examples, Related Articles.

**Length guidance:** 800-1500 words.

**Examples:** Agent Blueprint Package, Governance-as-Code, Runtime Adapters, Compliance Evidence Chain.

---

## Type: Task (How-To)

**Purpose:** Guide the reader through completing a specific, outcome-oriented action.

**Required sections:** TL;DR, Goal, Prerequisites, Steps, Verification, Troubleshooting, Next Steps, Related Articles.

**Length guidance:** 500-1200 words (excluding code samples).

**Rules:**
- Every step must be imperative ("Click **Save**", "Run the following command").
- Every step must state the expected outcome ("The status changes to `in_review`").
- Prerequisites must be specific and verifiable ("You have an API key with `governance:write` scope").

**Examples:** Engineer Setup Guide, Policy Authoring Guide, AgentCore Integration, Deployment Guide.

---

## Type: Reference

**Purpose:** Provide structured, scannable lookup information. Optimized for "find the answer" not "read start to finish."

**Required sections:** TL;DR, Overview (1 paragraph max), Reference Content (tables, schemas, endpoints), Examples, Notes & Caveats, Related Articles.

**Length guidance:** Variable — completeness over brevity.

**Rules:**
- Prefer tables over prose.
- Include code samples for every endpoint, parameter, or configuration option.
- Note version-specific behavior explicitly.

**Examples:** API References, Policy Expression Language, SR 11-7 Mapping, Glossary.

---

## Type: Troubleshooting

**Purpose:** Help the reader diagnose and resolve a specific problem, starting from observable symptoms.

**Required sections:** TL;DR, Symptom, Possible Causes, Diagnosis Steps, Resolution, Prevention, Escalation, Related Articles.

**Length guidance:** 400-800 words per issue.

**Rules:**
- Title should describe the symptom, not the cause ("Blueprint validation fails with error E-GOV-003" not "Missing required field in ABP").
- Order causes by likelihood (most common first).
- Include both quick-fix and root-cause resolution paths.

**Examples:** Known Issues, common integration failures, validation errors.

---

## Type: Decision Guide

**Purpose:** Help the reader choose between valid options by providing structured comparison and a recommended default.

**Required sections:** TL;DR, Decision Context, Options, Comparison Matrix, Recommendation, Decision Tree, Related Articles.

**Length guidance:** 600-1000 words.

**Rules:**
- Present options neutrally before stating the recommendation.
- The comparison matrix must use consistent evaluation criteria across all options.
- The recommendation must include "when this changes" — conditions under which the reader should revisit the decision.

**Examples:** Runtime adapter selection, deployment topology, intake mode selection.

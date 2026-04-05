---
id: "{section}-{seq}"
title: "{Choosing / Selecting — decision-oriented title}"
slug: "{kebab-case-slug}"
type: "decision-guide"
audiences:
  - "{executive | compliance | engineering | product}"
status: "draft"
version: "1.0.0"
platform_version: "{x.y.z}"
created: "{YYYY-MM-DD}"
updated: "{YYYY-MM-DD}"
author: "{Author or Team}"
reviewers: []
tags:
  - "{keyword-1}"
  - "{keyword-2}"
  - "{keyword-3}"
prerequisites: []
related: []
next_steps: []
feedback_url: "[PLACEHOLDER]"
tldr: >
  {2-3 sentences. What decision does the reader face? What is the
  recommended default? When should they deviate?}
---

# {Title}

> **TL;DR:** {Rendered from frontmatter tldr field}

## Decision Context

{Why does this decision matter? What are the consequences of choosing poorly?
What constraints should the reader consider? Frame the decision in terms of
their goals, not implementation details.}

## Options

### Option A: {Name}

{Description of what this option entails.}

**Best for:** {Scenarios where this option excels.}

**Trade-offs:** {What you give up by choosing this option.}

### Option B: {Name}

{Description.}

**Best for:** {Scenarios.}

**Trade-offs:** {What you give up.}

### Option C: {Name}

{Description.}

**Best for:** {Scenarios.}

**Trade-offs:** {What you give up.}

## Comparison Matrix

| Criteria | Option A | Option B | Option C |
|---|---|---|---|
| {Criterion 1} | {Rating/value} | {Rating/value} | {Rating/value} |
| {Criterion 2} | {Rating/value} | {Rating/value} | {Rating/value} |
| {Criterion 3} | {Rating/value} | {Rating/value} | {Rating/value} |
| {Criterion 4} | {Rating/value} | {Rating/value} | {Rating/value} |

## Recommendation

**Default choice: {Option Name}**

{Rationale — why this is the right default for most Intellios deployments.
Reference specific enterprise patterns or regulatory requirements that support
this recommendation.}

**Revisit this decision when:** {Conditions that should trigger reconsideration.
Be specific — e.g., "when your agent fleet exceeds 500 active agents" or "when
you require FedRAMP High authorization."}

## Decision Tree

> **[DIAGRAM: Decision Tree — {description}]**
>
> *Dimensions: 800x600 | Format: SVG preferred, PNG fallback*
> *Source file: `_assets/{filename}.{ext}`*

{Text-based fallback for the decision tree:}

```
Start: {Initial question}
├─ {Answer A} → Option A
├─ {Answer B} → {Follow-up question}
│   ├─ {Answer X} → Option B
│   └─ {Answer Y} → Option C
└─ {Answer C} → Option B
```

---

*See also: {Auto-rendered from frontmatter `related` field}*

*Next: {Auto-rendered from frontmatter `next_steps` field}*

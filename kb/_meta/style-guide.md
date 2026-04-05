---
id: "META-002"
title: "Intellios Knowledge Base — Style Guide"
slug: "kb-style-guide"
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
  - "style-guide"
  - "voice-tone"
  - "writing-conventions"
  - "internal-reference"
tldr: >
  Style guide defining voice, tone, and writing conventions for the Intellios Knowledge Base
---

# Intellios Knowledge Base — Style Guide

---

## Voice & Tone

**Authoritative but accessible.** Intellios documentation reads like a trusted advisor — confident in its domain, respectful of the reader's intelligence, never condescending.

| Principle | Do | Don't |
|---|---|---|
| **Confident** | "Intellios validates every blueprint against your governance policies before it enters review." | "Intellios tries to validate blueprints and should usually catch policy violations." |
| **Clear** | "The Policy Engine evaluates rules deterministically — no LLM inference, no probabilistic outcomes." | "The Policy Engine uses a sophisticated approach to deterministic evaluation." |
| **Precise** | "SR 11-7 requires model inventory documentation. Intellios generates this automatically from ABP metadata." | "Intellios helps with compliance stuff." |
| **Actionable** | "Navigate to **Governance → Policies** and select **Create Policy**." | "You may want to create a policy at some point." |

### Audience-Specific Adjustments

- **Executive:** Lead with outcomes and business impact. Minimize technical depth. Use analogies to established enterprise concepts (ERP, SDLC, change management).
- **Compliance:** Lead with regulatory requirements. Map platform capabilities to specific framework sections. Use regulatory terminology precisely.
- **Engineering:** Lead with architecture and implementation. Include code samples, API payloads, and configuration examples. Assume familiarity with cloud-native patterns.
- **Product:** Lead with capabilities and use cases. Bridge technical concepts to business outcomes. Include competitive positioning context.

---

## Terminology Rules

1. Use terms exactly as defined in `11-glossary/terms.md`. Do not create synonyms.
2. On first use in any article, bold the term and provide a brief inline definition or link to the glossary.
3. Acronyms: spell out on first use, then use the acronym. Example: "Agent Blueprint Package (ABP)" → "ABP" thereafter.
4. Never use "model" to mean "AI agent" — in the Intellios context, "model" refers to the underlying LLM, and "agent" refers to the governed entity.

---

## Formatting Standards

### Headings

- **H1 (`#`):** Article title only (one per article, matches frontmatter `title`)
- **H2 (`##`):** Major sections within the article
- **H3 (`###`):** Subsections
- **H4 (`####`):** Avoid if possible; restructure content instead

### Code & Configuration

Use fenced code blocks with language identifiers:

````markdown
```json
{
  "field": "capabilities.tools",
  "operator": "count_gte",
  "value": 1,
  "severity": "error",
  "message": "Agent must declare at least one tool"
}
```
````

### Callouts

Use blockquote-based callouts for emphasis:

```markdown
> **Note:** Additional context that is helpful but not essential.

> **Warning:** Information about potential negative consequences.

> **Important:** Critical information that affects correctness or security.

> **Tip:** Practical advice that improves the reader's experience.
```

### Tables

Use Markdown tables for structured comparisons. Keep tables under 6 columns. For wider data, use a reference article format with description lists.

### Links

- Internal: relative paths — `[Agent Lifecycle States](../03-core-concepts/agent-lifecycle-states.md)`
- External: full URLs — `[SR 11-7](https://www.federalreserve.gov/supervisionreg/srletters/sr1107.htm)`
- Always use descriptive link text; never use "click here" or bare URLs

---

## Writing Standards

### Sentence Structure

- Prefer active voice: "The Governance Validator checks policies" over "Policies are checked by the Governance Validator."
- Keep sentences under 30 words when possible.
- One idea per sentence.

### Paragraphs

- Maximum 4-5 sentences per paragraph.
- Lead each paragraph with its key point.

### Lists

- Use numbered lists for sequential steps.
- Use bulleted lists for non-ordered items.
- Each list item should be a complete thought (not a sentence fragment).

### Jargon Policy

Every domain-specific term must either be defined inline on first use or linked to the glossary. This applies to regulatory terms (SR 11-7, MRM, OCC), cloud terms (ECS Fargate, Bedrock, RDS), and Intellios-specific terms (ABP, governance-as-code, runtime adapter).

---

## Placeholder Convention

Where specific implementation details are not yet finalized, use:

```markdown
[PLACEHOLDER: Brief description of what goes here]
```

Placeholders are indexed and reviewed quarterly. No article with a P0 priority should ship with more than two placeholders.

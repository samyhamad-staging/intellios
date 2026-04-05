---
id: "{section}-{seq}"
title: "{Title — max 80 characters}"
slug: "{kebab-case-slug}"
type: "reference"
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
  {2-3 sentence summary. What information does this reference contain?
  Who needs it and when?}
---

# {Title}

> **TL;DR:** {Rendered from frontmatter tldr field}

## Overview

{1 paragraph max. What is this reference for? When should the reader consult it?
Do not repeat information that belongs in a concept article — link to it instead.}

## {Reference Section Title}

{Tables, parameter lists, endpoint specifications, schema definitions, or other
structured lookup content. Organize for scanning, not sequential reading.}

| {Column 1} | {Column 2} | {Column 3} | {Column 4} |
|---|---|---|---|
| {Data} | {Data} | {Data} | {Data} |

{Repeat table or subsection structure as needed for complete coverage.}

## Examples

{Code snippets, request/response pairs, configuration samples, or annotated
screenshots that show the reference content in use.}

### Example: {Scenario Title}

```{language}
{Code sample with inline comments explaining key elements}
```

**Result:**

```{language}
{Expected output or response}
```

## Notes & Caveats

{Edge cases, version-specific behavior, common misunderstandings, or limitations
that don't fit in the main reference tables. Use callout format for critical items.}

> **Warning:** {Critical caveat that could cause errors if overlooked.}

---

*See also: {Auto-rendered from frontmatter `related` field}*

*Next: {Auto-rendered from frontmatter `next_steps` field}*

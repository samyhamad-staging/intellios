---
id: "{section}-{seq}"
title: "{Title — max 80 characters, starts with verb}"
slug: "{kebab-case-slug}"
type: "task"
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
  {2-3 sentence summary. What will the reader accomplish? What is the
  expected outcome? Include the approximate time to complete if relevant.}
---

# {Title}

> **TL;DR:** {Rendered from frontmatter tldr field}

## Goal

{One sentence stating what the reader will accomplish by completing this task.
Example: "By the end of this guide, you will have a fully configured runtime
adapter connecting Intellios to your AWS AgentCore environment."}

## Prerequisites

Before starting, ensure you have:

- [ ] {Specific, verifiable prerequisite — e.g., "An Intellios account with `admin` role"}
- [ ] {Prerequisite — e.g., "AWS account with AgentCore enabled in us-east-1"}
- [ ] {Prerequisite — e.g., "Familiarity with [Agent Blueprint Package](../../03-core-concepts/agent-blueprint-package.md)"}

## Steps

### Step 1: {Action Title}

{Brief context for why this step is necessary (1 sentence max).}

{Imperative instruction. Be specific about what to click, type, or run.}

```{language}
{Code sample, CLI command, or configuration snippet if applicable}
```

**Expected result:** {What the reader should see or be able to verify after this step.}

### Step 2: {Action Title}

{Context.}

{Instruction.}

**Expected result:** {Verification.}

### Step 3: {Action Title}

{Context.}

{Instruction.}

**Expected result:** {Verification.}

{Add as many steps as needed. If more than 10 steps, consider splitting into
multiple task articles linked as a sequence.}

## Verification

{How to confirm the entire task succeeded end-to-end. Include a specific test
the reader can perform.}

```{language}
{Verification command, API call, or test procedure}
```

**Success criteria:** {What "done" looks like in concrete, observable terms.}

## Troubleshooting

If you encounter issues during this task:

| Symptom | Likely Cause | Resolution |
|---|---|---|
| {What the reader sees} | {Why it happens} | {How to fix it} |
| {Symptom} | {Cause} | {Resolution} |

For additional help, see [{Troubleshooting Article Title}]({link}) or contact
[support escalation path].

## Next Steps

Now that you have completed this task:

- {Suggested next action — linked to the relevant article}
- {Alternative next action — linked}

---

*See also: {Auto-rendered from frontmatter `related` field}*

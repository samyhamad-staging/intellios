---
id: "{section}-{seq}"
title: "{Symptom-based title — what the reader observes}"
slug: "{kebab-case-slug}"
type: "troubleshooting"
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
  - "troubleshooting"
prerequisites: []
related: []
next_steps: []
feedback_url: "https://feedback.intellios.ai/kb"
tldr: >
  {2-3 sentences. Describe the symptom, the most common cause, and the
  typical resolution path.}
---

# {Symptom-Based Title}

> **TL;DR:** {Rendered from frontmatter tldr field}

## Symptom

{Describe exactly what the reader is experiencing. Include error messages,
unexpected behaviors, or observable states. Quote error codes verbatim.}

```
{Error message or log output the reader sees, if applicable}
```

## Possible Causes

{Ordered by likelihood — most common first.}

1. **{Cause Name}** — {Brief explanation of why this produces the symptom.}
2. **{Cause Name}** — {Explanation.}
3. **{Cause Name}** — {Explanation.}

## Diagnosis

{Step-by-step process to determine which cause applies.}

### Check 1: {What to verify}

```{language}
{Diagnostic command, query, or inspection step}
```

**If you see {X}:** The cause is #{n}. Proceed to Resolution → {Cause Name}.

**If you see {Y}:** Continue to Check 2.

### Check 2: {What to verify}

```{language}
{Diagnostic step}
```

**If you see {X}:** The cause is #{n}. Proceed to Resolution → {Cause Name}.

## Resolution

### For {Cause 1 Name}

{Step-by-step fix. Use imperative instructions.}

```{language}
{Fix command or configuration change}
```

**Verification:** {How to confirm the fix worked.}

### For {Cause 2 Name}

{Step-by-step fix.}

### For {Cause 3 Name}

{Step-by-step fix.}

## Prevention

{How to avoid this problem in the future. Reference configuration best practices,
monitoring alerts, or process changes.}

## Escalation

If the steps above do not resolve the issue:

1. Collect: {specific diagnostic artifacts to gather}
2. Contact: {escalation path — support tier, Slack channel, or ticket system}
3. Reference: {this article's ID} in your escalation for faster triage

---

*See also: {Auto-rendered from frontmatter `related` field}*

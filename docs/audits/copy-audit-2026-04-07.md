# Copy & Microcopy Consistency Audit

**Date:** 2026-04-07
**Scope:** All user-facing text in `src/` — button labels, error messages, empty states, headings, tooltips, sidebar labels, status labels
**Overall Score:** 8.5/10 (Excellent baseline; 4 issues found, mostly low/medium severity)

---

## Methodology

Systematically read all page.tsx files, key components, the sidebar, status theme, and glossary. Compared all user-facing strings against four criteria: consistent capitalization, consistent terminology (per `docs/glossary.md`), actionable guidance, and professional tone.

---

## Issue 1: Mixed Ellipsis Characters in Loading States

**Severity:** Medium
**Pattern:** Loading button text mixes ASCII ellipsis (`...`, three periods) with Unicode em dash (`…`, single character).

| File | Current | Expected |
|------|---------|----------|
| `src/app/admin/api-keys/page.tsx:169` | `"Creating..."` (3 periods) | `"Creating…"` (em dash) |
| `src/app/admin/integrations/page.tsx` | `"Saving..."` (3 periods) | `"Saving…"` (em dash) |
| `src/app/admin/webhooks/page.tsx` | `"Saving..."` (3 periods) | `"Saving…"` (em dash) |
| `src/app/admin/settings/page.tsx` | `"Saving…"` (em dash) | Already correct |
| `src/app/admin/users/page.tsx` | `"Creating…"` (em dash) | Already correct |

**Recommended standard:** Em dash `…` (U+2026) everywhere. It's what the majority of the codebase already uses, renders as a single character, and matches the login page's `"Signing in…"`.

**Fix:** Find-and-replace `..."` with `…"` in the 3 affected files.

---

## Issue 2: Duplicated Status Label Constants

**Severity:** Low
**Pattern:** Status labels like `"Draft"`, `"In Review"`, `"Approved"` etc. are defined in `src/lib/status-theme.ts` as the canonical `STATUS_LABELS` export, but several pages redefine them locally.

| File | Duplication |
|------|-------------|
| `src/app/blueprints/page.tsx` (line ~45) | Local `FILTER_LABELS` object with same values as `STATUS_LABELS` |
| `src/app/page.tsx` (line ~77) | Local `STATUS_CONFIG` object with label values |
| `src/app/deploy/page.tsx` | Inline status label strings |

**Recommended fix:** Import `STATUS_LABELS` from `@/lib/status-theme` instead of redefining. This ensures a terminology change propagates everywhere.

---

## Issue 3: Error Messages Lack Actionable Guidance

**Severity:** Medium
**Pattern:** Some error messages state the failure but don't tell the user what to do next.

| File | Current | Suggested |
|------|---------|-----------|
| `src/components/governance/validation-report.tsx:51` | `"Validation failed"` | `"Validation failed — review the violations below and update the blueprint"` |
| `src/components/governance/policy-form.tsx` | `"Network error"` | `"Network error — check your connection and try again"` |
| `src/components/blueprint/inline-field-editor.tsx:109` | `"Save failed"` | `"Save failed — the change was not applied. Try again."` |

**Recommended standard:** Error messages should follow the pattern: `[What happened] — [what the user can do]`. This matches the deploy page's `enrichAgentCoreError()` function which already exemplifies this pattern well.

---

## Issue 4: Minor Navigation Label Pattern Inconsistency

**Severity:** Low
**Pattern:** Sidebar navigation mixes verb-noun labels (`"Create Agent"`) with plain noun labels (`"Blueprints"`, `"Registry"`) in the same section.

**Current Build section:** `"Overview"`, `"Create Agent"`, `"Blueprints"`, `"Agent Pipeline"`, `"Registry"`, `"Templates"`

**Assessment:** This is actually intentional — `"Create Agent"` is an action entry point, while the others are destinations. The verb signals that clicking it starts a workflow. No change recommended, but worth noting for future sidebar additions: action items use verb-noun, destinations use nouns only.

---

## What's Already Consistent (No Action Needed)

**Button capitalization:** All CTAs use Title Case consistently ("Submit for Review", "Create Key", "Deploy to Production"). This is correct for primary actions.

**Confirmation dialogs:** All use question form ("Deprecate this blueprint?") with consequence-explaining descriptions and action-matching confirm buttons.

**Empty states:** All follow the pattern: icon + heading ("No blueprints yet") + helpful subtext + CTA. The `EmptyState` component enforces this.

**Status labels and risk tiers:** Centralized in `lib/status-theme.ts` and used via `StatusBadge` component. Labels are grammatically correct ("In Review" not "in_review").

**Tooltip text:** Short, imperative, no periods. Consistent across all uses.

**Search placeholders:** All use `"Search [noun]…"` with em dash.

**Glossary compliance:** All canonical terms from `docs/glossary.md` are used correctly in the UI. "Agent" (not "agent blueprint") in user-facing text, "Agent Blueprint Package" only in technical/spec contexts.

---

## Recommendations Summary

1. **Immediate** (5 min): Standardize ellipsis characters in 3 admin page loading states.
2. **Short-term** (30 min): Import `STATUS_LABELS` from theme module in pages that duplicate them.
3. **Short-term** (20 min): Add actionable guidance to 3-5 terse error messages.
4. **Ongoing:** For future sidebar additions, follow verb-noun for actions, noun for destinations.

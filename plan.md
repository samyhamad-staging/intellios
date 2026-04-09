# Intellios UX Optimization — 12-Hour Autonomous Work Plan

**Date:** 2026-04-07
**Operator:** Claude Opus 4.6 (autonomous, Samy away)
**Codebase state:** 132 sessions, 454 source files, 3 waves of UX audit complete, security hardening complete

---

## Context

Intellios is a white-label enterprise agent factory built on Next.js 16 + AI SDK v5 + Drizzle ORM + Tailwind CSS + Catalyst UI Kit. It targets Fortune 500 enterprises in regulated industries for AI agent design, governance, and lifecycle management. The app has 49 page routes, ~100 components, and has completed 3 waves of UX polish (36/36 items) plus security remediation.

**Known UX gaps identified during audit:**
- 40 of 49 pages lack `loading.tsx` (streaming skeleton states)
- 41 of 49 pages lack `error.tsx` (error recovery boundaries)
- 12+ list/admin pages have no empty-state messaging
- Login/Register forms lack inline validation feedback
- Copy and microcopy inconsistencies across the app
- Remaining WCAG 2.2 AA compliance gaps

**Strategy:** Favor staged diffs (loading states, error boundaries, empty states) and audit documents (copy, accessibility) over live refactors. All changes are additive — new files, not modifications to existing complex pages.

---

## Task 1: Loading States for Critical Dynamic Routes

- **ID:** T1
- **Goal:** Add streaming skeleton loading states to the 12 highest-traffic pages that currently have no `loading.tsx`.
- **Inputs:** Existing patterns from `src/app/dashboard/loading.tsx`, `src/app/compliance/loading.tsx`, `src/app/registry/loading.tsx`; page layouts from target pages.
- **Steps:**
  1. Read each target page to understand its layout structure.
  2. Create a `loading.tsx` file for each that mirrors the page's visual structure with skeleton placeholders.
  3. Use existing design tokens (`bg-surface-muted`, `animate-pulse`, `border-border`, `shadow-[var(--shadow-card)]`).
  4. Verify each file exports a default function.
- **Deliverable:** 12 new `loading.tsx` files across critical routes.
- **Success criteria:** Each loading.tsx mirrors the layout structure of its page, uses design tokens consistently, and exports a valid React component.
- **Est. duration:** 90 minutes
- **Depends on:** none
- **Touches:** New files only — `src/app/review/loading.tsx`, `src/app/deploy/loading.tsx`, `src/app/registry/[agentId]/loading.tsx`, `src/app/blueprints/[id]/loading.tsx`, `src/app/intake/[sessionId]/loading.tsx`, `src/app/templates/loading.tsx`, `src/app/admin/users/loading.tsx`, `src/app/admin/settings/loading.tsx`, `src/app/admin/api-keys/loading.tsx`, `src/app/admin/webhooks/loading.tsx`, `src/app/admin/integrations/loading.tsx`, `src/app/governor/page-level/loading.tsx` (if governor lacks one)
- **Default-decision notes:** Match skeleton structure to the most common/default view of each page. Prefer slightly simpler skeletons over exact pixel matches.

## Task 2: Error Boundaries for Critical Routes

- **ID:** T2
- **Goal:** Add error boundary components to the 10 most important page groups that lack `error.tsx`.
- **Inputs:** Existing pattern from `src/app/error.tsx` and `src/app/admin/error.tsx`.
- **Steps:**
  1. Read existing error.tsx files to extract the consistent pattern.
  2. Create error.tsx files for: review, deploy, templates, monitor/intelligence, auth/*, contribute, governor sub-pages.
  3. Each error boundary includes: error logging, "Try again" button, contextual "Return to [parent]" link.
  4. Adapt the error message context to each domain (e.g., "review queue" vs "deployment console").
- **Deliverable:** 10 new `error.tsx` files.
- **Success criteria:** Each file follows the established pattern, is a valid client component, includes error.digest display, and has contextual return links.
- **Est. duration:** 60 minutes
- **Depends on:** none
- **Touches:** New files only — `src/app/review/error.tsx`, `src/app/deploy/error.tsx`, `src/app/templates/error.tsx`, `src/app/monitor/error.tsx`, `src/app/auth/error.tsx`, `src/app/contribute/error.tsx`, `src/app/audit/error.tsx`, `src/app/dashboard/error.tsx`, `src/app/compliance/error.tsx`, `src/app/welcome/error.tsx`
- **Default-decision notes:** Use the root error.tsx as the template. Contextual links point to the most relevant parent page for each route.

## Task 3: Empty States for List/Admin Pages

- **ID:** T3
- **Goal:** Audit and add proper empty-state messaging to 8 pages that display lists or tables but have no "nothing here" fallback.
- **Inputs:** Existing `EmptyState` component at `src/components/ui/empty-state.tsx`; target page files.
- **Steps:**
  1. Read the existing EmptyState component API.
  2. Read each target page to find the list/table rendering section.
  3. Add conditional empty-state rendering with contextual messaging and a CTA.
  4. Use existing EmptyState component or create inline empty states matching the design system.
- **Deliverable:** 8 modified page files with empty-state fallbacks.
- **Success criteria:** Every list/table page shows a helpful message + CTA when data is empty. No visual regression to non-empty states.
- **Est. duration:** 75 minutes
- **Depends on:** none
- **Touches:** `src/app/admin/users/page.tsx`, `src/app/admin/api-keys/page.tsx`, `src/app/admin/integrations/page.tsx`, `src/app/admin/webhooks/page.tsx`, `src/app/deploy/page.tsx`, `src/app/audit/page.tsx`, `src/app/templates/page.tsx`, `src/app/monitor/intelligence/page.tsx`
- **Default-decision notes:** Empty-state copy follows the pattern: "[Icon] No [items] yet — [brief explanation]. [CTA to create first item]". Use the existing EmptyState component if available; fall back to the inline dashed-border pattern used in the review page.

## Task 4: Form Validation UX Improvements

- **ID:** T4
- **Goal:** Improve inline validation feedback on the login, registration, and forgot-password forms.
- **Inputs:** `src/app/login/page.tsx`, `src/components/auth/register-form.tsx`, `src/app/auth/forgot-password/page.tsx`.
- **Steps:**
  1. Read each form component.
  2. Add inline field-level validation messages (email format, password length, password match).
  3. Add password strength indicator to registration form.
  4. Add "required field" visual indicators.
  5. Ensure error messages appear near the field, not just at form level.
- **Deliverable:** 3 modified files with improved validation UX.
- **Success criteria:** Each form shows inline validation errors on blur, password fields show requirements, and submit-level errors persist near relevant fields.
- **Est. duration:** 75 minutes
- **Depends on:** none
- **Touches:** `src/app/login/page.tsx`, `src/components/auth/register-form.tsx`, `src/app/auth/forgot-password/page.tsx`
- **Default-decision notes:** Use Tailwind for validation styling. Don't add new dependencies. Field-level errors appear below the field in red-500 text-xs. Strength indicator uses a simple 4-bar visual.

## Task 5: Copy & Microcopy Consistency Audit

- **ID:** T5
- **Goal:** Produce a comprehensive audit document reviewing all user-facing copy for consistency, clarity, and tone.
- **Inputs:** All page.tsx files, button labels, error messages, empty states, tooltips, sidebar labels.
- **Steps:**
  1. Systematically read all major page components.
  2. Extract all user-facing strings: headings, descriptions, button labels, error messages, empty states, tooltips.
  3. Check for: inconsistent capitalization, inconsistent terminology (per glossary), unclear CTAs, missing help text, jargon without explanation.
  4. Write findings into a structured audit document with severity, location, current copy, and suggested fix.
- **Deliverable:** `/docs/audits/copy-audit-2026-04-07.md`
- **Success criteria:** Document covers all major user-facing surfaces, categorizes issues by severity, and provides actionable replacement text.
- **Est. duration:** 90 minutes
- **Depends on:** none
- **Touches:** New file only — `docs/audits/copy-audit-2026-04-07.md` (read-only on all source files)
- **Default-decision notes:** Use American English. Prefer active voice. Capitalize only the first word in button labels (sentence case). "Agent" not "agent blueprint" in UI — "Agent Blueprint Package" only in technical docs.

## Task 6: WCAG 2.2 AA Accessibility Audit Report

- **ID:** T6
- **Goal:** Produce a structured accessibility audit document covering WCAG 2.2 AA compliance gaps remaining after Session 124's a11y hardening.
- **Inputs:** All page and component files; WCAG 2.2 AA criteria checklist; Session 124 journal entry (what was already fixed).
- **Steps:**
  1. Review Session 124's changes to understand what was addressed.
  2. Systematically check critical pages for: color contrast, keyboard navigation, ARIA attributes, focus management, form labels, touch targets, motion/animation preferences.
  3. Check new components added after Session 124 for a11y compliance.
  4. Write findings into a structured audit document with WCAG criterion reference, severity, location, and remediation suggestion.
- **Deliverable:** `/docs/audits/a11y-audit-2026-04-07.md`
- **Success criteria:** Document covers all WCAG 2.2 AA criteria, identifies specific component-level gaps, and provides actionable remediation steps.
- **Est. duration:** 90 minutes
- **Depends on:** none
- **Touches:** New file only — `docs/audits/a11y-audit-2026-04-07.md` (read-only on all source files)
- **Default-decision notes:** Focus on programmatic issues (missing ARIA, keyboard traps, missing alt text) over subjective design judgments. Flag color contrast issues but don't recalculate ratios without a tool.

---

## Execution Order

T1 → T2 → T3 → T4 → T5 → T6

All tasks are independent (no data dependencies), but ordered by impact: loading states and error boundaries are the highest-leverage improvements for user experience, followed by empty states and form validation (direct UX fixes), then audits (documentation for future work).

## Budget

6 tasks × ~80 min avg = ~8 hours active work + 2 hours buffer for checkpoints, decision logging, and final report = 10 hours within the 12-hour window.

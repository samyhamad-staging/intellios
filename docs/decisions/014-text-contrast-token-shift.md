# ADR-014: Text contrast token scale shift for WCAG AA compliance

**Status:** accepted
**Date:** 2026-04-08
**Supersedes:** (none)

## Context

The accessibility audit (2026-04-07, findings A-01 and A-03) identified that `--color-text-tertiary` (#94a3b8, slate-400) achieves only ~2.56:1 contrast against white backgrounds. WCAG 2.1 AA requires 4.5:1 for normal text. The token appears 723 times across 103 files, used for helper text, timestamps, metadata labels, and placeholder text — all at small sizes (text-xs, text-sm, text-base).

Simply darkening tertiary to pass 4.5:1 would make it nearly indistinguishable from secondary (#64748b, slate-500, 4.76:1), collapsing the visual hierarchy.

## Decision

Shift the entire text color scale down one Tailwind step in both light and dark modes:

**Light mode:**

| Token | Before | After |
|---|---|---|
| `--color-text` | #0f172a (slate-950) | #0f172a (unchanged) |
| `--color-text-secondary` | #64748b (slate-500, 4.76:1) | **#475569 (slate-600, 7.58:1)** |
| `--color-text-tertiary` | #94a3b8 (slate-400, 2.56:1) | **#64748b (slate-500, 4.76:1)** |
| `--color-text-disabled` | #cbd5e1 (slate-300) | #cbd5e1 (unchanged) |

**Dark mode:**

| Token | Before | After |
|---|---|---|
| `--color-text` | #f8fafc (slate-50) | #f8fafc (unchanged) |
| `--color-text-secondary` | #94a3b8 (slate-400, 6.96:1) | **#cbd5e1 (slate-300, 12.02:1)** |
| `--color-text-tertiary` | #64748b (slate-500, 3.75:1) | **#94a3b8 (slate-400, 6.96:1)** |
| `--color-text-disabled` | #475569 (slate-600) | #475569 (unchanged) |

Both secondary and tertiary now pass WCAG AA (4.5:1) in both modes, with 1.59:1 visual gap between them (light) and 1.73:1 (dark) — enough for clear hierarchy.

The shadcn/ui `--muted-foreground` compat alias and `chart-tokens.ts` hardcoded values were updated to match.

## Consequences

- **WCAG AA compliance:** All text using `text-text-secondary` or `text-text-tertiary` now passes 4.5:1 in both light and dark modes. A-01 and A-03 are resolved.
- **Zero class-name changes:** No component files need modification. All 723 occurrences of `text-text-tertiary` and 657 of `text-text-secondary` inherit the new values automatically via CSS custom properties.
- **Visual impact:** All secondary and tertiary text across the application is now slightly darker (light mode) or lighter (dark mode). This is a net accessibility improvement. Users may perceive slightly higher-contrast UI.
- **Disabled text is unchanged:** The disabled token (#cbd5e1 light / #475569 dark) remains low-contrast by design. WCAG does not require contrast for disabled elements.
- **Chart consistency:** `chart-tokens.ts` hardcoded values updated to match new CSS values.

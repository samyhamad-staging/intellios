# Intellios UI/UX Design Audit Report

**Date:** April 3, 2026
**Auditor:** Senior UI/UX Design Auditor
**Subject:** Comprehensive Visual and Interaction Design Audit
**Benchmark:** Microsoft Azure Portal / AWS Console / Datadog
**Standard:** WCAG 2.1 AA Compliance

---

## Executive Summary

**Overall Design Maturity Score: 6.2 / 10**

Intellios has a strong architectural foundation for an enterprise-grade design system. The token layer in `globals.css` is well-structured with semantic color aliases, a coherent indigo-based brand palette, and proper elevation/shadow tokens. The Catalyst component library provides a solid primitive layer. However, the application suffers from significant inconsistencies between this foundation and its actual implementation across pages — several major screens bypass the token system entirely, using hardcoded Tailwind utility colors that create visual fragmentation. This gap between "design system defined" and "design system adopted" is the single most important issue to resolve.

### Top 5 Critical Issues

1. **Token adoption failure across ~40% of pages.** The analytics dashboard (`/dashboard`), monitoring (`/monitor`), compliance (`/compliance`), and admin pages use hardcoded `gray-*`, `bg-white`, and `border-gray-200` classes instead of the defined `text-text`, `bg-surface`, and `border-border` tokens. This creates two visually distinct "versions" of the product within a single session.

2. **No dark mode support in application pages.** The Catalyst primitives are dark-mode-ready (with `dark:` variants throughout), but the application pages and custom components use light-only hardcoded values. The sidebar is dark-themed, but the content area has no dark mode path. For a platform targeting 24/7 operations teams, this is a significant gap.

3. **Status color mapping fragmentation.** At least four separate systems define status/risk/severity colors: inline style objects in `review-panel.tsx`, a `RISK_STYLE` map in `review/page.tsx`, `TIER_TEXT_COLOR` in `fleet-governance-dashboard.tsx`, and yet another mapping in `blueprint-view.tsx`. Each uses slightly different shade pairings (e.g., `red-700` vs `red-800` for the same semantic "danger" state). This creates subtle visual inconsistency in the most safety-critical UI elements.

4. **Heading hierarchy is semantically flat.** The Catalyst `Heading` component renders all heading levels with the same visual treatment (`text-2xl/8 font-semibold`). Page-level H1s across the app are uniformly `text-xl font-semibold` with no visual distinction between H1, H2, and H3. For information-dense governance screens, this lack of hierarchy harms scannability.

5. **Missing interactive states and loading patterns.** Several pages lack observable loading skeletons, empty states, or error boundaries. The `Skeleton` component exists but is underutilized. Quality-critical screens like the compliance dashboard construct ad-hoc loading states with `animate-pulse` divs rather than reusing the shared skeleton primitive.

### Strongest Aspects of Current Design

- **Well-structured token layer.** The `globals.css` `@theme` block defines a comprehensive token vocabulary: brand colors, semantic status colors, risk tiers, policy types, surfaces, borders, text levels, radii, shadows, and gradients. This is a strong foundation that many enterprise products at this stage lack.
- **Dark sidebar with clear nav hierarchy.** The sidebar navigation is well-organized with role-based section filtering, clear active-state indicators (left border accent + indigo glow), and appropriate grouping of governance, operations, and admin functions.
- **Catalyst primitive quality.** The Headless UI-based Catalyst components (Button, Input, Select, Dialog, Table) have proper accessibility attributes (`aria-current`, `data-slot` patterns, keyboard handling), consistent sizing between Input/Select/Textarea, and a clean API surface.
- **Chart tokenization.** The `chart-tokens.ts` file centralizes chart colors, font sizes, and grid styling — ensuring visual consistency across all Recharts visualizations.
- **Command palette (Cmd+K).** A globally-accessible command palette is a strong power-user pattern aligned with Azure/AWS/Datadog precedent.

### Strategic Recommendation Summary

The highest-ROI investment is **enforcing token adoption** across all existing pages before adding new features. A single engineer could execute a systematic find-and-replace migration (hardcoded `gray-*` to token classes) across the ~12 affected page files in 1-2 days. The second priority is **consolidating status color mappings** into a single, shared utility (a `statusColors.ts` or similar) that all components reference. These two changes alone would move the maturity score from 6.2 to approximately 7.5.

---

## Detailed Findings by Dimension

### Dimension 1: Color System & Palette

**Score: 7 / 10**

**Current State:**

The color system is architecturally sound. The `globals.css` `@theme` layer defines a comprehensive, semantically-named token vocabulary spanning brand, status, risk, policy, surface, border, and text color categories. The brand palette is indigo-centric (`#4f46e5` primary) with cool blue-tinted neutrals — an appropriate choice that reads as "AI-native" without being consumer-flashy. Status colors follow the standard emerald/amber/orange/red/sky mapping for success/warning/caution/danger/info.

The sidebar uses a dark slate theme (`#0c1222`) with indigo accent highlights, providing strong contrast against the light content area (`#f8f9fc`). Surface layering uses three tiers: `#ffffff` (surface), `#f8f9fc` (raised), and `#f0f2f8` (muted) — providing subtle but intentional depth.

However, the defined palette and the implemented palette diverge significantly. Approximately 40% of page files use hardcoded Tailwind color utilities (`text-gray-900`, `bg-white`, `border-gray-200`) instead of the semantic tokens (`text-text`, `bg-surface`, `border-border`). This creates visible inconsistency when navigating between token-compliant pages (e.g., `/blueprints`) and non-compliant pages (e.g., `/dashboard`).

**Issues:**

| # | Severity | Component/Screen | Issue | Recommendation | Reference |
|---|----------|-----------------|-------|----------------|-----------|
| 1.1 | Critical | `/dashboard`, `/monitor`, `/compliance`, `/admin/*` | Hardcoded `gray-*` and `bg-white` bypass entire token system. `text-gray-900` appears instead of `text-text`, `border-gray-200` instead of `border-border`. Creates two visually distinct palettes within one product. | Execute systematic migration: replace all `text-gray-900` with `text-text`, `bg-white` with `bg-surface`, `border-gray-200` with `border-border`, `text-gray-500` with `text-text-secondary`. | Azure Portal uses CSS custom properties exclusively; no hardcoded colors in page-level markup. |
| 1.2 | Major | `review-panel.tsx`, `blueprint-view.tsx`, `validation-report.tsx`, `quality-dashboard.tsx` | Status colors are hardcoded with inconsistent shade pairings: some use `red-700` + `red-100`, others use `red-800` + `red-50` for semantically identical "danger" states. | Create a `statusColors` utility exporting consistent bg/text/border triplets for each status level, referencing the existing `--color-danger-*` / `--color-success-*` tokens. | Azure uses a fixed semantic color map: `#D13438` (error), `#0F7B0F` (success), `#797673` (neutral) across all surfaces. |
| 1.3 | Major | `registry/page.tsx` (workflows section) | Workflows section uses `bg-gray-50`, `border-gray-200`, `text-gray-900` while the adjacent agents section uses `bg-surface-raised`, `border-border`, `text-text`. Within the same page, two color systems are visible. | Align workflows section to match agents section token usage. | N/A — internal consistency issue. |
| 1.4 | Minor | `activity-feed.tsx` | Avatar background colors use hardcoded Tailwind classes (`bg-violet-200`, `bg-blue-200`, `bg-emerald-200`) with no token reference. | Define avatar color palette as tokens or a shared constant array. | Datadog uses a fixed 8-color avatar ring from their design tokens. |
| 1.5 | Minor | Surface layering | `#ffffff` on `#f8f9fc` creates a contrast ratio of approximately 1.02:1 — below the threshold for clear visual separation between cards and page background. | Increase page background to `#f0f2f8` (the existing `--color-surface-muted`) for cards on page, or add subtle border to card containers. | Azure uses `#FAF9F8` page background with `#FFFFFF` cards + 1px `#EDEBE9` border for clear layering. |
| 1.6 | Minor | Primary color | `#4f46e5` (indigo-600) is appropriate for an AI platform but differs significantly from Azure's `#0078D4` blue. While this is a deliberate brand choice, some enterprise buyers may perceive indigo as less "serious" than blue. | Consider documenting this as an intentional brand decision. Optionally, provide a "corporate blue" theme variant for conservative financial clients. | Azure: `#0078D4`; AWS: `#FF9900`; Datadog: `#632CA6`. |

---

### Dimension 2: Typography & Text Hierarchy

**Score: 5.5 / 10**

**Current State:**

Intellios uses Geist Sans (variable weight, 100-900) as its primary font and Geist Mono for code/IDs. Geist is a strong choice — it was designed by Vercel for UI contexts with excellent legibility at small sizes. The font is loaded as a local variable font with `display: swap`, which is correct for performance.

Two custom size tokens are defined: `--text-2xs` (10px) for micro labels and `--text-xs-tight` (11px) for compact tags. Beyond these, the application relies on Tailwind's default type scale (`text-xs` through `text-5xl`).

The core problem is the absence of a disciplined heading hierarchy. The Catalyst `Heading` component applies `text-2xl/8 font-semibold` to all heading levels regardless of semantic level. In practice, every page uses `text-xl font-semibold text-text` for its H1, with no differentiated H2 or H3 treatment. Section subheadings alternate between `text-xs font-semibold uppercase tracking-wider` (governance-style) and `text-sm font-semibold` (dashboard-style) with no consistent rule.

**Issues:**

| # | Severity | Component/Screen | Issue | Recommendation | Reference |
|---|----------|-----------------|-------|----------------|-----------|
| 2.1 | Critical | Catalyst `heading.tsx` | All heading levels render identically. `Heading` uses `text-2xl/8 font-semibold` regardless of whether `level` is 1, 2, 3, or 4. Subheading uses `text-base/7 font-semibold` for all sub-levels. No visual hierarchy between levels. | Implement a size ramp: H1 = `text-2xl font-semibold`, H2 = `text-xl font-semibold`, H3 = `text-lg font-medium`, H4 = `text-base font-medium`. Apply different line-heights per level. | Azure Portal: distinct sizes per heading level with Segoe UI — H1 at 20px semibold, H2 at 16px semibold, H3 at 14px semibold. |
| 2.2 | Major | All pages | Page H1 is `text-xl` (20px effective), which is undersized for an enterprise primary heading. On information-dense screens, the page title doesn't command sufficient visual prominence. | Increase page H1 to `text-2xl font-semibold` (24px) minimum. Consider `text-2xl` with a heavier weight or a subtle bottom border for additional emphasis. | Azure Portal page titles are 20px with clear spacing and a breadcrumb trail above for context. |
| 2.3 | Major | `/dashboard`, `/compliance`, `/monitor` | Section subheadings inconsistent: dashboard uses `text-xs font-semibold text-gray-400`, compliance uses `text-sm font-semibold uppercase tracking-wider text-gray-500`, home uses `text-xs font-semibold uppercase tracking-widest text-text-tertiary`. Three different treatments for the same semantic purpose. | Define a single `SectionHeading` component: `text-xs font-semibold uppercase tracking-wider text-text-tertiary` as the standard. | Azure uses `text-sm font-semibold` for section titles, no uppercase. Datadog uses uppercase 11px for section headers. |
| 2.4 | Minor | Global | The `--text-2xs` token (10px) is at the WCAG minimum for readable text. Used for micro labels and role badges. Ensure no critical information is conveyed solely at this size. | Audit all `text-2xs` usage to confirm it's decorative/supplementary, never primary. Consider increasing to 11px (`--text-xs-tight`). | WCAG 2.1 has no minimum font size, but AA contrast ratios become harder to meet below 12px. |
| 2.5 | Minor | Code/monospace usage | Blueprint IDs and technical fields use `font-mono text-xs` but the Catalyst `Code` component uses `text-sm font-medium` with a border and background. Two different monospace treatments exist without clear rules for when to use which. | Document rule: inline code references use `Code` component with background; raw IDs/URIs use bare `font-mono text-xs` without decoration. | Azure Portal uses Consolas for resource IDs with a subtle `#F3F2F1` background pill. |
| 2.6 | Minor | Line heights | Heading uses `/8` line-height, Subheading uses `/7`, body uses `/6`, badges use `/5`. The scale is inconsistent (not a clear ratio progression). | Standardize to 1.5 (body), 1.25 (headings), 1.0 (badges/labels). | Standard enterprise type systems use 1.5x body, 1.25x headings. |

---

### Dimension 3: Layout, Spacing & Grid System

**Score: 7.5 / 10**

**Current State:**

Intellios uses a standard two-column layout: 240px fixed sidebar + flex-1 content area. The content area uses `var(--content-bg)` (`#f8f9fc`) background with `overflow-y-auto` for scrolling. This structure is correct and matches Azure/AWS patterns.

Most pages follow a consistent wrapper pattern of `px-6 py-6` (24px padding on all sides), which is appropriate for information-dense enterprise screens. Grid layouts use `gap-4` (16px) for card grids and `gap-3` (12px) for tighter layouts. Section spacing is predominantly `mb-6` or `space-y-6` (24px) between major sections.

The spacing generally follows a 4px base unit scale (4, 8, 12, 16, 20, 24), though some components use non-standard values. The `globals.css` defines a clean border-radius scale: 6px (sm), 8px (default), 12px (lg/card), 16px (xl).

**Issues:**

| # | Severity | Component/Screen | Issue | Recommendation | Reference |
|---|----------|-----------------|-------|----------------|-----------|
| 3.1 | Major | `/pipeline`, `/intake` | Header padding uses `py-4` instead of the standard `py-6` found on all other pages. Creates inconsistent vertical rhythm when navigating between pages. | Standardize all page headers to `py-6`. If pipeline needs a tighter header to maximize kanban space, document this as an intentional exception. | Azure Portal uses consistent 16px top padding across all page headers. |
| 3.2 | Major | Pipeline page | Uses `flex flex-col` with `h-[calc(100vh-0px)]` for full-height layout, while all other pages use simple `overflow-y-auto` scrolling. The `calc(100vh-0px)` value is a no-op and suggests an incomplete implementation. | Use `h-full` or `flex-1` within the existing flex layout. Calculate the actual offset (sidebar header height) if a fixed-height kanban is required. | Azure DevOps Boards uses `calc(100vh - 48px)` accounting for the top navbar. |
| 3.3 | Minor | Card border radius | Most cards use `rounded-xl` (12px), but login page and some modals use `rounded-2xl` (16px). Compliance modal uses `rounded-2xl` while other dialogs use Catalyst's `rounded-2xl` for panels. | Standardize: `rounded-xl` for content cards, `rounded-2xl` for modal dialogs. Document in design tokens. | Azure uses 4px radius for cards, 8px for dialogs. Datadog uses 8px consistently. |
| 3.4 | Minor | Content max-width | No `max-width` is set on the content area. On ultra-wide monitors (2560px+), content stretches to fill the entire viewport minus the 240px sidebar. Tables and text lines become uncomfortably wide. | Add `max-w-7xl mx-auto` (or `max-w-screen-xl`) to the main content wrapper for readability. Allow dashboard/kanban views to opt out. | Azure Portal caps content width at ~1200px with centered alignment. AWS Console uses full-width. |
| 3.5 | Minor | Spacing between sections | Pages inconsistently use `mb-6` (explicit margin-bottom) vs `space-y-6` (Tailwind gap utility) for section spacing. Both produce 24px gaps, but mixing approaches makes the spacing pattern harder to reason about. | Standardize to `space-y-6` for page-level section spacing (declarative, applies uniformly). Use `mb-*` only for one-off spacing adjustments. | N/A — code quality concern. |
| 3.6 | Minor | Table row padding | Varies between `px-5 py-4`, `px-5 py-3.5`, and `px-4 py-3` across different pages. | Standardize to `px-5 py-4` for standard-density tables, `px-4 py-3` for dense/compact tables. | Azure tables use consistent 12px vertical, 16px horizontal padding. |

---

### Dimension 4: Component Consistency & Design System Maturity

**Score: 6 / 10**

**Current State:**

Intellios has two component layers: the Catalyst primitive library (28 components in `src/components/catalyst/`) and a higher-level component layer (`src/components/ui/`, 19 components). The Catalyst layer is well-built — it's the official Tailwind Labs component set, built on Headless UI with proper accessibility support.

The challenge is in the gap between these primitives and their application. Core form controls (Button, Input, Select, Textarea) are consistent in sizing thanks to Catalyst's calculated padding pattern. But the Button component in the application layer diverges from Catalyst's Button — pages create their own button styles (`rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90`) instead of using the Catalyst `Button` component with `color="indigo"`.

Icons come from two sources: Lucide React (primary, used in sidebar and most pages) and Heroicons (used in the landing page). Icon sizing is inconsistent, with five different sizes observed: 12px, 13px, 14px, 15px, 16px, and 20px across different contexts.

**Issues:**

| # | Severity | Component/Screen | Issue | Recommendation | Reference |
|---|----------|-----------------|-------|----------------|-----------|
| 4.1 | Critical | Multiple pages | Pages create ad-hoc button styles instead of using Catalyst `Button`. Example: `blueprints/page.tsx` uses `rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90` — this is not the Catalyst Button. The `btn-primary` CSS class in `globals.css` defines yet a third button pattern (gradient + glow shadow). Three competing button implementations exist. | Consolidate to Catalyst `Button` as the single button primitive. Extend it with an `"indigo"` color variant if needed. Remove `btn-primary` class and inline button styles. | Azure Fluent UI has a single `Button` component with `appearance` prop (primary, subtle, outline, transparent). |
| 4.2 | Major | Catalyst components | Disabled state handling is inconsistent across primitives. Button/Input/Badge use `data-disabled:opacity-50`. Select uses `data-disabled:opacity-100`. Textarea uses `disabled:` (native selector) instead of `data-disabled:`. | Standardize all primitives to `data-disabled:opacity-50` for visual consistency. | Azure Fluent UI uses `opacity: 0.4` for all disabled states. |
| 4.3 | Major | Catalyst components | Focus ring implementation varies: Button uses `outline-blue-500`, Input uses `ring-blue-500` (via pseudo-element), Select uses `has-data-focus:after:ring-blue-500`. Three different DOM approaches for the same visual effect. | Standardize to a single focus-ring implementation. Recommend the pseudo-element `ring` approach as it avoids layout shift. Use a shared CSS utility class. | Azure uses a consistent 2px black inner border + 1px outer for all focus states. |
| 4.4 | Major | All pages | Icon sizing has no standard. Observed sizes: `size={12}` (search), `size={13}` (sign-out), `size={14}` (misc), `size={15}` (sidebar nav), `size={16}` (page content), `size={20}` (empty states), `size={24}` (large features). No documented sizing convention. | Define icon size tokens: `icon-xs` = 12px, `icon-sm` = 14px, `icon-base` = 16px, `icon-lg` = 20px, `icon-xl` = 24px. Map to contexts: sidebar nav = `icon-sm`, inline text = `icon-base`, empty states = `icon-xl`. | Azure uses 16px for inline, 20px for nav, 24px for feature icons. |
| 4.5 | Major | Badge component | Catalyst Badge uses `rounded-md` while all other interactive components use `rounded-lg`. This creates a visual inconsistency where badges have sharper corners than the buttons and inputs they sit alongside. | Align Badge to `rounded-lg` to match the rest of the system, or explicitly document `rounded-md` as the "pill" style for status indicators. | Azure badges use 2px radius (sharper than buttons at 4px), but the ratio is intentional. |
| 4.6 | Minor | Catalyst Heading | All heading levels render with identical styling. The `level` prop changes the HTML element but not the visual presentation. | Add level-specific styling as described in Dimension 2. | Every enterprise design system differentiates heading sizes by level. |
| 4.7 | Minor | Icon library | Landing page uses Heroicons (`@heroicons/react`), rest of app uses Lucide React (`lucide-react`). Two icon libraries coexist. | Consolidate to Lucide React throughout. Replace Heroicons usage on landing page. | Datadog uses a single custom icon set. Azure uses Fluent icons exclusively. |
| 4.8 | Minor | Empty state component | `empty-state.tsx` exists as a shared component but is not used in all places that need empty states. Activity feed, quality dashboard, and fleet governance construct their own empty states inline. | Audit all empty state instances and migrate to the shared `EmptyState` component. Add `icon`, `title`, `description`, and `action` props if not already present. | AWS Console uses a consistent empty state pattern: centered icon, title, description, CTA button. |

---

### Dimension 5: Navigation, Information Architecture & Wayfinding

**Score: 7.5 / 10**

**Current State:**

The sidebar navigation is one of Intellios's strongest design elements. It features a dark-themed sidebar (`#0c1222`) with clear section grouping (unlabeled primary section, "Governance", "Operations", "Admin"), role-based filtering (architects see Design Studio and Blueprints; reviewers see Review Queue and Governor), and a well-implemented active state indicator (left indigo border + subtle glow + white text).

The command palette (Cmd+K) is an excellent power-user affordance, matching patterns from Azure DevOps, Linear, and Vercel. The "Ask Intellios" help row above the user footer provides AI assistance discovery.

Navigation depth is appropriate — most workflows are accessible within 2 clicks (sidebar item, then an action within the page). The Governor dashboard provides a dedicated layout with its own sidebar for governance-focused roles.

**Issues:**

| # | Severity | Component/Screen | Issue | Recommendation | Reference |
|---|----------|-----------------|-------|----------------|-----------|
| 5.1 | Major | All pages | No breadcrumb navigation is visible. Users navigating to `/blueprints/[id]` or `/registry/[agentId]` have no way to see their location in the hierarchy or navigate back to the parent list without using the sidebar. | Add breadcrumb trail below the page header on all detail pages. Pattern: `Blueprints > Agent-Name-Here`. Use the Catalyst `Link` component. | Azure Portal uses breadcrumbs on every detail page. AWS Console uses them on all resource detail views. |
| 5.2 | Major | Sidebar | The primary nav section (Overview, Design Studio, Blueprints, Pipeline, Registry, Templates) has no section label, while Governance, Operations, and Admin do. This creates an asymmetry — the most important section lacks a label. | Add a "Workspace" or "Build" label above the primary nav section. Or keep it unlabeled but add a subtle visual separator. | Azure Portal labels its primary section "Favorites" or shows it as pinned items with a label. |
| 5.3 | Minor | Sidebar sections | The "Operations" section (Deploy, Monitor, Analytics, Audit Trail) mixes deployment actions with observability tools. Deploy is an action-oriented page while Monitor/Analytics/Audit are observability pages. | Consider splitting: "Deploy" could live under the primary section (it's an action on agents, not an observability function). "Observability" could contain Monitor, Analytics, and Audit Trail. | AWS Console separates "Actions" from "Monitoring" in service-level navigation. |
| 5.4 | Minor | Governor layout | Governor has its own sidebar with different navigation, but there's no clear visual indicator that the user has "entered" a different navigation context. The transition from main sidebar to governor sidebar may be disorienting. | Add a visual breadcrumb or "back to main" link at the top of the Governor sidebar. Consider a subtle color shift to indicate the different context. | Azure Portal sub-navigations show a "back" arrow and the parent resource name. |
| 5.5 | Minor | Terminology | Nav items use "Design Studio" (for intake) and "Pipeline" (for kanban lifecycle view). These terms are clear but could be confusing alongside "Blueprints" — is a Blueprint the output of Design Studio? The relationship isn't obvious from nav labels alone. | Add tooltips to sidebar items explaining the relationship: "Design Studio: Create new agent designs" and "Blueprints: View and refine generated agent specifications." | Azure Portal uses tooltips on collapsed sidebar items. |
| 5.6 | Minor | Page titles | Not all pages have a consistent subtitle/description below the H1. Some (like Review Queue) have `mt-0.5 text-sm text-text-secondary` descriptions, others (like Registry) have none. | Add a one-line description below every page H1 to orient users. | Datadog uses a consistent subtitle on every page header. |

---

### Dimension 6: Data Visualization, Tables & Information Density

**Score: 6.5 / 10**

**Current State:**

Data tables are the primary information display pattern, used on the blueprints listing, registry, review queue, monitoring, compliance, and admin pages. Most tables follow a consistent card-container pattern: `overflow-hidden rounded-xl border border-border bg-surface shadow-[var(--shadow-card)]` wrapping a Catalyst `Table` component with `striped` variant.

Charts use Recharts with a well-tokenized configuration via `chart-tokens.ts` — consistent 11px font size, `#64748b` text color, and `#e1e5ef` grid lines. Three chart components (Bar, Donut, Line) share the token system.

KPI cards appear on the dashboard, compliance, and monitoring pages, but their implementations differ. The dashboard page uses a custom KPI layout; the compliance page uses a different structure with dynamic color props; monitoring has yet another variant.

**Issues:**

| # | Severity | Component/Screen | Issue | Recommendation | Reference |
|---|----------|-----------------|-------|----------------|-----------|
| 6.1 | Major | Multiple pages | Status badges use at least 4 different color mapping systems. `status-badge.tsx` maps status names to Badge variants. `review-panel.tsx` hardcodes `border-red-200 bg-red-50 text-red-700` inline. `fleet-governance-dashboard.tsx` uses a `TIER_TEXT_COLOR` record. `blueprint-view.tsx` uses yet another inline color map. | Create a single `statusTheme.ts` utility that exports color triplets (bg, text, border) for each status/risk/severity level. All components should import from this single source. | Azure uses a `StatusBar` component with a `status` prop that deterministically maps to colors. |
| 6.2 | Major | KPI cards | Three different KPI card implementations exist: `kpi-card.tsx` (dashboard component), inline KPI sections in `compliance/page.tsx`, and custom metric displays in `monitor/page.tsx`. Different padding (`p-5` vs `p-4`), different heading sizes, different value formatting. | Consolidate into a single `KpiCard` component with props for `label`, `value`, `trend`, `color`, and `size` (compact vs standard). | Azure Portal "Essentials" panel uses a consistent metric card format across all resource pages. |
| 6.3 | Major | Tables | Tables lack consistent filtering, sorting, and search UI. Some pages (blueprints) have search bars; others (monitoring) have a filter panel; others (compliance) have neither. Pagination is not consistently implemented. | Create a standardized `TableToolbar` component with optional search, filter chips, sort controls, and pagination. Apply to all table views. | Datadog's table views always include: search bar, filter chips, column sort, and pagination controls in a consistent toolbar. |
| 6.4 | Minor | Charts | Chart margin configurations are inconsistent. Bar chart uses `{ top: 4, right: 4, bottom: 4, left: -20 }`. Quality dashboard chart uses `{ top: 4, right: 8, left: -24, bottom: 0 }`. | Define standard chart margins in `chart-tokens.ts` and reference them from all chart components. | N/A — code consistency issue. |
| 6.5 | Minor | Timestamps | Not observable from code alone whether timestamps are consistently formatted (relative vs absolute, timezone handling). The activity feed uses relative timestamps ("2h ago"). | Ensure all timestamps use the same formatting library and convention. Use relative time for recent events (<24h) and absolute with timezone for older events. | Azure Portal: relative for <24h ("3 hours ago"), absolute with timezone for older ("Mar 15, 2026, 2:30 PM EST"). |
| 6.6 | Minor | Information density | Pipeline kanban cards have a fixed `h-[156px]` height, which may waste space for simple agents or truncate information for complex ones. | Use auto-height with a `min-h` constraint instead of fixed height. | Azure DevOps work item cards are auto-sized based on content. |

---

### Dimension 7: Micro-interactions, Polish & Perceived Quality

**Score: 5.5 / 10**

**Current State:**

The application has foundational interaction patterns in place — buttons have `transition-colors` and `transition-all 150ms ease`, inputs have focus rings, and the sidebar has hover states with `transition-colors`. Two global keyframe animations exist (`domain-scan` for intake progress and `signal-bar` for pulse indicators).

However, polish details that separate "functional" from "enterprise-grade" are frequently missing. Many interactive elements lack visible hover states. Loading states are inconsistent. Toast notifications use Sonner (which is well-implemented), but error handling patterns vary. The login page has strong polish (ambient glow orbs, dot-grid background, glassmorphism), but this level of attention doesn't carry into the application interior.

**Issues:**

| # | Severity | Component/Screen | Issue | Recommendation | Reference |
|---|----------|-----------------|-------|----------------|-----------|
| 7.1 | Major | Multiple pages | Card-based list items use `hover:bg-surface-raised` (or `hover:bg-gray-50` on non-token pages), but there's no visual feedback for `active` (click/press) or `focus` states. Keyboard users navigating through lists have no visible focus indicator. | Add `focus-visible:ring-2 focus-visible:ring-primary/30` to all clickable card/list items. Add `active:bg-surface-muted` for press feedback. | Azure Portal list items show a left-border accent on focus and a pressed background state. |
| 7.2 | Major | Forms | Form validation is not observable as a consistent pattern. Some pages likely use inline validation (Zod schemas exist), but there's no standard error message component. The Catalyst Input supports `data-invalid` state with a red border, but whether error messages appear below fields is not consistently implemented. | Create a `FormField` wrapper component that renders label, input, help text, and error message in a consistent layout. Ensure all forms use this wrapper. | Azure Fluent UI `Field` component wraps inputs with consistent label, description, and error message slots. |
| 7.3 | Major | Loading states | The shared `Skeleton` component (`skeleton.tsx`) provides a clean `animate-pulse` primitive with configurable height and a `SkeletonList` for repeated rows. However, most pages construct ad-hoc loading states: quality-dashboard uses `h-24 rounded-xl animate-pulse bg-gray-100`, activity-feed builds custom placeholder rows. | Audit all loading states and replace with `Skeleton` / `SkeletonList` usage. Create page-level skeleton compositions (e.g., `BlueprintListSkeleton`, `DashboardSkeleton`). | Azure Portal uses consistent skeleton screens with subtle shimmer animations across all resource pages. |
| 7.4 | Minor | Buttons | Primary buttons have a gradient (`--gradient-primary`) + glow shadow (`--shadow-primary`) with hover state enhancement. This is more visually elaborate than Azure's flat fill buttons. While it gives Intellios personality, the glow shadow may read as "startup polish" rather than "enterprise gravity." | Consider offering a `variant="enterprise"` button style that uses flat indigo fill without gradient/glow. The gradient version could be reserved for hero CTAs (e.g., "Create New Agent"). | Azure uses flat `#0078D4` fill with subtle hover darkening. No gradients. |
| 7.5 | Minor | Tooltips | Radix UI Tooltip is included as a dependency, but tooltip usage is not consistently applied. Sidebar items, icon buttons, and truncated table cells should all have tooltips. | Audit all icon-only buttons and truncated text elements. Add tooltips to all elements where text is hidden or abbreviated. | Azure Portal applies tooltips to every icon button and truncated text. |
| 7.6 | Minor | Scrollbar styling | Custom scrollbar styling is defined in `globals.css` (6px width, `#cbd5e1` thumb, rounded). The sidebar has a darker variant. This is a nice touch, but Firefox support for `::-webkit-scrollbar` is limited. | Add `scrollbar-color` and `scrollbar-width` CSS properties for Firefox compatibility alongside the webkit rules. | Modern enterprise apps support both webkit and standard scrollbar styling. |
| 7.7 | Minor | Transitions | Card hover states use `transition-all`, which can animate unintended properties (e.g., color, padding). This can cause micro-jank when many properties animate simultaneously. | Replace `transition-all` with explicit `transition-colors` or `transition-shadow` to animate only intended properties. | N/A — performance best practice. |

---

## Priority Remediation Roadmap

### P0 (Ship-blocking): Items that undermine enterprise credibility

1. **Token migration across all pages** (Issues 1.1, 1.3). Replace all hardcoded `gray-*`, `bg-white`, and `border-gray-*` with semantic tokens. Estimated effort: 1-2 engineer-days. This single change has the highest impact on perceived design consistency.

2. **Consolidate status color mappings** (Issues 1.2, 6.1). Create `src/lib/status-theme.ts` with a single authoritative mapping of status/risk/severity to color triplets. Refactor `review-panel.tsx`, `blueprint-view.tsx`, `validation-report.tsx`, `quality-dashboard.tsx`, `fleet-governance-dashboard.tsx`, and `status-badge.tsx` to use it. Estimated effort: 1 engineer-day.

3. **Add breadcrumb navigation** (Issue 5.1). Implement a `Breadcrumb` component and add it to all detail pages (`/blueprints/[id]`, `/registry/[agentId]`, `/governance/policies/[id]`). Estimated effort: 0.5 engineer-days.

### P1 (Next sprint): Items that affect usability or consistency

4. **Fix heading hierarchy** (Issues 2.1, 2.2, 2.3). Update the Catalyst `Heading` component to apply level-specific sizes. Define and enforce a `SectionHeading` component for sub-section titles. Estimated effort: 1 engineer-day.

5. **Consolidate button implementations** (Issue 4.1). Remove inline button styles and `btn-primary` CSS class. Route all buttons through Catalyst `Button` with appropriate color/variant props. Estimated effort: 1 engineer-day.

6. **Standardize icon sizes** (Issue 4.4). Define icon size constants and audit all icon usage across the codebase. Estimated effort: 0.5 engineer-days.

7. **Add content max-width** (Issue 3.4). Add `max-w-7xl mx-auto` wrapper to content area (with opt-out for kanban/dashboard views). Estimated effort: 0.25 engineer-days.

8. **Consolidate KPI card implementations** (Issue 6.2). Build a single `KpiCard` component and replace all inline metric displays. Estimated effort: 0.5 engineer-days.

9. **Add keyboard focus indicators** (Issue 7.1). Add `focus-visible` rings to all clickable elements. Estimated effort: 0.5 engineer-days.

10. **Standardize table toolbar** (Issue 6.3). Create a `TableToolbar` component with search, filters, sort, and pagination. Estimated effort: 1-2 engineer-days.

### P2 (Design debt): Items to address in design system buildout

11. **Migrate loading states to Skeleton** (Issue 7.3). Replace all ad-hoc `animate-pulse` blocks with shared `Skeleton` components. Create page-level skeleton compositions.

12. **Normalize disabled states across Catalyst** (Issue 4.2). Standardize `data-disabled:opacity-50` across all primitives.

13. **Normalize focus ring implementation** (Issue 4.3). Choose one approach (recommend pseudo-element `ring`) and apply consistently.

14. **Add form validation component** (Issue 7.2). Create `FormField` wrapper for consistent label/input/error message layout.

15. **Add tooltip coverage** (Issue 7.5). Audit all icon buttons and truncated text for tooltip needs.

16. **Standardize page header padding** (Issue 3.1). Align pipeline and intake headers to standard `py-6`.

17. **Document enterprise button variant** (Issue 7.4). Consider flat-fill button option for conservative enterprise deployments.

18. **Consolidate icon libraries** (Issue 4.7). Remove Heroicons dependency and replace with Lucide equivalents on landing page.

---

## Design Token Recommendations

The following tokens would bring Intellios in line with Azure-tier enterprise polish. Many already exist in `globals.css` — the recommendations below fill gaps and add missing categories.

### Colors (additions to existing system)

```css
/* Existing tokens are strong. Add these missing aliases: */

/* Interactive element colors — currently, pages create their own */
--color-interactive: var(--color-primary);
--color-interactive-hover: var(--color-primary-hover);
--color-interactive-active: #3730a3; /* indigo-800 — press state */

/* Background hierarchy — rename for clarity */
--color-bg-page: #f0f2f8;        /* rename surface-muted → page background */
--color-bg-card: #ffffff;         /* surface → card background */
--color-bg-card-hover: #f8f9fc;   /* surface-raised → card hover */
--color-bg-inset: #f0f2f8;        /* for inset panels within cards */

/* Status consolidated tokens (replace all hardcoded pairs) */
--color-status-success-bg: var(--color-success-muted);
--color-status-success-text: var(--color-success-text);
--color-status-success-border: #a7f3d0;

--color-status-warning-bg: var(--color-warning-muted);
--color-status-warning-text: var(--color-warning-text);
--color-status-warning-border: #fde68a;

--color-status-danger-bg: var(--color-danger-muted);
--color-status-danger-text: var(--color-danger-text);
--color-status-danger-border: #fecaca;

--color-status-info-bg: var(--color-info-muted);
--color-status-info-text: var(--color-info-text);
--color-status-info-border: #bae6fd;

--color-status-neutral-bg: #f1f5f9;
--color-status-neutral-text: #475569;
--color-status-neutral-border: #e2e8f0;
```

### Spacing (additions)

```css
/* Page layout tokens */
--spacing-page-x: 1.5rem;     /* 24px — px-6 */
--spacing-page-y: 1.5rem;     /* 24px — py-6 */
--spacing-section: 1.5rem;    /* 24px — gap between major sections */
--spacing-card-padding: 1.25rem; /* 20px — p-5 internal card padding */
--spacing-card-gap: 1rem;     /* 16px — gap-4 between cards */

/* Table tokens */
--spacing-table-cell-x: 1.25rem; /* 20px — px-5 */
--spacing-table-cell-y: 1rem;    /* 16px — py-4 */
--spacing-table-cell-y-dense: 0.75rem; /* 12px — py-3 */
```

### Typography (additions)

```css
/* Heading size ramp */
--text-heading-1: 1.5rem;     /* 24px — page titles */
--text-heading-2: 1.25rem;    /* 20px — section titles */
--text-heading-3: 1.125rem;   /* 18px — subsection titles */
--text-heading-4: 1rem;       /* 16px — card titles */

/* Heading weights */
--font-weight-heading: 600;   /* semibold for all headings */

/* Section label style */
--text-section-label: 0.75rem; /* 12px */
--tracking-section-label: 0.05em; /* wider tracking */
```

### Elevation (existing is good, add one level)

```css
/* Add a focus elevation */
--shadow-focus: 0 0 0 2px rgba(79, 70, 229, 0.3); /* indigo focus ring */

/* Add card-hover elevation */
--shadow-card-hover: 0 4px 8px rgba(15, 23, 42, 0.06), 0 2px 4px rgba(15, 23, 42, 0.04);
```

### Border Radius (document existing scale)

```css
/* Existing scale is correct. Document usage rules: */
--radius-badge: 0.375rem;   /* 6px — badges, tags */
--radius-button: 0.5rem;    /* 8px — buttons, inputs */
--radius-card: 0.75rem;     /* 12px — cards, panels */
--radius-dialog: 1rem;      /* 16px — modals, dialogs */
--radius-pill: 9999px;      /* full — pills, avatars */
```

### Icon Sizes (new category)

```css
--icon-xs: 0.75rem;   /* 12px — decorative, micro */
--icon-sm: 0.875rem;  /* 14px — sidebar nav, inline */
--icon-base: 1rem;    /* 16px — default, buttons */
--icon-lg: 1.25rem;   /* 20px — feature icons */
--icon-xl: 1.5rem;    /* 24px — empty states, heroes */
```

---

*End of audit report. All issues are actionable with concrete fixes. The priority roadmap is ordered by impact-to-effort ratio, with P0 items delivering the most visible improvement for the least engineering investment.*

# Intellios Design Token Reference

## Overview

Intellios uses a three-layer design token system to maintain visual consistency across all interfaces:

1. **@theme layer** (`globals.css`) — CSS custom properties organized semantically (colors, typography, spacing, elevation)
2. **:root CSS variables** (`globals.css`) — Runtime values for shadcn/ui compatibility, sidebar theme, and elevation effects
3. **TypeScript constants** (`status-theme.ts`, `chart-tokens.ts`, `icon-sizes.ts`) — Named exports for components that cannot read CSS variables (charts, dynamic styling)

All color tokens are defined once in `globals.css` and synced across implementations. When adding new tokens, define them in `globals.css` first, then export TypeScript constants that reference the same hex values.

---

## Color Tokens

### Brand — Indigo-Violet

The primary brand color palette. Use for interactive elements, focus states, and primary CTAs.

| Token | CSS Var | Hex | Usage |
|---|---|---|---|
| `--color-primary` | `--color-primary` | `#4f46e5` | Primary buttons, active states, focus rings |
| `--color-primary-hover` | `--color-primary-hover` | `#4338ca` | Hover state for primary interactive elements |
| `--color-primary-subtle` | `--color-primary-subtle` | `#e0e7ff` | Light background for callouts, highlights |
| `--color-primary-muted` | `--color-primary-muted` | `#eef2ff` | Extra-light background for large surfaces |
| `--color-primary-fg` | `--color-primary-fg` | `#ffffff` | Text on primary backgrounds |

### Status Colors

#### Success — Emerald

| Token | CSS Var | Hex | Usage |
|---|---|---|---|
| `--color-success` | `--color-success` | `#059669` | Success badges, checkmarks, positive confirmations |
| `--color-success-hover` | `--color-success-hover` | `#047857` | Hover state for success interactive elements |
| `--color-success-subtle` | `--color-success-subtle` | `#d1fae5` | Light background for success callouts |
| `--color-success-muted` | `--color-success-muted` | `#ecfdf5` | Extra-light background for success panels |
| `--color-success-text` | `--color-success-text` | `#065f46` | Text for success alerts |
| `--color-success-fg` | `--color-success-fg` | `#ffffff` | Foreground on success backgrounds |

#### Warning — Amber

| Token | CSS Var | Hex | Usage |
|---|---|---|---|
| `--color-warning` | `--color-warning` | `#d97706` | Warning badges, cautions, recommendations |
| `--color-warning-hover` | `--color-warning-hover` | `#b45309` | Hover state for warning interactive elements |
| `--color-warning-subtle` | `--color-warning-subtle` | `#fef3c7` | Light background for warning callouts |
| `--color-warning-muted` | `--color-warning-muted` | `#fffbeb` | Extra-light background for warning panels |
| `--color-warning-text` | `--color-warning-text` | `#92400e` | Text for warning alerts |
| `--color-warning-fg` | `--color-warning-fg` | `#ffffff` | Foreground on warning backgrounds |

#### Caution — Orange

| Token | CSS Var | Hex | Usage |
|---|---|---|---|
| `--color-caution` | `--color-caution` | `#ea580c` | Caution badges, deprecations, planned removals |
| `--color-caution-hover` | `--color-caution-hover` | `#c2410c` | Hover state for caution interactive elements |
| `--color-caution-subtle` | `--color-caution-subtle` | `#ffedd5` | Light background for caution callouts |
| `--color-caution-muted` | `--color-caution-muted` | `#fff7ed` | Extra-light background for caution panels |
| `--color-caution-text` | `--color-caution-text` | `#9a3412` | Text for caution alerts |
| `--color-caution-fg` | `#ffffff` | `#ffffff` | Foreground on caution backgrounds |

#### Info — Sky

| Token | CSS Var | Hex | Usage |
|---|---|---|---|
| `--color-info` | `--color-info` | `#0284c7` | Info badges, help text, neutral alerts |
| `--color-info-hover` | `--color-info-hover` | `#0369a1` | Hover state for info interactive elements |
| `--color-info-subtle` | `--color-info-subtle` | `#e0f2fe` | Light background for info callouts |
| `--color-info-muted` | `--color-info-muted` | `#f0f9ff` | Extra-light background for info panels |
| `--color-info-text` | `--color-info-text` | `#075985` | Text for info alerts |
| `--color-info-fg` | `#ffffff` | `#ffffff` | Foreground on info backgrounds |

#### Danger — Red

| Token | CSS Var | Hex | Usage |
|---|---|---|---|
| `--color-danger` | `--color-danger` | `#dc2626` | Destructive actions, critical errors, denials |
| `--color-danger-hover` | `--color-danger-hover` | `#b91c1c` | Hover state for danger interactive elements |
| `--color-danger-subtle` | `--color-danger-subtle` | `#fee2e2` | Light background for danger callouts |
| `--color-danger-muted` | `--color-danger-muted` | `#fef2f2` | Extra-light background for danger panels |
| `--color-danger-text` | `--color-danger-text` | `#991b1b` | Text for danger alerts |
| `--color-danger-fg` | `#ffffff` | `#ffffff` | Foreground on danger backgrounds |

### Risk Tiers

Risk assessment color palette for governance and policy validation. Used in dashboards, reports, and risk cards.

| Token | CSS Var | Hex | Color | Usage |
|---|---|---|---|---|
| `--color-risk-low` | `--color-risk-low` | `#10b981` | Emerald | Acceptable risk, no action needed |
| `--color-risk-low-subtle` | `--color-risk-low-subtle` | `#d1fae5` | Emerald | Low-risk background |
| `--color-risk-low-muted` | `--color-risk-low-muted` | `#ecfdf5` | Emerald | Extra-light low-risk surface |
| `--color-risk-low-text` | `--color-risk-low-text` | `#065f46` | Emerald | Text on low-risk backgrounds |
| `--color-risk-low-border` | `--color-risk-low-border` | `#a7f3d0` | Emerald | Border for low-risk cards |
| `--color-risk-medium` | `--color-risk-medium` | `#f59e0b` | Amber | Manageable risk, review recommended |
| `--color-risk-medium-subtle` | `--color-risk-medium-subtle` | `#fef3c7` | Amber | Medium-risk background |
| `--color-risk-medium-muted` | `--color-risk-medium-muted` | `#fffbeb` | Amber | Extra-light medium-risk surface |
| `--color-risk-medium-text` | `--color-risk-medium-text` | `#92400e` | Amber | Text on medium-risk backgrounds |
| `--color-risk-medium-border` | `--color-risk-medium-border` | `#fde68a` | Amber | Border for medium-risk cards |
| `--color-risk-high` | `--color-risk-high` | `#f97316` | Orange | Significant risk, action required |
| `--color-risk-high-subtle` | `--color-risk-high-subtle` | `#ffedd5` | Orange | High-risk background |
| `--color-risk-high-muted` | `--color-risk-high-muted` | `#fff7ed` | Orange | Extra-light high-risk surface |
| `--color-risk-high-text` | `--color-risk-high-text` | `#9a3412` | Orange | Text on high-risk backgrounds |
| `--color-risk-high-border` | `--color-risk-high-border` | `#fed7aa` | Orange | Border for high-risk cards |
| `--color-risk-critical` | `--color-risk-critical` | `#ef4444` | Red | Critical risk, immediate action |
| `--color-risk-critical-subtle` | `--color-risk-critical-subtle` | `#fee2e2` | Red | Critical-risk background |
| `--color-risk-critical-muted` | `--color-risk-critical-muted` | `#fef2f2` | Red | Extra-light critical-risk surface |
| `--color-risk-critical-text` | `--color-risk-critical-text` | `#991b1b` | Red | Text on critical-risk backgrounds |
| `--color-risk-critical-border` | `--color-risk-critical-border` | `#fecaca` | Red | Border for critical-risk cards |

### Policy Types

Semantic colors for different policy categories in governance validation reports.

| Token | CSS Var | Hex | Color | Usage |
|---|---|---|---|---|
| `--color-policy-safety-subtle` | `--color-policy-safety-subtle` | `#ffedd5` | Orange | Background for safety policies |
| `--color-policy-safety-text` | `--color-policy-safety-text` | `#9a3412` | Orange | Text for safety policy labels |
| `--color-policy-safety-border` | `--color-policy-safety-border` | `#fed7aa` | Orange | Border for safety policy cards |
| `--color-policy-compliance-subtle` | `--color-policy-compliance-subtle` | `#e0f2fe` | Sky | Background for compliance policies |
| `--color-policy-compliance-text` | `--color-policy-compliance-text` | `#075985` | Sky | Text for compliance policy labels |
| `--color-policy-compliance-border` | `--color-policy-compliance-border` | `#bae6fd` | Sky | Border for compliance policy cards |
| `--color-policy-data-handling-subtle` | `--color-policy-data-handling-subtle` | `#ede9fe` | Violet | Background for data handling policies |
| `--color-policy-data-handling-text` | `--color-policy-data-handling-text` | `#4c1d95` | Violet | Text for data handling policy labels |
| `--color-policy-data-handling-border` | `--color-policy-data-handling-border` | `#ddd6fe` | Violet | Border for data handling policy cards |
| `--color-policy-access-control-subtle` | `--color-policy-access-control-subtle` | `#e0e7ff` | Indigo | Background for access control policies |
| `--color-policy-access-control-text` | `--color-policy-access-control-text` | `#312e81` | Indigo | Text for access control policy labels |
| `--color-policy-access-control-border` | `--color-policy-access-control-border` | `#c7d2fe` | Indigo | Border for access control policy cards |
| `--color-policy-audit-subtle` | `--color-policy-audit-subtle` | `#f1f5f9` | Slate | Background for audit policies |
| `--color-policy-audit-text` | `--color-policy-audit-text` | `#334155` | Slate | Text for audit policy labels |
| `--color-policy-audit-border` | `--color-policy-audit-border` | `#e2e8f0` | Slate | Border for audit policy cards |

### Surfaces

Background and surface colors for UI layers.

| Token | CSS Var | Hex | Usage |
|---|---|---|---|
| `--color-surface` | `--color-surface` | `#ffffff` | Primary surface for cards, panels, containers |
| `--color-surface-raised` | `--color-surface-raised` | `#f8f9fc` | Elevated surface for hover states, interactive elements |
| `--color-surface-muted` | `--color-surface-muted` | `#f0f2f8` | Muted background for inactive areas, disabled states |
| `--color-surface-overlay` | `--color-surface-overlay` | `rgba(15, 23, 42, 0.4)` | Modal backdrop, overlay dimming |

### Borders

Border colors for dividers, input fields, and card edges.

| Token | CSS Var | Hex | Usage |
|---|---|---|---|
| `--color-border` | `--color-border` | `#e1e5ef` | Default border for cards, inputs, dividers |
| `--color-border-strong` | `--color-border-strong` | `#8b95ad` | Stronger emphasis borders, focus rings |
| `--color-border-subtle` | `--color-border-subtle` | `#ebeef5` | De-emphasized borders, light dividers |

### Text

Text color palette for typography hierarchy.

| Token | CSS Var | Hex | Usage |
|---|---|---|---|
| `--color-text` | `--color-text` | `#0f172a` | Primary text, headings, body copy |
| `--color-text-secondary` | `--color-text-secondary` | `#64748b` | Secondary text, meta information, timestamps |
| `--color-text-tertiary` | `--color-text-tertiary` | `#94a3b8` | De-emphasized text, hints, captions |
| `--color-text-disabled` | `--color-text-disabled` | `#cbd5e1` | Disabled form inputs, placeholder text |

---

## Typography

### Font Families

Two font families are configured via `--font-sans` and `--font-mono` variables (loaded in `layout.tsx` from next/font):

| Font | CSS Var | Usage |
|---|---|---|
| **Geist Sans** | `--font-family-sans` | All body text, headings, UI labels, buttons |
| **Geist Mono** | `--font-family-mono` | Code blocks, console output, file paths, inline code |

### Type Scale

| Token | Size | Usage |
|---|---|---|
| `text-2xs` | 10px (`0.625rem`) | Micro labels, section headers, tag labels |
| `text-xs-tight` | 11px (`0.6875rem`) | Compact tags, metadata, dense UI |
| Standard Tailwind | 12px–48px | Use Tailwind's standard text-xs through text-4xl for all other sizes |

### Tailwind Text Utilities

Use standard Tailwind text sizes for hierarchy:

- `text-xs` (12px) — small helper text, secondary captions
- `text-sm` (14px) — dense body text, form labels
- `text-base` (16px) — standard body text, default UI
- `text-lg` (18px) — emphasis text, section subheadings
- `text-xl` (20px) — small headings (H4)
- `text-2xl` (24px) — medium headings (H3)
- `text-3xl` (30px) — large headings (H2)
- `text-4xl` (36px) — main headings (H1)

---

## Spacing

### Border Radius

Rounded corner tokens for consistent edge treatment.

| Token | Size | Pixels | Usage |
|---|---|---|---|
| `--radius-sm` | `0.375rem` | 6px | Form inputs, small badges, tight corners |
| `--radius` | `0.5rem` | 8px | Default radius for most components |
| `--radius-lg` | `0.75rem` | 12px | Cards, larger buttons, panels |
| `--radius-xl` | `1rem` | 16px | Large modals, expanded cards |
| `--radius-card` | `0.75rem` | 12px | Alias for card corners (same as `--radius-lg`) |

### Page Layout

Standard spacing patterns for consistent page structure:

| Pattern | Spacing | Usage |
|---|---|---|
| Page padding | `px-6 py-6` | Main content area margins |
| Section spacing | `space-y-6` | Vertical gap between page sections |
| Card grid gap | `gap-4` | Gap between cards in grids or lists |
| Compact spacing | `space-y-3`, `gap-2` | Dense layouts, table rows, form groups |

---

## Elevation

Shadow tokens create visual depth and hierarchy using indigo-tinted shadows that complement the primary brand color.

| Token | CSS Var | Usage |
|---|---|---|
| `--shadow-card` | `0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.06)` | Base shadow for cards, subtle elevation |
| `--shadow-raised` | `0 4px 12px rgba(79, 70, 229, 0.06), 0 2px 4px rgba(15, 23, 42, 0.04)` | Elevated surfaces, drawer headers |
| `--shadow-modal` | `0 24px 48px rgba(79, 70, 229, 0.12), 0 8px 16px rgba(15, 23, 42, 0.08)` | Modal dialogs, top-level overlays |
| `--shadow-primary` | `0 4px 14px rgba(79, 70, 229, 0.25), 0 2px 4px rgba(79, 70, 229, 0.10)` | Primary buttons, interactive focus states |
| `--shadow-primary-hover` | `0 6px 20px rgba(79, 70, 229, 0.35), 0 2px 6px rgba(79, 70, 229, 0.15)` | Primary button hover state |
| `--shadow-focus` | `0 0 0 2px var(--color-primary), 0 0 0 4px rgba(79, 70, 229, 0.2)` | Focus ring outline for keyboard navigation |

---

## Gradients

Gradient tokens for visual richness and emphasis.

| Token | Value | Usage |
|---|---|---|
| `--gradient-primary` | `linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)` | Primary button backgrounds, feature callouts |
| `--gradient-primary-hover` | `linear-gradient(135deg, #818cf8 0%, #6366f1 100%)` | Primary button hover state |
| `--gradient-sidebar-header` | `linear-gradient(180deg, #141d35 0%, var(--sidebar-bg) 100%)` | Sidebar header background |
| `--gradient-page-wash` | `linear-gradient(180deg, rgba(99, 102, 241, 0.03) 0%, transparent 200px)` | Subtle gradient wash at top of page for depth |
| `--gradient-login-bg` | `linear-gradient(135deg, #0c1222 0%, #1e1b4b 50%, #1a1645 100%)` | Login/authentication page background |

---

## Sidebar Theme

The sidebar uses its own dark color palette with accent highlights.

| Token | CSS Var | Hex | Usage |
|---|---|---|---|
| `--sidebar-bg` | `--sidebar-bg` | `#0c1222` | Sidebar background |
| `--sidebar-border` | `--sidebar-border` | `#1a2338` | Sidebar border dividers |
| `--sidebar-text` | `--sidebar-text` | `#8b95ad` | Inactive sidebar item text |
| `--sidebar-text-active` | `--sidebar-text-active` | `#ffffff` | Active sidebar item text |
| `--sidebar-active-bg` | `--sidebar-active-bg` | `rgba(99, 102, 241, 0.10)` | Background for active sidebar items |
| `--sidebar-hover-bg` | `--sidebar-hover-bg` | `rgba(99, 102, 241, 0.06)` | Hover background for sidebar items |
| `--sidebar-accent` | `--sidebar-accent` | `#818cf8` | Accent color for sidebar highlights |
| `--sidebar-active-glow` | `--sidebar-active-glow` | `0 0 12px rgba(99, 102, 241, 0.15)` | Glow effect for active sidebar items |
| `--sidebar-width` | `--sidebar-width` | `240px` | Fixed sidebar width |

---

## Icon Sizes

Standardized icon dimensions exported from `src/lib/icon-sizes.ts`. Use `ICON_SIZE` constants instead of arbitrary pixel values.

```tsx
import { ICON_SIZE } from "@/lib/icon-sizes";

// Usage
<Icon size={ICON_SIZE.base} />
<Icon size={ICON_SIZE.lg} />
```

| Constant | Size | Usage |
|---|---|---|
| `ICON_SIZE.xs` | 12px | Decorative icons, micro labels, very tight layouts |
| `ICON_SIZE.sm` | 14px | Sidebar navigation, compact UI elements |
| `ICON_SIZE.base` | 16px | Default inline icons, button icons, standard UI |
| `ICON_SIZE.lg` | 20px | Feature icons, section headers, prominent UI |
| `ICON_SIZE.xl` | 24px | Empty states, hero sections, large focal points |

---

## Status Theme

Complete semantic color mappings for status, risk, severity, and governance states. Import from `src/lib/status-theme.ts`.

### Status Levels (Blueprint Lifecycle)

```tsx
import { STATUS_THEME, getStatusTheme } from "@/lib/status-theme";

// Direct access
const draftScheme = STATUS_THEME.draft;

// Helper function
const scheme = getStatusTheme("approved");
// Returns: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-100", badge: "success" }
```

| Status | Badge Variant | Background | Text | Border |
|---|---|---|---|---|
| `draft` | `neutral` | `bg-gray-100` | `text-gray-700` | `border-gray-200` |
| `in_review` | `info` | `bg-sky-50` | `text-sky-700` | `border-sky-100` |
| `approved` | `success` | `bg-emerald-50` | `text-emerald-700` | `border-emerald-100` |
| `deployed` | `accent` | `bg-violet-50` | `text-violet-700` | `border-violet-100` |
| `rejected` | `danger` | `bg-red-50` | `text-red-700` | `border-red-100` |
| `deprecated` | `muted` | `bg-amber-50` | `text-amber-700` | `border-amber-100` |
| `suspended` | `danger` | `bg-red-50` | `text-red-700` | `border-red-200` |

### Risk Tiers

```tsx
import { RISK_THEME, getRiskTheme } from "@/lib/status-theme";

const scheme = getRiskTheme("critical");
// Returns: { bg: "bg-red-50", text: "text-red-700", border: "border-red-400", badge: "danger" }
```

| Risk Tier | Badge Variant | Background | Text | Border |
|---|---|---|---|---|
| `critical` | `danger` | `bg-red-50` | `text-red-700` | `border-red-400` |
| `high` | `danger` | `bg-orange-50` | `text-orange-700` | `border-orange-400` |
| `medium` | `warning` | `bg-amber-50` | `text-amber-700` | `border-amber-400` |
| `low` | `success` | `bg-sky-50` | `text-sky-700` | `border-sky-300` |

### Severity Levels (Validation & Errors)

```tsx
import { SEVERITY_THEME, getSeverityTheme } from "@/lib/status-theme";

const scheme = getSeverityTheme("error");
// Returns: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", badge: "danger" }
```

| Severity | Badge Variant | Background | Text | Border |
|---|---|---|---|---|
| `error` | `danger` | `bg-red-50` | `text-red-700` | `border-red-200` |
| `warning` | `warning` | `bg-yellow-50` | `text-yellow-700` | `border-yellow-200` |
| `info` | `info` | `bg-sky-50` | `text-sky-700` | `border-sky-100` |
| `success` | `success` | `bg-emerald-50` | `text-emerald-700` | `border-emerald-100` |
| `neutral` | `neutral` | `bg-gray-50` | `text-gray-600` | `border-gray-200` |

### Governance Health Status

```tsx
import { GOVERNANCE_THEME, getGovernanceTheme } from "@/lib/status-theme";

const scheme = getGovernanceTheme("pass");
// Returns: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", badge: "success" }
```

| Health | Badge Variant | Background | Text | Border |
|---|---|---|---|---|
| `pass` | `success` | `bg-emerald-50` | `text-emerald-700` | `border-emerald-200` |
| `warning` | `warning` | `bg-amber-50` | `text-amber-700` | `border-amber-200` |
| `error` | `danger` | `bg-red-50` | `text-red-700` | `border-red-200` |
| `unvalidated` | `neutral` | `bg-surface-raised` | `text-text-tertiary` | `border-border` |

### Human-Readable Labels

Status, risk, and governance health labels are exported for UI display:

```tsx
import { STATUS_LABELS, RISK_LABELS, GOVERNANCE_LABELS } from "@/lib/status-theme";

// STATUS_LABELS
{
  draft: "Draft",
  in_review: "In Review",
  approved: "Approved",
  deployed: "Deployed",
  rejected: "Rejected",
  deprecated: "Deprecated",
  suspended: "Suspended",
}

// RISK_LABELS
{
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
}

// GOVERNANCE_LABELS
{
  pass: "Passes governance",
  warning: "Warnings",
  error: "Errors",
  unvalidated: "Not validated",
}
```

---

## Chart Tokens

Design tokens for Recharts visualizations. Exported from `src/lib/chart-tokens.ts`. Recharts cannot read CSS variables, so hex values are stored in TypeScript constants and kept in sync with the main palette.

```tsx
import { chartColors, chartFontSize, chartGridColor, chartTextColor } from "@/lib/chart-tokens";

// Usage in Recharts
<ResponsiveContainer>
  <LineChart>
    <Line stroke={chartColors.primary} />
    <XAxis tick={{ fill: chartTextColor, fontSize: chartFontSize }} />
  </LineChart>
</ResponsiveContainer>
```

| Token | Hex | Corresponding CSS Token | Usage |
|---|---|---|---|
| `chartColors.primary` | `#4f46e5` | `--color-primary` | Primary data series, main chart lines |
| `chartColors.success` | `#059669` | `--color-success` | Success/positive data |
| `chartColors.warning` | `#d97706` | `--color-warning` | Warning-level data |
| `chartColors.danger` | `#dc2626` | `--color-danger` | Critical/error data |
| `chartColors.info` | `#0284c7` | `--color-info` | Informational data |
| `chartColors.gray` | `#94a3b8` | `--color-text-tertiary` | Neutral/secondary series |
| `chartColors.border` | `#e1e5ef` | `--color-border` | Chart grid lines, borders |
| `chartColors.muted` | `#f0f2f8` | `--color-surface-muted` | Muted backgrounds, disabled series |
| `chartFontSize` | — | — | Default font size for chart labels (11px) |
| `chartGridColor` | `#e1e5ef` | `--color-border` | Grid line color |
| `chartTextColor` | `#64748b` | `--color-text-secondary` | Axis labels, legend text |

---

## Usage Rules

### 1. Always Use Design Tokens

Never hardcode colors or sizes. Use design tokens from:
- **CSS:** `var(--color-primary)`, `var(--radius-lg)`, etc.
- **TypeScript:** `chartColors.primary`, `ICON_SIZE.base`, `STATUS_THEME.approved`, etc.
- **Tailwind utilities:** `bg-sky-50`, `text-slate-700` — but prefer tokens when available

### 2. Status, Risk, and Governance Colors

Always use `status-theme.ts` helper functions and constants for consistency:
- Use `STATUS_THEME[status]` for blueprint/agent lifecycle statuses
- Use `RISK_THEME[tier]` for risk assessment dashboards
- Use `SEVERITY_THEME[level]` for validation errors and alerts
- Use `GOVERNANCE_THEME[health]` for governance validation results
- Use helper functions: `getStatusTheme()`, `getRiskTheme()`, `getSeverityTheme()`, `getGovernanceTheme()`

### 3. Icon Sizes

Always import `ICON_SIZE` constants instead of hardcoding pixel values:

```tsx
import { ICON_SIZE } from "@/lib/icon-sizes";

// Good
<Icon size={ICON_SIZE.lg} />

// Bad
<Icon size={20} />
```

### 4. Chart Colors

Use `chartColors` for all Recharts visualizations:

```tsx
import { chartColors, chartFontSize } from "@/lib/chart-tokens";

<Line stroke={chartColors.primary} />
<Bar fill={chartColors.success} />
<XAxis tick={{ fill: chartTextColor, fontSize: chartFontSize }} />
```

### 5. Catalyst Components

Use Catalyst UI components from `src/components/catalyst/` instead of hand-rolling custom UI. All Catalyst components use design tokens internally.

```tsx
import { Button, Badge, Alert } from "@/components/catalyst";

// These automatically use design tokens
<Button>Primary Action</Button>
<Badge variant="success">Approved</Badge>
<Alert>This uses color-alert background</Alert>
```

### 6. Avoid Hardcoded Tailwind Grays

Do not use gray utilities directly (e.g., `bg-gray-100`, `text-gray-500`). Use semantic tokens instead:

```tsx
// Bad
<div className="bg-gray-100 text-gray-600">Disabled content</div>

// Good
<div className="bg-surface-muted text-text-tertiary">Disabled content</div>
```

### 7. Typography Hierarchy

Use Tailwind's text scale for headings and body text:

```tsx
// Headings
<h1 className="text-4xl font-bold">Page Title</h1>
<h2 className="text-3xl font-semibold">Section Heading</h2>
<h3 className="text-2xl font-semibold">Subsection</h3>
<h4 className="text-xl font-medium">Minor Heading</h4>

// Body
<p className="text-base">Standard body text</p>
<p className="text-sm text-text-secondary">Secondary text, meta information</p>
<p className="text-xs text-text-tertiary">Caption, tertiary information</p>

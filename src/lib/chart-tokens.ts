/**
 * Design token → hex map for Recharts.
 * Recharts does not read CSS custom properties — hex values must be passed directly.
 * Values are kept in sync with @theme tokens in globals.css.
 */

export const chartColors = {
  primary:   "#6366f1", // indigo-500 — --color-primary (canonical brand primary)
  success:   "#059669", // emerald-600 — --color-success
  warning:   "#d97706", // amber-600 — --color-warning
  danger:    "#dc2626", // red-600 — --color-danger
  info:      "#0284c7", // sky-600 — --color-info
  gray:      "#94a3b8", // slate-400 — --color-text-tertiary
  border:    "#e1e5ef", // --color-border
  muted:     "#f0f2f8", // --color-surface-muted
} as const;

export const chartFontSize = 11;
export const chartGridColor = "#e1e5ef"; // matches --color-border
export const chartTextColor = "#64748b"; // matches --color-text-secondary

/** Standard chart margins — use these instead of per-chart custom margins */
export const chartMargins = {
  /** Default: minimal margins for inline charts */
  default: { top: 4, right: 8, bottom: 4, left: -20 },
  /** Compact: tighter margins for small/sparkline charts */
  compact: { top: 0, right: 4, bottom: 0, left: -24 },
  /** With labels: extra left margin for Y-axis labels */
  withLabels: { top: 8, right: 12, bottom: 8, left: 8 },
} as const;

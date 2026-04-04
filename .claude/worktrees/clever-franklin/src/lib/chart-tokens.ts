/**
 * Design token → hex map for Recharts.
 * Recharts does not read CSS custom properties — hex values must be passed directly.
 * Values are kept in sync with @theme tokens in globals.css.
 */

export const chartColors = {
  primary:   "#4f46e5", // indigo-600 — --color-primary
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

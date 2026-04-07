/**
 * status-theme.ts — Centralized Status, Risk, Severity, and Governance Color Mappings
 *
 * Single source of truth for all status, risk, severity, and governance health color schemes.
 * This ensures consistent styling across all components (badges, panels, dashboards, etc.)
 * while leveraging CSS custom properties defined in globals.css where available.
 *
 * Design token imports use @theme variables when available (status, risk tiers),
 * falling back to Tailwind utilities for derived patterns and helper styles.
 */

import type { BadgeVariant } from "@/components/ui/badge";

// ─── Type definitions ────────────────────────────────────────────────────────

export type StatusLevel = "draft" | "in_review" | "approved" | "deployed" | "rejected" | "deprecated" | "suspended";
export type RiskTier = "critical" | "high" | "medium" | "low";
export type SeverityLevel = "error" | "warning" | "info" | "success" | "neutral";
export type GovernanceHealth = "pass" | "warning" | "error" | "unvalidated";

// ─── Color scheme triplet type ──────────────────────────────────────────────

export interface ColorScheme {
  /** Background color class (e.g., "bg-success-muted", maps to --color-success-muted) */
  bg: string;
  /** Text color class (e.g., "text-success-text", maps to --color-success-text) */
  text: string;
  /** Border color class (e.g., "border-success-subtle", maps to --color-success-subtle) */
  border: string;
  /** Dot color for indicators (can be used in Badge dot prop) */
  dot?: string;
  /** Badge component variant to use (when explicit Badge is needed) */
  badge?: BadgeVariant;
}

// ─── Status Level Color Mappings ────────────────────────────────────────────

/**
 * STATUS_THEME — Blueprint and agent lifecycle statuses
 *
 * Each status gets:
 *   - bg: muted background (50 shade)
 *   - text: emphasized text (700–800 shade)
 *   - border: subtle border (200 shade)
 *   - badge: which Badge variant to use
 */
export const STATUS_THEME: Record<StatusLevel, ColorScheme> = {
  draft: {
    bg: "bg-gray-100 dark:bg-gray-800/40",
    text: "text-gray-700 dark:text-gray-300",
    border: "border-gray-200 dark:border-gray-700",
    badge: "neutral",
  },
  in_review: {
    bg: "bg-sky-50 dark:bg-sky-950/30",
    text: "text-sky-700 dark:text-sky-300",
    border: "border-sky-100 dark:border-sky-800",
    badge: "info",
  },
  approved: {
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-100 dark:border-emerald-800",
    badge: "success",
  },
  deployed: {
    bg: "bg-violet-50 dark:bg-violet-950/30",
    text: "text-violet-700 dark:text-violet-300",
    border: "border-violet-100 dark:border-violet-800",
    badge: "accent",
  },
  rejected: {
    bg: "bg-red-50 dark:bg-red-950/30",
    text: "text-red-700 dark:text-red-300",
    border: "border-red-100 dark:border-red-800",
    badge: "danger",
  },
  deprecated: {
    bg: "bg-amber-50 dark:bg-amber-950/30",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-100 dark:border-amber-800",
    badge: "muted",
  },
  suspended: {
    bg: "bg-red-50 dark:bg-red-950/30",
    text: "text-red-700 dark:text-red-300",
    border: "border-red-200 dark:border-red-800",
    badge: "danger",
  },
};

// ─── Risk Tier Color Mappings ───────────────────────────────────────────────

/**
 * RISK_THEME — Risk assessment tiers (critical, high, medium, low)
 * Uses CSS custom property tokens defined in globals.css via @theme
 *
 * Risk levels range from critical (red) to low (emerald), with orange/amber for high/medium
 */
export const RISK_THEME: Record<RiskTier, ColorScheme> = {
  critical: {
    bg: "bg-red-50 dark:bg-red-950/30",
    text: "text-red-700 dark:text-red-300",
    border: "border-red-400 dark:border-red-700",
    badge: "danger",
  },
  high: {
    bg: "bg-orange-50 dark:bg-orange-950/30",
    text: "text-orange-700 dark:text-orange-300",
    border: "border-orange-400 dark:border-orange-700",
    badge: "danger",
  },
  medium: {
    bg: "bg-amber-50 dark:bg-amber-950/30",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-400 dark:border-amber-700",
    badge: "warning",
  },
  low: {
    bg: "bg-sky-50 dark:bg-sky-950/30",
    text: "text-sky-700 dark:text-sky-300",
    border: "border-sky-300 dark:border-sky-700",
    badge: "success",
  },
};

// ─── Severity Level Color Mappings ──────────────────────────────────────────

/**
 * SEVERITY_THEME — Validation and policy violation severity levels
 * Used in validation reports, governance checks, and error displays
 */
export const SEVERITY_THEME: Record<SeverityLevel, ColorScheme> = {
  error: {
    bg: "bg-red-50 dark:bg-red-950/30",
    text: "text-red-700 dark:text-red-300",
    border: "border-red-200 dark:border-red-800",
    badge: "danger",
  },
  warning: {
    bg: "bg-yellow-50 dark:bg-yellow-950/30",
    text: "text-yellow-700 dark:text-yellow-300",
    border: "border-yellow-200 dark:border-yellow-800",
    badge: "warning",
  },
  info: {
    bg: "bg-sky-50 dark:bg-sky-950/30",
    text: "text-sky-700 dark:text-sky-300",
    border: "border-sky-100 dark:border-sky-800",
    badge: "info",
  },
  success: {
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-100 dark:border-emerald-800",
    badge: "success",
  },
  neutral: {
    bg: "bg-gray-50 dark:bg-gray-800/40",
    text: "text-gray-600 dark:text-gray-400",
    border: "border-gray-200 dark:border-gray-700",
    badge: "neutral",
  },
};

// ─── Governance Health Color Mappings ───────────────────────────────────────

/**
 * GOVERNANCE_THEME — Overall governance validation health status
 * Used in fleet governance dashboard, blueprint reviews, and validation summaries
 */
export const GOVERNANCE_THEME: Record<GovernanceHealth, ColorScheme> = {
  pass: {
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200 dark:border-emerald-800",
    badge: "success",
  },
  warning: {
    bg: "bg-amber-50 dark:bg-amber-950/30",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-800",
    badge: "warning",
  },
  error: {
    bg: "bg-red-50 dark:bg-red-950/30",
    text: "text-red-700 dark:text-red-300",
    border: "border-red-200 dark:border-red-800",
    badge: "danger",
  },
  unvalidated: {
    bg: "bg-surface-raised",
    text: "text-text-tertiary",
    border: "border-border",
    badge: "neutral",
  },
};

// ─── Helper functions ───────────────────────────────────────────────────────

/**
 * Get the color scheme for a given status level
 * @param status The status string to look up
 * @returns ColorScheme for the status, or default neutral if not found
 */
export function getStatusTheme(status: string): ColorScheme {
  const s = status as StatusLevel;
  return STATUS_THEME[s] ?? STATUS_THEME.draft;
}

/**
 * Get the color scheme for a given risk tier
 * @param tier The risk tier string (critical, high, medium, low)
 * @returns ColorScheme for the tier, or default low if not found
 */
export function getRiskTheme(tier: string): ColorScheme {
  const t = tier.toLowerCase() as RiskTier;
  return RISK_THEME[t] ?? RISK_THEME.low;
}

/**
 * Get the color scheme for a given severity level
 * @param level The severity level string (error, warning, info, success, neutral)
 * @returns ColorScheme for the level, or default neutral if not found
 */
export function getSeverityTheme(level: string): ColorScheme {
  const l = level.toLowerCase() as SeverityLevel;
  return SEVERITY_THEME[l] ?? SEVERITY_THEME.neutral;
}

/**
 * Get the color scheme for a given governance health status
 * @param health The governance health string (pass, warning, error, unvalidated)
 * @returns ColorScheme for the health, or default unvalidated if not found
 */
export function getGovernanceTheme(health: string): ColorScheme {
  const h = health.toLowerCase() as GovernanceHealth;
  return GOVERNANCE_THEME[h] ?? GOVERNANCE_THEME.unvalidated;
}

// ─── Convenience exports ────────────────────────────────────────────────────

/**
 * Status labels — human-readable names for each status
 */
export const STATUS_LABELS: Record<StatusLevel, string> = {
  draft: "Draft",
  in_review: "In Review",
  approved: "Approved",
  deployed: "Deployed",
  rejected: "Rejected",
  deprecated: "Deprecated",
  suspended: "Suspended",
};

/**
 * Risk tier labels — human-readable names for each risk tier
 */
export const RISK_LABELS: Record<RiskTier, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

/**
 * Governance health labels — human-readable names for each health status
 */
export const GOVERNANCE_LABELS: Record<GovernanceHealth, string> = {
  pass: "Passes governance",
  warning: "Warnings",
  error: "Errors",
  unvalidated: "Not validated",
};

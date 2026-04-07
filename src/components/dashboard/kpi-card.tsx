import Link from "next/link";

// ── KPI color variants ──────────────────────────────────────────────────────
// Each variant defines bg, border, text for light and dark mode.

export type KpiVariant = "compliant" | "caution" | "neutral" | "deployed" | "review" | "danger";

const VARIANT_STYLES: Record<KpiVariant, string> = {
  compliant: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100",
  caution:   "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100",
  neutral:   "bg-surface border-border text-text",
  deployed:  "bg-violet-50 dark:bg-violet-950/30 border-violet-200 dark:border-violet-800 text-violet-900 dark:text-violet-100",
  review:    "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100",
  danger:    "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-900 dark:text-red-100",
};

export interface KpiCardProps {
  label: string;
  value: number | string;
  sub: string;
  variant?: KpiVariant;
  /** @deprecated Use `variant` instead. Kept for backwards compatibility. */
  color?: string;
  subColor?: string;
  href?: string;
  trend?: { value: number; label?: string };
}

function resolveVariant(variant?: KpiVariant, color?: string): string {
  if (variant) return VARIANT_STYLES[variant] ?? VARIANT_STYLES.neutral;
  // Backwards compatibility: map old color strings to variants
  if (color?.includes("compliant")) return VARIANT_STYLES.compliant;
  if (color?.includes("caution"))   return VARIANT_STYLES.caution;
  if (color?.includes("deployed"))  return VARIANT_STYLES.deployed;
  if (color?.includes("review"))    return VARIANT_STYLES.review;
  if (color?.includes("danger"))    return VARIANT_STYLES.danger;
  return VARIANT_STYLES.neutral;
}

export function KpiCard({ label, value, sub, variant, color, subColor, href, trend }: KpiCardProps) {
  const isEmpty = value === 0;
  const variantClasses = resolveVariant(variant, color);

  const inner = (
    <div
      className={`rounded-xl border p-5 min-w-0 transition-all ${variantClasses} ${
        isEmpty ? "opacity-60 border-dashed" : ""
      } ${href ? "hover:shadow-md cursor-pointer" : ""}`}
    >
      <div className="flex items-baseline gap-2">
        <div className="text-3xl font-bold tabular-nums">{value}</div>
        {trend && (
          <div className={`text-xs flex items-center gap-0.5 ${
            trend.value > 0 ? "text-emerald-600 dark:text-emerald-400"
            : trend.value < 0 ? "text-red-500 dark:text-red-400"
            : "text-text-tertiary"
          }`}>
            {trend.value > 0 && "▲"}
            {trend.value < 0 && "▼"}
            {trend.value === 0 && "—"}
            {trend.value !== 0 && <span>{Math.abs(trend.value)}</span>}
          </div>
        )}
      </div>
      <div className="mt-1 text-sm font-medium leading-tight">{label}</div>
      <div className={`mt-0.5 text-xs truncate ${subColor ?? "text-text-tertiary"}`}>
        {sub}
        {trend?.label && <span className="ml-1">{trend.label}</span>}
      </div>
    </div>
  );

  return href ? <Link href={href}>{inner}</Link> : inner;
}

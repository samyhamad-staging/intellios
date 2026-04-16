/**
 * ClaimTag — Inline product-claim maturity tag.
 *
 * Renders a small pill next to any product claim to signal its status:
 *   live        — feature exists and works in the product today
 *   designed-to — built for this outcome; unproven at enterprise scale
 *   roadmap     — planned, not yet built
 *
 * Fulfills Audit #7: every verifiable claim on the marketing site is labeled.
 */

export type ClaimTagType = "live" | "designed-to" | "roadmap";

interface ClaimTagProps {
  type: ClaimTagType;
  className?: string;
}

const CONFIG: Record<ClaimTagType, { label: string; pill: string; dot: string; title: string }> = {
  "live": {
    label: "Live",
    pill: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    dot: "bg-emerald-500",
    title: "Verified product capability — available in the product today",
  },
  "designed-to": {
    label: "Designed to",
    pill: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    dot: "bg-amber-500",
    title: "Built for this outcome — architecture supports it, not yet validated at enterprise scale",
  },
  "roadmap": {
    label: "Roadmap",
    pill: "border-gray-400/30 bg-gray-500/10 text-gray-500 dark:text-gray-400",
    dot: "bg-gray-400",
    title: "Planned capability — not yet built",
  },
};

export function ClaimTag({ type, className = "" }: ClaimTagProps) {
  const c = CONFIG[type];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold leading-none align-middle ${c.pill} ${className}`}
      title={c.title}
    >
      <span className={`h-1 w-1 shrink-0 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

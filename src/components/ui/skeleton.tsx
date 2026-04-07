import { cn } from "./cn";

type SkeletonVariant = "text" | "circular" | "rectangular";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Height class, e.g. "h-4", "h-20". Defaults to "h-4". */
  height?: string;
  /** Visual variant: "text" (rounded-md, default), "circular" (rounded-full), "rectangular" (rounded-xl) */
  variant?: SkeletonVariant;
  /** Width class, e.g. "w-1/2", "w-full". Defaults to w-full. */
  width?: string;
}

function getVariantRadius(variant?: SkeletonVariant): string {
  switch (variant) {
    case "circular":
      return "rounded-full";
    case "rectangular":
      return "rounded-xl";
    case "text":
    default:
      return "rounded-md";
  }
}

export function Skeleton({
  height = "h-4",
  variant = "text",
  width = "w-full",
  className,
  ...props
}: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse bg-surface-muted",
        getVariantRadius(variant),
        height,
        width,
        className
      )}
      {...props}
    />
  );
}

interface SkeletonListProps {
  rows?: number;
  height?: string;
  gap?: string;
}

/** Pre-built skeleton for a list of card rows */
export function SkeletonList({ rows = 4, height = "h-20", gap = "space-y-3" }: SkeletonListProps) {
  return (
    <div
      className={gap}
      role="status"
      aria-label="Loading content"
      aria-live="polite"
      aria-busy="true"
    >
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} height={height} />
      ))}
      {/* Screen-reader text announces the loading state */}
      <span className="sr-only">Loading…</span>
    </div>
  );
}

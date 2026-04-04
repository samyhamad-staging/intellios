import { cn } from "./cn";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Height class, e.g. "h-4", "h-20". Defaults to "h-4". */
  height?: string;
}

export function Skeleton({ height = "h-4", className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-gray-100", height, className)}
      {...props}
    />
  );
}

/** Pre-built skeleton for a list of card rows */
export function SkeletonList({ rows = 4, height = "h-20" }: { rows?: number; height?: string }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} height={height} />
      ))}
    </div>
  );
}

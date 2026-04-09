export default function ReviewLoading() {
  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="h-7 w-36 animate-pulse rounded bg-surface-muted" />
          <div className="h-4 w-72 animate-pulse rounded bg-surface-muted" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-28 animate-pulse rounded-lg bg-surface-muted" />
          <div className="h-9 w-24 animate-pulse rounded-lg bg-surface-muted" />
        </div>
      </div>

      {/* Risk filter tabs */}
      <div className="flex gap-2">
        {[80, 72, 64, 56].map((w, i) => (
          <div key={i} className="h-8 animate-pulse rounded-full bg-surface-muted" style={{ width: w }} />
        ))}
      </div>

      {/* Queue list */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden shadow-[var(--shadow-card)]">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className={`flex items-center gap-4 px-5 py-4 ${i > 0 ? "border-t border-border" : ""}`}
          >
            <div className="h-5 w-5 animate-pulse rounded bg-surface-muted shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-48 animate-pulse rounded bg-surface-muted" />
              <div className="h-3 w-32 animate-pulse rounded bg-surface-muted" />
            </div>
            <div className="h-6 w-20 animate-pulse rounded-full bg-surface-muted" />
            <div className="h-5 w-16 animate-pulse rounded-full bg-surface-muted" />
            <div className="h-3 w-12 animate-pulse rounded bg-surface-muted" />
            <div className="h-4 w-4 animate-pulse rounded bg-surface-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}

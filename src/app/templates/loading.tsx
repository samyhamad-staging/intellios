export default function TemplatesLoading() {
  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div className="text-center space-y-2">
        <div className="h-8 w-48 mx-auto animate-pulse rounded bg-surface-muted" />
        <div className="h-4 w-80 mx-auto animate-pulse rounded bg-surface-muted" />
      </div>

      {/* Search + filters */}
      <div className="flex items-center gap-3 max-w-2xl mx-auto">
        <div className="h-10 flex-1 animate-pulse rounded-lg bg-surface-muted" />
        <div className="h-10 w-32 animate-pulse rounded-lg bg-surface-muted" />
      </div>

      {/* Vertical filter tabs */}
      <div className="flex justify-center gap-2">
        {[64, 80, 72, 56].map((w, i) => (
          <div key={i} className="h-8 animate-pulse rounded-full bg-surface-muted" style={{ width: w }} />
        ))}
      </div>

      {/* Template grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-surface p-5 space-y-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1.5">
                <div className="h-5 w-36 animate-pulse rounded bg-surface-muted" />
                <div className="h-3 w-20 animate-pulse rounded bg-surface-muted" />
              </div>
              <div className="h-5 w-16 animate-pulse rounded-full bg-surface-muted" />
            </div>
            <div className="space-y-1.5">
              <div className="h-3 w-full animate-pulse rounded bg-surface-muted" />
              <div className="h-3 w-4/5 animate-pulse rounded bg-surface-muted" />
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
              <div className="flex gap-1.5">
                <div className="h-4 w-14 animate-pulse rounded-full bg-surface-muted" />
                <div className="h-4 w-14 animate-pulse rounded-full bg-surface-muted" />
              </div>
              <div className="h-3 w-12 animate-pulse rounded bg-surface-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

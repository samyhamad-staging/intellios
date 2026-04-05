export default function GovernanceLoading() {
  return (
    <div className="p-6 space-y-8">
      {/* Page header */}
      <div className="space-y-1">
        <div className="h-7 w-48 animate-pulse rounded bg-surface-muted" />
        <div className="h-4 w-80 animate-pulse rounded bg-surface-muted" />
      </div>

      {/* KPI summary row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-surface p-4 space-y-2">
            <div className="h-3 w-24 animate-pulse rounded bg-surface-muted" />
            <div className="h-8 w-16 animate-pulse rounded bg-surface-muted" />
            <div className="h-3 w-32 animate-pulse rounded bg-surface-muted" />
          </div>
        ))}
      </div>

      {/* Policy frameworks */}
      <div className="space-y-4">
        <div className="h-5 w-36 animate-pulse rounded bg-surface-muted" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-surface p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-5 w-5 animate-pulse rounded-full bg-surface-muted" />
                <div className="h-4 w-32 animate-pulse rounded bg-surface-muted" />
              </div>
              <div className="space-y-1.5">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="flex items-center justify-between">
                    <div className="h-3 w-24 animate-pulse rounded bg-surface-muted" />
                    <div className="h-4 w-12 animate-pulse rounded-full bg-surface-muted" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Violations table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-5 w-40 animate-pulse rounded bg-surface-muted" />
          <div className="h-8 w-24 animate-pulse rounded-lg bg-surface-muted" />
        </div>
        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          <div className="border-b border-border-subtle p-4 flex gap-6">
            {[100, 80, 120, 80].map((w, i) => (
              <div key={i} className="h-3 animate-pulse rounded bg-surface-muted" style={{ width: w }} />
            ))}
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="border-b border-border-subtle p-4 flex items-center gap-6">
              <div className="h-4 w-40 animate-pulse rounded bg-surface-muted" />
              <div className="h-4 w-24 animate-pulse rounded-full bg-surface-muted" />
              <div className="h-4 w-32 animate-pulse rounded bg-surface-muted" />
              <div className="h-4 w-16 animate-pulse rounded-full bg-surface-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

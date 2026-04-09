export default function AgentDetailLoading() {
  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <div className="h-3 w-16 animate-pulse rounded bg-surface-muted" />
        <div className="h-3 w-3 animate-pulse rounded bg-surface-muted" />
        <div className="h-3 w-24 animate-pulse rounded bg-surface-muted" />
      </div>

      {/* Agent header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="h-8 w-56 animate-pulse rounded bg-surface-muted" />
            <div className="h-6 w-20 animate-pulse rounded-full bg-surface-muted" />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-4 w-24 animate-pulse rounded bg-surface-muted" />
            <div className="h-4 w-32 animate-pulse rounded bg-surface-muted" />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-28 animate-pulse rounded-lg bg-surface-muted" />
          <div className="h-9 w-9 animate-pulse rounded-lg bg-surface-muted" />
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border pb-px">
        {[64, 80, 72, 56, 80, 64].map((w, i) => (
          <div key={i} className="h-9 animate-pulse rounded-t bg-surface-muted" style={{ width: w }} />
        ))}
      </div>

      {/* Tab content — Blueprint view skeleton */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Identity section */}
          <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
            <div className="h-5 w-24 animate-pulse rounded bg-surface-muted" />
            <div className="space-y-2">
              <div className="h-4 w-full animate-pulse rounded bg-surface-muted" />
              <div className="h-4 w-5/6 animate-pulse rounded bg-surface-muted" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-surface-muted" />
            </div>
          </div>
          {/* Instructions section */}
          <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
            <div className="h-5 w-32 animate-pulse rounded bg-surface-muted" />
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-4 animate-pulse rounded bg-surface-muted" style={{ width: `${85 - i * 8}%` }} />
              ))}
            </div>
          </div>
        </div>
        {/* Sidebar */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-surface p-5 space-y-3">
            <div className="h-5 w-20 animate-pulse rounded bg-surface-muted" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="h-3 w-20 animate-pulse rounded bg-surface-muted" />
                <div className="h-3 w-28 animate-pulse rounded bg-surface-muted" />
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-border bg-surface p-5 space-y-3">
            <div className="h-5 w-28 animate-pulse rounded bg-surface-muted" />
            <div className="h-24 w-full animate-pulse rounded bg-surface-muted" />
          </div>
        </div>
      </div>
    </div>
  );
}

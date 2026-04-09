export default function DeployLoading() {
  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="h-7 w-48 animate-pulse rounded bg-surface-muted" />
          <div className="h-4 w-80 animate-pulse rounded bg-surface-muted" />
        </div>
      </div>

      {/* Deployment stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-surface p-4 space-y-2">
            <div className="h-3 w-24 animate-pulse rounded bg-surface-muted" />
            <div className="h-8 w-12 animate-pulse rounded bg-surface-muted" />
          </div>
        ))}
      </div>

      {/* Table toolbar */}
      <div className="flex items-center gap-3">
        <div className="h-9 w-64 animate-pulse rounded-lg bg-surface-muted" />
        <div className="flex gap-2">
          {[60, 72, 56].map((w, i) => (
            <div key={i} className="h-7 animate-pulse rounded-full bg-surface-muted" style={{ width: w }} />
          ))}
        </div>
      </div>

      {/* Agent table */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="border-b border-border-subtle p-4 flex gap-6">
          {[120, 80, 80, 100, 80].map((w, i) => (
            <div key={i} className="h-3 animate-pulse rounded bg-surface-muted" style={{ width: w }} />
          ))}
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="border-b border-border-subtle p-4 flex items-center gap-6">
            <div className="h-4 w-36 animate-pulse rounded bg-surface-muted" />
            <div className="h-5 w-16 animate-pulse rounded-full bg-surface-muted" />
            <div className="h-4 w-20 animate-pulse rounded bg-surface-muted" />
            <div className="h-4 w-24 animate-pulse rounded bg-surface-muted" />
            <div className="h-8 w-20 animate-pulse rounded-lg bg-surface-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}

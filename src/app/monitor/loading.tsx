export default function MonitorLoading() {
  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div className="space-y-1">
        <div className="h-7 w-32 animate-pulse rounded bg-surface-muted" />
        <div className="h-4 w-68 animate-pulse rounded bg-surface-muted" />
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-surface p-4 space-y-2">
            <div className="h-3 w-24 animate-pulse rounded bg-surface-muted" />
            <div className="h-8 w-14 animate-pulse rounded bg-surface-muted" />
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="h-9 w-56 animate-pulse rounded-lg bg-surface-muted" />
        <div className="flex gap-2">
          {[64, 80, 72, 68].map((w, i) => (
            <div key={i} className="h-7 animate-pulse rounded-full bg-surface-muted" style={{ width: w }} />
          ))}
        </div>
        <div className="ml-auto h-9 w-28 animate-pulse rounded-lg bg-surface-muted" />
      </div>

      {/* Agent health table */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="border-b border-border-subtle bg-surface-raised px-4 py-3 flex gap-6">
          {[140, 80, 100, 80, 100, 80].map((w, i) => (
            <div key={i} className="h-3 animate-pulse rounded bg-surface-muted" style={{ width: w }} />
          ))}
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="border-b border-border-subtle px-4 py-3 flex items-center gap-6">
            <div className="h-4 w-36 animate-pulse rounded bg-surface-muted" />
            <div className="h-5 w-20 animate-pulse rounded-full bg-surface-muted" />
            <div className="h-4 w-24 animate-pulse rounded bg-surface-muted" />
            <div className="h-4 w-16 animate-pulse rounded bg-surface-muted" />
            <div className="h-4 w-24 animate-pulse rounded bg-surface-muted" />
            <div className="h-4 w-16 animate-pulse rounded bg-surface-muted" />
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between border-t border-border pt-3">
        <div className="h-4 w-36 animate-pulse rounded bg-surface-muted" />
        <div className="flex gap-2">
          <div className="h-8 w-20 animate-pulse rounded-lg bg-surface-muted" />
          <div className="h-8 w-20 animate-pulse rounded-lg bg-surface-muted" />
        </div>
      </div>
    </div>
  );
}

export default function ComplianceLoading() {
  return (
    <div className="p-6 space-y-8">
      {/* Page header */}
      <div className="space-y-1">
        <div className="h-7 w-44 animate-pulse rounded bg-surface-muted" />
        <div className="h-4 w-72 animate-pulse rounded bg-surface-muted" />
      </div>

      {/* Status summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-surface p-4 space-y-2">
            <div className="h-3 w-28 animate-pulse rounded bg-surface-muted" />
            <div className="h-8 w-12 animate-pulse rounded bg-surface-muted" />
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="h-9 w-56 animate-pulse rounded-lg bg-surface-muted" />
        <div className="flex gap-2">
          {[64, 80, 72].map((w, i) => (
            <div key={i} className="h-7 animate-pulse rounded-full bg-surface-muted" style={{ width: w }} />
          ))}
        </div>
        <div className="ml-auto h-8 w-28 animate-pulse rounded-lg bg-surface-muted" />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="border-b border-border-subtle bg-surface-raised p-3 flex gap-4">
          {[120, 80, 100, 80, 120].map((w, i) => (
            <div key={i} className="h-3 animate-pulse rounded bg-surface-muted" style={{ width: w }} />
          ))}
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="border-b border-border-subtle p-3 flex items-center gap-4">
            <div className="h-4 w-36 animate-pulse rounded bg-surface-muted" />
            <div className="h-5 w-20 animate-pulse rounded-full bg-surface-muted" />
            <div className="h-4 w-24 animate-pulse rounded bg-surface-muted" />
            <div className="h-4 w-20 animate-pulse rounded bg-surface-muted" />
            <div className="h-4 w-28 animate-pulse rounded bg-surface-muted" />
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

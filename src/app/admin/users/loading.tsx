export default function AdminUsersLoading() {
  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <div className="h-3 w-12 animate-pulse rounded bg-surface-muted" />
        <div className="h-3 w-3 animate-pulse rounded bg-surface-muted" />
        <div className="h-3 w-20 animate-pulse rounded bg-surface-muted" />
      </div>

      {/* Page header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="h-7 w-36 animate-pulse rounded bg-surface-muted" />
          <div className="h-4 w-64 animate-pulse rounded bg-surface-muted" />
        </div>
        <div className="h-9 w-28 animate-pulse rounded-lg bg-surface-muted" />
      </div>

      {/* Search + filter */}
      <div className="flex items-center gap-3">
        <div className="h-9 w-64 animate-pulse rounded-lg bg-surface-muted" />
        <div className="h-9 w-32 animate-pulse rounded-lg bg-surface-muted" />
      </div>

      {/* Users table */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="border-b border-border-subtle p-4 flex gap-6">
          {[120, 160, 80, 100, 80].map((w, i) => (
            <div key={i} className="h-3 animate-pulse rounded bg-surface-muted" style={{ width: w }} />
          ))}
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="border-b border-border-subtle p-4 flex items-center gap-6">
            <div className="h-8 w-8 animate-pulse rounded-full bg-surface-muted shrink-0" />
            <div className="h-4 w-32 animate-pulse rounded bg-surface-muted" />
            <div className="h-4 w-44 animate-pulse rounded bg-surface-muted" />
            <div className="h-5 w-20 animate-pulse rounded-full bg-surface-muted" />
            <div className="h-3 w-20 animate-pulse rounded bg-surface-muted" />
            <div className="h-7 w-7 animate-pulse rounded bg-surface-muted" />
          </div>
        ))}
      </div>

      {/* Pending invitations */}
      <div className="space-y-3">
        <div className="h-5 w-40 animate-pulse rounded bg-surface-muted" />
        <div className="rounded-xl border border-dashed border-border bg-surface p-4 space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-4 w-40 animate-pulse rounded bg-surface-muted" />
              <div className="h-5 w-16 animate-pulse rounded-full bg-surface-muted" />
              <div className="h-3 w-24 animate-pulse rounded bg-surface-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

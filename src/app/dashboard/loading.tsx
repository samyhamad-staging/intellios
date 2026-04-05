export default function DashboardLoading() {
  return (
    <div className="p-6 space-y-8">
      {/* Page header */}
      <div className="space-y-1">
        <div className="h-7 w-40 animate-pulse rounded bg-surface-muted" />
        <div className="h-4 w-64 animate-pulse rounded bg-surface-muted" />
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-surface p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-3 w-24 animate-pulse rounded bg-surface-muted" />
              <div className="h-4 w-4 animate-pulse rounded bg-surface-muted" />
            </div>
            <div className="h-9 w-16 animate-pulse rounded bg-surface-muted" />
            <div className="h-3 w-32 animate-pulse rounded bg-surface-muted" />
          </div>
        ))}
      </div>

      {/* AI Briefing */}
      <div className="rounded-xl border border-border bg-surface p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-4 w-24 animate-pulse rounded bg-surface-muted" />
          <div className="h-3 w-20 animate-pulse rounded bg-surface-muted" />
        </div>
        <div className="h-4 w-full animate-pulse rounded bg-surface-muted" />
        <div className="h-4 w-5/6 animate-pulse rounded bg-surface-muted" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-surface-muted" />
      </div>

      {/* Two-column section: activity + status */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent activity */}
        <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-4 w-32 animate-pulse rounded bg-surface-muted" />
            <div className="h-4 w-16 animate-pulse rounded bg-surface-muted" />
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="h-7 w-7 animate-pulse rounded-full bg-surface-muted shrink-0" />
              <div className="flex-1 space-y-1">
                <div className="h-4 w-3/4 animate-pulse rounded bg-surface-muted" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-surface-muted" />
              </div>
              <div className="h-3 w-16 animate-pulse rounded bg-surface-muted" />
            </div>
          ))}
        </div>

        {/* Health status */}
        <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
          <div className="h-4 w-28 animate-pulse rounded bg-surface-muted" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="h-4 w-36 animate-pulse rounded bg-surface-muted" />
              <div className="h-5 w-16 animate-pulse rounded-full bg-surface-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

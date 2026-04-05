export default function ApprovalsLoading() {
  return (
    <div className="space-y-6 p-6">
      {/* Context banner skeleton */}
      <div className="rounded-xl border border-border bg-surface p-4">
        <div className="h-4 w-3/4 animate-pulse rounded bg-surface-muted" />
        <div className="mt-1.5 h-3 w-1/2 animate-pulse rounded bg-surface-muted" />
      </div>

      {/* Page header */}
      <div className="space-y-1">
        <div className="h-6 w-40 animate-pulse rounded bg-surface-muted" />
        <div className="h-4 w-72 animate-pulse rounded bg-surface-muted" />
      </div>

      {/* Review queue cards */}
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-surface p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="h-5 w-52 animate-pulse rounded bg-surface-muted" />
                <div className="flex items-center gap-2">
                  <div className="h-5 w-20 animate-pulse rounded-full bg-surface-muted" />
                  <div className="h-4 w-32 animate-pulse rounded bg-surface-muted" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-8 w-28 animate-pulse rounded-lg bg-surface-muted" />
                <div className="h-8 w-20 animate-pulse rounded-lg bg-surface-muted" />
              </div>
            </div>
            <div className="border-t border-border-subtle pt-3 flex items-center gap-6">
              <div className="h-3 w-28 animate-pulse rounded bg-surface-muted" />
              <div className="h-3 w-24 animate-pulse rounded bg-surface-muted" />
              <div className="h-3 w-32 animate-pulse rounded bg-surface-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

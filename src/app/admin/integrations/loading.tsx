export default function IntegrationsLoading() {
  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <div className="h-3 w-12 animate-pulse rounded bg-surface-muted" />
        <div className="h-3 w-3 animate-pulse rounded bg-surface-muted" />
        <div className="h-3 w-24 animate-pulse rounded bg-surface-muted" />
      </div>

      {/* Page header */}
      <div className="space-y-1">
        <div className="h-7 w-36 animate-pulse rounded bg-surface-muted" />
        <div className="h-4 w-80 animate-pulse rounded bg-surface-muted" />
      </div>

      {/* Integration cards grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-surface p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 animate-pulse rounded-lg bg-surface-muted shrink-0" />
              <div className="space-y-1 flex-1">
                <div className="h-5 w-28 animate-pulse rounded bg-surface-muted" />
                <div className="h-3 w-20 animate-pulse rounded bg-surface-muted" />
              </div>
              <div className="h-6 w-12 animate-pulse rounded-full bg-surface-muted" />
            </div>
            <div className="h-3 w-full animate-pulse rounded bg-surface-muted" />
            <div className="h-3 w-3/4 animate-pulse rounded bg-surface-muted" />
            <div className="pt-2 border-t border-border-subtle">
              <div className="h-8 w-24 animate-pulse rounded-lg bg-surface-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

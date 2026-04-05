export default function RegistryLoading() {
  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div className="space-y-1">
        <div className="h-7 w-36 animate-pulse rounded bg-surface-muted" />
        <div className="h-4 w-80 animate-pulse rounded bg-surface-muted" />
      </div>

      {/* Toolbar: search + filter chips + action button */}
      <div className="flex items-center gap-3">
        <div className="h-9 w-64 animate-pulse rounded-lg bg-surface-muted" />
        <div className="flex gap-2">
          {[56, 72, 64, 80, 60].map((w, i) => (
            <div key={i} className="h-7 animate-pulse rounded-full bg-surface-muted" style={{ width: w }} />
          ))}
        </div>
        <div className="ml-auto h-9 w-32 animate-pulse rounded-lg bg-surface-muted" />
      </div>

      {/* Agent cards grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-surface p-5 space-y-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1.5">
                <div className="h-5 w-40 animate-pulse rounded bg-surface-muted" />
                <div className="h-3 w-24 animate-pulse rounded bg-surface-muted" />
              </div>
              <div className="h-6 w-20 animate-pulse rounded-full bg-surface-muted" />
            </div>
            <div className="h-3 w-full animate-pulse rounded bg-surface-muted" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-surface-muted" />
            <div className="flex items-center justify-between pt-1 border-t border-border-subtle">
              <div className="flex gap-1.5">
                <div className="h-4 w-14 animate-pulse rounded-full bg-surface-muted" />
                <div className="h-4 w-18 animate-pulse rounded-full bg-surface-muted" />
              </div>
              <div className="h-3 w-20 animate-pulse rounded bg-surface-muted" />
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between border-t border-border pt-4">
        <div className="h-4 w-32 animate-pulse rounded bg-surface-muted" />
        <div className="flex gap-2">
          <div className="h-8 w-20 animate-pulse rounded-lg bg-surface-muted" />
          <div className="h-8 w-20 animate-pulse rounded-lg bg-surface-muted" />
        </div>
      </div>
    </div>
  );
}

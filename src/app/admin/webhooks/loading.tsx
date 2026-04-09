export default function WebhooksLoading() {
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
          <div className="h-7 w-28 animate-pulse rounded bg-surface-muted" />
          <div className="h-4 w-72 animate-pulse rounded bg-surface-muted" />
        </div>
        <div className="h-9 w-36 animate-pulse rounded-lg bg-surface-muted" />
      </div>

      {/* Webhooks list */}
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-surface p-5 space-y-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1.5">
                <div className="h-5 w-40 animate-pulse rounded bg-surface-muted" />
                <div className="h-3 w-64 animate-pulse rounded bg-surface-muted font-mono" />
              </div>
              <div className="flex gap-2">
                <div className="h-5 w-16 animate-pulse rounded-full bg-surface-muted" />
                <div className="h-7 w-7 animate-pulse rounded bg-surface-muted" />
              </div>
            </div>
            <div className="flex gap-1.5">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="h-5 w-24 animate-pulse rounded-full bg-surface-muted" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

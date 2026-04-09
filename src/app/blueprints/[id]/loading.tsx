export default function BlueprintDetailLoading() {
  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <div className="h-3 w-20 animate-pulse rounded bg-surface-muted" />
        <div className="h-3 w-3 animate-pulse rounded bg-surface-muted" />
        <div className="h-3 w-28 animate-pulse rounded bg-surface-muted" />
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-7 w-64 animate-pulse rounded bg-surface-muted" />
          <div className="flex items-center gap-3">
            <div className="h-5 w-16 animate-pulse rounded-full bg-surface-muted" />
            <div className="h-4 w-20 animate-pulse rounded bg-surface-muted" />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-24 animate-pulse rounded-lg bg-surface-muted" />
          <div className="h-9 w-32 animate-pulse rounded-lg bg-surface-muted" />
        </div>
      </div>

      {/* Section stepper */}
      <div className="flex gap-2">
        {["Identity", "Instructions", "Tools", "Knowledge", "Constraints", "Governance"].map((_, i) => (
          <div key={i} className="h-8 w-24 animate-pulse rounded-full bg-surface-muted" />
        ))}
      </div>

      {/* Blueprint content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3 space-y-6">
          <div className="rounded-xl border border-border bg-surface p-6 space-y-4">
            <div className="h-5 w-24 animate-pulse rounded bg-surface-muted" />
            <div className="space-y-2">
              <div className="h-4 w-full animate-pulse rounded bg-surface-muted" />
              <div className="h-4 w-5/6 animate-pulse rounded bg-surface-muted" />
              <div className="h-4 w-4/6 animate-pulse rounded bg-surface-muted" />
            </div>
          </div>
          <div className="rounded-xl border border-border bg-surface p-6 space-y-4">
            <div className="h-5 w-32 animate-pulse rounded bg-surface-muted" />
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-4 animate-pulse rounded bg-surface-muted" style={{ width: `${90 - i * 10}%` }} />
              ))}
            </div>
          </div>
        </div>
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border border-border bg-surface p-5 space-y-3">
            <div className="h-5 w-28 animate-pulse rounded bg-surface-muted" />
            <div className="h-32 w-full animate-pulse rounded bg-surface-muted" />
          </div>
        </div>
      </div>
    </div>
  );
}

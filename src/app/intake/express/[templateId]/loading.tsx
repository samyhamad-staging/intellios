export default function ExpressIntakeLoading() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-8 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <div className="h-3 w-16 animate-pulse rounded bg-surface-muted" />
        <div className="h-3 w-3 animate-pulse rounded bg-surface-muted" />
        <div className="h-3 w-20 animate-pulse rounded bg-surface-muted" />
        <div className="h-3 w-3 animate-pulse rounded bg-surface-muted" />
        <div className="h-3 w-32 animate-pulse rounded bg-surface-muted" />
      </div>

      {/* Page header */}
      <div className="space-y-2">
        <div className="h-7 w-56 animate-pulse rounded bg-surface-muted" />
        <div className="h-4 w-80 animate-pulse rounded bg-surface-muted" />
      </div>

      {/* Template info card */}
      <div className="rounded-xl border border-border bg-surface p-5 space-y-3">
        <div className="h-5 w-36 animate-pulse rounded bg-surface-muted" />
        <div className="h-4 w-full animate-pulse rounded bg-surface-muted" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-surface-muted" />
      </div>

      {/* Form fields */}
      <div className="space-y-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-3 w-24 animate-pulse rounded bg-surface-muted" />
            <div className="h-10 w-full animate-pulse rounded-lg bg-surface-muted" />
          </div>
        ))}
        <div className="space-y-1.5">
          <div className="h-3 w-28 animate-pulse rounded bg-surface-muted" />
          <div className="h-24 w-full animate-pulse rounded-lg bg-surface-muted" />
        </div>
      </div>

      {/* Submit button */}
      <div className="flex justify-end">
        <div className="h-10 w-36 animate-pulse rounded-lg bg-surface-muted" />
      </div>
    </div>
  );
}

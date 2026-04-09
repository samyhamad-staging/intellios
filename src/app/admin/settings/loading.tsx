export default function AdminSettingsLoading() {
  return (
    <div className="p-6 space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <div className="h-3 w-12 animate-pulse rounded bg-surface-muted" />
        <div className="h-3 w-3 animate-pulse rounded bg-surface-muted" />
        <div className="h-3 w-16 animate-pulse rounded bg-surface-muted" />
      </div>

      {/* Page header */}
      <div className="space-y-1">
        <div className="h-7 w-48 animate-pulse rounded bg-surface-muted" />
        <div className="h-4 w-72 animate-pulse rounded bg-surface-muted" />
      </div>

      {/* Settings sections */}
      {["Branding", "Deployment Targets", "Approval Chain", "Notifications"].map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-surface p-6 space-y-4">
          <div className="h-5 w-36 animate-pulse rounded bg-surface-muted" />
          <div className="h-4 w-64 animate-pulse rounded bg-surface-muted" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {Array.from({ length: 2 }).map((_, j) => (
              <div key={j} className="space-y-1.5">
                <div className="h-3 w-20 animate-pulse rounded bg-surface-muted" />
                <div className="h-10 w-full animate-pulse rounded-lg bg-surface-muted" />
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Save button */}
      <div className="flex justify-end">
        <div className="h-10 w-28 animate-pulse rounded-lg bg-surface-muted" />
      </div>
    </div>
  );
}

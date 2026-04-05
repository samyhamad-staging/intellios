export default function PipelineLoading() {
  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div className="space-y-1">
        <div className="h-7 w-48 animate-pulse rounded bg-surface-muted" />
        <div className="h-4 w-72 animate-pulse rounded bg-surface-muted" />
      </div>

      {/* Filter chips + sort */}
      <div className="flex items-center gap-2">
        {[80, 64, 72, 88, 64].map((w, i) => (
          <div key={i} className={`h-7 w-${w === 80 ? "20" : w === 64 ? "16" : w === 72 ? "18" : w === 88 ? "22" : "16"} animate-pulse rounded-full bg-surface-muted`} />
        ))}
        <div className="ml-auto h-8 w-28 animate-pulse rounded-lg bg-surface-muted" />
      </div>

      {/* Kanban columns */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {["Draft", "In Review", "Approved"].map((col) => (
          <div key={col} className="rounded-xl border border-border bg-surface p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-4 w-20 animate-pulse rounded bg-surface-muted" />
              <div className="h-5 w-7 animate-pulse rounded-full bg-surface-muted" />
            </div>
            {Array.from({ length: col === "In Review" ? 4 : 3 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-border-subtle bg-surface-raised p-3 space-y-2">
                <div className="h-4 w-3/4 animate-pulse rounded bg-surface-muted" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-surface-muted" />
                <div className="flex gap-1.5">
                  <div className="h-4 w-16 animate-pulse rounded-full bg-surface-muted" />
                  <div className="h-4 w-20 animate-pulse rounded-full bg-surface-muted" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

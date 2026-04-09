export default function IntakeSessionLoading() {
  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="h-3 w-16 animate-pulse rounded bg-surface-muted" />
          <div className="h-3 w-3 animate-pulse rounded bg-surface-muted" />
          <div className="h-3 w-28 animate-pulse rounded bg-surface-muted" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-24 animate-pulse rounded-lg bg-surface-muted" />
          <div className="h-8 w-20 animate-pulse rounded-lg bg-surface-muted" />
        </div>
      </div>

      {/* Domain progress strip */}
      <div className="border-b border-border px-6 py-2">
        <div className="flex gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-7 w-24 animate-pulse rounded-full bg-surface-muted" />
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 px-6 py-4 space-y-4">
          {/* Assistant message */}
          <div className="flex gap-3 max-w-2xl">
            <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-surface-muted" />
            <div className="space-y-2 flex-1">
              <div className="h-4 w-5/6 animate-pulse rounded bg-surface-muted" />
              <div className="h-4 w-4/6 animate-pulse rounded bg-surface-muted" />
              <div className="h-4 w-3/6 animate-pulse rounded bg-surface-muted" />
            </div>
          </div>
          {/* User message */}
          <div className="flex gap-3 max-w-2xl ml-auto">
            <div className="space-y-2 flex-1">
              <div className="h-4 w-4/6 ml-auto animate-pulse rounded bg-surface-muted" />
              <div className="h-4 w-3/6 ml-auto animate-pulse rounded bg-surface-muted" />
            </div>
            <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-surface-muted" />
          </div>
        </div>

        {/* Chat input area */}
        <div className="border-t border-border px-6 py-3">
          <div className="h-11 w-full animate-pulse rounded-xl bg-surface-muted" />
        </div>
      </div>
    </div>
  );
}

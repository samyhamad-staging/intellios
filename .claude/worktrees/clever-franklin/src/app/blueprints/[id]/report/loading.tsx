/**
 * Loading skeleton for the MRM Compliance Report page.
 *
 * Shown while assembleMRMReport() runs server-side (typically 2–5 seconds).
 * Matches the visual structure of the report so the transition is seamless.
 */
export default function ReportLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Toolbar skeleton ────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-8 py-3 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-4 w-48 animate-pulse rounded bg-gray-200" />
          <div className="h-5 w-24 animate-pulse rounded-full bg-gray-100" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-8 w-28 animate-pulse rounded-lg bg-gray-100" />
          <div className="h-8 w-32 animate-pulse rounded-lg bg-gray-100" />
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-8 py-10 space-y-8">
        {/* ── Cover section skeleton ──────────────────────────────────────── */}
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 animate-pulse rounded-xl bg-gray-100" />
            <div className="flex-1 space-y-2">
              <div className="h-7 w-64 animate-pulse rounded bg-gray-200" />
              <div className="h-4 w-40 animate-pulse rounded bg-gray-100" />
              <div className="flex gap-2 pt-1">
                <div className="h-5 w-20 animate-pulse rounded-full bg-gray-100" />
                <div className="h-5 w-24 animate-pulse rounded-full bg-gray-100" />
                <div className="h-5 w-32 animate-pulse rounded-full bg-gray-100" />
              </div>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4 border-t border-gray-100 pt-4 sm:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-1">
                <div className="h-3 w-20 animate-pulse rounded bg-gray-100" />
                <div className="h-4 w-28 animate-pulse rounded bg-gray-200" />
              </div>
            ))}
          </div>
        </div>

        {/* ── Section card skeletons (3) ──────────────────────────────────── */}
        {[
          { titleW: "w-52", rows: 4 },
          { titleW: "w-40", rows: 3 },
          { titleW: "w-56", rows: 5 },
        ].map((s, i) => (
          <div key={i} className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            {/* Section header */}
            <div className="mb-6 flex items-center gap-3 border-b border-gray-100 pb-4">
              <div className="h-7 w-7 animate-pulse rounded-full bg-gray-100" />
              <div className={`h-5 ${s.titleW} animate-pulse rounded bg-gray-200`} />
            </div>
            {/* Row skeletons */}
            <div className="space-y-3">
              {[...Array(s.rows)].map((_, j) => (
                <div key={j} className="flex items-start gap-4">
                  <div className="h-4 w-32 animate-pulse rounded bg-gray-100 shrink-0" />
                  <div className={`h-4 animate-pulse rounded bg-gray-200 ${j % 2 === 0 ? "w-64" : "w-48"}`} />
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* ── Progress indicator ───────────────────────────────────────────── */}
        <div className="flex items-center justify-center gap-3 pb-8 text-sm text-gray-400">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-t-gray-400" />
          Assembling compliance report…
        </div>
      </div>
    </div>
  );
}

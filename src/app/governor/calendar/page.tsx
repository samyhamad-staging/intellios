"use client";

import { useEffect, useState } from "react";
import { Calendar, Download, Clock, Shield, ChevronRight } from "lucide-react";
import { Heading } from "@/components/catalyst/heading";
import { SkeletonList } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

interface ReviewEvent {
  id: string;
  agentId: string;
  agentName: string;
  nextReviewDue: string;
  status: string;
  daysUntil: number;
  urgency: "overdue" | "urgent" | "upcoming" | "future";
}

interface PolicyEvent {
  id: string;
  name: string;
  type: string;
  annualReviewDue: string;
  daysUntil: number;
}

interface CalendarData {
  agentReviews: ReviewEvent[];
  policyReviews: PolicyEvent[];
}

export default function ComplianceCalendarPage() {
  const [data, setData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetch("/api/compliance/calendar")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load calendar");
        return r.json();
      })
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => { setFetchError(true); setLoading(false); });
  }, []);

  async function handleDownload() {
    setDownloading(true);
    try {
      const r = await fetch("/api/compliance/calendar.ics");
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "intellios-compliance.ics";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

  const urgencyColor: Record<string, string> = {
    overdue: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800",
    urgent:  "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    upcoming:"bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700",
    future:  "bg-surface-muted text-text-secondary border-border",
  };

  const urgencyLabel: Record<string, string> = {
    overdue: "Overdue",
    urgent:  "Due soon",
    upcoming:"Upcoming",
    future:  "Scheduled",
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Heading level={1} className="flex items-center gap-2">
            <Calendar className="h-6 w-6 text-violet-600 dark:text-violet-400" />
            Compliance Calendar
          </Heading>
          <p className="text-sm text-text-secondary mt-1">
            SR 11-7 periodic reviews and annual policy review deadlines
          </p>
        </div>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex items-center gap-2 rounded-lg border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/30 px-4 py-2 text-sm font-medium text-violet-700 dark:text-violet-300 hover:bg-violet-100 disabled:opacity-50 transition-colors"
        >
          <Download className="h-4 w-4" />
          {downloading ? "Downloading…" : "Export to Calendar (.ics)"}
        </button>
      </div>

      {loading && <SkeletonList rows={4} height="h-16" />}

      {/* W-06: Show a clear empty/error state when the API is unavailable */}
      {!loading && (fetchError || !data) && (
        <div className="rounded-xl border border-border bg-surface-muted p-10 text-center">
          <Calendar className="mx-auto h-10 w-10 text-text-tertiary mb-3" />
          <p className="text-sm font-medium text-text-secondary">No compliance events available</p>
          <p className="mt-1 text-xs text-text-tertiary">
            {fetchError
              ? "Unable to load calendar data. Please try again later."
              : "No SR 11-7 review dates or policy reviews are currently scheduled."}
          </p>
        </div>
      )}

      {!loading && !fetchError && data && (
        <>
          {/* Agent Periodic Reviews */}
          <section>
            <Heading level={2} className="mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-text-secondary" />
              Agent Periodic Reviews (SR 11-7)
              <span className="ml-auto text-xs font-normal text-text-secondary">
                {data.agentReviews.length} scheduled
              </span>
            </Heading>

            {data.agentReviews.length === 0 ? (
              <EmptyState
                icon={Clock}
                heading="No periodic reviews scheduled"
                subtext="Deploy agents and set review dates in the Registry to see them here."
                className="py-8 rounded-xl border border-border"
              />
            ) : (
              <div className="divide-y divide-border-subtle rounded-xl border border-border overflow-hidden">
                {data.agentReviews.map((ev) => (
                  <div key={ev.id} className="flex items-center gap-4 px-5 py-3.5 bg-surface hover:bg-surface-muted transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text truncate">{ev.agentName}</p>
                      <p className="text-xs text-text-secondary">
                        Due {new Date(ev.nextReviewDue).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${urgencyColor[ev.urgency]}`}>
                      {ev.daysUntil < 0 ? `${Math.abs(ev.daysUntil)}d overdue` :
                       ev.daysUntil === 0 ? "Due today" :
                       `${ev.daysUntil}d`} · {urgencyLabel[ev.urgency]}
                    </span>
                    <a
                      href={`/registry/${ev.agentId}`}
                      className="text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-200 transition-colors"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Policy Annual Reviews */}
          <section>
            <Heading level={2} className="mb-3 flex items-center gap-2">
              <Shield className="h-4 w-4 text-text-secondary" />
              Annual Policy Reviews
              <span className="ml-auto text-xs font-normal text-text-secondary">
                {data.policyReviews.length} upcoming
              </span>
            </Heading>

            {data.policyReviews.length === 0 ? (
              <EmptyState
                icon={Shield}
                heading="No policy reviews due"
                subtext="All policies are up to date. Annual reviews will appear here when they approach."
                className="py-8 rounded-xl border border-border"
              />
            ) : (
              <div className="divide-y divide-border-subtle rounded-xl border border-border overflow-hidden">
                {data.policyReviews.map((ev) => (
                  <div key={ev.id} className="flex items-center gap-4 px-5 py-3.5 bg-surface hover:bg-surface-muted transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text truncate">{ev.name}</p>
                      <p className="text-xs text-text-secondary capitalize">
                        {ev.type} · Annual review due {new Date(ev.annualReviewDue).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                      ev.daysUntil <= 30 ? urgencyColor.urgent : urgencyColor.future
                    }`}>
                      {ev.daysUntil}d remaining
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

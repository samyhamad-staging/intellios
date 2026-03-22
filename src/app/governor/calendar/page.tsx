"use client";

import { useEffect, useState } from "react";
import { Calendar, Download, Clock, Shield, ChevronRight } from "lucide-react";

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
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetch("/api/compliance/calendar")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
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
    overdue: "bg-red-100 text-red-700 border-red-200",
    urgent:  "bg-amber-100 text-amber-700 border-amber-200",
    upcoming:"bg-yellow-50 text-yellow-700 border-yellow-200",
    future:  "bg-slate-50 text-slate-600 border-slate-200",
  };

  const urgencyLabel: Record<string, string> = {
    overdue: "Overdue",
    urgent:  "Due soon",
    upcoming:"Upcoming",
    future:  "Scheduled",
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 flex items-center gap-2">
            <Calendar className="h-6 w-6 text-violet-600" />
            Compliance Calendar
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            SR 11-7 periodic reviews and annual policy review deadlines
          </p>
        </div>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-medium text-violet-700 hover:bg-violet-100 disabled:opacity-50 transition-colors"
        >
          <Download className="h-4 w-4" />
          {downloading ? "Downloading…" : "Export to Calendar (.ics)"}
        </button>
      </div>

      {loading && (
        <div className="text-center text-slate-500 py-16">Loading calendar…</div>
      )}

      {!loading && data && (
        <>
          {/* Agent Periodic Reviews */}
          <section>
            <h2 className="text-base font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-500" />
              Agent Periodic Reviews (SR 11-7)
              <span className="ml-auto text-xs font-normal text-slate-500">
                {data.agentReviews.length} scheduled
              </span>
            </h2>

            {data.agentReviews.length === 0 ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                No periodic reviews scheduled. Deploy agents and set review dates in the Registry.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden">
                {data.agentReviews.map((ev) => (
                  <div key={ev.id} className="flex items-center gap-4 px-5 py-3.5 bg-white hover:bg-slate-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{ev.agentName}</p>
                      <p className="text-xs text-slate-500">
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
                      className="text-violet-600 hover:text-violet-800 transition-colors"
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
            <h2 className="text-base font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <Shield className="h-4 w-4 text-slate-500" />
              Annual Policy Reviews
              <span className="ml-auto text-xs font-normal text-slate-500">
                {data.policyReviews.length} upcoming
              </span>
            </h2>

            {data.policyReviews.length === 0 ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                No policy reviews due in the next 12 months.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden">
                {data.policyReviews.map((ev) => (
                  <div key={ev.id} className="flex items-center gap-4 px-5 py-3.5 bg-white hover:bg-slate-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{ev.name}</p>
                      <p className="text-xs text-slate-500 capitalize">
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

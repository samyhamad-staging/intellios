"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { CheckSquare, AlertTriangle, Download } from "lucide-react";
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from "@/components/ui/table";
import { SkeletonList } from "@/components/ui/skeleton";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AtRiskAgent {
  blueprintId: string;
  agentId: string;
  agentName: string;
  status: string;
  version: string;
  issues: string[];
  healthStatus: string | null;
  lastCheckedAt: string | null;
}

interface ReviewQueueItem {
  blueprintId: string;
  agentId: string;
  agentName: string;
  version: string;
  submittedBy: string;
  ageHours: number;
  slaStatus: "ok" | "warning" | "breach";
}

interface PolicyCoverageItem {
  name: string;
  type: string;
  violationCount: number;
  affectedAgentCount: number;
}

interface OverdueReviewItem {
  blueprintId: string;
  agentId: string;
  agentName: string;
  version: string;
  nextReviewDue: string;
  lastPeriodicReviewAt: string | null;
}

interface PostureData {
  // KPIs
  deployedCount: number;
  healthCounts: { clean: number; critical: number; unknown: number };
  testCoverage: { total: number; tested: number; pct: number | null };
  reviewQueueCount: number;
  oldestReviewHours: number | null;
  atRiskCount: number;
  complianceRate: number | null;
  statusCounts: Record<string, number>;
  // Detailed
  atRiskAgents: AtRiskAgent[];
  reviewQueue: ReviewQueueItem[];
  policyCoverage: PolicyCoverageItem[];
  overdueReviews: OverdueReviewItem[];
}

interface AnalyticsData {
  monthlySubmissions: Array<{ month: string; count: number }>;
  monthlyApprovals: Array<{ month: string; count: number }>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatAge(hours: number): string {
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

const SLA_COLORS: Record<string, string> = {
  ok: "text-green-600",
  warning: "text-amber-600",
  breach: "text-red-600",
};

const SLA_LABELS: Record<string, string> = {
  ok: "On track",
  warning: "SLA warning",
  breach: "SLA breach",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CompliancePage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();

  const [posture, setPosture] = useState<PostureData | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Report download state
  const [downloading, setDownloading] = useState(false);

  async function handleDownloadReport() {
    setDownloading(true);
    try {
      const now = new Date();
      const period = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
      const res = await fetch(`/api/compliance/report?period=${period}`);
      if (!res.ok) throw new Error("Report failed");
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `compliance-report-${period}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // silently ignore download errors
    } finally {
      setDownloading(false);
    }
  }

  // Complete Review modal state
  const [completeModal, setCompleteModal] = useState<OverdueReviewItem | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [completeError, setCompleteError] = useState<string | null>(null);

  // Role gate — redirect non-authorized roles
  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (!session?.user) {
      router.push("/login");
      return;
    }
    const role = session.user.role;
    if (role !== "compliance_officer" && role !== "admin" && role !== "viewer") {
      router.push("/");
    }
  }, [session, sessionStatus, router]);

  useEffect(() => {
    if (sessionStatus !== "authenticated") return;
    const role = session?.user?.role;
    if (role !== "compliance_officer" && role !== "admin" && role !== "viewer") return;

    Promise.all([
      fetch("/api/compliance/posture").then((r) => r.json()),
      fetch("/api/governance/analytics").then((r) => r.json()),
    ])
      .then(([postureData, analyticsData]) => {
        setPosture(postureData as PostureData);
        setAnalytics(analyticsData as AnalyticsData);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load compliance data");
        setLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionStatus]);

  async function handleCompleteReview() {
    if (!completeModal) return;
    setCompleteError(null);
    setCompletingId(completeModal.blueprintId);
    try {
      const res = await fetch(
        `/api/blueprints/${completeModal.blueprintId}/periodic-review/complete`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes: reviewNotes || undefined }),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setCompleteError((data as { error?: string }).error ?? "Failed to complete review.");
        return;
      }
      // Refresh posture data and close modal
      const postureData = await fetch("/api/compliance/posture").then((r) => r.json());
      setPosture(postureData as PostureData);
      setCompleteModal(null);
      setReviewNotes("");
    } catch {
      setCompleteError("Something went wrong. Please try again.");
    } finally {
      setCompletingId(null);
    }
  }

  if (sessionStatus === "loading" || (loading && !error)) {
    return (
      <div className="px-6 py-6 space-y-4">
        <SkeletonList rows={4} height="h-16" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-red-600 mb-3">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-6 space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <CheckSquare size={20} className="text-violet-600" />
            <h1 className="text-xl font-semibold text-gray-900">Compliance Command Center</h1>
          </div>
          <p className="text-sm text-gray-500 pl-7">Enterprise compliance posture, at-risk agents, and review queue</p>
        </div>
        <div className="flex items-center gap-2">
          {(session?.user?.role === "admin" || session?.user?.role === "compliance_officer") && (
            <button
              onClick={handleDownloadReport}
              disabled={downloading}
              className="flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-sm text-violet-700 hover:bg-violet-100 transition-colors disabled:opacity-50"
            >
              <Download size={14} />
              {downloading ? "Generating…" : "Download Report"}
            </button>
          )}
          <Link
            href="/governance"
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:border-gray-400 hover:text-gray-900 transition-colors"
          >
            Governance Hub →
          </Link>
        </div>
      </div>

      <div className="space-y-6">
        {posture && (
          <>
            {/* ── Section A: Enterprise Posture KPIs ─────────────────────── */}
            <section>
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
                Enterprise Posture
              </h2>
              <div className="grid grid-cols-5 gap-4">
                {[
                  {
                    label: "Deployed Agents",
                    value: posture.deployedCount,
                    sub: `${posture.healthCounts.clean} healthy · ${posture.healthCounts.critical} critical`,
                    color:
                      posture.healthCounts.critical > 0
                        ? "bg-red-50 border-red-200 text-red-900"
                        : "bg-white border-gray-200 text-gray-900",
                    subColor:
                      posture.healthCounts.critical > 0
                        ? "text-red-600"
                        : "text-gray-400",
                  },
                  {
                    label: "Compliance Rate",
                    value:
                      posture.complianceRate != null
                        ? `${posture.complianceRate}%`
                        : "N/A",
                    sub: "of prod blueprints clean",
                    color:
                      posture.complianceRate != null &&
                      posture.complianceRate >= 80
                        ? "bg-green-50 border-green-200 text-green-900"
                        : posture.complianceRate != null &&
                          posture.complianceRate >= 50
                        ? "bg-amber-50 border-amber-200 text-amber-900"
                        : posture.complianceRate != null
                        ? "bg-red-50 border-red-200 text-red-900"
                        : "bg-white border-gray-200 text-gray-900",
                    subColor:
                      posture.complianceRate != null &&
                      posture.complianceRate >= 80
                        ? "text-green-600"
                        : posture.complianceRate != null &&
                          posture.complianceRate >= 50
                        ? "text-amber-600"
                        : posture.complianceRate != null
                        ? "text-red-600"
                        : "text-gray-400",
                  },
                  {
                    label: "Test Coverage",
                    value:
                      posture.testCoverage.pct != null
                        ? `${posture.testCoverage.pct}%`
                        : "N/A",
                    sub: `${posture.testCoverage.tested}/${posture.testCoverage.total} tested`,
                    color:
                      posture.testCoverage.pct != null &&
                      posture.testCoverage.pct >= 80
                        ? "bg-green-50 border-green-200 text-green-900"
                        : "bg-white border-gray-200 text-gray-900",
                    subColor:
                      posture.testCoverage.pct != null &&
                      posture.testCoverage.pct >= 80
                        ? "text-green-600"
                        : "text-gray-400",
                  },
                  {
                    label: "Review Queue",
                    value: posture.reviewQueueCount,
                    sub:
                      posture.oldestReviewHours != null
                        ? `oldest: ${formatAge(posture.oldestReviewHours)}`
                        : "empty",
                    color:
                      posture.oldestReviewHours != null &&
                      posture.oldestReviewHours >= 72
                        ? "bg-red-50 border-red-200 text-red-900"
                        : posture.oldestReviewHours != null &&
                          posture.oldestReviewHours >= 48
                        ? "bg-amber-50 border-amber-200 text-amber-900"
                        : "bg-white border-gray-200 text-gray-900",
                    subColor:
                      posture.oldestReviewHours != null &&
                      posture.oldestReviewHours >= 72
                        ? "text-red-600"
                        : posture.oldestReviewHours != null &&
                          posture.oldestReviewHours >= 48
                        ? "text-amber-600"
                        : "text-gray-400",
                  },
                  {
                    label: "At-Risk Agents",
                    value: posture.atRiskCount,
                    sub: "need attention",
                    color:
                      posture.atRiskCount > 0
                        ? "bg-amber-50 border-amber-200 text-amber-900"
                        : "bg-green-50 border-green-200 text-green-900",
                    subColor:
                      posture.atRiskCount > 0
                        ? "text-amber-600"
                        : "text-green-600",
                  },
                ].map(({ label, value, sub, color, subColor }) => {
                  const anchor = label === "At-Risk Agents" ? "#at-risk" : label === "Compliance Rate" ? "#policy-coverage" : label === "Review Queue" ? "#review-queue" : undefined;
                  const inner = (
                    <>
                      <div className="text-2xl font-bold">{value}</div>
                      <div className="mt-0.5 text-xs font-medium">{label}</div>
                      <div className={`mt-0.5 text-xs ${subColor}`}>{sub}</div>
                    </>
                  );
                  return anchor ? (
                    <a key={label} href={anchor} className={`block rounded-xl border p-4 hover:shadow-sm hover:border-violet-200 transition-all ${color}`}>
                      {inner}
                    </a>
                  ) : (
                    <div key={label} className={`rounded-xl border p-4 ${color}`}>
                      {inner}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* ── Section A2: Periodic Review Status ─────────────────────── */}
            <section>
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
                Periodic Review Status (SR 11-7)
              </h2>
              {(posture.overdueReviews?.length ?? 0) === 0 ? (
                <div className="rounded-xl border border-green-200 bg-green-50 p-5 text-center">
                  <p className="text-sm font-medium text-green-800">✓ All deployments on schedule</p>
                  <p className="mt-0.5 text-xs text-green-600">No deployed agents have overdue periodic reviews.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5">
                    <AlertTriangle size={14} className="text-red-600 shrink-0" />
                    <span className="text-sm font-medium text-red-800">
                      {posture.overdueReviews.length} agent{posture.overdueReviews.length !== 1 ? "s" : ""} with overdue periodic review
                    </span>
                  </div>
                  <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                    <Table striped>
                      <TableHead>
                        <TableRow>
                          <TableHeader>Agent</TableHeader>
                          <TableHeader>Review Due</TableHeader>
                          <TableHeader>Days Overdue</TableHeader>
                          <TableHeader>Last Review</TableHeader>
                          <TableHeader>Action</TableHeader>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {posture.overdueReviews.map((item) => {
                          const daysOverdue = Math.floor((Date.now() - new Date(item.nextReviewDue).getTime()) / (1000 * 60 * 60 * 24));
                          return (
                            <TableRow key={item.blueprintId}>
                              <TableCell>
                                <div className="font-medium text-gray-900">{item.agentName}</div>
                                <div className="text-xs text-gray-400">v{item.version}</div>
                              </TableCell>
                              <TableCell className="text-sm text-red-700">
                                {new Date(item.nextReviewDue).toLocaleDateString(undefined, { dateStyle: "medium" })}
                              </TableCell>
                              <TableCell>
                                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                                  {daysOverdue}d overdue
                                </span>
                              </TableCell>
                              <TableCell className="text-xs text-gray-500">
                                {item.lastPeriodicReviewAt
                                  ? new Date(item.lastPeriodicReviewAt).toLocaleDateString(undefined, { dateStyle: "medium" })
                                  : "Never"}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <Link href={`/registry/${item.agentId}`} className="text-xs text-blue-600 hover:underline">View →</Link>
                                  <button
                                    onClick={() => { setCompleteModal(item); setReviewNotes(""); setCompleteError(null); }}
                                    className="text-xs text-violet-700 hover:text-violet-900 font-medium"
                                  >
                                    Complete Review
                                  </button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </section>

            {/* ── Section B: At-Risk Agents ───────────────────────────────── */}
            <section id="at-risk">
              <div className="mb-4">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                  At-Risk Agents ({posture.atRiskCount})
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">Agents with unresolved validation errors</p>
              </div>
              {posture.atRiskAgents.length === 0 ? (
                <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center">
                  <p className="text-sm font-medium text-green-800">
                    ✓ No agents at risk
                  </p>
                  <p className="mt-1 text-xs text-green-600">
                    All approved and deployed blueprints pass governance and have
                    test coverage.
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                  <Table striped>
                    <TableHead>
                      <TableRow>
                        <TableHeader>Agent</TableHeader>
                        <TableHeader>Status</TableHeader>
                        <TableHeader>Issues</TableHeader>
                        <TableHeader>Health</TableHeader>
                        <TableHeader>Action</TableHeader>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {posture.atRiskAgents.map((agent) => (
                        <TableRow key={agent.blueprintId}>
                          <TableCell>
                            <div className="font-medium text-gray-900">
                              {agent.agentName}
                            </div>
                            <div className="text-xs text-gray-400">
                              v{agent.version}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs capitalize text-gray-600">
                              {agent.status.replace("_", " ")}
                            </span>
                          </TableCell>
                          <TableCell>
                            <ul className="space-y-0.5">
                              {agent.issues.map((issue, i) => (
                                <li
                                  key={i}
                                  className="text-xs text-amber-700"
                                >
                                  • {issue}
                                </li>
                              ))}
                            </ul>
                          </TableCell>
                          <TableCell>
                            {agent.healthStatus ? (
                              <span
                                className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                                  agent.healthStatus === "critical"
                                    ? "bg-red-100 text-red-700"
                                    : agent.healthStatus === "clean"
                                    ? "bg-green-100 text-green-700"
                                    : "bg-gray-100 text-gray-600"
                                }`}
                              >
                                {agent.healthStatus}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Link
                              href={`/registry/${agent.agentId}`}
                              className="text-xs text-blue-600 hover:underline"
                            >
                              View →
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </section>

            {/* ── Section C: Review Queue Pressure ───────────────────────── */}
            <section id="review-queue">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                  Review Queue ({posture.reviewQueueCount})
                </h2>
                {posture.reviewQueueCount > 0 && (
                  <Link
                    href="/review"
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Open Review Queue →
                  </Link>
                )}
              </div>

              {posture.reviewQueue.length === 0 ? (
                <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
                  <p className="text-sm text-gray-400">
                    No blueprints pending review
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {posture.reviewQueue
                    .sort((a, b) => b.ageHours - a.ageHours)
                    .map((item) => (
                      <Link
                        key={item.blueprintId}
                        href={`/registry/${item.agentId}`}
                        className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-5 py-3 hover:border-gray-400 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="min-w-0">
                            <span className="truncate font-medium text-sm text-gray-900">
                              {item.agentName}
                            </span>
                            <div className="text-xs text-gray-400">
                              v{item.version} · Submitted by {item.submittedBy}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                          <div className="text-right">
                            <div
                              className={`text-xs font-medium ${SLA_COLORS[item.slaStatus]}`}
                            >
                              {SLA_LABELS[item.slaStatus]}
                            </div>
                            <div className="text-xs text-gray-400">
                              {formatAge(item.ageHours)} in review
                            </div>
                          </div>
                          <span className="text-xs text-gray-400">View →</span>
                        </div>
                      </Link>
                    ))}
                </div>
              )}
            </section>

            {/* ── Section D: Policy Coverage Gaps ────────────────────────── */}
            <section id="policy-coverage">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
                Policy Coverage ({posture.policyCoverage.length} active policies)
              </h2>

              {posture.policyCoverage.length === 0 ? (
                <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
                  <p className="text-sm text-gray-400">
                    No active governance policies.{" "}
                    <Link
                      href="/governance"
                      className="text-blue-600 hover:underline"
                    >
                      Define policies →
                    </Link>
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                  <Table striped>
                    <TableHead>
                      <TableRow>
                        <TableHeader>Policy</TableHeader>
                        <TableHeader>Type</TableHeader>
                        <TableHeader>Violations</TableHeader>
                        <TableHeader>Affected Agents</TableHeader>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {posture.policyCoverage.map((policy) => (
                        <TableRow key={policy.name}>
                          <TableCell className="font-medium text-gray-900">
                            {policy.name}
                          </TableCell>
                          <TableCell>
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs capitalize text-gray-600">
                              {policy.type.replace("_", " ")}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            {policy.violationCount > 0 ? (
                              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                                {policy.violationCount}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">0</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {policy.affectedAgentCount > 0 ? (
                              <Link
                                href="/registry"
                                className="text-xs font-medium text-violet-600 hover:text-violet-700"
                              >
                                {policy.affectedAgentCount} agent{policy.affectedAgentCount !== 1 ? "s" : ""}
                              </Link>
                            ) : (
                              <span className="text-xs text-gray-400">0 agents</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {posture.policyCoverage.every(
                    (p) => p.violationCount === 0
                  ) && (
                    <div className="border-t border-gray-100 bg-green-50 px-4 py-3 text-xs text-green-700 text-center">
                      ✓ No active policy violations across all deployed blueprints
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* ── Section E: Activity Trends ──────────────────────────────── */}
            {analytics && (
              <section>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                    Activity Trends (last 6 months)
                  </h2>
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block h-2 w-2 rounded-full bg-blue-400" />
                      Submitted
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block h-2 w-2 rounded-full bg-green-400" />
                      Approved
                    </span>
                  </div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-5">
                  {analytics.monthlySubmissions.every((m) => m.count === 0) &&
                  analytics.monthlyApprovals.every((m) => m.count === 0) ? (
                    <div className="flex flex-col items-center gap-1 py-6 text-center">
                      <p className="text-sm text-gray-400">No submission activity in the last 6 months</p>
                      <p className="text-xs text-gray-300">Data will appear here once agents are submitted for review</p>
                    </div>
                  ) : (() => {
                    const maxCount = Math.max(
                      ...analytics.monthlySubmissions.map((m) => m.count),
                      ...analytics.monthlyApprovals.map((m) => m.count),
                      1
                    );
                    return (
                      <div className="space-y-2">
                        {analytics.monthlySubmissions.map((sub, i) => {
                          const appr = analytics.monthlyApprovals[i];
                          const subCount = sub.count;
                          const apprCount = appr?.count ?? 0;
                          const subPct = Math.round((subCount / maxCount) * 100);
                          const apprPct = Math.round((apprCount / maxCount) * 100);
                          // Format "2025-10" → "Oct 2025"
                          const [yr, mo] = sub.month.split("-");
                          const label = new Date(Number(yr), Number(mo) - 1, 1)
                            .toLocaleDateString("en-US", { month: "short", year: "numeric" });
                          return (
                            <div key={sub.month} className="grid grid-cols-[80px_1fr_72px] items-center gap-3">
                              <span className="text-xs text-gray-400 text-right whitespace-nowrap">{label}</span>
                              <div className="relative h-5 rounded bg-gray-50 overflow-hidden">
                                <div
                                  className="absolute inset-y-0 left-0 rounded bg-blue-100 transition-all"
                                  style={{ width: `${subPct}%` }}
                                />
                                <div
                                  className="absolute inset-y-0 left-0 rounded bg-green-400/70 transition-all"
                                  style={{ width: `${apprPct}%` }}
                                />
                              </div>
                              <div className="text-right text-xs text-gray-400 whitespace-nowrap">
                                {subCount} / {apprCount}
                              </div>
                            </div>
                          );
                        })}
                        <div className="mt-1 grid grid-cols-[80px_1fr_72px] gap-3">
                          <span />
                          <div className="text-xs text-gray-300">submitted / approved</div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {/* ── Complete Review Modal ──────────────────────────────────────────── */}
      {completeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
            <h3 className="mb-1 text-base font-semibold text-gray-900">Mark periodic review complete</h3>
            <p className="mb-4 text-sm text-gray-500">
              This will record completion for{" "}
              <span className="font-medium text-gray-900">{completeModal.agentName}</span>{" "}
              and schedule the next review based on the configured cadence.
            </p>

            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Review notes <span className="text-gray-400">(optional)</span>
              </label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={3}
                maxLength={1000}
                placeholder="Findings, actions taken, or conclusions from the review…"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 resize-none"
              />
            </div>

            {completeError && (
              <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {completeError}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setCompleteModal(null); setReviewNotes(""); setCompleteError(null); }}
                disabled={!!completingId}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCompleteReview}
                disabled={!!completingId}
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
              >
                {completingId ? "Completing…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

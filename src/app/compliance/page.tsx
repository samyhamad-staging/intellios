"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { CheckSquare, AlertTriangle } from "lucide-react";

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

  // Role gate — redirect non-authorized roles
  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (!session?.user) {
      router.push("/login");
      return;
    }
    const role = session.user.role;
    if (role !== "compliance_officer" && role !== "admin") {
      router.push("/");
    }
  }, [session, sessionStatus, router]);

  useEffect(() => {
    if (sessionStatus !== "authenticated") return;
    const role = session?.user?.role;
    if (role !== "compliance_officer" && role !== "admin") return;

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

  if (sessionStatus === "loading" || (loading && !error)) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-gray-400">Loading compliance posture…</p>
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
    <div className="px-8 py-8 space-y-8">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <CheckSquare size={20} className="text-violet-600" />
            <h1 className="text-xl font-semibold text-gray-900">Compliance Command Center</h1>
          </div>
          <p className="text-sm text-gray-500 pl-7">Enterprise compliance posture, at-risk agents, and review queue</p>
        </div>
        <Link
          href="/governance"
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:border-gray-400 hover:text-gray-900 transition-colors"
        >
          Governance Hub →
        </Link>
      </div>

      <div className="space-y-8">
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
                ].map(({ label, value, sub, color, subColor }) => (
                  <div key={label} className={`rounded-xl border p-4 ${color}`}>
                    <div className="text-2xl font-bold">{value}</div>
                    <div className="mt-0.5 text-xs font-medium">{label}</div>
                    <div className={`mt-0.5 text-xs ${subColor}`}>{sub}</div>
                  </div>
                ))}
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
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50">
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Agent</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Review Due</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Days Overdue</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Last Review</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {posture.overdueReviews.map((item) => {
                          const daysOverdue = Math.floor((Date.now() - new Date(item.nextReviewDue).getTime()) / (1000 * 60 * 60 * 24));
                          return (
                            <tr key={item.blueprintId} className="hover:bg-gray-50">
                              <td className="px-4 py-3">
                                <div className="font-medium text-gray-900">{item.agentName}</div>
                                <div className="text-xs text-gray-400">v{item.version}</div>
                              </td>
                              <td className="px-4 py-3 text-sm text-red-700">
                                {new Date(item.nextReviewDue).toLocaleDateString(undefined, { dateStyle: "medium" })}
                              </td>
                              <td className="px-4 py-3">
                                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                                  {daysOverdue}d overdue
                                </span>
                              </td>
                              <td className="px-4 py-3 text-xs text-gray-500">
                                {item.lastPeriodicReviewAt
                                  ? new Date(item.lastPeriodicReviewAt).toLocaleDateString(undefined, { dateStyle: "medium" })
                                  : "Never"}
                              </td>
                              <td className="px-4 py-3">
                                <Link href={`/registry/${item.agentId}`} className="text-xs text-blue-600 hover:underline">View →</Link>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>

            {/* ── Section B: At-Risk Agents ───────────────────────────────── */}
            <section>
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
                At-Risk Agents ({posture.atRiskCount})
              </h2>
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
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                          Agent
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                          Issues
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                          Health
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {posture.atRiskAgents.map((agent) => (
                        <tr key={agent.blueprintId} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">
                              {agent.agentName}
                            </div>
                            <div className="text-xs text-gray-400">
                              v{agent.version}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs capitalize text-gray-600">
                              {agent.status.replace("_", " ")}
                            </span>
                          </td>
                          <td className="px-4 py-3">
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
                          </td>
                          <td className="px-4 py-3">
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
                          </td>
                          <td className="px-4 py-3">
                            <Link
                              href={`/registry/${agent.agentId}`}
                              className="text-xs text-blue-600 hover:underline"
                            >
                              View →
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* ── Section C: Review Queue Pressure ───────────────────────── */}
            <section>
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
            <section>
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
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                          Policy
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                          Type
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                          Violations
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                          Affected Agents
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {posture.policyCoverage.map((policy) => (
                        <tr
                          key={policy.name}
                          className="hover:bg-gray-50"
                        >
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {policy.name}
                          </td>
                          <td className="px-4 py-3">
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs capitalize text-gray-600">
                              {policy.type.replace("_", " ")}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {policy.violationCount > 0 ? (
                              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                                {policy.violationCount}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">0</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {policy.affectedAgentCount > 0 ? (
                              <span className="text-xs font-medium text-red-700">
                                {policy.affectedAgentCount}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">0</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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

            {/* ── Section E: 30-Day Trends ────────────────────────────────── */}
            {analytics && (
              <section>
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
                  Activity Trends (last 6 months)
                </h2>
                <div className="rounded-xl border border-gray-200 bg-white p-5">
                  {(() => {
                    const maxCount = Math.max(
                      ...analytics.monthlySubmissions.map((m) => m.count),
                      ...analytics.monthlyApprovals.map((m) => m.count),
                      1
                    );
                    return (
                      <div className="space-y-3">
                        {analytics.monthlySubmissions.map((sub, i) => {
                          const appr = analytics.monthlyApprovals[i];
                          const subPct = Math.round(
                            (sub.count / maxCount) * 100
                          );
                          const apprPct = Math.round(
                            ((appr?.count ?? 0) / maxCount) * 100
                          );
                          return (
                            <div key={sub.month}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-gray-500">
                                  {sub.month}
                                </span>
                                <div className="flex items-center gap-4 text-xs text-gray-400">
                                  <span className="flex items-center gap-1">
                                    <span className="inline-block w-2 h-2 rounded-full bg-blue-400" />
                                    {sub.count} submitted
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <span className="inline-block w-2 h-2 rounded-full bg-green-400" />
                                    {appr?.count ?? 0} approved
                                  </span>
                                </div>
                              </div>
                              <div className="space-y-1">
                                <div className="h-2 w-full rounded-full bg-gray-100">
                                  <div
                                    className="h-2 rounded-full bg-blue-400 transition-all"
                                    style={{ width: `${subPct}%` }}
                                  />
                                </div>
                                <div className="h-2 w-full rounded-full bg-gray-100">
                                  <div
                                    className="h-2 rounded-full bg-green-400 transition-all"
                                    style={{ width: `${apprPct}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {analytics.monthlySubmissions.every(
                          (m) => m.count === 0
                        ) && (
                          <p className="text-center text-xs text-gray-400 py-4">
                            No submission activity in the last 6 months
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

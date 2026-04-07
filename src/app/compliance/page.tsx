"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { CheckSquare, AlertTriangle, Download, ClipboardList, FileCheck } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Heading, Subheading } from "@/components/catalyst/heading";
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from "@/components/ui/table";
import { TableToolbar, Pagination } from "@/components/ui/table-toolbar";
import { SectionHeading } from "@/components/ui/section-heading";
import { SkeletonList } from "@/components/ui/skeleton";
import { FormField } from "@/components/ui/form-field";

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
  ok: "text-success",
  warning: "text-warning",
  breach: "text-danger",
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

  // Search state for tables
  const [atRiskSearch, setAtRiskSearch] = useState("");
  const [atRiskPage, setAtRiskPage] = useState(1);
  const AT_RISK_PAGE_SIZE = 10;

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
          <p className="text-sm text-danger mb-3">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-sm text-text-secondary hover:text-text"
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
            <CheckSquare size={20} className="text-violet-600 dark:text-violet-400" />
            <Heading level={1}>Compliance Dashboard</Heading>
          </div>
          <p className="mt-0.5 text-sm text-text-secondary">Compliance posture and regulatory evidence</p>
        </div>
        <div className="flex items-center gap-2">
          {(session?.user?.role === "admin" || session?.user?.role === "compliance_officer") && (
            <button
              onClick={handleDownloadReport}
              disabled={downloading}
              className="flex items-center gap-1.5 rounded-lg border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/30 px-3 py-1.5 text-sm text-violet-700 dark:text-violet-300 hover:bg-violet-100 transition-colors disabled:opacity-50"
            >
              <Download size={14} />
              {downloading ? "Generating…" : "Download Report"}
            </button>
          )}
          <Link
            href="/governance"
            className="rounded-lg border border-border px-3 py-1.5 text-sm text-text-secondary hover:border-border-strong hover:text-text transition-colors"
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
              <SectionHeading className="mb-4 text-sm">
                Enterprise Posture
              </SectionHeading>
              <div className="grid grid-cols-5 gap-4">
                {[
                  {
                    label: "Deployed Agents",
                    value: posture.deployedCount,
                    sub: `${posture.healthCounts.clean} healthy · ${posture.healthCounts.critical} critical`,
                    color:
                      posture.healthCounts.critical > 0
                        ? "bg-danger-muted border-danger-muted text-danger-text"
                        : "bg-surface border-border text-text",
                    subColor:
                      posture.healthCounts.critical > 0
                        ? "text-danger"
                        : "text-text-tertiary",
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
                        ? "bg-success-muted border-success-muted text-success-text"
                        : posture.complianceRate != null &&
                          posture.complianceRate >= 50
                        ? "bg-warning-muted border-warning-muted text-warning-text"
                        : posture.complianceRate != null
                        ? "bg-danger-muted border-danger-muted text-danger-text"
                        : "bg-surface border-border text-text",
                    subColor:
                      posture.complianceRate != null &&
                      posture.complianceRate >= 80
                        ? "text-success"
                        : posture.complianceRate != null &&
                          posture.complianceRate >= 50
                        ? "text-warning"
                        : posture.complianceRate != null
                        ? "text-danger"
                        : "text-text-tertiary",
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
                        ? "bg-success-muted border-success-muted text-success-text"
                        : "bg-surface border-border text-text",
                    subColor:
                      posture.testCoverage.pct != null &&
                      posture.testCoverage.pct >= 80
                        ? "text-success"
                        : "text-text-tertiary",
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
                        ? "bg-danger-muted border-danger-muted text-danger-text"
                        : posture.oldestReviewHours != null &&
                          posture.oldestReviewHours >= 48
                        ? "bg-warning-muted border-warning-muted text-warning-text"
                        : "bg-surface border-border text-text",
                    subColor:
                      posture.oldestReviewHours != null &&
                      posture.oldestReviewHours >= 72
                        ? "text-danger"
                        : posture.oldestReviewHours != null &&
                          posture.oldestReviewHours >= 48
                        ? "text-warning"
                        : "text-text-tertiary",
                  },
                  {
                    label: "At-Risk Agents",
                    value: posture.atRiskCount,
                    sub: "need attention",
                    color:
                      posture.atRiskCount > 0
                        ? "bg-warning-muted border-warning-muted text-warning-text"
                        : "bg-success-muted border-success-muted text-success-text",
                    subColor:
                      posture.atRiskCount > 0
                        ? "text-warning"
                        : "text-success",
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
                    <a key={label} href={anchor} className={`block rounded-xl border p-4 hover:shadow-sm hover:border-violet-200 dark:hover:border-violet-800 transition-all ${color}`}>
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
              <SectionHeading className="mb-4 text-sm">
                Periodic Review Status (SR 11-7)
              </SectionHeading>
              {(posture.overdueReviews?.length ?? 0) === 0 ? (
                <div className="rounded-xl border border-success-muted bg-success-muted p-5 text-center">
                  <p className="text-sm font-medium text-success-text">✓ All deployments on schedule</p>
                  <p className="mt-0.5 text-xs text-success">No deployed agents have overdue periodic reviews.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 rounded-lg border border-danger-muted bg-danger-muted px-4 py-2.5">
                    <AlertTriangle size={14} className="text-red-600 dark:text-red-400 shrink-0" />
                    <span className="text-sm font-medium text-danger-text">
                      {posture.overdueReviews.length} agent{posture.overdueReviews.length !== 1 ? "s" : ""} with overdue periodic review
                    </span>
                  </div>
                  <div className="overflow-hidden rounded-xl border border-border bg-surface">
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
                            <TableRow key={item.blueprintId} className="interactive-row">
                              <TableCell>
                                <div className="font-medium text-text">{item.agentName}</div>
                                <div className="text-xs text-text-tertiary">v{item.version}</div>
                              </TableCell>
                              <TableCell className="text-sm text-danger-text">
                                {new Date(item.nextReviewDue).toLocaleDateString(undefined, { dateStyle: "medium" })}
                              </TableCell>
                              <TableCell>
                                <span className="rounded-full bg-danger-subtle px-2 py-0.5 text-xs font-medium text-danger-text">
                                  {daysOverdue}d overdue
                                </span>
                              </TableCell>
                              <TableCell className="text-xs text-text-secondary">
                                {item.lastPeriodicReviewAt
                                  ? new Date(item.lastPeriodicReviewAt).toLocaleDateString(undefined, { dateStyle: "medium" })
                                  : "Never"}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <Link href={`/registry/${item.agentId}`} className="text-xs text-primary hover:underline">View →</Link>
                                  <button
                                    onClick={() => { setCompleteModal(item); setReviewNotes(""); setCompleteError(null); }}
                                    className="text-xs text-violet-700 dark:text-violet-300 hover:text-violet-900 font-medium"
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
                <SectionHeading className="text-sm">
                  At-Risk Agents ({posture.atRiskCount})
                </SectionHeading>
                <p className="text-xs text-text-tertiary mt-0.5">Agents with unresolved validation errors</p>
              </div>
              {posture.atRiskAgents.length === 0 ? (
                <div className="rounded-xl border border-success-muted bg-success-muted p-6 text-center">
                  <p className="text-sm font-medium text-success-text">
                    ✓ No agents at risk
                  </p>
                  <p className="mt-1 text-xs text-success">
                    All approved and deployed blueprints pass governance and have
                    test coverage.
                  </p>
                </div>
              ) : (() => {
                const filteredAtRisk = posture.atRiskAgents.filter((a) =>
                  !atRiskSearch ||
                  a.agentName.toLowerCase().includes(atRiskSearch.toLowerCase()) ||
                  a.agentId.toLowerCase().includes(atRiskSearch.toLowerCase())
                );
                const pagedAtRisk = filteredAtRisk.slice((atRiskPage - 1) * AT_RISK_PAGE_SIZE, atRiskPage * AT_RISK_PAGE_SIZE);
                const totalAtRiskPages = Math.ceil(filteredAtRisk.length / AT_RISK_PAGE_SIZE);
                return (
                <>
                  <div className="mb-3">
                    <TableToolbar
                      searchPlaceholder="Search agent name or ID…"
                      searchValue={atRiskSearch}
                      onSearchChange={(value) => { setAtRiskSearch(value); setAtRiskPage(1); }}
                      resultCount={filteredAtRisk.length}
                      resultLabel="agent"
                    />
                  </div>
                  <div className="overflow-hidden rounded-xl border border-border bg-surface">
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
                      {pagedAtRisk
                        .map((agent) => (
                        <TableRow key={agent.blueprintId} className="interactive-row">
                          <TableCell>
                            <div className="font-medium text-text">
                              {agent.agentName}
                            </div>
                            <div className="text-xs text-text-tertiary">
                              v{agent.version}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs capitalize text-text-secondary">
                              {agent.status.replace("_", " ")}
                            </span>
                          </TableCell>
                          <TableCell>
                            <ul className="space-y-0.5">
                              {agent.issues.map((issue, i) => (
                                <li
                                  key={i}
                                  className="text-xs text-warning-text"
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
                                    ? "bg-danger-subtle text-danger-text"
                                    : agent.healthStatus === "clean"
                                    ? "bg-success-subtle text-success-text"
                                    : "bg-surface-muted text-text-secondary"
                                }`}
                              >
                                {agent.healthStatus}
                              </span>
                            ) : (
                              <span className="text-xs text-text-tertiary">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Link
                              href={`/registry/${agent.agentId}`}
                              className="text-xs text-primary hover:underline"
                            >
                              View →
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {totalAtRiskPages > 1 && (
                    <Pagination
                      currentPage={atRiskPage}
                      totalPages={totalAtRiskPages}
                      onPageChange={setAtRiskPage}
                    />
                  )}
                  </div>
                </>
                );
              })()}
            </section>

            {/* ── Section C: Review Queue Pressure ───────────────────────── */}
            <section id="review-queue">
              <div className="mb-4 flex items-center justify-between">
                <SectionHeading className="text-sm">
                  Review Queue ({posture.reviewQueueCount})
                </SectionHeading>
                {posture.reviewQueueCount > 0 && (
                  <Link
                    href="/review"
                    className="text-xs text-primary hover:underline"
                  >
                    Open Review Queue →
                  </Link>
                )}
              </div>

              {posture.reviewQueue.length === 0 ? (
                <EmptyState
                  icon={ClipboardList}
                  heading="No blueprints pending review"
                  subtext="All submitted blueprints have been reviewed. New submissions will appear here."
                />
              ) : (
                <div className="space-y-2">
                  {posture.reviewQueue
                    .sort((a, b) => b.ageHours - a.ageHours)
                    .map((item) => (
                      <Link
                        key={item.blueprintId}
                        href={`/registry/${item.agentId}`}
                        className="flex items-center justify-between rounded-lg border border-border bg-surface px-5 py-3 hover:border-border-strong transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="min-w-0">
                            <span className="truncate font-medium text-sm text-text">
                              {item.agentName}
                            </span>
                            <div className="text-xs text-text-tertiary">
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
                            <div className="text-xs text-text-tertiary">
                              {formatAge(item.ageHours)} in review
                            </div>
                          </div>
                          <span className="text-xs text-text-tertiary">View →</span>
                        </div>
                      </Link>
                    ))}
                </div>
              )}
            </section>

            {/* ── Section D: Policy Coverage Gaps ────────────────────────── */}
            <section id="policy-coverage">
              <SectionHeading className="mb-4 text-sm">
                Policy Coverage ({posture.policyCoverage.length} active policies)
              </SectionHeading>

              {posture.policyCoverage.length === 0 ? (
                <EmptyState
                  icon={FileCheck}
                  heading="No active governance policies"
                  subtext="Define policies in the Governance Hub to start tracking coverage across your agent fleet."
                  action={<Link href="/governance" className="text-sm text-primary hover:underline">Go to Governance Hub →</Link>}
                />
              ) : (
                <div className="overflow-hidden rounded-xl border border-border bg-surface">
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
                        <TableRow key={policy.name} className="interactive-row">
                          <TableCell className="font-medium text-text">
                            {policy.name}
                          </TableCell>
                          <TableCell>
                            <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs capitalize text-text-secondary">
                              {policy.type.replace("_", " ")}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            {policy.violationCount > 0 ? (
                              <span className="rounded-full bg-danger-subtle px-2 py-0.5 text-xs font-medium text-danger-text">
                                {policy.violationCount}
                              </span>
                            ) : (
                              <span className="text-xs text-text-tertiary">0</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {policy.affectedAgentCount > 0 ? (
                              <Link
                                href="/registry"
                                className="text-xs font-medium text-violet-600 dark:text-violet-400 hover:text-violet-700"
                              >
                                {policy.affectedAgentCount} agent{policy.affectedAgentCount !== 1 ? "s" : ""}
                              </Link>
                            ) : (
                              <span className="text-xs text-text-tertiary">0 agents</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {posture.policyCoverage.every(
                    (p) => p.violationCount === 0
                  ) && (
                    <div className="border-t border-border-subtle bg-green-50 dark:bg-emerald-950/30 px-4 py-3 text-xs text-green-700 dark:text-emerald-300 text-center">
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
                  <SectionHeading className="text-sm">
                    Activity Trends (last 6 months)
                  </SectionHeading>
                  <div className="flex items-center gap-4 text-xs text-text-tertiary">
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
                <div className="rounded-xl border border-border bg-surface p-5">
                  {analytics.monthlySubmissions.every((m) => m.count === 0) &&
                  analytics.monthlyApprovals.every((m) => m.count === 0) ? (
                    <div className="flex flex-col items-center gap-1 py-6 text-center">
                      <p className="text-sm text-text-tertiary">No submission activity in the last 6 months</p>
                      <p className="text-xs text-text-disabled">Data will appear here once agents are submitted for review</p>
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
                              <span className="text-xs text-text-tertiary text-right whitespace-nowrap">{label}</span>
                              <div className="relative h-5 rounded bg-surface-raised overflow-hidden">
                                <div
                                  className="absolute inset-y-0 left-0 rounded bg-blue-100 dark:bg-blue-900/40 transition-all"
                                  style={{ width: `${subPct}%` }}
                                />
                                <div
                                  className="absolute inset-y-0 left-0 rounded bg-green-400/70 dark:bg-green-500/50 transition-all"
                                  style={{ width: `${apprPct}%` }}
                                />
                              </div>
                              <div className="text-right text-xs text-text-tertiary whitespace-nowrap">
                                {subCount} / {apprCount}
                              </div>
                            </div>
                          );
                        })}
                        <div className="mt-1 grid grid-cols-[80px_1fr_72px] gap-3">
                          <span />
                          <div className="text-xs text-text-disabled">submitted / approved</div>
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
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl">
            <Subheading level={3} className="mb-1 text-text">Mark periodic review complete</Subheading>
            <p className="mb-4 text-sm text-text-secondary">
              This will record completion for{" "}
              <span className="font-medium text-text">{completeModal.agentName}</span>{" "}
              and schedule the next review based on the configured cadence.
            </p>

            <div className="mb-4">
              <FormField label="Review notes" htmlFor="compliance-review-notes" optional>
                <textarea
                  id="compliance-review-notes"
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={3}
                  maxLength={1000}
                  placeholder="Findings, actions taken, or conclusions from the review…"
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-text focus:outline-none focus:ring-1 focus:ring-text resize-none"
                />
              </FormField>
            </div>

            {completeError && (
              <p className="mb-3 rounded-lg bg-red-50 dark:bg-red-950/30 px-3 py-2 text-sm text-red-700 dark:text-red-300">
                {completeError}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setCompleteModal(null); setReviewNotes(""); setCompleteError(null); }}
                disabled={!!completingId}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-raised disabled:opacity-50"
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

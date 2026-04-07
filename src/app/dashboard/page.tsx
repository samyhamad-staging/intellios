"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import {
  fetchDashboardSummary,
  fetchDashboardBriefing,
  fetchMe,
} from "@/lib/query/fetchers";
import type { BriefingSummary } from "@/lib/query/fetchers";
import { Heading, Subheading } from "@/components/catalyst/heading";
import { KpiCard } from "@/components/dashboard/kpi-card";
import type { KpiVariant } from "@/components/dashboard/kpi-card";
import { SectionHeading } from "@/components/ui/section-heading";
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from "@/components/ui/table";

// ── AI Briefing Widget ────────────────────────────────────────────────────────

type HealthStatus = "healthy" | "degraded" | "critical" | "unknown";

const healthColors: Record<HealthStatus, string> = {
  healthy:  "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300",
  degraded: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300",
  critical: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300",
  unknown:  "bg-surface-raised border-border text-text",
};

const healthDot: Record<HealthStatus, string> = {
  healthy:  "bg-emerald-500",
  degraded: "bg-amber-500",
  critical: "bg-red-500",
  unknown:  "bg-text-tertiary",
};

function AiBriefingWidget({ briefing }: { briefing: BriefingSummary | null | undefined }) {
  if (!briefing) return null;

  const status = (briefing.healthStatus ?? "unknown") as HealthStatus;
  const preview = briefing.content.length > 240
    ? briefing.content.slice(0, 240).replace(/\s+\S*$/, "") + "…"
    : briefing.content;

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <Subheading level={2} className="text-text-tertiary">AI Briefing</Subheading>
        <Link href="/monitor/intelligence" className="text-xs text-text-tertiary hover:text-text transition-colors">
          View full briefing →
        </Link>
      </div>
      <div className={`rounded-xl border px-4 py-3.5 ${healthColors[status]}`}>
        <div className="flex items-start gap-3">
          <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${healthDot[status]}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-xs font-semibold capitalize">{status} · {briefing.briefingDate}</span>
              <span className="text-xs opacity-60">
                {new Date(briefing.generatedAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            <p className="text-sm leading-relaxed opacity-80">{preview}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "1d ago";
  if (diffDays < 30) return `${diffDays}d ago`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 8) return `${diffWeeks}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-surface-muted ${className ?? ""}`} />;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AnalyticsDashboardPage() {
  // ── Data fetching via React Query ─────────────────────────────────────────
  const { data: summary, isLoading: summaryLoading, error: summaryError } = useQuery({
    queryKey: queryKeys.dashboard.summary(),
    queryFn: fetchDashboardSummary,
    staleTime: 60_000,
  });

  const { data: briefing } = useQuery({
    queryKey: queryKeys.dashboard.briefing(),
    queryFn: fetchDashboardBriefing,
    staleTime: 5 * 60_000,
  });

  const { data: me } = useQuery({
    queryKey: queryKeys.me(),
    queryFn: fetchMe,
    staleTime: 10 * 60_000,
  });

  const loading = summaryLoading;
  const error = summaryError ? (summaryError as Error).message : null;
  const userRole = me?.role ?? null;

  const { total = 0, deployed = 0, approved = 0, inReview = 0, draft = 0, rejected = 0, deprecated = 0 } = summary?.counts ?? {};
  const { clean = 0, withErrors = 0, notValidated = 0, complianceRate = null } = summary?.governance ?? {};
  const recentDeployed = summary?.recentDeployed ?? [];
  const needingAttention = summary?.needingAttention ?? [];
  const policyCount = summary?.policyCount ?? 0;

  const nonDraft = total - draft;
  const deploymentRate = nonDraft > 0 ? Math.round((deployed / nonDraft) * 100) : null;

  const funnelStages = [
    { label: "Draft",     count: draft,    color: "dot-draft"    },
    { label: "In Review", count: inReview, color: "dot-review"   },
    { label: "Approved",  count: approved, color: "dot-approved" },
    { label: "Deployed",  count: deployed, color: "dot-deployed" },
  ];
  const funnelMax = Math.max(...funnelStages.map((s) => s.count), 1);

  return (
    <div className="max-w-screen-2xl mx-auto w-full px-6 py-6 space-y-6">
      {/* Page header */}
      <div>
        <Heading level={1}>Analytics</Heading>
        <p className="mt-0.5 text-sm text-text-secondary">
          Platform-wide metrics and performance insights
        </p>
      </div>

      {error && (
        <div className="rounded-lg border badge-gov-error p-4 text-sm">
          {error}
        </div>
      )}

      {/* ── Row 1: AI Briefing + Role Actions (high-value first) ─────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Briefing — promoted to top for immediate situational awareness */}
        <div>
          {loading ? (
            <SkeletonBlock className="h-28" />
          ) : (
            <AiBriefingWidget briefing={briefing} />
          )}
        </div>

        {/* Role-aware Next Actions */}
        {!loading && userRole && (() => {
          type Action = { label: string; sub: string; href: string; urgent?: boolean };
          const actions: Action[] = [];

          if (userRole === "architect") {
            actions.push(
              { label: "Continue your sessions", sub: `${draft} draft blueprint${draft !== 1 ? "s" : ""} in progress`, href: "/intake" },
              { label: "Review quality scores", sub: "Check AI feedback on your blueprints", href: "/blueprints" },
            );
          } else if (userRole === "reviewer" || userRole === "compliance_officer") {
            actions.push(
              {
                label: inReview > 0 ? `${inReview} blueprint${inReview !== 1 ? "s" : ""} awaiting review` : "Review queue is clear",
                sub: inReview > 0 ? "Check SLA deadlines before items become overdue" : "No blueprints currently in review",
                href: "/review",
                urgent: inReview > 0,
              },
              { label: "Governance compliance", sub: `${complianceRate !== null ? `${complianceRate}% compliance rate` : "Check fleet compliance posture"}`, href: "/governance" },
            );
          } else if (userRole === "governor" || userRole === "admin") {
            actions.push(
              {
                label: inReview > 0 ? `${inReview} pending approval${inReview !== 1 ? "s" : ""}` : "Approval queue clear",
                sub: inReview > 0 ? "Fleet-wide review queue" : "No blueprints awaiting approval",
                href: "/governor/approvals",
                urgent: inReview > 0,
              },
              { label: "Fleet health", sub: `${deployed} deployed · ${clean} clean · ${withErrors} with errors`, href: "/governor/fleet" },
            );
          }

          if (actions.length === 0) return null;

          return (
            <section>
              <SectionHeading className="mb-3">Your Next Actions</SectionHeading>
              <div className="space-y-2">
                {actions.map((action) => (
                  <Link
                    key={action.href + action.label}
                    href={action.href}
                    className={`flex items-center justify-between rounded-xl border px-4 py-3.5 transition-colors hover:shadow-sm ${
                      action.urgent
                        ? "border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-950/50"
                        : "border-border bg-surface hover:bg-surface-raised"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold truncate ${action.urgent ? "text-amber-900 dark:text-amber-200" : "text-text"}`}>
                        {action.label}
                      </p>
                      <p className={`mt-0.5 text-xs truncate ${action.urgent ? "text-amber-700 dark:text-amber-400" : "text-text-secondary"}`}>
                        {action.sub}
                      </p>
                    </div>
                    <ArrowRight className={`ml-3 h-4 w-4 shrink-0 ${action.urgent ? "text-amber-500" : "text-text-disabled"}`} />
                  </Link>
                ))}
              </div>
            </section>
          );
        })()}
      </div>

      {/* ── Row 2: Top-line KPIs ─────────────────────────────────────── */}
      <section>
        <SectionHeading className="mb-4">Platform Overview</SectionHeading>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Compliance Rate"
            value={loading ? "–" : complianceRate !== null ? `${complianceRate}%` : "—"}
            sub={`${policyCount} polic${policyCount === 1 ? "y" : "ies"} active`}
            variant={
              (complianceRate !== null && complianceRate >= 80
                ? "compliant"
                : complianceRate !== null && complianceRate >= 50
                ? "caution"
                : "neutral") as KpiVariant
            }
            href="/governance"
          />
          <KpiCard
            label="Deployed Agents"
            value={loading ? "–" : deployed}
            sub="live in production"
            variant="deployed"
            href="/deploy"
          />
          <KpiCard
            label="Pending Review"
            value={loading ? "–" : inReview}
            sub={inReview > 0 ? "awaiting decision" : "queue clear"}
            variant={inReview > 0 ? "review" : "neutral"}
            href="/review"
          />
          <KpiCard
            label="Deployment Rate"
            value={loading ? "–" : deploymentRate !== null ? `${deploymentRate}%` : "—"}
            sub="of non-draft agents"
            variant="neutral"
          />
        </div>
      </section>

      {/* ── Row 3: Pipeline funnel + Governance health ──────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline funnel */}
        <section>
          <SectionHeading className="mb-4">Pipeline Funnel</SectionHeading>
          <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => <SkeletonBlock key={i} className="h-8" />)}
              </div>
            ) : (
              <>
                {funnelStages.map((stage) => (
                  <div key={stage.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-text">{stage.label}</span>
                      <span className="text-sm font-semibold tabular-nums text-text">{stage.count}</span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-surface-muted">
                      <div
                        className={`h-2.5 rounded-full ${stage.color} transition-all duration-500`}
                        style={{ width: `${(stage.count / funnelMax) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}

                {/* Terminal states */}
                <div className="border-t border-border-subtle pt-3 grid grid-cols-2 gap-3 text-center">
                  <div>
                    <div className="text-xs text-text-tertiary">Rejected</div>
                    <div className="text-lg font-semibold tabular-nums text-[color:var(--status-rejected-text)]">{rejected}</div>
                  </div>
                  <div>
                    <div className="text-xs text-text-tertiary">Deprecated</div>
                    <div className="text-lg font-semibold tabular-nums text-[color:var(--status-deprecated-badge-text)]">{deprecated}</div>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Governance health */}
        <section>
          <SectionHeading className="mb-4">Governance Health</SectionHeading>
          <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
            {loading ? (
              <div className="space-y-3">
                <SkeletonBlock className="h-20" />
                <SkeletonBlock className="h-16" />
              </div>
            ) : (
              <>
                {/* Summary cards */}
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-lg badge-gov-pass p-3">
                    <div className="text-2xl font-bold tabular-nums">{clean}</div>
                    <div className="text-xs mt-0.5">Passing</div>
                  </div>
                  <div className="rounded-lg badge-gov-error p-3">
                    <div className="text-2xl font-bold tabular-nums">{withErrors}</div>
                    <div className="text-xs mt-0.5">With Errors</div>
                  </div>
                  <div className="rounded-lg bg-surface-raised p-3">
                    <div className="text-2xl font-bold tabular-nums text-text">{notValidated}</div>
                    <div className="text-xs text-text-secondary mt-0.5">Unvalidated</div>
                  </div>
                </div>

                {/* Top violations */}
                {needingAttention.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-text-secondary mb-2">Top issues to resolve</p>
                    <div className="space-y-1.5">
                      {needingAttention.map((agent) => (
                        <Link
                          key={agent.agentId}
                          href={`/registry/${agent.agentId}?tab=governance`}
                          className="flex items-center justify-between rounded-lg border border-[color:var(--gov-error-border)] bg-surface px-3 py-2 hover:border-[color:var(--gov-error-icon)] transition-colors"
                        >
                          <span className="text-sm text-text truncate">
                            {agent.name ?? `Agent ${agent.agentId.slice(0, 8)}`}
                          </span>
                          <span className="shrink-0 ml-2 text-xs font-medium text-[color:var(--gov-error-text)]">
                            {agent.violationCount} error{agent.violationCount !== 1 ? "s" : ""}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {needingAttention.length === 0 && (
                  <div className="text-center py-3">
                    <p className="text-sm font-medium text-[color:var(--gov-pass-text)]">✓ No governance errors detected</p>
                    <p className="text-xs text-[color:var(--gov-pass-icon)] mt-0.5">{clean} validated agent{clean !== 1 ? "s" : ""} passing</p>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </div>

      {/* ── Row 4: Recent deployments ────────────────────────────────── */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <Subheading level={2} className="text-text-tertiary">Recent Deployments</Subheading>
          <Link href="/deploy" className="text-xs text-text-tertiary hover:text-text transition-colors">
            View all →
          </Link>
        </div>

        {loading && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <SkeletonBlock key={i} className="h-12" />)}
          </div>
        )}

        {!loading && recentDeployed.length === 0 && (
          <div className="rounded-card border border-dashed border-border bg-surface p-8 text-center">
            <p className="text-sm text-text-tertiary">No agents deployed yet.</p>
            {approved > 0 && (
              <p className="mt-1 text-xs text-text-tertiary">
                {approved} approved agent{approved !== 1 ? "s" : ""} ready to deploy.{" "}
                <Link href="/deploy" className="underline hover:text-text-secondary">
                  Go to Deployment Console →
                </Link>
              </p>
            )}
          </div>
        )}

        {!loading && recentDeployed.length > 0 && (
          <div className="overflow-hidden rounded-card border border-border bg-surface">
            <Table striped>
              <TableHead>
                <TableRow>
                  <TableHeader>Agent</TableHeader>
                  <TableHeader>Version</TableHeader>
                  <TableHeader className="hidden sm:table-cell">Tags</TableHeader>
                  <TableHeader>Deployed</TableHeader>
                  <TableHeader></TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {recentDeployed.map((agent) => (
                  <TableRow key={agent.agentId} className="interactive-row">
                    <TableCell className="font-medium text-text">
                      {agent.name ?? `Agent ${agent.agentId.slice(0, 8)}`}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-text-secondary">v{agent.version}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="flex gap-1">
                        {(agent.tags ?? []).slice(0, 2).map((tag) => (
                          <span key={tag} className="rounded-full bg-surface-muted px-1.5 py-0.5 text-xs text-text-secondary">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-text-tertiary">{timeAgo(agent.updatedAt)}</TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/registry/${agent.agentId}`}
                        className="text-xs text-text-tertiary hover:text-text underline"
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
    </div>
  );
}

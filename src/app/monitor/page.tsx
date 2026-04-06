"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import Link from "next/link";
import { StatusBadge } from "@/components/registry/status-badge";
import { TableToolbar, Pagination } from "@/components/ui/table-toolbar";
import { Heading } from "@/components/catalyst/heading";
import { SectionHeading } from "@/components/ui/section-heading";
import { Activity, RefreshCw, Cpu, CheckCircle2, SearchX, Clock, AlertCircle } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from "@/components/ui/table";

interface AgentHealth {
  agentId: string;
  blueprintId: string;
  name: string | null;
  version: string;
  tags: string[];
  deployedAt: string;
  deploymentTarget: string | null;
  healthStatus: "clean" | "degraded" | "critical" | "unknown";
  errorCount: number;
  warningCount: number;
  lastCheckedAt: string | null;
  productionErrorRate: number | null;
  productionLatencyP99: number | null;
  lastTelemetryAt: string | null;
  governanceDrift: { status?: string; newViolations?: unknown[]; checkedAt?: string } | null;
}

type BedrockAgentStatus =
  | "PREPARED"
  | "FAILED"
  | "CREATING"
  | "PREPARING"
  | "NOT_PREPARED"
  | "DELETING"
  | "UNREACHABLE";

interface AgentCoreHealthEntry {
  blueprintId: string;
  agentId: string;
  agentName: string | null;
  region: string;
  bedrockStatus: BedrockAgentStatus;
  lastDeployedAt: string;
}

interface AgentCoreHealthSummary {
  total: number;
  prepared: number;
  unreachable: number;
  other: number;
}

interface MonitorSummary {
  total: number;
  clean: number;
  degraded: number;
  critical: number;
  unknown: number;
}

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  if (diffMins < 2) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 30) return `${diffDays} days ago`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 8) return `${diffWeeks}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

function HealthBadge({ status, errorCount }: { status: "clean" | "degraded" | "critical" | "unknown"; errorCount: number }) {
  if (status === "clean") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
        ✓ Clean
      </span>
    );
  }
  if (status === "degraded") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
        ⚠ Degraded
      </span>
    );
  }
  if (status === "critical") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
        ! {errorCount} Error{errorCount === 1 ? "" : "s"}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-2.5 py-0.5 text-xs font-medium text-text-secondary">
      Not checked
    </span>
  );
}

function KpiCard({
  label,
  value,
  sub,
  color,
  subColor,
}: {
  label: string;
  value: number;
  sub: string;
  color: string;
  subColor: string;
}) {
  return (
    <div className={`rounded-xl border p-5 ${color}`}>
      <div className="text-3xl font-bold">{value}</div>
      <div className="mt-1 text-sm font-semibold">{label}</div>
      <div className={`mt-0.5 text-xs ${subColor}`}>{sub}</div>
    </div>
  );
}

export default function MonitorPage() {
  const { data: sessionData } = useSession();
  const queryClient = useQueryClient();
  const role = sessionData?.user?.role ?? "";

  const {
    data: monitorData,
    isLoading: loading,
  } = useQuery({
    queryKey: queryKeys.monitor.agents(),
    queryFn: async () => {
      const res = await fetch("/api/monitor");
      if (!res.ok) throw new Error("Failed to load monitor data");
      return res.json() as Promise<{ agents: AgentHealth[]; summary: MonitorSummary }>;
    },
    // Refresh every 30s while the tab is focused — matches the old polling pattern
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });
  const agents = monitorData?.agents ?? [];
  const summary = monitorData?.summary ?? { total: 0, clean: 0, degraded: 0, critical: 0, unknown: 0 };

  const [checkingAll, setCheckingAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [healthFilter, setHealthFilter] = useState<"all" | "clean" | "degraded" | "critical" | "unknown">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  // P1-33: Per-agent alert acknowledgement — client-side, browser-local
  const ACK_KEY = "monitor-ack";
  const [acknowledgedAgentIds, setAcknowledgedAgentIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem("monitor-ack");
      return raw ? new Set<string>(JSON.parse(raw) as string[]) : new Set<string>();
    } catch { return new Set<string>(); }
  });

  function toggleAckAgent(agentId: string) {
    setAcknowledgedAgentIds((prev) => {
      const next = new Set(prev);
      if (next.has(agentId)) { next.delete(agentId); } else { next.add(agentId); }
      try { localStorage.setItem(ACK_KEY, JSON.stringify([...next])); } catch { /* quota */ }
      return next;
    });
  }

  // AgentCore live status
  const [agcHealth, setAgcHealth] = useState<AgentCoreHealthEntry[]>([]);
  const [agcSummary, setAgcSummary] = useState<AgentCoreHealthSummary | null>(null);
  const [checkingAgc, setCheckingAgc] = useState(false);
  const [agcError, setAgcError] = useState<string | null>(null);

  async function handleCheckAll() {
    setCheckingAll(true);
    try {
      await fetch("/api/monitor/check-all", { method: "POST" });
      await queryClient.invalidateQueries({ queryKey: queryKeys.monitor.agents() });
    } finally {
      setCheckingAll(false);
    }
  }

  // ── Optimistic single-agent health check ─────────────────────────────────
  const checkOneMutation = useMutation({
    mutationFn: (targetAgentId: string) =>
      fetch(`/api/monitor/${targetAgentId}/check`, { method: "POST" }),
    onMutate: async (targetAgentId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.monitor.agents() });
      const previous = queryClient.getQueryData<{ agents: AgentHealth[]; summary: MonitorSummary }>(
        queryKeys.monitor.agents()
      );
      // Optimistically mark the agent as "unknown" to signal the check is running
      if (previous) {
        queryClient.setQueryData<{ agents: AgentHealth[]; summary: MonitorSummary }>(
          queryKeys.monitor.agents(),
          {
            ...previous,
            agents: previous.agents.map((a) =>
              a.agentId === targetAgentId
                ? { ...a, healthStatus: "unknown" as const, lastCheckedAt: new Date().toISOString() }
                : a
            ),
          }
        );
      }
      return { previous };
    },
    onError: (_err, _targetAgentId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.monitor.agents(), context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.monitor.agents() });
    },
  });

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return agents.filter((a) => {
      const matchesSearch =
        !q ||
        (a.name ?? "").toLowerCase().includes(q) ||
        a.agentId.toLowerCase().includes(q);
      const matchesHealth =
        healthFilter === "all" || a.healthStatus === healthFilter;
      return matchesSearch && matchesHealth;
    });
  }, [agents, searchQuery, healthFilter]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, healthFilter]);

  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const canCheck = role === "compliance_officer" || role === "admin";

  // Whether any agents are deployed to AgentCore (controls section visibility)
  const hasAgentCoreAgents = agents.some((a) => a.deploymentTarget === "agentcore");

  async function handleCheckAgcHealth() {
    setCheckingAgc(true);
    setAgcError(null);
    try {
      const res = await fetch("/api/monitor/agentcore-health");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setAgcError(data.message ?? "Failed to check AgentCore health");
        return;
      }
      const data = await res.json();
      setAgcHealth(data.agents ?? []);
      setAgcSummary(data.summary ?? null);
    } catch {
      setAgcError("Network error — unable to reach AgentCore health endpoint");
    } finally {
      setCheckingAgc(false);
    }
  }

  return (
    <main className="px-6 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Activity size={20} className="text-violet-600" />
            <Heading level={1}>Deployment Monitor</Heading>
          </div>
          <p className="mt-0.5 text-sm text-text-secondary">Real-time agent health and performance</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/monitor/intelligence"
            className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-text-secondary hover:border-border-strong hover:text-text transition-colors"
          >
            Intelligence →
          </Link>
          {canCheck && (
            <button
              onClick={handleCheckAll}
              disabled={checkingAll || loading}
              className="flex items-center gap-2 rounded-lg bg-text px-4 py-2 text-sm font-medium text-surface hover:bg-text-secondary disabled:opacity-50"
            >
              {checkingAll ? (
                <>
                  <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Checking…
                </>
              ) : (
                <><RefreshCw size={13} />Check All Agents</>
              )}
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="mb-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <KpiCard
          label="Deployed"
          value={summary.total}
          sub="total in production"
          color="bg-surface border border-border text-text"
          subColor="text-text-secondary"
        />
        <KpiCard
          label="Clean"
          value={summary.clean}
          sub="passing all policies"
          color="bg-green-50 border border-green-200 text-green-900"
          subColor="text-green-600"
        />
        <KpiCard
          label="Degraded"
          value={summary.degraded}
          sub="production issues detected"
          color={summary.degraded > 0 ? "bg-amber-50 border border-amber-200 text-amber-900" : "bg-surface border border-border text-text"}
          subColor={summary.degraded > 0 ? "text-amber-600" : "text-text-secondary"}
        />
        <KpiCard
          label="Critical"
          value={summary.critical}
          sub="governance errors found"
          color={summary.critical > 0 ? "bg-red-50 border border-red-200 text-red-900" : "bg-surface border border-border text-text"}
          subColor={summary.critical > 0 ? "text-red-600" : "text-text-secondary"}
        />
        <KpiCard
          label="Not Checked"
          value={summary.unknown}
          sub="awaiting first health check"
          color={summary.unknown > 0 ? "bg-surface-raised border border-border text-text" : "bg-surface border border-border text-text"}
          subColor={summary.unknown > 0 ? "text-text-secondary" : "text-text-tertiary"}
        />
      </div>

      {/* Filter toolbar */}
      <div className="mb-4">
        <TableToolbar
          searchPlaceholder="Name or agent ID…"
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          filters={[
            { key: "all", label: "All", active: healthFilter === "all" },
            { key: "clean", label: "Clean", active: healthFilter === "clean" },
            { key: "degraded", label: "Degraded", active: healthFilter === "degraded" },
            { key: "critical", label: "Critical", active: healthFilter === "critical" },
            { key: "unknown", label: "Not Checked", active: healthFilter === "unknown" },
          ]}
          onFilterClick={(key) => setHealthFilter(key as typeof healthFilter)}
          resultCount={filtered.length > 0 ? filtered.length : undefined}
          resultLabel="agent"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 border-b border-border-subtle px-5 py-4">
              <div className="h-4 w-48 animate-pulse rounded bg-surface-muted" />
              <div className="h-4 w-16 animate-pulse rounded bg-surface-muted" />
              <div className="h-5 w-20 animate-pulse rounded-full bg-surface-muted" />
            </div>
          ))}
        </div>
      ) : agents.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-border bg-surface p-12 text-center">
          <p className="text-sm font-medium text-text-secondary">No deployed agents yet.</p>
          <p className="mt-1 text-xs text-text-tertiary">
            Deploy an approved agent to begin monitoring its governance health.
          </p>
          <Link
            href="/deploy"
            className="mt-4 inline-block rounded-lg bg-text px-4 py-2 text-sm font-medium text-surface hover:bg-text-secondary"
          >
            Go to Deployment Console →
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <div className="border-b border-border-subtle px-5 py-2.5 flex items-center gap-3">
            <span className="text-xs text-text-tertiary">
              {filtered.length} agent{filtered.length === 1 ? "" : "s"}
              {filtered.length !== agents.length && ` (filtered from ${agents.length})`}
            </span>
            {acknowledgedAgentIds.size > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 border border-green-200 px-2 py-0.5 text-xs font-medium text-green-700">
                <CheckCircle2 className="h-3 w-3" />
                {acknowledgedAgentIds.size} acknowledged
              </span>
            )}
          </div>
          <Table striped>
            <TableHead>
              <TableRow>
                <TableHeader>Agent</TableHeader>
                <TableHeader>Version</TableHeader>
                <TableHeader>Health</TableHeader>
                <TableHeader>Errors</TableHeader>
                <TableHeader>Warnings</TableHeader>
                <TableHeader>Production</TableHeader>
                <TableHeader>Deployed</TableHeader>
                <TableHeader>Last Checked</TableHeader>
                <TableHeader>Actions</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9}>
                    <EmptyState
                      icon={SearchX}
                      heading={agents.length === 0 ? "No agents deployed yet" : "No agents match your filters"}
                      subtext={agents.length === 0
                        ? "Deploy agents from the Registry to start monitoring their health."
                        : "Try adjusting your search query or health status filter."}
                      action={agents.length > 0 ? (
                        <button
                          onClick={() => { setSearchQuery(""); setHealthFilter("all"); }}
                          className="text-sm text-primary hover:underline"
                        >
                          Clear filters
                        </button>
                      ) : undefined}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                paged.map((agent) => {
                  const isChecking = checkOneMutation.isPending && checkOneMutation.variables === agent.agentId;
                  const isAcked = acknowledgedAgentIds.has(agent.agentId);
                  const isAlertable = agent.healthStatus === "degraded" || agent.healthStatus === "critical";
                  return (
                    <TableRow key={agent.agentId} className={`interactive-row${isAcked ? " opacity-60" : ""}`}>
                      <TableCell>
                        <div className="font-medium text-text truncate max-w-48">
                          {agent.name ?? "Unnamed Agent"}
                        </div>
                        <div className="mt-0.5 font-mono text-xs text-text-tertiary">
                          {agent.agentId.slice(0, 8)}
                        </div>
                        {agent.tags.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {agent.tags.slice(0, 2).map((tag) => (
                              <span
                                key={tag}
                                className="rounded-full bg-surface-muted px-1.5 py-0.5 text-xs text-text-secondary"
                              >
                                {tag}
                              </span>
                            ))}
                            {agent.tags.length > 2 && (
                              <span className="text-xs text-text-tertiary">+{agent.tags.length - 2}</span>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-text-secondary">v{agent.version}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          <HealthBadge status={agent.healthStatus} errorCount={agent.errorCount} />
                          {agent.governanceDrift?.status === "drifted" && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                              ⚠ Drifted
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {agent.errorCount > 0 ? (
                          <span className="font-semibold text-red-600">{agent.errorCount}</span>
                        ) : (
                          <span className="text-text-tertiary">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {agent.warningCount > 0 ? (
                          <span className="text-amber-600">{agent.warningCount}</span>
                        ) : (
                          <span className="text-text-tertiary">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-text-secondary">
                        {agent.lastTelemetryAt ? (
                          <div>
                            <div className="text-text-secondary">
                              {agent.productionErrorRate !== null
                                ? `${(agent.productionErrorRate * 100).toFixed(1)}% err`
                                : "—"}
                            </div>
                            <div className="text-text-tertiary">seen {timeAgo(agent.lastTelemetryAt)}</div>
                          </div>
                        ) : (
                          <span className="text-text-disabled">No data</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-text-secondary">
                        {timeAgo(agent.deployedAt)}
                      </TableCell>
                      <TableCell className="text-xs text-text-secondary">
                        {agent.lastCheckedAt ? timeAgo(agent.lastCheckedAt) : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-3">
                          {/* P1-33: Acknowledge button — shown for degraded/critical agents */}
                          {isAlertable && (
                            <button
                              onClick={() => toggleAckAgent(agent.agentId)}
                              className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium transition-colors ${
                                isAcked
                                  ? "border-green-200 bg-surface text-green-700 hover:border-red-200 hover:text-red-600"
                                  : "border-border bg-surface text-text-secondary hover:border-green-300 hover:text-green-700"
                              }`}
                              title={isAcked ? "Un-acknowledge alert" : "Acknowledge — mark as known/accepted"}
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              {isAcked ? "Undo" : "Acknowledge"}
                            </button>
                          )}
                          {canCheck && (
                            <button
                              onClick={() => checkOneMutation.mutate(agent.agentId)}
                              disabled={isChecking || checkingAll}
                              className="text-xs text-blue-600 hover:underline disabled:opacity-40"
                            >
                              {isChecking ? (
                                <span className="inline-flex items-center gap-1">
                                  <span className="inline-block h-2.5 w-2.5 animate-spin rounded-full border border-blue-600 border-t-transparent" />
                                  Checking…
                                </span>
                              ) : (
                                "↻ Check Now"
                              )}
                            </button>
                          )}
                          <Link
                            href={`/registry/${agent.agentId}`}
                            className="text-xs text-text-secondary hover:text-text"
                          >
                            View →
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          )}
        </div>
      )}

      {/* AgentCore Live Status Section */}
      {hasAgentCoreAgents && (
        <div className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu size={18} className="text-violet-600" />
              <SectionHeading className="text-base">AgentCore Live Status</SectionHeading>
              <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">
                AWS Bedrock
              </span>
            </div>
            {canCheck && (
              <button
                onClick={handleCheckAgcHealth}
                disabled={checkingAgc}
                className="flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-medium text-violet-700 hover:bg-violet-100 disabled:opacity-50 transition-colors"
              >
                {checkingAgc ? (
                  <>
                    <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
                    Checking AWS…
                  </>
                ) : (
                  <><RefreshCw size={13} />Check Live AWS Status</>
                )}
              </button>
            )}
          </div>

          {agcError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {agcError}
            </div>
          )}

          {agcSummary === null ? (
            <div className="rounded-xl border-2 border-dashed border-border bg-surface px-6 py-8 text-center">
              <p className="text-sm text-text-secondary">
                Click <strong>Check Live AWS Status</strong> to query the live Bedrock agent status for each deployed agent.
              </p>
              <p className="mt-1 text-xs text-text-tertiary">
                Requires AWS credentials configured in the server environment.
              </p>
            </div>
          ) : (
            <>
              {/* Summary strip */}
              <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border border-border bg-surface p-4">
                  <div className="text-2xl font-bold text-text">{agcSummary.total}</div>
                  <div className="mt-0.5 text-xs text-text-secondary">AgentCore agents</div>
                </div>
                <div className={`rounded-xl border p-4 ${agcSummary.prepared === agcSummary.total && agcSummary.total > 0 ? "border-green-200 bg-green-50" : "border-border bg-surface"}`}>
                  <div className={`text-2xl font-bold ${agcSummary.prepared === agcSummary.total && agcSummary.total > 0 ? "text-green-700" : "text-text"}`}>{agcSummary.prepared}</div>
                  <div className="mt-0.5 text-xs text-text-secondary">PREPARED (callable)</div>
                </div>
                <div className={`rounded-xl border p-4 ${agcSummary.unreachable > 0 ? "border-red-200 bg-red-50" : "border-border bg-surface"}`}>
                  <div className={`text-2xl font-bold ${agcSummary.unreachable > 0 ? "text-red-700" : "text-text"}`}>{agcSummary.unreachable}</div>
                  <div className="mt-0.5 text-xs text-text-secondary">Unreachable</div>
                </div>
              </div>

              {/* Per-agent table */}
              <div className="overflow-hidden rounded-xl border border-border bg-surface">
                <Table striped>
                  <TableHead>
                    <TableRow>
                      <TableHeader>Agent</TableHeader>
                      <TableHeader>AWS Agent ID</TableHeader>
                      <TableHeader>Region</TableHeader>
                      <TableHeader>Bedrock Status</TableHeader>
                      <TableHeader>Last Deployed</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {agcHealth.map((entry) => (
                      <TableRow key={entry.blueprintId} className="interactive-row">
                        <TableCell className="font-medium text-text">
                          {entry.agentName ?? "Unnamed Agent"}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-text-secondary">
                          {entry.agentId}
                        </TableCell>
                        <TableCell className="text-xs text-text-secondary">
                          {entry.region}
                        </TableCell>
                        <TableCell>
                          <BedrockStatusBadge status={entry.bedrockStatus} />
                        </TableCell>
                        <TableCell className="text-xs text-text-secondary">
                          {timeAgo(entry.lastDeployedAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>
      )}
    </main>
  );
}

function BedrockStatusBadge({ status }: { status: BedrockAgentStatus }) {
  if (status === "PREPARED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
        <CheckCircle2 size={14} />
        PREPARED
      </span>
    );
  }
  if (status === "PREPARING" || status === "CREATING") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
        <Clock size={14} />
        {status}
      </span>
    );
  }
  if (status === "FAILED" || status === "UNREACHABLE") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
        <AlertCircle size={14} />
        {status}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-2.5 py-0.5 text-xs font-medium text-text-secondary">
      {status}
    </span>
  );
}

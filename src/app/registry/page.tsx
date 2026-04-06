"use client";

import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import { fetchAgents, fetchWorkflows } from "@/lib/query/fetchers";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { StatusBadge } from "@/components/registry/status-badge";
import { Heading } from "@/components/catalyst/heading";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SkeletonList } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Tooltip } from "@/components/ui/tooltip";
import { TableToolbar } from "@/components/ui/table-toolbar";
import { Button } from "@/components/catalyst/button";
import { AgentComparison } from "@/components/registry/agent-comparison";
import { WorkflowCreationWizard } from "@/components/workflow/creation-wizard";
import { Bot, ChevronRight, Copy, Inbox, GitBranch, Search, CheckCircle2, AlertTriangle, XCircle, HelpCircle, Plus, Users, ArrowLeftRight } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RegistryEntry {
  id: string; agentId: string; version: string; name: string | null;
  tags: string[]; status: string; sessionId: string; createdAt: string; updatedAt: string;
  monthlyCostUsd: number | null;
  violationCount: number | null;
  warningCount: number | null;
}

interface WorkflowEntry {
  id: string; workflowId: string; version: string; name: string;
  description: string; status: string; createdAt: string; updatedAt: string;
  definition?: { agents?: { agentId: string; role: string; required: boolean }[] };
}

type ArtifactTab = "agents" | "workflows";

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_AGENT_STATUSES = ["draft", "in_review", "approved", "deployed", "rejected", "deprecated"] as const;
const ALL_WORKFLOW_STATUSES = ["draft", "in_review", "approved", "rejected", "deprecated"] as const;
const STATUS_LABELS: Record<string, string> = {
  draft: "Draft", in_review: "In Review", approved: "Approved",
  deployed: "Deployed", rejected: "Rejected", deprecated: "Deprecated",
};
const STATUS_DESCRIPTIONS: Record<string, string> = {
  draft: "Work in progress — not yet submitted for review",
  in_review: "Submitted and awaiting human or governance review",
  approved: "Passed review and governance checks — ready to deploy",
  deployed: "Running in production and collecting telemetry",
  rejected: "Returned from review with required changes",
  deprecated: "Superseded by a newer version — no longer active",
};

// ─── Health Pulse ─────────────────────────────────────────────────────────────
// Derives a green / amber / red / gray health signal from governance data.
// violationCount: null = not yet validated; 0 = clean; >0 = errors present.
// warningCount:   null = not yet validated; 0 = no warnings; >0 = warnings.

type HealthColor = "green" | "amber" | "red" | "gray";

function deriveHealth(violationCount: number | null, warningCount: number | null): HealthColor {
  if (violationCount === null) return "gray";
  if (violationCount > 0) return "red";
  if (warningCount !== null && warningCount > 0) return "amber";
  return "green";
}

function healthLabel(color: HealthColor, violationCount: number | null, warningCount: number | null): string {
  if (color === "gray") return "Not yet validated";
  if (color === "red") return `${violationCount} governance error${violationCount !== 1 ? "s" : ""}`;
  if (color === "amber") return `${warningCount} governance warning${warningCount !== 1 ? "s" : ""}`;
  return "Passing governance";
}

const HEALTH_CLASSES: Record<HealthColor, string> = {
  green: "text-emerald-500",
  amber: "text-amber-400",
  red:   "text-red-500",
  gray:  "text-text-tertiary",
};

const HEALTH_ICONS: Record<HealthColor, React.ComponentType<{ size?: number; className?: string }>> = {
  green: CheckCircle2,
  amber: AlertTriangle,
  red: XCircle,
  gray: HelpCircle,
};

function HealthPulse({ violationCount, warningCount }: { violationCount: number | null; warningCount: number | null }) {
  const color = deriveHealth(violationCount, warningCount);
  const label = healthLabel(color, violationCount, warningCount);
  const IconComponent = HEALTH_ICONS[color];
  return (
    <span
      title={label}
      aria-label={label}
      className="inline-flex items-center justify-center shrink-0"
    >
      <IconComponent size={14} className={HEALTH_CLASSES[color]} />
    </span>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function matchesSearch(name: string | null, id: string, tags: string[] | undefined, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return (name?.toLowerCase().includes(q) || id.toLowerCase().includes(q) || tags?.some((t) => t.toLowerCase().includes(q))) ?? false;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RegistryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ── Tab — initialized from ?tab= URL param ──
  const [activeTab, setActiveTab] = useState<ArtifactTab>(() => {
    const tab = searchParams.get("tab");
    return (tab === "workflows" ? "workflows" : "agents") as ArtifactTab;
  });

  // ── Data fetching — React Query ──────────────────────────────────────────
  const {
    data: agents = [],
    isLoading: agentsLoading,
    error: agentsQueryError,
  } = useQuery({
    queryKey: queryKeys.registry.agents(),
    queryFn: fetchAgents,
  });
  const agentsError = agentsQueryError ? (agentsQueryError as Error).message : null;

  // Lazy-load workflows only when the user switches to the workflows tab.
  const {
    data: wflows = [],
    isLoading: wflowsLoading,
    error: wflowsQueryError,
  } = useQuery({
    queryKey: queryKeys.registry.workflows(),
    queryFn: fetchWorkflows,
    enabled: activeTab === "workflows",
  });
  const wflowsError = wflowsQueryError ? (wflowsQueryError as Error).message : null;

  const [cloningId, setCloningId] = useState<string | null>(null);

  // ── Agent comparison mode ─────────────────────────────────────────────────
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<Set<string>>(new Set());

  const toggleCompareSelection = useCallback((agentId: string) => {
    setSelectedForCompare((prev) => {
      const next = new Set(prev);
      if (next.has(agentId)) {
        next.delete(agentId);
      } else if (next.size < 3) {
        next.add(agentId);
      }
      return next;
    });
  }, []);

  const comparisonAgents = useMemo(() =>
    agents.filter((a) => selectedForCompare.has(a.agentId)).map((a) => ({
      agentId: a.agentId,
      name: a.name,
      status: a.status,
      version: a.version,
      tags: a.tags,
      violationCount: a.violationCount,
      warningCount: a.warningCount,
    })),
    [agents, selectedForCompare]
  );

  // ── New Orchestration wizard state ─────────────────────────────────────────
  const [showNewOrchestration, setShowNewOrchestration] = useState(false);

  // ── Shared filter state — initialized from ?q= and ?status= URL params ──
  const [searchQuery, setSearchQueryState] = useState<string>(() => searchParams.get("q") ?? "");
  const [statusFilter, setStatusFilterState] = useState<string>(() => searchParams.get("status") ?? "");

  // ─── URL-synced filter helpers ────────────────────────────────────────────
  // All filter mutations write to URL so filters survive back/forward
  // navigation and can be shared via link (e.g. /registry?status=deployed).

  function buildRegistryURL(tab: ArtifactTab, q: string, status: string): string {
    const p = new URLSearchParams();
    if (tab !== "agents") p.set("tab", tab);
    if (q) p.set("q", q);
    if (status) p.set("status", status);
    return p.toString() ? `/registry?${p}` : "/registry";
  }

  const setSearchQuery = (q: string) => {
    setSearchQueryState(q);
    router.replace(buildRegistryURL(activeTab, q, statusFilter), { scroll: false });
  };

  const setStatusFilter = (s: string) => {
    setStatusFilterState(s);
    router.replace(buildRegistryURL(activeTab, searchQuery, s), { scroll: false });
  };

  // ─── Tab switch (resets filters and URL) ─────────────────────────────────

  const switchTab = (tab: ArtifactTab) => {
    setActiveTab(tab);
    setSearchQueryState("");
    setStatusFilterState("");
    router.replace(buildRegistryURL(tab, "", ""), { scroll: false });
  };

  // ─── Clone handler ────────────────────────────────────────────────────────

  const handleClone = useCallback(async (agent: RegistryEntry, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    setCloningId(agent.id);
    try {
      const res = await fetch(`/api/blueprints/${agent.id}/clone`, { method: "POST" });
      if (!res.ok) return;
      const cloned = await res.json();
      router.push(`/registry/${cloned.agentId}`);
    } catch { /* non-critical */ }
    finally { setCloningId(null); }
  }, [router]);

  // ─── Filtered lists ───────────────────────────────────────────────────────

  const filteredAgents = useMemo(() =>
    agents.filter((a) =>
      matchesSearch(a.name, a.agentId, a.tags, searchQuery) &&
      (!statusFilter || a.status === statusFilter)
    ),
    [agents, searchQuery, statusFilter]
  );

  const filteredWflows = useMemo(() =>
    wflows.filter((w) =>
      matchesSearch(w.name, w.id, undefined, searchQuery) &&
      (!statusFilter || w.status === statusFilter)
    ),
    [wflows, searchQuery, statusFilter]
  );

  // ─── Derived values ───────────────────────────────────────────────────────

  const loading = activeTab === "agents" ? agentsLoading : wflowsLoading;
  const error   = activeTab === "agents" ? agentsError  : wflowsError;
  const total   = activeTab === "agents" ? agents.length : wflows.length;
  const filtered = activeTab === "agents" ? filteredAgents : filteredWflows;
  const statuses = activeTab === "agents" ? ALL_AGENT_STATUSES : ALL_WORKFLOW_STATUSES;
  const hasFilters = searchQuery.trim() !== "" || statusFilter !== "";

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="max-w-screen-2xl mx-auto w-full px-6 py-6">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <Heading level={1}>Registry</Heading>
          <p className="mt-0.5 text-sm text-text-secondary">Manage deployed agents and orchestrations</p>
        </div>
        {activeTab === "workflows" && (
          <button
            onClick={() => setShowNewOrchestration(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-xs font-medium text-white hover:bg-violet-700 transition-colors shadow-sm"
          >
            <Plus size={14} />
            New Orchestration
          </button>
        )}
      </div>

      {/* Artifact-type tabs */}
      <Tabs value={activeTab} onValueChange={(v) => switchTab(v as ArtifactTab)} className="mb-5">
        <TabsList>
          <TabsTrigger value="agents"><Bot size={14} /> Agents</TabsTrigger>
          <TabsTrigger value="workflows"><GitBranch size={14} /> Orchestrations</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Compare mode toggle — agents tab only */}
      {activeTab === "agents" && agents.length >= 2 && (
        <div className="mb-3 flex items-center justify-end gap-2">
          <button
            onClick={() => {
              setCompareMode(!compareMode);
              if (compareMode) setSelectedForCompare(new Set());
            }}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              compareMode
                ? "bg-violet-100 text-violet-700 border border-violet-200"
                : "border border-border text-text-secondary hover:bg-surface-raised hover:text-text"
            }`}
          >
            <ArrowLeftRight size={12} />
            {compareMode ? `Comparing (${selectedForCompare.size}/3)` : "Compare Agents"}
          </button>
          {compareMode && selectedForCompare.size > 0 && (
            <button
              onClick={() => setSelectedForCompare(new Set())}
              className="text-xs text-text-tertiary hover:text-text"
            >
              Clear selection
            </button>
          )}
        </div>
      )}

      {/* Search + filter toolbar */}
      <div className="mb-6">
        <TableToolbar
          searchPlaceholder={`Search ${activeTab}…`}
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          filters={[
            { key: "_all_", label: "All", active: !statusFilter },
            ...statuses.map((s) => ({
              key: s,
              label: STATUS_LABELS[s],
              active: statusFilter === s,
            })),
          ]}
          onFilterClick={(key) => setStatusFilter(key === "_all_" ? "" : key)}
          resultCount={!loading && filtered.length > 0 ? filtered.length : undefined}
          resultLabel={activeTab === "agents" ? "agent" : "orchestration"}
        />
      </div>

      {/* W3-08: aria-live region announces loading → content transitions */}
      <div aria-live="polite" aria-atomic="false">

      {/* Show skeleton during any loading state */}
      {loading && <SkeletonList rows={4} />}

      {/* Error */}
      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {/* ── Agent list ────────────────────────────────────────────────────── */}
      {activeTab === "agents" && !agentsLoading && !agentsError && (
        <>
          {agents.length === 0 && (
            <EmptyState
              icon={Inbox}
              heading="No agents yet"
              subtext="Deployed agents appear here once approved blueprints are pushed to production."
              action={
                <div className="flex flex-col items-center gap-1">
                  <Link href="/intake" className="text-xs text-violet-600 hover:text-violet-700">Start an intake session →</Link>
                  <Link href="/templates" className="text-xs text-violet-600 hover:text-violet-700">Browse templates →</Link>
                </div>
              }
            />
          )}

          {agents.length > 0 && filteredAgents.length === 0 && (
            <EmptyState
              icon={Search}
              heading="No agents match your filters"
              action={
                <button onClick={() => { setSearchQuery(""); setStatusFilter(""); }} className="text-xs text-violet-600 hover:text-violet-700 underline">
                  Clear filters
                </button>
              }
            />
          )}

          {filteredAgents.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-[var(--shadow-card)]">
              {filteredAgents.map((agent, i) => (
                <div key={agent.agentId} className={`${i > 0 ? "border-t border-border" : ""}`}>
                  <Link href={compareMode ? "#" : `/registry/${agent.agentId}`} onClick={compareMode ? (e) => { e.preventDefault(); toggleCompareSelection(agent.agentId); } : undefined} className="flex items-center gap-4 px-5 py-4 interactive-row">
                    {compareMode ? (
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
                        selectedForCompare.has(agent.agentId)
                          ? "bg-violet-100 text-violet-600 border-2 border-violet-400"
                          : "bg-surface-muted text-text-tertiary border-2 border-transparent"
                      }`}>
                        {selectedForCompare.has(agent.agentId) ? (
                          <CheckCircle2 size={15} />
                        ) : (
                          <Bot size={15} />
                        )}
                      </div>
                    ) : (
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-text-tertiary">
                        <Bot size={15} />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <HealthPulse violationCount={agent.violationCount} warningCount={agent.warningCount} />
                        <span className="truncate text-sm font-medium text-text">{agent.name ?? "Unnamed Agent"}</span>
                        <StatusBadge status={agent.status} />
                      </div>
                      <div className="flex items-center gap-2 text-xs text-text-tertiary">
                        <span>v{agent.version}</span>
                        <span>·</span>
                        <span>{new Date(agent.createdAt).toLocaleDateString()}</span>
                      </div>
                      {Array.isArray(agent.tags) && agent.tags.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {(agent.tags as string[]).slice(0, 5).map((tag) => (
                            <span key={tag} className="rounded-md bg-surface-raised px-1.5 py-0.5 text-xs-tight text-text-secondary">{tag}</span>
                          ))}
                          {agent.tags.length > 5 && <span className="text-xs-tight text-text-tertiary">+{agent.tags.length - 5} more</span>}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {agent.monthlyCostUsd !== null && agent.monthlyCostUsd > 0 && (
                        <span className="text-xs text-text-secondary hidden sm:block">
                          ${agent.monthlyCostUsd.toFixed(4)}<span className="text-text-tertiary">/mo</span>
                        </span>
                      )}
                      <button
                        onClick={(e) => handleClone(agent, e)}
                        disabled={cloningId === agent.id}
                        className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs text-text-secondary hover:border-primary/30 hover:text-text disabled:opacity-50 transition-colors"
                      >
                        <Copy size={11} />
                        {cloningId === agent.id ? "Cloning…" : "Clone"}
                      </button>
                      <ChevronRight size={14} className="text-text-tertiary" />
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Workflow list ──────────────────────────────────────────────────── */}
      {activeTab === "workflows" && !wflowsLoading && !wflowsError && (
        <>
          {wflows.length === 0 && (
            <EmptyState
              icon={Inbox}
              heading="No orchestrations yet"
              subtext="Create an orchestration to compose multiple agents into a coordinated pipeline."
              action={
                <button
                  onClick={() => setShowNewOrchestration(true)}
                  className="text-xs text-violet-600 hover:text-violet-700"
                >
                  Create your first orchestration →
                </button>
              }
            />
          )}

          {wflows.length > 0 && filteredWflows.length === 0 && (
            <EmptyState
              icon={Search}
              heading="No orchestrations match your filters"
              action={
                <button onClick={() => { setSearchQuery(""); setStatusFilter(""); }} className="text-xs text-violet-600 hover:text-violet-700 underline">
                  Clear filters
                </button>
              }
            />
          )}

          {filteredWflows.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
              {filteredWflows.map((wf, i) => (
                <div key={wf.id} className={`${i > 0 ? "border-t border-border-subtle" : ""}`}>
                  <Link href={`/registry/workflow/${wf.id}`} className="flex items-center gap-4 px-5 py-4 interactive-row">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-500">
                      <GitBranch size={15} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="truncate text-sm font-medium text-text">{wf.name}</span>
                        <StatusBadge status={wf.status} />
                      </div>
                      <div className="flex items-center gap-2 text-xs text-text-tertiary">
                        <span>v{wf.version}</span>
                        <span>·</span>
                        <span className="font-mono">{wf.id.slice(0, 8)}</span>
                        <span>·</span>
                        <span>{new Date(wf.createdAt).toLocaleDateString()}</span>
                      </div>
                      {wf.description && (
                        <p className="mt-0.5 text-xs text-text-tertiary truncate">{wf.description}</p>
                      )}
                    </div>
                    {wf.definition?.agents && wf.definition.agents.length > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-xs text-violet-700 shrink-0" title={`${wf.definition.agents.length} participating agent${wf.definition.agents.length !== 1 ? "s" : ""}`}>
                        <Users size={11} />
                        {wf.definition.agents.length}
                      </span>
                    )}
                    <ChevronRight size={14} className="text-text-disabled shrink-0" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      </div>{/* end aria-live region */}

      {/* Agent Comparison Panel */}
      {compareMode && comparisonAgents.length >= 2 && (
        <AgentComparison
          agents={comparisonAgents}
          onClose={() => {
            setCompareMode(false);
            setSelectedForCompare(new Set());
          }}
          onRemoveAgent={(id) => {
            setSelectedForCompare((prev) => {
              const next = new Set(prev);
              next.delete(id);
              return next;
            });
          }}
        />
      )}

      {/* Guided Workflow Creation Wizard */}
      <WorkflowCreationWizard
        open={showNewOrchestration}
        onClose={() => setShowNewOrchestration(false)}
        onComplete={async (definition) => {
          const res = await fetch("/api/workflows", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: definition.name,
              description: definition.description,
              definition,
            }),
          });
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error ?? "Failed to create orchestration");
          }
          const { workflow } = await res.json();
          router.push(`/registry/workflow/${workflow.id}`);
        }}
      />
    </div>
  );
}

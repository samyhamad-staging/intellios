"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import { StatusBadge } from "@/components/registry/status-badge";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Heading, Subheading } from "@/components/catalyst/heading";
import { InlineAlert } from "@/components/catalyst/alert";
import { ArrowLeft, GitBranch, Users, ArrowRight, Database, AlertTriangle, Download, Info } from "lucide-react";
import type { WorkflowDefinition } from "@/lib/types/workflow";

// ─── Workflow Flow Diagram ────────────────────────────────────────────────────

/**
 * WorkflowFlowDiagram — renders a left-to-right flow visualization.
 *
 * Uses BFS from the "start" sentinel to order nodes, then renders each node as
 * a labeled box with connecting arrows. Handles branching by showing parallel
 * nodes at the same depth level stacked vertically.
 */
function WorkflowFlowDiagram({ definition }: { definition: WorkflowDefinition }) {
  const { agents, handoffRules } = definition;

  if (!agents || agents.length === 0 || !handoffRules || handoffRules.length === 0) {
    return null;
  }

  // Build adjacency list and BFS-order the nodes
  const adjacency = new Map<string, string[]>();
  for (const rule of handoffRules) {
    if (!adjacency.has(rule.from)) adjacency.set(rule.from, []);
    adjacency.get(rule.from)!.push(rule.to);
  }

  // BFS from "start" to get ordered levels
  const levels: string[][] = [];
  const visited = new Set<string>();
  let queue: string[] = ["start"];
  while (queue.length > 0) {
    const level: string[] = [];
    const nextQueue: string[] = [];
    for (const node of queue) {
      if (visited.has(node)) continue;
      visited.add(node);
      level.push(node);
      const neighbours = adjacency.get(node) ?? [];
      for (const n of neighbours) {
        if (!visited.has(n)) nextQueue.push(n);
      }
    }
    if (level.length > 0) levels.push(level);
    queue = nextQueue;
  }

  // Collect all edges (from → to) for arrow rendering
  const edges: Array<{ from: string; to: string; condition: string }> = handoffRules.map((r) => ({
    from: r.from,
    to: r.to,
    condition: r.condition,
  }));

  // Helper: get display label for a node id
  const agentMap = new Map(agents.map((a) => [a.agentId, a]));
  function nodeLabel(id: string): { label: string; sub: string | null; isAgent: boolean } {
    if (id === "start") return { label: "Start", sub: null, isAgent: false };
    if (id === "end") return { label: "End", sub: null, isAgent: false };
    const agent = agentMap.get(id);
    if (agent) return { label: agent.role, sub: id.slice(0, 8), isAgent: true };
    return { label: id.slice(0, 8), sub: null, isAgent: false };
  }

  return (
    <section className="mb-6">
      <Subheading level={2} className="mb-3 flex items-center gap-2">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="4" cy="12" r="2" /><circle cx="20" cy="12" r="2" />
          <circle cx="12" cy="5" r="2" /><circle cx="12" cy="19" r="2" />
          <line x1="6" y1="12" x2="10" y2="12" /><line x1="14" y1="12" x2="18" y2="12" />
          <line x1="12" y1="7" x2="12" y2="10" /><line x1="12" y1="14" x2="12" y2="17" />
        </svg>
        Orchestration Flow
      </Subheading>
      <div className="overflow-x-auto">
        <div className="flex items-start gap-0 min-w-max">
          {levels.map((level, li) => (
            <div key={li} className="flex items-center">
              {/* Node column — stacked vertically if multiple nodes at same depth */}
              <div className="flex flex-col gap-2">
                {level.map((nodeId) => {
                  const { label, sub, isAgent } = nodeLabel(nodeId);
                  const isSentinel = nodeId === "start" || nodeId === "end";
                  const outgoing = edges.filter((e) => e.from === nodeId);
                  const allConditionsTrue = outgoing.every((e) => e.condition === "true" || e.condition === "always");

                  return (
                    <div key={nodeId} className="flex flex-col items-center">
                      {/* Node box */}
                      <div
                        title={outgoing.map((e) => `→ ${e.to}: ${e.condition}`).join("\n")}
                        className={`flex flex-col items-center justify-center rounded-lg border px-3 py-2 text-center min-w-[90px] max-w-[120px] ${
                          isSentinel
                            ? "border-border bg-surface-muted text-text-secondary"
                            : isAgent
                            ? "border-violet-200 bg-violet-50 text-violet-800"
                            : "border-blue-200 bg-blue-50 text-blue-700"
                        }`}
                      >
                        <span className={`text-xs font-semibold leading-tight ${isSentinel ? "uppercase tracking-wide text-[10px]" : ""}`}>
                          {label}
                        </span>
                        {sub && <span className="mt-0.5 font-mono text-[9px] text-text-tertiary leading-none">{sub}</span>}
                        {!allConditionsTrue && outgoing.length > 1 && (
                          <span className="mt-1 rounded-full bg-amber-100 px-1.5 text-[9px] text-amber-700 font-medium">
                            {outgoing.length} branches
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Arrow connector — skip after last level */}
              {li < levels.length - 1 && (
                <div className="flex items-center self-stretch">
                  <div className="flex flex-col items-center justify-center px-2 self-center">
                    <svg width="28" height="12" viewBox="0 0 28 12" fill="none">
                      <line x1="0" y1="6" x2="22" y2="6" stroke="#d1d5db" strokeWidth="1.5" />
                      <polyline points="18,2 24,6 18,10" stroke="#d1d5db" strokeWidth="1.5" fill="none" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      {/* Condition legend — shown when non-trivial conditions exist */}
      {edges.some((e) => e.condition !== "true" && e.condition !== "always") && (
        <p className="mt-2 text-xs text-text-tertiary">
          Hover a node to see its outgoing transition conditions.
        </p>
      )}
    </section>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface WorkflowRecord {
  id: string;
  workflowId: string;
  version: string;
  name: string;
  description: string;
  definition: WorkflowDefinition;
  status: string;
  enterpriseId: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WorkflowDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const queryClient = useQueryClient();

  const [workflow, setWorkflow] = useState<WorkflowRecord | null>(null);
  const [loading, setLoading]  = useState(true);
  const [error, setError]      = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/workflows/${id}`)
      .then((r) => {
        if (r.status === 404) { setError("Workflow not found"); setLoading(false); return null; }
        return r.json();
      })
      .then((data) => {
        if (data) { setWorkflow(data.workflow); setLoading(false); }
      })
      .catch(() => { setError("Failed to load workflow"); setLoading(false); });
  }, [id]);

  // ── Optimistic workflow status transition ──────────────────────────────────
  const transitionMutation = useMutation({
    mutationFn: async ({ newStatus, comment }: { newStatus: string; comment?: string }) => {
      const res = await fetch(`/api/workflows/${id}/status`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ status: newStatus, comment }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to update status");
      return data;
    },
    onMutate: async ({ newStatus }) => {
      // Snapshot the current workflow state for rollback
      const previousWorkflow = workflow;
      // Cancel any in-flight workflow list refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.registry.workflows() });
      const previousWorkflows = queryClient.getQueryData(queryKeys.registry.workflows());
      // Optimistically update local state immediately
      setWorkflow((w) => w ? { ...w, status: newStatus } : w);
      return { previousWorkflow, previousWorkflows };
    },
    onError: (_err, _vars, context) => {
      // Rollback local state
      if (context?.previousWorkflow !== undefined) {
        setWorkflow(context.previousWorkflow);
      }
      // Rollback workflows list cache
      if (context?.previousWorkflows !== undefined) {
        queryClient.setQueryData(queryKeys.registry.workflows(), context.previousWorkflows);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.registry.workflows() });
    },
  });

  const handleDeprecate = () => {
    if (!confirm("Deprecate this workflow? It will remain readable but no longer active.")) return;
    transitionMutation.mutate({ newStatus: "deprecated" });
  };

  // ─── Loading / Error ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="px-6 py-6 space-y-4">
        <div className="h-6 w-48 animate-pulse rounded bg-surface-muted" />
        <div className="h-40 animate-pulse rounded-xl bg-surface-muted" />
      </div>
    );
  }

  if (error || !workflow) {
    return (
      <div className="px-6 py-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center gap-2">
          <AlertTriangle size={14} />
          {error ?? "Workflow not found"}
        </div>
        <button onClick={() => router.back()} className="mt-4 text-sm text-violet-600 hover:text-violet-700">← Back</button>
      </div>
    );
  }

  const def = workflow.definition;

  return (
    <div className="px-6 py-6 max-w-4xl">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Breadcrumb items={[
          { label: "Registry", href: "/registry" },
          { label: "Workflows", href: "/registry" },
          { label: workflow.name },
        ]} />
      </div>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-500">
            <GitBranch size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Heading level={1}>{workflow.name}</Heading>
              <StatusBadge status={workflow.status} />
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-text-tertiary">
              <span>v{workflow.version}</span>
              <span>·</span>
              <span className="font-mono">{workflow.id.slice(0, 8)}</span>
              <span>·</span>
              <span>Created {new Date(workflow.createdAt).toLocaleDateString()}</span>
              <span>·</span>
              <span>by {workflow.createdBy}</span>
            </div>
            {workflow.description && (
              <p className="mt-1.5 text-sm text-text-secondary">{workflow.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {transitionMutation.error && (
            <span className="text-xs text-red-600 max-w-xs">
              {transitionMutation.error instanceof Error
                ? transitionMutation.error.message
                : "Failed to update status"}
            </span>
          )}
          {workflow.status === "draft" && (
            <button
              onClick={() => transitionMutation.mutate({ newStatus: "in_review" })}
              disabled={transitionMutation.isPending}
              className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-100 disabled:opacity-50 transition-colors"
            >
              {transitionMutation.isPending ? "Updating…" : "Submit for Review"}
            </button>
          )}
          {workflow.status === "in_review" && (
            <>
              <button
                onClick={() => transitionMutation.mutate({ newStatus: "approved" })}
                disabled={transitionMutation.isPending}
                className="rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 disabled:opacity-50 transition-colors"
              >
                {transitionMutation.isPending ? "Updating…" : "Approve"}
              </button>
              <button
                onClick={() => transitionMutation.mutate({ newStatus: "rejected" })}
                disabled={transitionMutation.isPending}
                className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
              >
                Reject
              </button>
              <button
                onClick={() => transitionMutation.mutate({ newStatus: "draft" })}
                disabled={transitionMutation.isPending}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface-raised disabled:opacity-50 transition-colors"
              >
                Return to Draft
              </button>
            </>
          )}
          {workflow.status === "rejected" && (
            <button
              onClick={() => transitionMutation.mutate({ newStatus: "draft" })}
              disabled={transitionMutation.isPending}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface-raised disabled:opacity-50 transition-colors"
            >
              {transitionMutation.isPending ? "Updating…" : "Reset to Draft"}
            </button>
          )}
          {workflow.status === "approved" && (
            <a
              href={`/api/workflows/${id}/export/code`}
              className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition-colors inline-flex items-center gap-1"
            >
              <Download size={11} />
              Export Code
            </a>
          )}
          {workflow.status !== "deprecated" && (
            <button
              onClick={handleDeprecate}
              disabled={transitionMutation.isPending}
              className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
            >
              Deprecate
            </button>
          )}
        </div>
      </div>

      {/* Orchestration Definition Banner */}
      <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
        <div className="flex items-start gap-2">
          <Info size={14} className="mt-0.5 shrink-0 text-blue-600" />
          <div className="text-sm text-blue-800">
            <span className="font-medium">Orchestration Definition</span> — This workflow composes{" "}
            <strong>{def.agents?.length ?? 0} agent{(def.agents?.length ?? 0) !== 1 ? "s" : ""}</strong>{" "}
            with {def.handoffRules?.length ?? 0} handoff rule{(def.handoffRules?.length ?? 0) !== 1 ? "s" : ""}{" "}
            and {def.sharedContext?.length ?? 0} shared context field{(def.sharedContext?.length ?? 0) !== 1 ? "s" : ""}.
            Workflows are published definitions — they describe agent coordination but are not deployed to a runtime target.
          </div>
        </div>
      </div>

      {/* Export Definition Button */}
      <div className="mb-6 flex justify-end">
        <button
          onClick={() => {
            const blob = new Blob([JSON.stringify(def, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${workflow.name.replace(/\s+/g, "-").toLowerCase()}-v${workflow.version}.json`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface-raised hover:text-text transition-colors"
        >
          <Download size={12} />
          Export Definition
        </button>
      </div>

      {/* Orchestration Flow */}
      <WorkflowFlowDiagram definition={def} />

      {/* Participating Agents */}
      <section className="mb-6">
        <Subheading level={2} className="mb-3 flex items-center gap-2">
          <Users size={14} /> Participating Agents ({def.agents?.length ?? 0})
        </Subheading>
        {(!def.agents || def.agents.length === 0) ? (
          <p className="text-sm text-text-tertiary">No agents defined.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
            {def.agents.map((agent, i) => (
              <div key={agent.agentId} className={`flex items-center justify-between gap-4 px-5 py-3 ${i > 0 ? "border-t border-border-subtle" : ""}`}>
                <div>
                  <span className="text-sm font-medium text-text">{agent.role}</span>
                  <span className="ml-2 font-mono text-xs text-text-tertiary">{agent.agentId.slice(0, 8)}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {agent.required && (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs-tight font-medium text-amber-700 border border-amber-200">Required</span>
                  )}
                  <Link
                    href={`/registry/${agent.agentId}`}
                    className="text-xs text-violet-600 hover:text-violet-700"
                  >
                    View →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Handoff Rules */}
      <section className="mb-6">
        <Subheading level={2} className="mb-3 flex items-center gap-2">
          <ArrowRight size={14} /> Transition Rules ({def.handoffRules?.length ?? 0})
        </Subheading>
        {(!def.handoffRules || def.handoffRules.length === 0) ? (
          <p className="text-sm text-text-tertiary">No handoff rules defined.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm divide-y divide-border-subtle">
            {def.handoffRules
              .slice()
              .sort((a, b) => a.priority - b.priority)
              .map((rule, i) => (
                <div key={i} className="px-5 py-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-mono text-xs bg-surface-muted rounded px-1.5 py-0.5 text-text-secondary">{rule.from}</span>
                    <ArrowRight size={12} className="text-text-tertiary" />
                    <span className="font-mono text-xs bg-surface-muted rounded px-1.5 py-0.5 text-text-secondary">{rule.to}</span>
                    <span className="ml-auto text-xs text-text-tertiary">priority {rule.priority}</span>
                  </div>
                  <p className="mt-1 text-xs text-text-secondary font-mono">{rule.condition}</p>
                </div>
              ))}
          </div>
        )}
      </section>

      {/* Shared Context */}
      <section>
        <Subheading level={2} className="mb-3 flex items-center gap-2">
          <Database size={14} /> Shared Context ({def.sharedContext?.length ?? 0} field{(def.sharedContext?.length ?? 0) !== 1 ? "s" : ""})
        </Subheading>
        {def.sharedContext && def.sharedContext.length > 0 && (
          <p className="mb-3 text-xs text-text-tertiary">
            These fields are accessible to all participating agents during orchestration, enabling data flow between pipeline stages.
          </p>
        )}
        {(!def.sharedContext || def.sharedContext.length === 0) ? (
          <p className="text-sm text-text-tertiary">No shared context fields.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm divide-y divide-border-subtle">
            {def.sharedContext.map((field, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3">
                <span className="font-mono text-xs text-text">{field.field}</span>
                <span className="rounded bg-surface-muted px-1.5 py-0.5 text-xs-tight text-text-secondary">{field.type}</span>
                <span className="text-xs text-text-tertiary flex-1">{field.description}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

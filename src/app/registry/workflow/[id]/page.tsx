"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { StatusBadge } from "@/components/registry/status-badge";
import { ArrowLeft, GitBranch, Users, ArrowRight, Database, AlertTriangle } from "lucide-react";
import type { WorkflowDefinition } from "@/lib/types/workflow";

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

  const [workflow, setWorkflow] = useState<WorkflowRecord | null>(null);
  const [loading, setLoading]  = useState(true);
  const [error, setError]      = useState<string | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [transitionError, setTransitionError] = useState<string | null>(null);

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

  const transition = async (newStatus: string, comment?: string) => {
    setTransitioning(true);
    setTransitionError(null);
    try {
      const res = await fetch(`/api/workflows/${id}/status`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ status: newStatus, comment }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTransitionError(data.error ?? "Failed to update status");
      } else {
        setWorkflow((w) => w ? { ...w, status: data.status } : w);
      }
    } catch { setTransitionError("Failed to update status"); }
    finally { setTransitioning(false); }
  };

  const handleDeprecate = async () => {
    if (!confirm("Deprecate this workflow? It will remain readable but no longer active.")) return;
    await transition("deprecated");
  };

  // ─── Loading / Error ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="px-6 py-6 space-y-4">
        <div className="h-6 w-48 animate-pulse rounded bg-gray-100" />
        <div className="h-40 animate-pulse rounded-xl bg-gray-100" />
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
      <div className="mb-6 flex items-center gap-2 text-sm text-gray-400">
        <Link href="/registry" className="hover:text-gray-600 flex items-center gap-1">
          <ArrowLeft size={13} /> Registry
        </Link>
        <span>/</span>
        <span className="text-gray-400">Workflows</span>
        <span>/</span>
        <span className="text-gray-700 font-medium">{workflow.name}</span>
      </div>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-500">
            <GitBranch size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-gray-900">{workflow.name}</h1>
              <StatusBadge status={workflow.status} />
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-400">
              <span>v{workflow.version}</span>
              <span>·</span>
              <span className="font-mono">{workflow.id.slice(0, 8)}</span>
              <span>·</span>
              <span>Created {new Date(workflow.createdAt).toLocaleDateString()}</span>
              <span>·</span>
              <span>by {workflow.createdBy}</span>
            </div>
            {workflow.description && (
              <p className="mt-1.5 text-sm text-gray-500">{workflow.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {transitionError && (
            <span className="text-xs text-red-600 max-w-xs">{transitionError}</span>
          )}
          {workflow.status === "draft" && (
            <button
              onClick={() => transition("in_review")}
              disabled={transitioning}
              className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-100 disabled:opacity-50 transition-colors"
            >
              {transitioning ? "Updating…" : "Submit for Review"}
            </button>
          )}
          {workflow.status === "in_review" && (
            <>
              <button
                onClick={() => transition("approved")}
                disabled={transitioning}
                className="rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 disabled:opacity-50 transition-colors"
              >
                {transitioning ? "Updating…" : "Approve"}
              </button>
              <button
                onClick={() => transition("rejected")}
                disabled={transitioning}
                className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
              >
                Reject
              </button>
              <button
                onClick={() => transition("draft")}
                disabled={transitioning}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Return to Draft
              </button>
            </>
          )}
          {workflow.status === "rejected" && (
            <button
              onClick={() => transition("draft")}
              disabled={transitioning}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {transitioning ? "Updating…" : "Reset to Draft"}
            </button>
          )}
          {workflow.status !== "deprecated" && (
            <button
              onClick={handleDeprecate}
              disabled={transitioning}
              className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
            >
              Deprecate
            </button>
          )}
        </div>
      </div>

      {/* Participating Agents */}
      <section className="mb-6">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
          <Users size={14} /> Agents ({def.agents?.length ?? 0})
        </h2>
        {(!def.agents || def.agents.length === 0) ? (
          <p className="text-sm text-gray-400">No agents defined.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            {def.agents.map((agent, i) => (
              <div key={agent.agentId} className={`flex items-center justify-between gap-4 px-5 py-3 ${i > 0 ? "border-t border-gray-100" : ""}`}>
                <div>
                  <span className="text-sm font-medium text-gray-900">{agent.role}</span>
                  <span className="ml-2 font-mono text-xs text-gray-400">{agent.agentId.slice(0, 8)}</span>
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
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
          <ArrowRight size={14} /> Handoff Rules ({def.handoffRules?.length ?? 0})
        </h2>
        {(!def.handoffRules || def.handoffRules.length === 0) ? (
          <p className="text-sm text-gray-400">No handoff rules defined.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm divide-y divide-gray-100">
            {def.handoffRules
              .slice()
              .sort((a, b) => a.priority - b.priority)
              .map((rule, i) => (
                <div key={i} className="px-5 py-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-mono text-xs bg-gray-100 rounded px-1.5 py-0.5 text-gray-600">{rule.from}</span>
                    <ArrowRight size={12} className="text-gray-400" />
                    <span className="font-mono text-xs bg-gray-100 rounded px-1.5 py-0.5 text-gray-600">{rule.to}</span>
                    <span className="ml-auto text-xs text-gray-400">priority {rule.priority}</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500 font-mono">{rule.condition}</p>
                </div>
              ))}
          </div>
        )}
      </section>

      {/* Shared Context */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
          <Database size={14} /> Shared Context Fields ({def.sharedContext?.length ?? 0})
        </h2>
        {(!def.sharedContext || def.sharedContext.length === 0) ? (
          <p className="text-sm text-gray-400">No shared context fields.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm divide-y divide-gray-100">
            {def.sharedContext.map((field, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3">
                <span className="font-mono text-xs text-gray-700">{field.field}</span>
                <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs-tight text-gray-500">{field.type}</span>
                <span className="text-xs text-gray-400 flex-1">{field.description}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

"use client";

/**
 * Agent Comparison Panel — Phase 2
 *
 * Side-by-side comparison of 2–3 agents across key dimensions:
 * identity, capabilities, constraints, governance, and quality scores.
 * Rendered as a slide-up panel from the registry page when agents are selected.
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { X, ArrowRight } from "lucide-react";
import { StatusBadge } from "@/components/registry/status-badge";

interface ComparisonAgent {
  agentId: string;
  name: string | null;
  status: string;
  version: string;
  tags: string[];
  abp?: {
    identity?: { name?: string; description?: string; agentType?: string };
    capabilities?: { tools?: { name: string }[]; dataSources?: { name: string }[] };
    constraints?: { riskTier?: string; humanEscalation?: boolean };
    governance?: { reviewCycle?: string };
  };
  qualityScore?: number | null;
  violationCount?: number | null;
  warningCount?: number | null;
}

interface AgentComparisonProps {
  agents: ComparisonAgent[];
  onClose: () => void;
  onRemoveAgent: (agentId: string) => void;
}

function ComparisonCell({ label, values }: { label: string; values: (string | React.ReactNode)[] }) {
  const allSame = values.every((v) => String(v) === String(values[0]));
  return (
    <tr className="border-t border-border-subtle">
      <td className="px-4 py-2.5 text-xs font-medium text-text-secondary whitespace-nowrap bg-surface-muted">
        {label}
      </td>
      {values.map((v, i) => (
        <td
          key={i}
          className={`px-4 py-2.5 text-xs text-text ${
            !allSame && typeof v === "string" ? "font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30" : ""
          }`}
        >
          {v || <span className="text-text-tertiary">—</span>}
        </td>
      ))}
    </tr>
  );
}

export function AgentComparison({ agents, onClose, onRemoveAgent }: AgentComparisonProps) {
  const [details, setDetails] = useState<ComparisonAgent[]>(agents);
  const [loading, setLoading] = useState(true);

  // Fetch full agent details for comparison
  useEffect(() => {
    setLoading(true);
    Promise.all(
      agents.map((a) =>
        fetch(`/api/registry/${a.agentId}`)
          .then((r) => r.json())
          .then((data) => ({
            ...a,
            abp: data.agent?.abp ?? undefined,
            qualityScore: null, // could fetch from /api/registry/[id]/quality
          }))
          .catch(() => a)
      )
    ).then((results) => {
      setDetails(results);
      setLoading(false);
    });
  }, [agents]);

  if (agents.length < 2) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 max-h-[70vh] overflow-y-auto rounded-t-2xl border-t border-border bg-surface shadow-xl animate-in slide-in-from-bottom-4">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-text">Compare Agents</span>
          <span className="rounded-full bg-violet-100 dark:bg-violet-900/40 px-2 py-0.5 text-xs font-medium text-violet-700 dark:text-violet-300">
            {agents.length} selected
          </span>
        </div>
        <button onClick={onClose} className="rounded-lg p-1.5 text-text-tertiary hover:bg-surface-muted hover:text-text transition-colors">
          <X size={16} />
        </button>
      </div>

      {/* Comparison Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-violet-300 dark:border-violet-700 border-t-violet-600" />
          <span className="ml-2 text-sm text-text-secondary">Loading comparison data…</span>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-xs font-medium text-text-tertiary bg-surface-muted w-40">Dimension</th>
                {details.map((a) => (
                  <th key={a.agentId} className="px-4 py-3 min-w-[200px]">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <Link href={`/registry/${a.agentId}`} className="text-sm font-medium text-text hover:text-violet-600 dark:text-violet-400">
                          {a.name ?? "Unnamed Agent"}
                        </Link>
                        <div className="mt-0.5 flex items-center gap-1.5">
                          <StatusBadge status={a.status} />
                          <span className="text-xs text-text-tertiary">v{a.version}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => onRemoveAgent(a.agentId)}
                        className="rounded p-0.5 text-text-tertiary hover:text-red-500 dark:text-red-400"
                        title="Remove from comparison" aria-label="Remove from comparison"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Identity */}
              <ComparisonCell
                label="Agent Type"
                values={details.map((a) => a.abp?.identity?.agentType ?? "—")}
              />
              <ComparisonCell
                label="Description"
                values={details.map((a) => (
                  <span key={a.agentId} className="line-clamp-2">{a.abp?.identity?.description ?? "—"}</span>
                ))}
              />
              {/* Risk & Governance */}
              <ComparisonCell
                label="Risk Tier"
                values={details.map((a) => a.abp?.constraints?.riskTier ?? "—")}
              />
              <ComparisonCell
                label="Human Escalation"
                values={details.map((a) =>
                  a.abp?.constraints?.humanEscalation === true ? "Yes" :
                  a.abp?.constraints?.humanEscalation === false ? "No" : "—"
                )}
              />
              <ComparisonCell
                label="Review Cycle"
                values={details.map((a) => a.abp?.governance?.reviewCycle ?? "—")}
              />
              {/* Capabilities */}
              <ComparisonCell
                label="Tools"
                values={details.map((a) => {
                  const tools = a.abp?.capabilities?.tools;
                  if (!tools || tools.length === 0) return "—";
                  return tools.slice(0, 4).map((t) => t.name).join(", ") + (tools.length > 4 ? ` +${tools.length - 4}` : "");
                })}
              />
              <ComparisonCell
                label="Data Sources"
                values={details.map((a) => {
                  const ds = a.abp?.capabilities?.dataSources;
                  if (!ds || ds.length === 0) return "—";
                  return ds.slice(0, 3).map((d) => d.name).join(", ") + (ds.length > 3 ? ` +${ds.length - 3}` : "");
                })}
              />
              {/* Quality */}
              <ComparisonCell
                label="Governance Health"
                values={details.map((a) => {
                  if (a.violationCount === null || a.violationCount === undefined) return "Not validated";
                  if (a.violationCount > 0) return <span className="text-red-600 dark:text-red-400">{a.violationCount} error{a.violationCount !== 1 ? "s" : ""}</span>;
                  if (a.warningCount && a.warningCount > 0) return <span className="text-amber-600 dark:text-amber-400">{a.warningCount} warning{a.warningCount !== 1 ? "s" : ""}</span>;
                  return <span className="text-emerald-600">Passing</span>;
                })}
              />
              <ComparisonCell
                label="Tags"
                values={details.map((a) =>
                  a.tags && a.tags.length > 0 ? a.tags.slice(0, 5).join(", ") : "—"
                )}
              />
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

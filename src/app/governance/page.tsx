"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import { fetchAgents, fetchPolicies, fetchGovernanceTemplates, fetchGovernanceAnalytics } from "@/lib/query/fetchers";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Shield, Plus, Download } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/catalyst/button";
import { Heading, Subheading } from "@/components/catalyst/heading";
import { SectionHeading } from "@/components/ui/section-heading";
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from "@/components/ui/table";
import { TableToolbar, Pagination } from "@/components/ui/table-toolbar";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { chartColors, chartFontSize, chartGridColor, chartTextColor } from "@/lib/chart-tokens";

interface Agent {
  id: string;
  agentId: string;
  name: string | null;
  status: string;
  violationCount: number | null;
  tags: string[];
  updatedAt: string;
}

interface Policy {
  id: string;
  name: string;
  type: string;
  description: string | null;
  rules: unknown[];
  enterpriseId: string | null;
  policyVersion: number;
  createdAt: string;
  scopedAgentIds: string[] | null;
}

interface SimBlueprint {
  blueprintId: string;
  agentName: string;
  agentId: string;
  status: "new_violations" | "resolved_violations" | "no_change";
  newViolationCount: number;
  resolvedViolationCount: number;
}

interface SimResult {
  summary: { total: number; newViolations: number; resolvedViolations: number; noChange: number };
  blueprints: SimBlueprint[];
}

interface PolicyHistoryEntry {
  id: string;
  policyVersion: number;
  createdAt: string;
  supersededAt: string | null;
  isActive: boolean;
}

interface TemplatePack {
  id: string;
  name: string;
  description: string;
  framework: string;
  policyCount: number;
}

interface AnalyticsData {
  agentStatusCounts: Record<string, number>;
  validationPassRate: number | null;
  policyViolationsByType: Array<{ type: string; count: number }>;
  monthlySubmissions: Array<{ month: string; count: number }>;
  monthlyApprovals: Array<{ month: string; count: number }>;
  topViolatedPolicies: Array<{ policyName: string; count: number }>;
  topViolatedRules: Array<{ policyName: string; field: string; severity: string; affectedCount: number; affectedBlueprints: string[] }>;
  avgTimeToApprovalHours: number | null;
}

const FRAMEWORK_COLORS: Record<string, string> = {
  "SR 11-7":       "bg-policy-compliance-subtle text-policy-compliance-text border-policy-compliance-border",
  "EU AI Act":     "bg-policy-data-handling-subtle text-policy-data-handling-text border-policy-data-handling-border",
  "GDPR":          "bg-policy-audit-subtle text-policy-audit-text border-policy-audit-border",
  "Best Practices":"bg-surface-raised text-text border-border",
};

const POLICY_TYPE_COLORS: Record<string, string> = {
  safety:         "bg-policy-safety-subtle text-policy-safety-text border-policy-safety-border",
  compliance:     "bg-policy-compliance-subtle text-policy-compliance-text border-policy-compliance-border",
  data_handling:  "bg-policy-data-handling-subtle text-policy-data-handling-text border-policy-data-handling-border",
  access_control: "bg-policy-access-control-subtle text-policy-access-control-text border-policy-access-control-border",
  audit:          "bg-policy-audit-subtle text-policy-audit-text border-policy-audit-border",
};

export default function GovernanceHubPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const canManagePolicies =
    session?.user?.role === "admin" || session?.user?.role === "compliance_officer";
  const canViewAnalytics =
    session?.user?.role === "admin" || session?.user?.role === "compliance_officer" || session?.user?.role === "viewer";

  // P2-344: Date range for analytics (days) — declared before queries that depend on it
  const [analyticsDays, setAnalyticsDays] = useState<30 | 90 | 365>(90);

  // ── React Query data fetching ───────────────────────────────────────────────
  const { data: agents = [], isLoading: agentsLoading, error: agentsErr } =
    useQuery({ queryKey: queryKeys.registry.agents(), queryFn: fetchAgents });

  const { data: policies = [], isLoading: policiesLoading, error: policiesErr } =
    useQuery({ queryKey: queryKeys.governance.policies(), queryFn: fetchPolicies });

  const { data: templatePacks = [], isLoading: templatePacksLoading } =
    useQuery({ queryKey: queryKeys.governance.templates(), queryFn: fetchGovernanceTemplates });

  const {
    data: analytics,
    isLoading: analyticsLoading,
    dataUpdatedAt: analyticsUpdatedAt,
  } = useQuery({
    queryKey: queryKeys.governance.analytics(analyticsDays),
    queryFn: () => fetchGovernanceAnalytics(analyticsDays) as Promise<AnalyticsData | null>,
    enabled: canViewAnalytics,
    // Analytics are expensive — keep fresh for 2 minutes
    staleTime: 2 * 60 * 1000,
  });
  const analyticsLoadedAt = analyticsUpdatedAt ? new Date(analyticsUpdatedAt) : null;

  const loading = agentsLoading || policiesLoading || templatePacksLoading;
  const error = agentsErr ? (agentsErr as Error).message
    : policiesErr ? (policiesErr as Error).message
    : null;

  // Analytics section collapsed by default — summary line shown; expand for charts
  const [analyticsExpanded, setAnalyticsExpanded] = useState(false);
  const [importingPack, setImportingPack] = useState<string | null>(null);
  const [importToast, setImportToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [duplicatePrompt, setDuplicatePrompt] = useState<{ packId: string; duplicates: string[] } | null>(null);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const [policyHistories, setPolicyHistories] = useState<Record<string, PolicyHistoryEntry[]>>({});
  const [historyLoading, setHistoryLoading] = useState<Record<string, boolean>>({});
  const [simulatingId, setSimulatingId] = useState<string | null>(null);
  const [simResults, setSimResults] = useState<Record<string, SimResult>>({});
  const [violationsSearchValue, setViolationsSearchValue] = useState("");
  const [violationsCurrentPage, setViolationsCurrentPage] = useState(1);

  const showToast = (message: string, type: "success" | "error") => {
    setImportToast({ message, type });
    setTimeout(() => setImportToast(null), 4000);
  };

  const handlePreviewImpact = async (policy: Policy) => {
    if (simulatingId === policy.id) return;
    // Toggle off if already shown
    if (simResults[policy.id]) {
      setSimResults((prev) => {
        const next = { ...prev };
        delete next[policy.id];
        return next;
      });
      return;
    }
    setSimulatingId(policy.id);
    try {
      const res = await fetch("/api/governance/policies/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          policy: { name: policy.name, type: policy.type, description: policy.description ?? "", rules: policy.rules },
          existingPolicyId: policy.id,
        }),
      });
      if (!res.ok) throw new Error("Simulation failed");
      const data: SimResult = await res.json();
      setSimResults((prev) => ({ ...prev, [policy.id]: data }));
    } catch {
      showToast("Simulation failed — check console for details", "error");
    } finally {
      setSimulatingId(null);
    }
  };

  const applyPack = async (packId: string, force = false) => {
    setImportingPack(packId);
    setDuplicatePrompt(null);
    try {
      const res = await fetch(`/api/governance/templates/${packId}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force }),
      });
      if (res.status === 409) {
        const data = await res.json();
        setDuplicatePrompt({ packId, duplicates: data.duplicates ?? [] });
        return;
      }
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Import failed");
      }
      const data = await res.json();
      showToast(`✓ Imported ${data.created} polic${data.created === 1 ? "y" : "ies"} from pack`, "success");
      await queryClient.invalidateQueries({ queryKey: queryKeys.governance.policies() });
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Import failed", "error");
    } finally {
      setImportingPack(null);
    }
  };

  const toggleHistory = async (policyId: string) => {
    if (expandedHistoryId === policyId) {
      setExpandedHistoryId(null);
      return;
    }
    setExpandedHistoryId(policyId);
    if (policyHistories[policyId]) return; // already loaded
    setHistoryLoading((prev) => ({ ...prev, [policyId]: true }));
    try {
      const res = await fetch(`/api/governance/policies/${policyId}/history`);
      if (res.ok) {
        const data = await res.json();
        setPolicyHistories((prev) => ({ ...prev, [policyId]: data.history ?? [] }));
      }
    } finally {
      setHistoryLoading((prev) => ({ ...prev, [policyId]: false }));
    }
  };

  // ── Coverage stats ─────────────────────────────────────────────────────────
  const total = agents.length;
  const clean = agents.filter((a) => a.violationCount === 0).length;
  const withErrors = agents.filter((a) => a.violationCount !== null && a.violationCount > 0).length;
  const notValidated = agents.filter((a) => a.violationCount === null).length;

  // ── Violations by status ───────────────────────────────────────────────────
  const statusGroups: Record<string, { count: number; withErrors: number }> = {};
  for (const agent of agents) {
    const s = agent.status;
    if (!statusGroups[s]) statusGroups[s] = { count: 0, withErrors: 0 };
    statusGroups[s].count++;
    if (agent.violationCount && agent.violationCount > 0) statusGroups[s].withErrors++;
  }

  // ── Agents with violations (sorted by violation count desc) ────────────────
  const agentsWithViolations = agents
    .filter((a) => a.violationCount !== null && a.violationCount > 0)
    .sort((a, b) => (b.violationCount ?? 0) - (a.violationCount ?? 0));

  // Filter violations list by search
  const filteredViolations = agentsWithViolations.filter((agent) =>
    (agent.name ?? agent.agentId).toLowerCase().includes(violationsSearchValue.toLowerCase()) ||
    agent.agentId.toLowerCase().includes(violationsSearchValue.toLowerCase())
  );

  const VIOLATIONS_PER_PAGE = 10;
  const totalViolationPages = Math.ceil(filteredViolations.length / VIOLATIONS_PER_PAGE);
  const startViolationIdx = (violationsCurrentPage - 1) * VIOLATIONS_PER_PAGE;
  const paginatedViolations = filteredViolations.slice(startViolationIdx, startViolationIdx + VIOLATIONS_PER_PAGE);

  // ── Export Compliance Report (P1-334) ────────────────────────────────────────
  // Generates a print-optimised HTML window from in-memory analytics data.
  // No new dependencies — the browser's native print dialog handles PDF export.
  function exportComplianceReport() {
    const reportDate = new Date().toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric",
    });
    const passRate = analytics?.validationPassRate != null
      ? `${analytics.validationPassRate}%` : "N/A";
    const totalViolations = analytics?.policyViolationsByType.reduce((s, t) => s + t.count, 0) ?? 0;
    const approvedCount = analytics?.agentStatusCounts?.["approved"] ?? 0;
    const pendingCount = (analytics?.agentStatusCounts?.["pending_review"] ?? 0)
      + (analytics?.agentStatusCounts?.["pending"] ?? 0);
    const avgTime = analytics?.avgTimeToApprovalHours != null
      ? `${analytics.avgTimeToApprovalHours.toFixed(1)} hrs` : "N/A";

    const topViolationsRows = (analytics?.topViolatedPolicies ?? [])
      .slice(0, 10)
      .map(
        (p) =>
          `<tr><td>${escapeHtml(p.policyName)}</td><td style="text-align:center">${p.count}</td></tr>`,
      )
      .join("");

    const violationsByTypeRows = (analytics?.policyViolationsByType ?? [])
      .map(
        (v) =>
          `<tr><td style="text-transform:capitalize">${escapeHtml(v.type.replace(/_/g, " "))}</td><td style="text-align:center">${v.count}</td></tr>`,
      )
      .join("");

    const agentViolationRows = agentsWithViolations
      .slice(0, 20)
      .map(
        (a) =>
          `<tr><td>${escapeHtml(a.name ?? a.agentId)}</td><td style="text-align:center;color:#b91c1c;font-weight:600">${a.violationCount}</td><td style="text-transform:capitalize">${escapeHtml(a.status)}</td></tr>`,
      )
      .join("");

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Intellios — Compliance Report ${reportDate}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-size: 12px; color: #111; background: #fff; padding: 40px; }
  h1 { font-size: 22px; font-weight: 700; color: #111; margin-bottom: 4px; }
  .subtitle { font-size: 12px; color: #6b7280; margin-bottom: 32px; }
  h2 { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #6b7280; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; margin: 28px 0 14px; }
  .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 8px; }
  .kpi { border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px 16px; }
  .kpi-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #6b7280; margin-bottom: 4px; }
  .kpi-value { font-size: 24px; font-weight: 700; color: #111; }
  .kpi-value.red { color: #b91c1c; }
  .kpi-value.green { color: #15803d; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { background: #f9fafb; text-align: left; padding: 7px 10px; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; border-bottom: 1px solid #e5e7eb; }
  td { padding: 7px 10px; border-bottom: 1px solid #f3f4f6; color: #374151; }
  .footer { margin-top: 40px; font-size: 10px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 14px; display: flex; justify-content: space-between; }
  @media print {
    body { padding: 20px; }
    h2 { page-break-after: avoid; }
    table { page-break-inside: avoid; }
  }
</style>
</head>
<body>
<h1>Intellios Compliance Report</h1>
<p class="subtitle">Generated ${reportDate} &nbsp;·&nbsp; ${policies.length} active policies &nbsp;·&nbsp; ${agents.length} agents</p>

<h2>Executive Summary</h2>
<div class="kpi-grid">
  <div class="kpi"><div class="kpi-label">Validation Pass Rate</div><div class="kpi-value ${analytics?.validationPassRate != null && analytics.validationPassRate < 80 ? "red" : "green"}">${passRate}</div></div>
  <div class="kpi"><div class="kpi-label">Total Violations</div><div class="kpi-value ${totalViolations > 0 ? "red" : "green"}">${totalViolations}</div></div>
  <div class="kpi"><div class="kpi-label">Approved Agents</div><div class="kpi-value green">${approvedCount}</div></div>
  <div class="kpi"><div class="kpi-label">Avg Time to Approval</div><div class="kpi-value">${avgTime}</div></div>
</div>

${violationsByTypeRows ? `<h2>Violations by Category</h2>
<table><thead><tr><th>Category</th><th style="text-align:center">Count</th></tr></thead>
<tbody>${violationsByTypeRows}</tbody></table>` : ""}

${topViolationsRows ? `<h2>Top Violated Policies</h2>
<table><thead><tr><th>Policy</th><th style="text-align:center">Violations</th></tr></thead>
<tbody>${topViolationsRows}</tbody></table>` : ""}

${agentViolationRows ? `<h2>Agents Requiring Attention (${agentsWithViolations.length})</h2>
<table><thead><tr><th>Agent</th><th style="text-align:center">Violations</th><th>Status</th></tr></thead>
<tbody>${agentViolationRows}</tbody></table>` : ""}

<h2>Active Policies (${policies.length})</h2>
<table>
  <thead><tr><th>Policy</th><th>Type</th><th>Version</th><th>Created</th></tr></thead>
  <tbody>
    ${policies.map((p) => `<tr>
      <td>${escapeHtml(p.name)}</td>
      <td style="text-transform:capitalize">${escapeHtml(p.type.replace(/_/g, " "))}</td>
      <td>v${p.policyVersion}</td>
      <td>${new Date(p.createdAt).toLocaleDateString()}</td>
    </tr>`).join("")}
  </tbody>
</table>

<div class="footer">
  <span>Intellios Enterprise Governance Platform</span>
  <span>Confidential — For authorized use only</span>
</div>
<script>window.onload = function(){ window.print(); };<\/script>
</body>
</html>`;

    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  }

  function escapeHtml(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  return (
    <div className="px-6 py-6 space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Shield size={20} className="text-violet-600" />
            <Heading level={1}>Governance Hub</Heading>
          </div>
          <p className="mt-0.5 text-sm text-text-secondary">Define and manage governance policies</p>
        </div>
        <Link
          href="/audit"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-text-secondary hover:border-border-strong hover:text-text transition-colors"
        >
          Audit Trail →
        </Link>
      </div>

      {/* ── Quick Actions ────────────────────────────────────────────────────
           Surfaces frequently-needed actions without requiring the user to
           scroll through the analytics and policy list sections. Actions are
           conditionally rendered based on role and current page state.        */}
      {!loading && (
        <div className="flex flex-wrap items-center gap-2">
          {canManagePolicies && (
            <Link
              href="/governance/policies/new"
              className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-sm font-medium text-violet-700 hover:bg-violet-100 transition-colors"
            >
              <Plus size={13} />
              New Policy
            </Link>
          )}
          {canManagePolicies && templatePacks.length > 0 && (
            <button
              onClick={() =>
                document.getElementById("template-packs")?.scrollIntoView({ behavior: "smooth", block: "start" })
              }
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-text-secondary hover:border-border-strong hover:text-text transition-colors"
            >
              <Download size={13} />
              Import Pack
            </button>
          )}
          {agentsWithViolations.length > 0 && (
            <button
              onClick={() =>
                document.getElementById("violations")?.scrollIntoView({ behavior: "smooth", block: "start" })
              }
              className="inline-flex items-center gap-2 rounded-lg border border-danger-muted bg-danger-muted px-3 py-1.5 text-sm font-medium text-danger-text hover:bg-danger-subtle transition-colors"
            >
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-danger-subtle text-[10px] font-bold text-danger-text">
                {agentsWithViolations.length}
              </span>
              Active Violations
            </button>
          )}
          {!canViewAnalytics && (
            <Link
              href="/audit"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-text-secondary hover:border-border-strong hover:text-text transition-colors"
            >
              Audit Trail →
            </Link>
          )}
          {canViewAnalytics && analytics && (
            <button
              onClick={exportComplianceReport}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
            >
              <Download size={13} />
              Export Compliance Report
            </button>
          )}
          {canViewAnalytics && (
            <a
              href="/api/compliance/calendar.ics"
              download="intellios-compliance-calendar.ics"
              title="Download an .ics file with all compliance review deadlines and policy renewal dates — import into Outlook or Google Calendar"
              className="inline-flex items-center gap-1.5 rounded-lg border border-info-muted bg-info-muted px-3 py-1.5 text-sm font-medium text-info-text hover:bg-info-subtle transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              Add to Calendar
            </a>
          )}
        </div>
      )}

      <div className="space-y-6">
        {error && (
          <div className="rounded-lg border border-danger-muted bg-danger-muted p-4 text-sm text-danger-text">
            {error}
          </div>
        )}

        {/* ── Governance Analytics ─────────────────────────────────────────── */}
        {canViewAnalytics && (
          <section>
            {/* Collapsible header — summary line when collapsed */}
            <button
              onClick={() => setAnalyticsExpanded((v) => !v)}
              className="mb-4 flex w-full items-center justify-between group"
            >
              <SectionHeading className="text-sm group-hover:text-text transition-colors">
                Analytics
              </SectionHeading>
              <div className="flex items-center gap-3">
                {!analyticsExpanded && !analyticsLoading && analytics && (
                  <span className="text-xs text-text-tertiary">
                    {analytics.validationPassRate != null ? `Pass rate: ${analytics.validationPassRate}%` : ""}
                    {analytics.validationPassRate != null && " · "}
                    {(() => {
                      const total = analytics.policyViolationsByType.reduce((s, t) => s + t.count, 0);
                      return total > 0 ? <span className="text-danger font-medium">{total} violation{total !== 1 ? "s" : ""}</span> : "0 violations";
                    })()}
                    {analytics.avgTimeToApprovalHours != null && ` · ${analytics.avgTimeToApprovalHours < 24 ? `${analytics.avgTimeToApprovalHours}h` : `${Math.round(analytics.avgTimeToApprovalHours / 24)}d`} avg approval`}
                  </span>
                )}
                {analyticsExpanded && analyticsLoadedAt && (
                  <span className="text-xs text-text-tertiary" title={analyticsLoadedAt.toLocaleString()}>
                    Refreshed {analyticsLoadedAt.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
                <span className="text-xs text-text-tertiary group-hover:text-text-secondary transition-colors">
                  {analyticsExpanded ? "▲ Collapse" : "▼ Expand"}
                </span>
              </div>
            </button>

            {analyticsExpanded && (
              <>
            {/* P2-344: Date range selector */}
            <div className="mb-4 flex items-center gap-2">
              <span className="text-xs text-text-tertiary font-medium">Period:</span>
              {([30, 90, 365] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setAnalyticsDays(d)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    analyticsDays === d
                      ? "bg-indigo-600 text-white"
                      : "border border-border bg-surface text-text-secondary hover:border-indigo-300 hover:text-indigo-700"
                  }`}
                >
                  {d === 365 ? "Last 365 days" : `Last ${d} days`}
                </button>
              ))}
            </div>

            {/* P2-344: Narrative summary */}
            {!analyticsLoading && analytics && (() => {
              const passRate = analytics.validationPassRate ?? null;
              const totalViolations = analytics.policyViolationsByType.reduce((s, t) => s + t.count, 0);
              const approved = analytics.agentStatusCounts?.["approved"] ?? 0;
              const deployed = analytics.agentStatusCounts?.["deployed"] ?? 0;
              const periodLabel = analyticsDays === 365 ? "In the last year" : `In the last ${analyticsDays} days`;
              const passPhrase = passRate != null
                ? ` with a ${passRate}% validation pass rate`
                : "";
              const violationPhrase = totalViolations > 0
                ? `, ${totalViolations} violation${totalViolations !== 1 ? "s" : ""} detected`
                : ", no violations detected";
              const deployedPhrase = deployed > 0 ? ` and ${deployed} agent${deployed !== 1 ? "s" : ""} running in production` : "";
              return (
                <div className="mb-5 rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-3">
                  <p className="text-xs font-semibold text-indigo-700 mb-0.5">Summary</p>
                  <p className="text-sm text-indigo-900">
                    {periodLabel}: <span className="font-semibold">{approved} agent{approved !== 1 ? "s" : ""} approved</span>
                    {passPhrase}{violationPhrase}{deployedPhrase}.
                  </p>
                </div>
              );
            })()}

            {/* KPI Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              {[
                {
                  label: "Validation Pass Rate",
                  value: analyticsLoading
                    ? "–"
                    : analytics?.validationPassRate != null
                    ? `${analytics.validationPassRate}%`
                    : "N/A",
                  sub: "of validated agents",
                  color:
                    analytics?.validationPassRate != null && analytics.validationPassRate >= 80
                      ? "bg-success-muted border border-success-muted text-success-text"
                      : analytics?.validationPassRate != null && analytics.validationPassRate >= 50
                      ? "bg-warning-muted border border-warning-muted text-warning-text"
                      : analytics?.validationPassRate != null
                      ? "bg-danger-muted border border-danger-muted text-danger-text"
                      : "bg-surface border-border text-text",
                  subColor:
                    analytics?.validationPassRate != null && analytics.validationPassRate >= 80
                      ? "text-success"
                      : analytics?.validationPassRate != null && analytics.validationPassRate >= 50
                      ? "text-warning"
                      : analytics?.validationPassRate != null
                      ? "text-danger"
                      : "text-text-tertiary",
                },
                {
                  label: "Avg Time to Approval",
                  value: analyticsLoading
                    ? "–"
                    : analytics?.avgTimeToApprovalHours != null
                    ? analytics.avgTimeToApprovalHours < 24
                      ? `${analytics.avgTimeToApprovalHours}h`
                      : `${Math.round(analytics.avgTimeToApprovalHours / 24)}d`
                    : "N/A",
                  sub: "from review submission",
                  color: "bg-surface border-border text-text",
                  subColor: "text-text-tertiary",
                },
                {
                  label: "Active Violations",
                  value: analyticsLoading
                    ? "–"
                    : analytics
                    ? analytics.policyViolationsByType.reduce((s, t) => s + t.count, 0)
                    : "–",
                  sub: "across all agents",
                  color:
                    !analyticsLoading &&
                    analytics &&
                    analytics.policyViolationsByType.reduce((s, t) => s + t.count, 0) > 0
                      ? "bg-danger-muted border border-danger-muted text-danger-text"
                      : "bg-surface border-border text-text",
                  subColor:
                    !analyticsLoading &&
                    analytics &&
                    analytics.policyViolationsByType.reduce((s, t) => s + t.count, 0) > 0
                      ? "text-danger"
                      : "text-text-tertiary",
                },
              ].map(({ label, value, sub, color, subColor }) => (
                <div key={label} className={`rounded-xl border p-5 ${color}`}>
                  <div className="text-3xl font-bold">{value}</div>
                  <div className="mt-1 text-sm font-medium">{label}</div>
                  <div className={`mt-0.5 text-xs ${subColor}`}>{sub}</div>
                </div>
              ))}
            </div>

            {!analyticsLoading && analytics && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Monthly Submissions vs Approvals bar chart */}
                <div className="rounded-xl border border-border bg-surface p-5">
                  <SectionHeading className="mb-4">
                    Monthly Activity (last 6 months)
                  </SectionHeading>
                  {analytics.monthlySubmissions.every((m) => m.count === 0) ? (
                    <p className="text-center text-xs text-text-tertiary py-8">
                      No submission activity in the last 6 months
                    </p>
                  ) : (
                    <ResponsiveContainer width="100%" height={160}>
                      <BarChart
                        data={analytics.monthlySubmissions.map((sub, i) => ({
                          month: sub.month.slice(0, 7),
                          submitted: sub.count,
                          approved: analytics.monthlyApprovals[i]?.count ?? 0,
                        }))}
                        margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                        barCategoryGap="30%"
                        barGap={2}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} vertical={false} />
                        <XAxis dataKey="month" tick={{ fontSize: chartFontSize, fill: chartTextColor }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: chartFontSize, fill: chartTextColor }} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{ fontSize: chartFontSize, borderRadius: 6, border: "1px solid #e1e5ef", padding: "4px 8px" }}
                          cursor={{ fill: "#f0f2f8" }}
                        />
                        <Bar dataKey="submitted" name="Submitted" fill={chartColors.info} radius={[3, 3, 0, 0]} />
                        <Bar dataKey="approved" name="Approved" fill={chartColors.success} radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* Right column: Top Violated Policies + Agent Status Distribution */}
                <div className="space-y-6">
                  {/* Top Violated Policies */}
                  <div className="rounded-xl border border-border bg-surface p-5">
                    <SectionHeading className="mb-3">
                      Top Violated Policies
                    </SectionHeading>
                    {analytics.topViolatedPolicies.length === 0 ? (
                      <p className="text-xs text-text-tertiary py-2">
                        No active violations — all validated agents are clean
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {analytics.topViolatedPolicies.map((p) => (
                          <div
                            key={p.policyName}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="truncate text-text text-xs">{p.policyName}</span>
                            <span className="ml-3 shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                              {p.count} error{p.count === 1 ? "" : "s"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Rule Violation Detail — which specific rules fail most, with affected blueprints */}
                  {analytics.topViolatedRules && analytics.topViolatedRules.length > 0 && (
                    <div className="col-span-2 rounded-xl border border-border bg-surface p-5">
                      <SectionHeading className="mb-3">
                        Violation Hotspots
                      </SectionHeading>
                      <p className="mb-3 text-xs text-text-tertiary">
                        Most frequently violated rules across active blueprints
                      </p>
                      <div className="space-y-2">
                        {analytics.topViolatedRules.map((rule, idx) => (
                          <div key={idx} className="rounded-lg border border-red-100 bg-red-50/50 p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-medium text-text">{rule.policyName}</p>
                                <p className="mt-0.5 text-xs text-text-secondary font-mono">{rule.field}</p>
                              </div>
                              <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                                {rule.affectedCount} agent{rule.affectedCount === 1 ? "" : "s"}
                              </span>
                            </div>
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {rule.affectedBlueprints.map((name) => (
                                <span key={name} className="rounded bg-surface px-1.5 py-0.5 text-xs-tight text-text-secondary border border-border">
                                  {name}
                                </span>
                              ))}
                              {rule.affectedCount > rule.affectedBlueprints.length && (
                                <span className="text-xs-tight text-text-tertiary">
                                  +{rule.affectedCount - rule.affectedBlueprints.length} more
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Agent Status Distribution */}
                  <div className="rounded-xl border border-border bg-surface p-5">
                    <SectionHeading className="mb-3">
                      Agent Status Distribution
                    </SectionHeading>
                    {Object.keys(analytics.agentStatusCounts).length === 0 ? (
                      <p className="text-xs text-text-tertiary py-2">No agents in registry</p>
                    ) : (() => {
                          const STATUS_HEX: Record<string, string> = {
                            draft:      chartColors.gray,
                            in_review:  chartColors.warning,
                            approved:   chartColors.info,
                            deployed:   chartColors.success,
                            rejected:   chartColors.danger,
                            deprecated: "#9ca3af",
                          };
                          const pieData = Object.entries(analytics.agentStatusCounts)
                            .sort((a, b) => b[1] - a[1])
                            .map(([status, count]) => ({ name: status.replace("_", " "), value: count, status }));
                          return (
                            <div className="flex flex-col items-center gap-3">
                              <ResponsiveContainer width="100%" height={120}>
                                <PieChart>
                                  <Pie
                                    data={pieData}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={32}
                                    outerRadius={52}
                                    paddingAngle={2}
                                  >
                                    {pieData.map((entry) => (
                                      <Cell key={entry.status} fill={STATUS_HEX[entry.status] ?? chartColors.gray} />
                                    ))}
                                  </Pie>
                                  <Tooltip
                                    contentStyle={{ fontSize: chartFontSize, borderRadius: 6, border: "1px solid #e1e5ef", padding: "4px 8px" }}
                                    formatter={(_value, name) => [_value, name]}
                                  />
                                </PieChart>
                              </ResponsiveContainer>
                              <div className="flex flex-wrap justify-center gap-x-3 gap-y-1">
                                {pieData.map((entry) => (
                                  <span key={entry.status} className="flex items-center gap-1 text-xs text-text-secondary capitalize">
                                    <span className="inline-block h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: STATUS_HEX[entry.status] ?? chartColors.gray }} />
                                    {entry.name} ({entry.value})
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        })()
                    }
                  </div>
                </div>
              </div>
            )}

            {analyticsLoading && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="h-64 animate-pulse rounded-xl bg-surface-muted" />
                <div className="space-y-4">
                  <div className="h-28 animate-pulse rounded-xl bg-surface-muted" />
                  <div className="h-32 animate-pulse rounded-xl bg-surface-muted" />
                </div>
              </div>
            )}
              </>
            )}
          </section>
        )}

        {/* ── Coverage Stats ──────────────────────────────────────────────── */}
        <section>
          <SectionHeading className="mb-4 text-sm">
            Coverage Overview
          </SectionHeading>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              {
                label: "Total Agents",
                value: loading ? "–" : total,
                sub: "in registry",
                color: "bg-surface border-border text-text",
                subColor: "text-text-tertiary",
              },
              {
                label: "Passing Governance",
                value: loading ? "–" : clean,
                sub: total > 0 ? `${Math.round((clean / total) * 100)}% of agents` : "—",
                color: "bg-success-muted border border-success-muted text-success-text",
                subColor: "text-success",
              },
              {
                label: "With Errors",
                value: loading ? "–" : withErrors,
                sub: withErrors > 0 ? "need remediation" : "none",
                color: withErrors > 0
                  ? "bg-danger-muted border border-danger-muted text-danger-text"
                  : "bg-surface border-border text-text",
                subColor: withErrors > 0 ? "text-danger" : "text-text-tertiary",
              },
              {
                label: "Not Validated",
                value: loading ? "–" : notValidated,
                sub: notValidated > 0 ? "validate in Workbench" : "all validated",
                color: notValidated > 0
                  ? "bg-warning-muted border border-warning-muted text-warning-text"
                  : "bg-surface border-border text-text",
                subColor: notValidated > 0 ? "text-warning" : "text-text-tertiary",
              },
            ].map(({ label, value, sub, color, subColor }) => (
              <div key={label} className={`rounded-card border p-5 ${color}`}>
                <div className="text-3xl font-bold">{value}</div>
                <div className="mt-1 text-sm font-medium">{label}</div>
                <div className={`mt-0.5 text-xs ${subColor}`}>{sub}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Agents with violations ──────────────────────────────────────── */}
        {!loading && agentsWithViolations.length > 0 && (
          <section id="violations">
            <SectionHeading className="mb-4 text-sm">
              Agents Requiring Attention ({agentsWithViolations.length})
            </SectionHeading>
            <div className="space-y-4">
              <TableToolbar
                searchPlaceholder="Search agents by name or ID…"
                searchValue={violationsSearchValue}
                onSearchChange={(val) => {
                  setViolationsSearchValue(val);
                  setViolationsCurrentPage(1);
                }}
                resultCount={filteredViolations.length}
                resultLabel="agent"
              />
              <div className="space-y-2">
                {paginatedViolations.map((agent) => (
                <Link
                  key={agent.agentId}
                  href={`/registry/${agent.agentId}?tab=governance`}
                  className="flex items-center justify-between rounded-lg border border-red-200 bg-surface px-5 py-3 hover:border-red-400 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="truncate font-medium text-sm text-text">
                      {agent.name ?? "Unnamed Agent"}
                    </span>
                    <span className="shrink-0 rounded-full bg-surface-muted px-2 py-0.5 text-xs text-text-secondary capitalize">
                      {agent.status.replace("_", " ")}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="rounded-full bg-danger-subtle px-2.5 py-0.5 text-xs font-medium text-danger-text">
                      {agent.violationCount} error{agent.violationCount === 1 ? "" : "s"}
                    </span>
                    <span className="text-xs text-text-tertiary">View →</span>
                  </div>
                </Link>
              ))}
              </div>
              {totalViolationPages > 1 && (
                <Pagination
                  currentPage={violationsCurrentPage}
                  totalPages={totalViolationPages}
                  onPageChange={setViolationsCurrentPage}
                />
              )}
            </div>
          </section>
        )}

        {!loading && agentsWithViolations.length === 0 && total > 0 && notValidated === 0 && (
          <section>
            <div className="rounded-card border border-success-muted bg-success-muted p-6 text-center">
              <p className="text-lg font-medium text-success-text">✓ All validated agents pass governance</p>
              <p className="mt-1 text-sm text-success">
                {clean} agent{clean === 1 ? "" : "s"} validated against {policies.length} polic{policies.length === 1 ? "y" : "ies"}
              </p>
            </div>
          </section>
        )}

        {/* ── Policy library ──────────────────────────────────────────────── */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <SectionHeading className="text-sm">
              Policy Library ({loading ? "…" : policies.length})
            </SectionHeading>
            {canManagePolicies && (
              <Link
                href="/governance/policies/new"
                className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-700 transition-colors"
              >
                <Plus size={14} />New Policy
              </Link>
            )}
          </div>

          {/* W3-08: aria-live region announces loading → content transitions */}
          <div aria-live="polite" aria-atomic="false">
          {loading && (
            <div role="status" aria-label="Loading policies" aria-busy="true" className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg bg-surface-muted" />
              ))}
              <span className="sr-only">Loading policies…</span>
            </div>
          )}

          {!loading && policies.length === 0 && (
            <EmptyState
              icon={Shield}
              heading="No governance policies defined"
              subtext={canManagePolicies
                ? "Create your first policy to start validating agent blueprints against your enterprise standards."
                : "Contact your administrator to define governance policies for this enterprise."}
              action={canManagePolicies ? (
                <Button href="/governance/policies/new" color="indigo">
                  <Plus size={14} />
                  Create first policy
                </Button>
              ) : undefined}
            />
          )}

          {!loading && policies.length > 0 && (
            <div className="space-y-2">
              {policies.map((policy) => (
                <div key={policy.id} className="rounded-lg border border-border bg-surface overflow-hidden">
                  {/* Policy card row */}
                  <div className="flex items-start justify-between px-5 py-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm text-text">{policy.name}</span>
                        <span
                          className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${
                            POLICY_TYPE_COLORS[policy.type] ?? "bg-surface-raised text-text-secondary border-border"
                          }`}
                        >
                          {policy.type.replace("_", " ")}
                        </span>
                        {policy.policyVersion > 1 && (
                          <span className="shrink-0 rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-xs font-medium text-indigo-700">
                            v{policy.policyVersion}
                          </span>
                        )}
                        {Array.isArray(policy.scopedAgentIds) && policy.scopedAgentIds.length > 0 && (
                          <span
                            className="shrink-0 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs font-medium text-amber-700"
                            title={`Scoped to ${policy.scopedAgentIds.length} agent${policy.scopedAgentIds.length !== 1 ? "s" : ""}`}
                          >
                            {policy.scopedAgentIds.length} agent{policy.scopedAgentIds.length !== 1 ? "s" : ""}
                          </span>
                        )}
                        {!policy.enterpriseId && (
                          <span className="shrink-0 rounded-full bg-purple-50 border border-purple-200 px-2 py-0.5 text-xs text-purple-700">
                            platform
                          </span>
                        )}
                      </div>
                      {policy.description && (
                        <p className="mt-1 text-xs text-text-secondary line-clamp-2">{policy.description}</p>
                      )}
                    </div>
                    <div className="shrink-0 ml-4 text-right space-y-1">
                      <div className="text-xs text-text-tertiary">
                        {Array.isArray(policy.rules) ? policy.rules.length : 0} rule{(Array.isArray(policy.rules) ? policy.rules.length : 0) === 1 ? "" : "s"}
                      </div>
                      <div className="text-xs text-text-tertiary">
                        {new Date(policy.createdAt).toLocaleDateString()}
                      </div>
                      <div className="flex items-center justify-end gap-3">
                        {canManagePolicies && (
                          <button
                            onClick={() => handlePreviewImpact(policy)}
                            disabled={simulatingId === policy.id}
                            className="text-xs text-violet-600 hover:text-violet-800 disabled:text-text-tertiary transition-colors"
                            title="Simulate impact on approved/deployed agents"
                          >
                            {simulatingId === policy.id
                              ? "Simulating…"
                              : simResults[policy.id]
                              ? "× Clear"
                              : "Preview Impact"}
                          </button>
                        )}
                        {canManagePolicies && policy.policyVersion > 1 && (
                          <button
                            onClick={() => toggleHistory(policy.id)}
                            className="text-xs text-text-secondary hover:text-text transition-colors"
                          >
                            {expandedHistoryId === policy.id ? "Hide history" : "History"}
                          </button>
                        )}
                        {canManagePolicies && (
                          <Link
                            href={`/governance/policies/${policy.id}/edit`}
                            className="inline-block text-xs text-primary hover:text-primary-hover transition-colors"
                          >
                            {policy.enterpriseId === null ? "View" : "Edit"} →
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ── Inline simulation result panel ─────────────────── */}
                  {simResults[policy.id] && (() => {
                    const sim = simResults[policy.id];
                    const affected = sim.blueprints.filter((b) => b.status !== "no_change");
                    return (
                      <div className="border-t border-violet-100 bg-violet-50 px-5 py-4">
                        <SectionHeading className="mb-3" style={{ color: "#6d28d9" }}>
                          Impact Preview — {sim.summary.total} agent{sim.summary.total !== 1 ? "s" : ""} checked
                        </SectionHeading>
                        {/* Summary stats */}
                        <div className="flex items-center gap-3 mb-3">
                          <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                            sim.summary.newViolations > 0
                              ? "bg-danger-muted border-danger-muted text-danger-text"
                              : "bg-surface-raised border-border text-text-secondary"
                          }`}>
                            {sim.summary.newViolations} new violation{sim.summary.newViolations !== 1 ? "s" : ""}
                          </span>
                          <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                            sim.summary.resolvedViolations > 0
                              ? "bg-success-muted border-success-muted text-success-text"
                              : "bg-surface-raised border-border text-text-secondary"
                          }`}>
                            {sim.summary.resolvedViolations} resolved
                          </span>
                          <span className="rounded-full border border-border bg-surface-raised px-2.5 py-0.5 text-xs font-medium text-text-secondary">
                            {sim.summary.noChange} no change
                          </span>
                        </div>
                        {/* Affected agents list */}
                        {affected.length === 0 ? (
                          <p className="text-xs text-violet-600">No agents affected — all pass or fail with no change.</p>
                        ) : (
                          <div className="space-y-1">
                            {affected.slice(0, 5).map((b) => (
                              <div key={b.blueprintId} className="flex items-center gap-2">
                                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                                  b.status === "new_violations"
                                    ? "bg-danger-subtle text-danger-text"
                                    : "bg-success-subtle text-success-text"
                                }`}>
                                  {b.status === "new_violations" ? `+${b.newViolationCount}` : `−${b.resolvedViolationCount}`}
                                </span>
                                <Link
                                  href={`/registry/${b.agentId}`}
                                  className="text-xs text-text hover:underline truncate"
                                >
                                  {b.agentName}
                                </Link>
                              </div>
                            ))}
                            {affected.length > 5 && (
                              <p className="text-xs text-text-tertiary pt-1">+{affected.length - 5} more affected agents</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Expandable version history */}
                  {expandedHistoryId === policy.id && (
                    <div className="border-t border-border-subtle bg-surface-raised px-5 py-3">
                      <SectionHeading className="mb-2">
                        Version History
                      </SectionHeading>
                      {historyLoading[policy.id] ? (
                        <div className="text-xs text-text-tertiary py-2">Loading…</div>
                      ) : (policyHistories[policy.id] ?? []).length === 0 ? (
                        <div className="text-xs text-text-tertiary py-2">No history available.</div>
                      ) : (
                        <Table dense>
                          <TableHead>
                            <TableRow>
                              <TableHeader>Version</TableHeader>
                              <TableHeader>Date</TableHeader>
                              <TableHeader>Status</TableHeader>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {(policyHistories[policy.id] ?? []).map((entry) => (
                              <TableRow key={entry.id} className="interactive-row">
                                <TableCell className="font-medium text-text-secondary">v{entry.policyVersion}</TableCell>
                                <TableCell className="text-text-secondary">
                                  {new Date(entry.createdAt).toLocaleDateString(undefined, {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </TableCell>
                                <TableCell>
                                  {entry.isActive ? (
                                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-green-700 font-medium">
                                      Active
                                    </span>
                                  ) : (
                                    <span className="rounded-full bg-surface-muted px-2 py-0.5 text-text-secondary">
                                      Superseded
                                    </span>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          </div>{/* end aria-live region */}
        </section>

        {/* ── Compliance Starter Packs ────────────────────────────────────── */}
        {templatePacks.length > 0 && (
          <section id="template-packs">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <SectionHeading className="text-sm">
                  Compliance Starter Packs
                </SectionHeading>
                <p className="mt-0.5 text-xs text-text-tertiary">
                  Pre-built policy packs for common regulatory frameworks. Policies are created in your enterprise and can be edited after import.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {templatePacks.map((pack) => (
                <div
                  key={pack.id}
                  className="rounded-xl border border-border bg-surface p-5 flex flex-col gap-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-text">{pack.name}</span>
                        <span
                          className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${
                            FRAMEWORK_COLORS[pack.framework] ?? "bg-surface-raised text-text-secondary border-border"
                          }`}
                        >
                          {pack.framework}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-text-secondary line-clamp-3">{pack.description}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-2xl font-bold text-text">{pack.policyCount}</div>
                      <div className="text-xs text-text-tertiary">polic{pack.policyCount === 1 ? "y" : "ies"}</div>
                    </div>
                  </div>
                  {canManagePolicies && (
                    <button
                      onClick={() => applyPack(pack.id)}
                      disabled={importingPack === pack.id}
                      className="mt-auto w-full rounded-lg border border-border px-3 py-2 text-sm font-medium text-text hover:border-border-strong hover:text-text transition-colors disabled:opacity-50"
                    >
                      {importingPack === pack.id ? "Importing…" : "Import Pack →"}
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Duplicate conflict prompt */}
            {duplicatePrompt && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
                <p className="text-sm font-medium text-amber-800 mb-1">
                  {duplicatePrompt.duplicates.length} existing polic{duplicatePrompt.duplicates.length === 1 ? "y" : "ies"} would be replaced:
                </p>
                <ul className="mb-3 space-y-0.5">
                  {duplicatePrompt.duplicates.map((name) => (
                    <li key={name} className="text-xs text-amber-700">• {name}</li>
                  ))}
                </ul>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => applyPack(duplicatePrompt.packId, true)}
                    disabled={importingPack === duplicatePrompt.packId}
                    className="rounded-lg bg-amber-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                  >
                    {importingPack === duplicatePrompt.packId ? "Importing…" : "Overwrite and Import"}
                  </button>
                  <button
                    onClick={() => setDuplicatePrompt(null)}
                    className="text-sm text-amber-700 hover:text-amber-900"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Import toast */}
            {importToast && (
              <div
                className={`mt-4 rounded-lg border px-4 py-3 text-sm font-medium ${
                  importToast.type === "success"
                    ? "border-green-200 bg-green-50 text-green-800"
                    : "border-red-200 bg-red-50 text-red-700"
                }`}
              >
                {importToast.message}
              </div>
            )}
          </section>
        )}

        {/* ── Status breakdown ────────────────────────────────────────────── */}
        {!loading && Object.keys(statusGroups).length > 0 && (
          <section>
            <SectionHeading className="mb-4 text-sm">
              Compliance by Stage
            </SectionHeading>
            <div className="overflow-hidden rounded-card border border-border bg-surface">
              <Table striped>
                <TableHead>
                  <TableRow>
                    <TableHeader>Stage</TableHeader>
                    <TableHeader>Agents</TableHeader>
                    <TableHeader>With Errors</TableHeader>
                    <TableHeader>Clean</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.entries(statusGroups).map(([status, { count, withErrors: we }]) => (
                    <TableRow key={status} className="interactive-row">
                      <TableCell className="font-medium text-text capitalize">
                        {status.replace("_", " ")}
                      </TableCell>
                      <TableCell className="text-right text-text-secondary">{count}</TableCell>
                      <TableCell className="text-right">
                        {we > 0 ? (
                          <span className="font-medium text-red-600">{we}</span>
                        ) : (
                          <span className="text-text-tertiary">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={count - we > 0 ? "text-green-600 font-medium" : "text-text-tertiary"}>
                          {count - we}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

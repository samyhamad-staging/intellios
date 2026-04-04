"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Heading } from "@/components/catalyst/heading";
import { SkeletonList } from "@/components/ui/skeleton";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import Link from "next/link";
import { Globe, Users, CheckSquare, Activity, DollarSign, Layers } from "lucide-react";
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from "@/components/ui/table";
import { TableToolbar, Pagination } from "@/components/ui/table-toolbar";

// ─── Types ────────────────────────────────────────────────────────────────────

interface EnterpriseRow {
  enterpriseId: string | null;
  totalAgents: number;
  deployedAgents: number;
  statusCounts: Record<string, number>;
  complianceRate: number | null;
}

interface FleetTotals {
  enterpriseCount: number;
  totalAgents: number;
  deployedAgents: number;
  avgComplianceRate: number | null;
}

interface AgentTypeRow {
  agentType: string;
  total: number;
  deployed: number;
}

interface FleetData {
  enterprises: EnterpriseRow[];
  totals: FleetTotals;
  byAgentType: AgentTypeRow[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// P2-562: Agent-type → department label + estimated monthly cost per deployed agent
const AGENT_TYPE_META: Record<string, { label: string; dept: string; costPerAgent: number; color: string }> = {
  automation:       { label: "Automation",       dept: "IT / Operations",  costPerAgent: 120, color: "bg-blue-50 text-blue-700 border-blue-100"     },
  "decision-support": { label: "Decision Support", dept: "Risk / Compliance", costPerAgent: 180, color: "bg-violet-50 text-violet-700 border-violet-100" },
  autonomous:       { label: "Autonomous",       dept: "Advanced Ops",     costPerAgent: 250, color: "bg-amber-50 text-amber-700 border-amber-100"   },
  "data-access":    { label: "Data Access",      dept: "Analytics / BI",   costPerAgent: 140, color: "bg-emerald-50 text-emerald-700 border-emerald-100" },
  unclassified:     { label: "Unclassified",     dept: "—",                costPerAgent: 150, color: "bg-surface-raised text-text-secondary border-border-subtle"     },
};

function defaultMeta(agentType: string) {
  return AGENT_TYPE_META[agentType] ?? { label: agentType, dept: "Other", costPerAgent: 150, color: "bg-surface-raised text-text-secondary border-border-subtle" };
}

const COST_PER_DEPLOYED = 150; // blended monthly average in USD

function formatCost(n: number) {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n}`;
}

function ComplianceBadge({ rate }: { rate: number | null }) {
  if (rate === null) return <span className="text-xs text-text-tertiary">—</span>;
  const color =
    rate >= 90 ? "text-green-600 bg-green-50" :
    rate >= 70 ? "text-amber-600 bg-amber-50" :
    "text-red-600 bg-red-50";
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${color}`}>
      {rate}%
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminFleetPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();

  const [data, setData] = useState<FleetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Auth gate: admin only, no enterpriseId (super-admin)
  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (!session?.user) { router.push("/login"); return; }
    if (session.user.role !== "admin") { router.push("/"); return; }
  }, [session, sessionStatus, router]);

  useEffect(() => {
    if (sessionStatus !== "authenticated") return;
    if (session?.user?.role !== "admin") return;

    fetch("/api/admin/fleet-overview")
      .then(async (r) => {
        if (!r.ok) {
          if (r.status === 403) {
            setError("super-admin-only");
          } else {
            setError("Failed to load fleet data");
          }
          setLoading(false);
          return;
        }
        const d = await r.json();
        setData(d as FleetData);
        setLoading(false);
      })
      .catch(() => { setError("Failed to load fleet data"); setLoading(false); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionStatus]);

  if (sessionStatus === "loading" || loading) {
    return (
      <div className="px-6 py-6 space-y-4">
        <SkeletonList rows={4} height="h-16" />
      </div>
    );
  }

  if (error) {
    if (error === "super-admin-only") {
      // M-04: Add heading/structure to the error state so the page isn't just plain text
      return (
        <div className="px-6 py-6 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Globe size={20} className="text-text-tertiary" />
            <Heading level={1} className="text-text-secondary">Platform Fleet Overview</Heading>
          </div>
          <div className="rounded-xl border border-border bg-surface-muted p-6 max-w-lg">
            <p className="text-sm font-medium text-text mb-1">Super-admin access required</p>
            <p className="text-sm text-text-secondary">
              Platform fleet overview is only available to super-admin accounts (admins without an enterprise scope).
            </p>
            <Link
              href="/registry"
              className="mt-4 inline-flex items-center text-sm text-violet-600 hover:text-violet-800 hover:underline"
            >
              View your enterprise agents →
            </Link>
          </div>
        </div>
      );
    }
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const { enterprises, totals } = data;

  // Filter enterprises by search
  const filteredEnterprises = enterprises.filter((e) =>
    (e.enterpriseId ?? "").toLowerCase().includes(searchValue.toLowerCase()) ||
    "platform (no enterprise)".includes(searchValue.toLowerCase())
  );

  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.ceil(filteredEnterprises.length / ITEMS_PER_PAGE);
  const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedEnterprises = filteredEnterprises.slice(startIdx, startIdx + ITEMS_PER_PAGE);

  return (
    <div className="px-6 py-6 space-y-6">
      {/* Breadcrumb */}
      <div className="mb-2">
        <Breadcrumb items={[
          { label: "Admin", href: "/admin" },
          { label: "Fleet" },
        ]} />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Globe size={20} className="text-violet-600" />
            <Heading level={1}>Platform Fleet Overview</Heading>
          </div>
          <p className="text-sm text-text-secondary pl-7">
            Cross-enterprise agent fleet summary — super-admin view
          </p>
        </div>
        <Link
          href="/admin/settings"
          className="rounded-lg border border-border px-3 py-1.5 text-sm text-text-secondary hover:border-border-strong hover:text-text transition-colors"
        >
          Admin Settings →
        </Link>
      </div>

      {/* Platform Totals */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          {
            label: "Enterprises",
            value: totals.enterpriseCount,
            icon: <Globe size={16} className="text-violet-500" />,
          },
          {
            label: "Total Agents",
            value: totals.totalAgents,
            icon: <Users size={16} className="text-blue-500" />,
          },
          {
            label: "Deployed",
            value: totals.deployedAgents,
            icon: <Activity size={16} className="text-green-500" />,
          },
          {
            label: "Avg Compliance",
            value:
              totals.avgComplianceRate !== null
                ? `${totals.avgComplianceRate}%`
                : "—",
            icon: <CheckSquare size={16} className="text-emerald-500" />,
            color:
              totals.avgComplianceRate !== null
                ? totals.avgComplianceRate >= 90
                  ? "text-green-700"
                  : totals.avgComplianceRate >= 70
                  ? "text-amber-700"
                  : "text-red-700"
                : "text-text-secondary",
          },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-border bg-surface p-4 shadow-sm"
          >
            <div className="flex items-center gap-2 mb-2">
              {card.icon}
              <span className="text-2xs font-semibold uppercase tracking-wider text-text-secondary">
                {card.label}
              </span>
            </div>
            <p className={`text-2xl font-bold ${card.color ?? "text-text"}`}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* P2-562: Platform cost summary card */}
      <div className="rounded-xl border border-violet-100 bg-violet-50 p-5">
        <div className="flex items-center gap-2 mb-1">
          <DollarSign size={16} className="text-violet-600" />
          <span className="text-sm font-semibold text-violet-800">Estimated Platform Cost</span>
          <span className="ml-auto text-2xs text-violet-400 font-mono">blended avg $150/deployed agent/mo</span>
        </div>
        <p className="text-3xl font-bold text-violet-700">
          {formatCost(totals.deployedAgents * COST_PER_DEPLOYED)}
          <span className="text-lg font-normal text-violet-400 ml-1">/month</span>
        </p>
        <p className="mt-1 text-xs text-violet-500">
          Based on {totals.deployedAgents} deployed agent{totals.deployedAgents !== 1 ? "s" : ""} across {totals.enterpriseCount} enterprise{totals.enterpriseCount !== 1 ? "s" : ""}.
          {" "}Actual costs vary by agent type and usage.
        </p>
      </div>

      {/* Enterprise Table */}
      <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border-subtle">
          <Heading level={2} className="text-sm">
            By Enterprise ({enterprises.length} total)
          </Heading>
        </div>
        <div className="px-6 py-4 border-b border-border-subtle">
          <TableToolbar
            searchPlaceholder="Search by enterprise ID…"
            searchValue={searchValue}
            onSearchChange={(val) => {
              setSearchValue(val);
              setCurrentPage(1);
            }}
            resultCount={filteredEnterprises.length}
            resultLabel="enterprise"
          />
        </div>
        <div className="overflow-x-auto">
          <Table striped>
            <TableHead>
              <TableRow>
                <TableHeader>Enterprise ID</TableHeader>
                <TableHeader>Total</TableHeader>
                <TableHeader>Deployed</TableHeader>
                <TableHeader>In Review</TableHeader>
                <TableHeader>Draft</TableHeader>
                <TableHeader>Compliance</TableHeader>
                <TableHeader>Est. Monthly Cost</TableHeader>
                <TableHeader>Actions</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedEnterprises.map((e) => (
                <TableRow key={e.enterpriseId ?? "__platform__"} className="interactive-row">
                  <TableCell className="font-mono text-xs text-text">
                    {e.enterpriseId ?? (
                      <span className="italic text-text-tertiary">platform (no enterprise)</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-text">
                    {e.totalAgents}
                  </TableCell>
                  <TableCell className="text-right text-green-700">
                    {e.deployedAgents}
                  </TableCell>
                  <TableCell className="text-right text-amber-600">
                    {e.statusCounts["in_review"] ?? 0}
                  </TableCell>
                  <TableCell className="text-right text-text-secondary">
                    {e.statusCounts["draft"] ?? 0}
                  </TableCell>
                  <TableCell className="text-center">
                    <ComplianceBadge rate={e.complianceRate} />
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-text">
                    {formatCost(e.deployedAgents * COST_PER_DEPLOYED)}
                    <span className="ml-0.5 text-text-tertiary">/mo</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/registry?enterprise=${e.enterpriseId ?? ""}`}
                      className="text-xs text-violet-600 hover:text-violet-800 hover:underline"
                    >
                      View agents →
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            {/* Platform total row */}
            <tfoot>
              <tr className="border-t-2 border-border bg-surface-raised font-semibold">
                <td className="px-4 py-3 text-xs text-text uppercase tracking-wide">
                  Platform Total
                </td>
                <td className="px-4 py-3 text-right text-text">{totals.totalAgents}</td>
                <td className="px-4 py-3 text-right text-green-700">{totals.deployedAgents}</td>
                <td className="px-4 py-3 text-right text-amber-600">
                  {enterprises.reduce((s, e) => s + (e.statusCounts["in_review"] ?? 0), 0)}
                </td>
                <td className="px-4 py-3 text-right text-text-secondary">
                  {enterprises.reduce((s, e) => s + (e.statusCounts["draft"] ?? 0), 0)}
                </td>
                <td className="px-4 py-3 text-center">
                  <ComplianceBadge rate={totals.avgComplianceRate} />
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs text-text">
                  {formatCost(totals.deployedAgents * COST_PER_DEPLOYED)}<span className="text-text-tertiary">/mo</span>
                </td>
                <td />
              </tr>
            </tfoot>
          </Table>
        </div>
        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        )}
      </div>
      {/* P2-562: By Agent Category (department proxy) */}
      {data.byAgentType.length > 0 && (
        <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border-subtle flex items-center gap-2">
            <Layers size={16} className="text-violet-500" />
            <Heading level={2} className="text-sm">By Agent Category</Heading>
            <span className="ml-auto text-xs text-text-tertiary">Maps to business department</span>
          </div>
          <div className="grid gap-px bg-surface-muted" style={{ gridTemplateColumns: `repeat(${Math.min(data.byAgentType.length, 4)}, 1fr)` }}>
            {data.byAgentType.map((row) => {
              const meta = defaultMeta(row.agentType);
              const estCost = row.deployed * meta.costPerAgent;
              const deployPct = row.total > 0 ? Math.round((row.deployed / row.total) * 100) : 0;
              return (
                <div key={row.agentType} className="bg-surface p-5">
                  <div className={`inline-flex items-center rounded-full border px-2 py-0.5 text-2xs font-semibold mb-3 ${meta.color}`}>
                    {meta.label}
                  </div>
                  <p className="text-xs text-text-secondary mb-3">{meta.dept}</p>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-text-secondary">Total agents</span>
                      <span className="text-sm font-bold text-text">{row.total}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-text-secondary">Deployed</span>
                      <span className="text-sm font-semibold text-green-700">{row.deployed}</span>
                    </div>
                    {/* Deploy rate bar */}
                    <div className="h-1.5 rounded-full bg-surface-muted mt-2">
                      <div
                        className="h-full rounded-full bg-green-400 transition-all"
                        style={{ width: `${deployPct}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
                      <span className="text-xs text-text-tertiary">Est. monthly cost</span>
                      <span className="text-xs font-mono font-semibold text-text">{formatCost(estCost)}/mo</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

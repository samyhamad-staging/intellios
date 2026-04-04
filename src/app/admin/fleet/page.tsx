"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { SkeletonList } from "@/components/ui/skeleton";
import Link from "next/link";
import { Globe, Users, CheckSquare, Activity, DollarSign, Layers } from "lucide-react";
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from "@/components/ui/table";

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
  unclassified:     { label: "Unclassified",     dept: "—",                costPerAgent: 150, color: "bg-gray-50 text-gray-600 border-gray-100"     },
};

function defaultMeta(agentType: string) {
  return AGENT_TYPE_META[agentType] ?? { label: agentType, dept: "Other", costPerAgent: 150, color: "bg-gray-50 text-gray-600 border-gray-100" };
}

const COST_PER_DEPLOYED = 150; // blended monthly average in USD

function formatCost(n: number) {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n}`;
}

function ComplianceBadge({ rate }: { rate: number | null }) {
  if (rate === null) return <span className="text-xs text-gray-400">—</span>;
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
      return (
        <div className="px-6 py-6">
          <p className="text-sm text-gray-500">
            Platform fleet overview is only available to super-admins (admin accounts without an enterprise scope).
          </p>
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

  return (
    <div className="px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Globe size={20} className="text-violet-600" />
            <h1 className="text-xl font-semibold text-gray-900">Platform Fleet Overview</h1>
          </div>
          <p className="text-sm text-gray-500 pl-7">
            Cross-enterprise agent fleet summary — super-admin view
          </p>
        </div>
        <Link
          href="/admin/settings"
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:border-gray-400 hover:text-gray-900 transition-colors"
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
                : "text-gray-500",
          },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center gap-2 mb-2">
              {card.icon}
              <span className="text-2xs font-semibold uppercase tracking-wider text-gray-500">
                {card.label}
              </span>
            </div>
            <p className={`text-2xl font-bold ${card.color ?? "text-gray-900"}`}>
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
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">
            By Enterprise ({enterprises.length} total)
          </h2>
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
              {enterprises.map((e) => (
                <TableRow key={e.enterpriseId ?? "__platform__"}>
                  <TableCell className="font-mono text-xs text-gray-700">
                    {e.enterpriseId ?? (
                      <span className="italic text-gray-400">platform (no enterprise)</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-gray-900">
                    {e.totalAgents}
                  </TableCell>
                  <TableCell className="text-right text-green-700">
                    {e.deployedAgents}
                  </TableCell>
                  <TableCell className="text-right text-amber-600">
                    {e.statusCounts["in_review"] ?? 0}
                  </TableCell>
                  <TableCell className="text-right text-gray-500">
                    {e.statusCounts["draft"] ?? 0}
                  </TableCell>
                  <TableCell className="text-center">
                    <ComplianceBadge rate={e.complianceRate} />
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-gray-700">
                    {formatCost(e.deployedAgents * COST_PER_DEPLOYED)}
                    <span className="ml-0.5 text-gray-400">/mo</span>
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
              <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold">
                <td className="px-4 py-3 text-xs text-gray-700 uppercase tracking-wide">
                  Platform Total
                </td>
                <td className="px-4 py-3 text-right text-gray-900">{totals.totalAgents}</td>
                <td className="px-4 py-3 text-right text-green-700">{totals.deployedAgents}</td>
                <td className="px-4 py-3 text-right text-amber-600">
                  {enterprises.reduce((s, e) => s + (e.statusCounts["in_review"] ?? 0), 0)}
                </td>
                <td className="px-4 py-3 text-right text-gray-500">
                  {enterprises.reduce((s, e) => s + (e.statusCounts["draft"] ?? 0), 0)}
                </td>
                <td className="px-4 py-3 text-center">
                  <ComplianceBadge rate={totals.avgComplianceRate} />
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs text-gray-700">
                  {formatCost(totals.deployedAgents * COST_PER_DEPLOYED)}<span className="text-gray-400">/mo</span>
                </td>
                <td />
              </tr>
            </tfoot>
          </Table>
        </div>
      </div>
      {/* P2-562: By Agent Category (department proxy) */}
      {data.byAgentType.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <Layers size={16} className="text-violet-500" />
            <h2 className="text-sm font-semibold text-gray-700">By Agent Category</h2>
            <span className="ml-auto text-xs text-gray-400">Maps to business department</span>
          </div>
          <div className="grid gap-px bg-gray-100" style={{ gridTemplateColumns: `repeat(${Math.min(data.byAgentType.length, 4)}, 1fr)` }}>
            {data.byAgentType.map((row) => {
              const meta = defaultMeta(row.agentType);
              const estCost = row.deployed * meta.costPerAgent;
              const deployPct = row.total > 0 ? Math.round((row.deployed / row.total) * 100) : 0;
              return (
                <div key={row.agentType} className="bg-white p-5">
                  <div className={`inline-flex items-center rounded-full border px-2 py-0.5 text-2xs font-semibold mb-3 ${meta.color}`}>
                    {meta.label}
                  </div>
                  <p className="text-xs text-gray-500 mb-3">{meta.dept}</p>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Total agents</span>
                      <span className="text-sm font-bold text-gray-900">{row.total}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Deployed</span>
                      <span className="text-sm font-semibold text-green-700">{row.deployed}</span>
                    </div>
                    {/* Deploy rate bar */}
                    <div className="h-1.5 rounded-full bg-gray-100 mt-2">
                      <div
                        className="h-full rounded-full bg-green-400 transition-all"
                        style={{ width: `${deployPct}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                      <span className="text-xs text-gray-400">Est. monthly cost</span>
                      <span className="text-xs font-mono font-semibold text-gray-700">{formatCost(estCost)}/mo</span>
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

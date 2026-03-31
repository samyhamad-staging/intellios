"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Globe, Users, CheckSquare, Activity } from "lucide-react";

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

interface FleetData {
  enterprises: EnterpriseRow[];
  totals: FleetTotals;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-gray-400">Loading fleet overview…</p>
      </div>
    );
  }

  if (error) {
    if (error === "super-admin-only") {
      return (
        <div className="px-8 py-8">
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
    <div className="px-8 py-8 space-y-8">
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

      {/* Enterprise Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">
            By Enterprise ({enterprises.length} total)
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Enterprise ID
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Deployed
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  In Review
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Draft
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Compliance
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {enterprises.map((e) => (
                <tr key={e.enterpriseId ?? "__platform__"} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 font-mono text-xs text-gray-700">
                    {e.enterpriseId ?? (
                      <span className="italic text-gray-400">platform (no enterprise)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">
                    {e.totalAgents}
                  </td>
                  <td className="px-4 py-3 text-right text-green-700">
                    {e.deployedAgents}
                  </td>
                  <td className="px-4 py-3 text-right text-amber-600">
                    {e.statusCounts["in_review"] ?? 0}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500">
                    {e.statusCounts["draft"] ?? 0}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <ComplianceBadge rate={e.complianceRate} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/registry?enterprise=${e.enterpriseId ?? ""}`}
                      className="text-xs text-violet-600 hover:text-violet-800 hover:underline"
                    >
                      View agents →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
            {/* Platform total row */}
            <tfoot>
              <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold">
                <td className="px-6 py-3 text-xs text-gray-700 uppercase tracking-wide">
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
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

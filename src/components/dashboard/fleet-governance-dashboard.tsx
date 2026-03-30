import { db } from "@/lib/db";
import { agentBlueprints, intakeSessions } from "@/lib/db/schema";
import { and, eq, inArray, isNull, lt, isNotNull } from "drizzle-orm";
import Link from "next/link";
import type { ValidationReport } from "@/lib/governance/types";
import type { ABP } from "@/lib/types/abp";

/**
 * FleetGovernanceDashboard — Phase 51.
 *
 * CRO/CISO-facing aggregate risk posture view over all approved and deployed
 * agents. Surfaces the four questions a budget holder needs answered:
 *
 *   1. What is our risk tier distribution? (low / medium / high / critical)
 *   2. Are any agents overdue for periodic review?
 *   3. Do any agents have governance violations that need resolution?
 *   4. Can I get to any agent's evidence package in one click?
 *
 * Risk tier is derived from:
 *   a) intakeSessions.riskTier — set during Phase 1 intake context (preferred)
 *   b) ABP governance policy coverage — fallback for older agents without intake context
 *
 * Server component — queries directly without an intermediate API route.
 */

type RiskTier = "low" | "medium" | "high" | "critical";
type GovernanceHealth = "pass" | "warning" | "error" | "unvalidated";

interface FleetAgent {
  id: string;
  agentId: string;
  name: string | null;
  status: string;
  version: string;
  riskTier: RiskTier;
  governance: GovernanceHealth;
  errorCount: number;
  warningCount: number;
  policyCount: number;
  nextReviewDue: Date | null;
  isOverdue: boolean;
}

function deriveRiskTier(
  intakeRiskTier: string | null,
  abp: ABP
): RiskTier {
  // Use intake-time classification when available
  if (intakeRiskTier === "low") return "low";
  if (intakeRiskTier === "medium") return "medium";
  if (intakeRiskTier === "high") return "high";
  if (intakeRiskTier === "critical") return "critical";

  // Fallback: derive from governance policy coverage (same logic as MRM report)
  const policyTypes = (abp.governance?.policies ?? []).map((p) => p.type);
  const hasSafety = policyTypes.includes("safety");
  const hasCompliance = policyTypes.includes("compliance");
  if (hasSafety && hasCompliance) return "high";
  if (hasSafety || hasCompliance) return "medium";
  return "low";
}

function deriveGovernanceHealth(
  report: ValidationReport | null
): { health: GovernanceHealth; errorCount: number; warningCount: number } {
  if (!report) return { health: "unvalidated", errorCount: 0, warningCount: 0 };
  const errors = report.violations?.filter((v) => v.severity === "error").length ?? 0;
  const warnings = report.violations?.filter((v) => v.severity === "warning").length ?? 0;
  if (errors > 0) return { health: "error", errorCount: errors, warningCount: warnings };
  if (warnings > 0) return { health: "warning", errorCount: 0, warningCount: warnings };
  return { health: "pass", errorCount: 0, warningCount: 0 };
}

const TIER_CONFIG: Record<RiskTier, { label: string; bg: string; text: string; border: string }> = {
  critical: { label: "Critical", bg: "bg-red-50",    text: "text-red-700",    border: "border-red-200" },
  high:     { label: "High",     bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  medium:   { label: "Medium",   bg: "bg-amber-50",  text: "text-amber-700",  border: "border-amber-200" },
  low:      { label: "Low",      bg: "bg-green-50",  text: "text-green-700",  border: "border-green-200" },
};

const TIERS: RiskTier[] = ["critical", "high", "medium", "low"];

interface FleetGovernanceDashboardProps {
  enterpriseId: string | null | undefined;
  userRole: string;
}

export async function FleetGovernanceDashboard({
  enterpriseId,
  userRole,
}: FleetGovernanceDashboardProps) {
  const enterpriseFilter =
    userRole === "admin"
      ? undefined
      : enterpriseId
      ? eq(agentBlueprints.enterpriseId, enterpriseId)
      : isNull(agentBlueprints.enterpriseId);

  // Fetch approved + deployed agents with risk tier from intake session
  const rows = await db
    .select({
      id: agentBlueprints.id,
      agentId: agentBlueprints.agentId,
      name: agentBlueprints.name,
      status: agentBlueprints.status,
      version: agentBlueprints.version,
      validationReport: agentBlueprints.validationReport,
      nextReviewDue: agentBlueprints.nextReviewDue,
      abp: agentBlueprints.abp,
      intakeRiskTier: intakeSessions.riskTier,
    })
    .from(agentBlueprints)
    .leftJoin(intakeSessions, eq(agentBlueprints.sessionId, intakeSessions.id))
    .where(
      enterpriseFilter
        ? and(
            inArray(agentBlueprints.status, ["approved", "deployed"]),
            enterpriseFilter
          )
        : inArray(agentBlueprints.status, ["approved", "deployed"])
    )
    .orderBy(agentBlueprints.updatedAt);

  const now = new Date();

  const agents: FleetAgent[] = rows.map((row) => {
    const abp = row.abp as ABP;
    const report = row.validationReport as ValidationReport | null;
    const { health, errorCount, warningCount } = deriveGovernanceHealth(report);
    const riskTier = deriveRiskTier(row.intakeRiskTier, abp);
    const isOverdue = row.nextReviewDue != null && row.nextReviewDue < now;
    const policyCount = abp.governance?.policies?.length ?? 0;

    return {
      id: row.id,
      agentId: row.agentId,
      name: row.name,
      status: row.status,
      version: row.version,
      riskTier,
      governance: health,
      errorCount,
      warningCount,
      policyCount,
      nextReviewDue: row.nextReviewDue,
      isOverdue,
    };
  });

  // ── Aggregate metrics ─────────────────────────────────────────────────────
  const tierCounts = Object.fromEntries(
    TIERS.map((t) => [t, agents.filter((a) => a.riskTier === t).length])
  ) as Record<RiskTier, number>;

  const overdueCount = agents.filter((a) => a.isOverdue).length;
  const errorCount = agents.filter((a) => a.governance === "error").length;
  const unvalidatedCount = agents.filter((a) => a.governance === "unvalidated").length;

  if (agents.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-white px-6 py-10 text-center text-sm text-gray-400">
        No approved or deployed agents yet. Fleet governance posture will appear here once agents are approved.
      </div>
    );
  }

  const hasAlerts = overdueCount > 0 || errorCount > 0 || unvalidatedCount > 0;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-[var(--shadow-card)]">
      {/* Risk distribution + governance alerts — compact summary bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="flex items-center gap-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">Risk</span>
          {TIERS.map((tier) => {
            const cfg = TIER_CONFIG[tier];
            const count = tierCounts[tier];
            return (
              <span key={tier} className="flex items-center gap-1.5">
                <span className={`text-sm font-bold ${cfg.text}`}>{count}</span>
                <span className={`text-xs ${cfg.text} opacity-70`}>{cfg.label}</span>
              </span>
            );
          })}
        </div>
        {hasAlerts && (
          <div className="flex items-center gap-2">
            {overdueCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                {overdueCount} overdue
              </span>
            )}
            {errorCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[11px] font-medium text-orange-700">
                <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                {errorCount} error{errorCount !== 1 ? "s" : ""}
              </span>
            )}
            {unvalidatedCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-500">
                <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                {unvalidatedCount} unvalidated
              </span>
            )}
          </div>
        )}
      </div>

      {/* Per-agent fleet table */}
      <div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-left">
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-gray-400 w-[35%]">
                Agent
              </th>
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-gray-400 w-[14%]">
                Risk Tier
              </th>
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-gray-400 w-[18%]">
                Governance
              </th>
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-gray-400 w-[18%]">
                Next Review
              </th>
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-gray-400 w-[15%]">
                Evidence
              </th>
            </tr>
          </thead>
          <tbody>
            {agents.map((agent, i) => {
              const tierCfg = TIER_CONFIG[agent.riskTier];
              return (
                <tr
                  key={agent.id}
                  className={`${i > 0 ? "border-t border-gray-100" : ""} hover:bg-gray-50 transition-colors`}
                >
                  {/* Agent name + version + status */}
                  <td className="px-4 py-3">
                    <Link
                      href={`/registry/${agent.agentId}`}
                      className="font-medium text-gray-900 hover:text-violet-700 transition-colors"
                    >
                      {agent.name ?? `Agent ${agent.agentId.slice(0, 8)}`}
                    </Link>
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-400">
                      <span>v{agent.version}</span>
                      <span>·</span>
                      <span className={`font-medium ${agent.status === "deployed" ? "text-violet-600" : "text-green-600"}`}>
                        {agent.status}
                      </span>
                      <span>·</span>
                      <span>{agent.policyCount} polic{agent.policyCount === 1 ? "y" : "ies"}</span>
                    </div>
                  </td>

                  {/* Risk tier badge */}
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${tierCfg.bg} ${tierCfg.text} border ${tierCfg.border}`}
                    >
                      {tierCfg.label}
                    </span>
                  </td>

                  {/* Governance health */}
                  <td className="px-4 py-3">
                    {agent.governance === "pass" && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
                        <span className="text-green-500">✓</span> Passes
                      </span>
                    )}
                    {agent.governance === "warning" && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700">
                        <span>⚠</span> {agent.warningCount} warning{agent.warningCount !== 1 ? "s" : ""}
                      </span>
                    )}
                    {agent.governance === "error" && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700">
                        <span>✗</span> {agent.errorCount} error{agent.errorCount !== 1 ? "s" : ""}
                      </span>
                    )}
                    {agent.governance === "unvalidated" && (
                      <span className="text-xs text-gray-400">Not validated</span>
                    )}
                  </td>

                  {/* Next review / overdue */}
                  <td className="px-4 py-3">
                    {agent.nextReviewDue == null ? (
                      <span className="text-xs text-gray-300">—</span>
                    ) : agent.isOverdue ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                        Overdue
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500">
                        {agent.nextReviewDue.toLocaleDateString(undefined, { dateStyle: "medium" })}
                      </span>
                    )}
                  </td>

                  {/* Evidence package link */}
                  <td className="px-4 py-3">
                    <Link
                      href={`/blueprints/${agent.id}/report`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
                      title="View compliance report"
                    >
                      View Report
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

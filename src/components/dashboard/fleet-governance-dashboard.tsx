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

const TIER_CONFIG: Record<RiskTier, { label: string; cardCls: string; badgeCls: string }> = {
  critical: { label: "Critical", cardCls: "card-risk-critical", badgeCls: "badge-risk-critical" },
  high:     { label: "High",     cardCls: "card-risk-high",     badgeCls: "badge-risk-high" },
  medium:   { label: "Medium",   cardCls: "card-risk-medium",   badgeCls: "badge-risk-medium" },
  low:      { label: "Low",      cardCls: "card-risk-low",      badgeCls: "badge-risk-low" },
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
      <div className="rounded-card border border-dashed border-gray-200 bg-white px-6 py-10 text-center text-sm text-gray-400">
        No approved or deployed agents yet. Fleet governance posture will appear here once agents are approved.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Risk tier distribution */}
      <div className="grid grid-cols-4 gap-3">
        {TIERS.map((tier) => {
          const cfg = TIER_CONFIG[tier];
          const count = tierCounts[tier];
          return (
            <div
              key={tier}
              className={`rounded-card border ${cfg.cardCls} px-4 py-3`}
            >
              <div className="text-2xl font-bold">{count}</div>
              <div className="mt-0.5 text-xs font-medium opacity-80">
                {cfg.label} Risk
              </div>
            </div>
          );
        })}
      </div>

      {/* Governance alerts */}
      {(overdueCount > 0 || errorCount > 0 || unvalidatedCount > 0) && (
        <div className="flex flex-wrap gap-2">
          {overdueCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full border badge-gov-error px-3 py-1 text-xs font-medium">
              <span className="h-1.5 w-1.5 rounded-full dot-alert-critical" />
              {overdueCount} overdue for periodic review
            </span>
          )}
          {errorCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full border badge-risk-high px-3 py-1 text-xs font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--risk-high-dot)]" />
              {errorCount} with governance errors
            </span>
          )}
          {unvalidatedCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full border badge-draft px-3 py-1 text-xs font-medium">
              <span className="h-1.5 w-1.5 rounded-full dot-draft" />
              {unvalidatedCount} not yet validated
            </span>
          )}
        </div>
      )}

      {/* Per-agent fleet table */}
      <div className="overflow-hidden rounded-card border border-gray-200 bg-white shadow-sm">
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
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium border ${tierCfg.badgeCls}`}
                    >
                      {tierCfg.label}
                    </span>
                  </td>

                  {/* Governance health */}
                  <td className="px-4 py-3">
                    {agent.governance === "pass" && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-[color:var(--gov-pass-text)]">
                        <span className="text-[color:var(--gov-pass-icon)]">✓</span> Passes
                      </span>
                    )}
                    {agent.governance === "warning" && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-[color:var(--gov-warn-text)]">
                        <span>⚠</span> {agent.warningCount} warning{agent.warningCount !== 1 ? "s" : ""}
                      </span>
                    )}
                    {agent.governance === "error" && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-[color:var(--gov-error-text)]">
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
                      <span className="inline-flex items-center gap-1 rounded-full badge-overdue px-2 py-0.5 text-xs font-medium">
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

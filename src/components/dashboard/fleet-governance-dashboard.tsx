import { db } from "@/lib/db";
import { agentBlueprints, intakeSessions } from "@/lib/db/schema";
import { and, eq, inArray, isNull, lt, isNotNull } from "drizzle-orm";
import Link from "next/link";
import type { ValidationReport } from "@/lib/governance/types";
import type { ABP } from "@/lib/types/abp";
import { Badge } from "@/components/ui/badge";
import type { BadgeVariant } from "@/components/ui/badge";
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from "@/components/ui/table";

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

const TIER_LABEL: Record<RiskTier, string> = {
  critical: "Critical",
  high:     "High",
  medium:   "Medium",
  low:      "Low",
};

const TIER_VARIANT: Record<RiskTier, BadgeVariant> = {
  critical: "danger",
  high:     "danger",
  medium:   "warning",
  low:      "success",
};

const TIER_TEXT_COLOR: Record<RiskTier, string> = {
  critical: "text-red-700",
  high:     "text-red-700",
  medium:   "text-amber-700",
  low:      "text-emerald-700",
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
      <div className="rounded-xl border border-dashed border-border bg-surface px-6 py-10 text-center text-sm text-text-tertiary">
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
            const count = tierCounts[tier];
            return (
              <span key={tier} className="flex items-center gap-1.5">
                <span className={`text-sm font-bold ${TIER_TEXT_COLOR[tier]}`}>{count}</span>
                <span className={`text-xs ${TIER_TEXT_COLOR[tier]} opacity-70`}>{TIER_LABEL[tier]}</span>
              </span>
            );
          })}
        </div>
        {hasAlerts && (
          <div className="flex items-center gap-2">
            {overdueCount > 0 && (
              <Badge variant="danger" dot>{overdueCount} overdue</Badge>
            )}
            {errorCount > 0 && (
              <Badge variant="warning" dot>{errorCount} error{errorCount !== 1 ? "s" : ""}</Badge>
            )}
            {unvalidatedCount > 0 && (
              <Badge variant="neutral" dot>{unvalidatedCount} unvalidated</Badge>
            )}
          </div>
        )}
      </div>

      {/* Per-agent fleet table */}
      <div>
        <Table striped>
          <TableHead>
            <TableRow>
              <TableHeader>Agent</TableHeader>
              <TableHeader>Risk Tier</TableHeader>
              <TableHeader>Governance</TableHeader>
              <TableHeader>Next Review</TableHeader>
              <TableHeader>Evidence</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {agents.map((agent) => {
              return (
                <TableRow key={agent.id}>
                  {/* Agent name + version + status */}
                  <TableCell>
                    <Link
                      href={`/registry/${agent.agentId}`}
                      className="font-medium text-text hover:text-primary transition-colors"
                    >
                      {agent.name ?? `Agent ${agent.agentId.slice(0, 8)}`}
                    </Link>
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-text-tertiary">
                      <span>v{agent.version}</span>
                      <span>·</span>
                      <span className={`font-medium ${agent.status === "deployed" ? "text-violet-600" : "text-emerald-600"}`}>
                        {agent.status}
                      </span>
                      <span>·</span>
                      <span>{agent.policyCount} polic{agent.policyCount === 1 ? "y" : "ies"}</span>
                    </div>
                  </TableCell>

                  {/* Risk tier badge */}
                  <TableCell>
                    <Badge variant={TIER_VARIANT[agent.riskTier]}>
                      {TIER_LABEL[agent.riskTier]}
                    </Badge>
                  </TableCell>

                  {/* Governance health */}
                  <TableCell>
                    {agent.governance === "pass" && (
                      <Badge variant="success">Passes</Badge>
                    )}
                    {agent.governance === "warning" && (
                      <Badge variant="warning">{agent.warningCount} warning{agent.warningCount !== 1 ? "s" : ""}</Badge>
                    )}
                    {agent.governance === "error" && (
                      <Badge variant="danger">{agent.errorCount} error{agent.errorCount !== 1 ? "s" : ""}</Badge>
                    )}
                    {agent.governance === "unvalidated" && (
                      <Badge variant="muted">Not validated</Badge>
                    )}
                  </TableCell>

                  {/* Next review / overdue */}
                  <TableCell>
                    {agent.nextReviewDue == null ? (
                      <span className="text-xs text-text-tertiary/40">Not scheduled</span>
                    ) : agent.isOverdue ? (
                      <Badge variant="danger">Overdue</Badge>
                    ) : (
                      <span className="text-xs text-text-secondary">
                        {agent.nextReviewDue.toLocaleDateString(undefined, { dateStyle: "medium" })}
                      </span>
                    )}
                  </TableCell>

                  {/* Evidence package link */}
                  <TableCell>
                    <Link
                      href={`/blueprints/${agent.id}/report`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
                      title="View compliance report"
                    >
                      View Report
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

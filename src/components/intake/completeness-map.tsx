"use client";

/**
 * Completeness Map — Phase 49: Intake Confidence Engine.
 *
 * Shown in Phase 3 (IntakeReview) above the section acknowledgment cards.
 * Visualises all 7 requirement domains with fill status, requirement count,
 * and whether the domain was required by context signals or is optional.
 *
 * Domain states:
 *   required + filled   → green (bg-green-50, border-green-200)
 *   required + empty    → red   (bg-red-50, border-red-200) — hard-block on generate
 *   optional + filled   → blue  (bg-blue-50, border-blue-200) — depth bonus
 *   optional + sparse   → amber (bg-amber-50, border-amber-200) — has items but below typical depth
 *   optional + empty    → gray  (bg-gray-50, border-gray-100) — not captured, not required
 *
 * A domain is "sparse" when it is filled but the item count is below the
 * typical minimum for the risk tier (e.g., 0 denied actions for a PII agent).
 */

import { IntakePayload, IntakeContext, IntakeRiskTier, StakeholderContribution, ContributionDomain } from "@/lib/types/intake";
import { getExpectedContributionDomains } from "@/lib/intake/coverage";

interface DomainStatus {
  key: string;
  label: string;
  icon: string;
  itemCount: number;
  itemNames: string[];
  status: "required-filled" | "required-empty" | "optional-filled" | "optional-sparse" | "optional-empty";
  /** Which context signal triggered this domain as required, if any */
  triggerReason?: string;
  /** Whether a stakeholder contribution was received for this domain */
  hasStakeholderInput: boolean;
}

// Maps completeness-map domain key → review section anchor id
const DOMAIN_TO_SECTION_ANCHOR: Record<string, string> = {
  identity:     "rv-section-identity",
  tools:        "rv-section-capabilities",
  instructions: "rv-section-instructions",
  knowledge:    "rv-section-knowledge",
  constraints:  "rv-section-constraints",
  governance:   "rv-section-governance",
  audit:        "rv-section-audit",
};

function getItemNames(section: string, payload: IntakePayload): string[] {
  switch (section) {
    case "identity":
      return payload.identity?.name ? [payload.identity.name] : [];
    case "tools":
      return payload.capabilities?.tools?.map((t) => t.name) ?? [];
    case "instructions":
      return payload.capabilities?.instructions ? ["Custom instructions configured"] : [];
    case "knowledge":
      return payload.capabilities?.knowledge_sources?.map((s) => s.name) ?? [];
    case "constraints":
      return [
        ...(payload.constraints?.allowed_domains ?? []).map((d) => `Allow: ${d}`),
        ...(payload.constraints?.denied_actions ?? []).map((a) => `Deny: ${a}`),
      ];
    case "governance":
      return payload.governance?.policies?.map((p) => p.name) ?? [];
    case "audit": {
      const a = payload.governance?.audit;
      if (!a) return [];
      const parts: string[] = [];
      if (a.log_interactions !== undefined) parts.push(`Logging ${a.log_interactions ? "on" : "off"}`);
      if (a.retention_days !== undefined) parts.push(`${a.retention_days}-day retention`);
      if (a.pii_redaction !== undefined) parts.push(`PII redaction ${a.pii_redaction ? "on" : "off"}`);
      return parts;
    }
    default:
      return [];
  }
}

function getSectionItemCount(section: string, payload: IntakePayload): number {
  switch (section) {
    case "identity":
      return payload.identity?.name ? 1 : 0;
    case "tools":
      return payload.capabilities?.tools?.length ?? 0;
    case "instructions":
      return payload.capabilities?.instructions ? 1 : 0;
    case "knowledge":
      return payload.capabilities?.knowledge_sources?.length ?? 0;
    case "constraints":
      return (
        (payload.constraints?.allowed_domains?.length ?? 0) +
        (payload.constraints?.denied_actions?.length ?? 0)
      );
    case "governance":
      return payload.governance?.policies?.length ?? 0;
    case "audit":
      return payload.governance?.audit !== undefined ? 1 : 0;
    default:
      return 0;
  }
}

// Minimum item count before a section is considered "sparse" for a given risk tier
const SPARSE_THRESHOLDS: Record<
  "identity" | "tools" | "governance",
  Partial<Record<IntakeRiskTier, number>>
> = {
  identity: { low: 1, medium: 1, high: 1, critical: 1 },
  tools: { low: 1, medium: 1, high: 2, critical: 2 },
  governance: { medium: 1, high: 2, critical: 5 },
};

function isSparse(section: string, count: number, riskTier: IntakeRiskTier): boolean {
  if (count === 0) return false; // empty, not sparse
  const threshold = SPARSE_THRESHOLDS[section as keyof typeof SPARSE_THRESHOLDS]?.[riskTier];
  if (threshold === undefined) return false;
  return count < threshold;
}

function getRequiredTrigger(section: string, context: IntakeContext): string | undefined {
  switch (section) {
    case "governance":
      if (context.dataSensitivity === "pii" || context.dataSensitivity === "regulated") {
        return `Required: ${context.dataSensitivity} data sensitivity`;
      }
      if (context.deploymentType === "customer-facing" || context.deploymentType === "partner-facing") {
        return `Required: ${context.deploymentType} deployment`;
      }
      if ((context.regulatoryScope ?? []).filter((s) => s !== "none").length > 0) {
        return `Required: ${(context.regulatoryScope ?? []).filter((s) => s !== "none").join(", ")} scope`;
      }
      return undefined;
    case "audit":
      if (context.dataSensitivity === "pii" || context.dataSensitivity === "regulated") {
        return `Required: ${context.dataSensitivity} data requires audit logging`;
      }
      return undefined;
    case "instructions":
      if (context.deploymentType === "customer-facing" || context.deploymentType === "partner-facing") {
        return `Required: customer/partner-facing agents need behavioral instructions`;
      }
      return undefined;
    default:
      return undefined;
  }
}

function isRequiredSection(
  section: string,
  context: IntakeContext | null,
  riskTier: IntakeRiskTier
): boolean {
  // Identity and tools are always required
  if (section === "identity" || section === "tools") return true;
  if (!context) return false;

  // Governance: required for medium+ risk or when context signals mandate it
  if (section === "governance") {
    if (riskTier === "medium" || riskTier === "high" || riskTier === "critical") {
      if (
        context.dataSensitivity === "pii" ||
        context.dataSensitivity === "regulated" ||
        context.deploymentType === "customer-facing" ||
        context.deploymentType === "partner-facing" ||
        (context.integrationTypes ?? []).includes("external-apis") ||
        (context.regulatoryScope ?? []).some((s) => s !== "none")
      ) {
        return true;
      }
    }
  }
  // Audit: required when PII/regulated data
  if (section === "audit") {
    if (context.dataSensitivity === "pii" || context.dataSensitivity === "regulated") return true;
  }
  // Instructions: required for customer/partner-facing
  if (section === "instructions") {
    if (context.deploymentType === "customer-facing" || context.deploymentType === "partner-facing") {
      return true;
    }
  }
  return false;
}

const SECTION_DEFINITIONS = [
  { key: "identity",     label: "Agent Identity",          icon: "◎" },
  { key: "tools",        label: "Tools & Capabilities",    icon: "⚙" },
  { key: "instructions", label: "Behavioral Instructions", icon: "📋" },
  { key: "knowledge",    label: "Knowledge Sources",       icon: "🗄" },
  { key: "constraints",  label: "Constraints",             icon: "🚧" },
  { key: "governance",   label: "Governance Policies",     icon: "🛡" },
  { key: "audit",        label: "Audit Configuration",     icon: "📝" },
] as const;

interface CompletenessMapProps {
  payload: IntakePayload;
  context: IntakeContext | null;
  riskTier?: IntakeRiskTier | null;
  contributions?: StakeholderContribution[];
}

function statusColors(status: DomainStatus["status"]): string {
  switch (status) {
    case "required-filled":   return "border-green-200 bg-green-50";
    case "required-empty":    return "border-red-200 bg-red-50";
    case "optional-filled":   return "border-blue-200 bg-blue-50";
    case "optional-sparse":   return "border-amber-200 bg-amber-50";
    case "optional-empty":    return "border-gray-100 bg-gray-50 opacity-75";
  }
}

function statusIcon(status: DomainStatus["status"]): string {
  switch (status) {
    case "required-filled":  return "✓";
    case "required-empty":   return "!";
    case "optional-filled":  return "✓";
    case "optional-sparse":  return "~";
    case "optional-empty":   return "–";
  }
}

function statusIconColors(status: DomainStatus["status"]): string {
  switch (status) {
    case "required-filled":  return "bg-green-500 text-white";
    case "required-empty":   return "bg-red-500 text-white";
    case "optional-filled":  return "bg-blue-500 text-white";
    case "optional-sparse":  return "bg-amber-400 text-white";
    case "optional-empty":   return "bg-gray-200 text-gray-400";
  }
}

function statusLabel(status: DomainStatus["status"], count: number): string {
  switch (status) {
    case "required-filled":  return count === 1 ? `${count} item` : `${count} items`;
    case "required-empty":   return "Required — not captured";
    case "optional-filled":  return count === 1 ? `${count} item` : `${count} items`;
    case "optional-sparse":  return `${count} item${count !== 1 ? "s" : ""} — consider adding more`;
    case "optional-empty":   return "Optional — not captured";
  }
}

export function CompletenessMap({
  payload,
  context,
  riskTier,
  contributions = [],
}: CompletenessMapProps) {
  const tier = riskTier ?? "medium";

  const contributionDomains = new Set(contributions.map((c) => c.domain as ContributionDomain));
  const expectedDomains = context
    ? new Set(getExpectedContributionDomains(context, tier))
    : new Set<ContributionDomain>();

  const domains: DomainStatus[] = SECTION_DEFINITIONS.map(({ key, label, icon }) => {
    const count = getSectionItemCount(key, payload);
    const required = isRequiredSection(key, context, tier);
    const filled = count > 0;
    const sparse = filled && isSparse(key, count, tier);
    const triggerReason = context ? getRequiredTrigger(key, context) : undefined;

    // Map section key to contribution domain key where applicable
    const domainMap: Record<string, ContributionDomain> = {
      governance: "compliance",
    };
    const correspondingDomain = domainMap[key] as ContributionDomain | undefined;
    const hasStakeholderInput = correspondingDomain
      ? contributionDomains.has(correspondingDomain)
      : false;

    let status: DomainStatus["status"];
    if (required) {
      status = filled ? "required-filled" : "required-empty";
    } else if (sparse) {
      status = "optional-sparse";
    } else if (filled) {
      status = "optional-filled";
    } else {
      status = "optional-empty";
    }

    return {
      key,
      label,
      icon,
      itemCount: count,
      itemNames: getItemNames(key, payload),
      status,
      triggerReason: required ? triggerReason : undefined,
      hasStakeholderInput,
    };
  });

  const filledCount = domains.filter((d) => d.status !== "required-empty" && d.status !== "optional-empty").length;
  const requiredEmptyCount = domains.filter((d) => d.status === "required-empty").length;
  const sparseCount = domains.filter((d) => d.status === "optional-sparse").length;

  return (
    <div className="mb-6 rounded-card border border-gray-200 bg-white px-5 py-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Completeness Map
          </div>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
            {filledCount} of {domains.length} sections captured
          </span>
        </div>
        {/* Summary badges */}
        <div className="flex items-center gap-1.5">
          {requiredEmptyCount > 0 && (
            <span className="rounded-full bg-red-100 border border-red-200 px-2 py-0.5 text-xs text-red-700">
              {requiredEmptyCount} required missing
            </span>
          )}
          {sparseCount > 0 && (
            <span className="rounded-full bg-amber-100 border border-amber-200 px-2 py-0.5 text-xs text-amber-700">
              {sparseCount} sparse
            </span>
          )}
          {requiredEmptyCount === 0 && sparseCount === 0 && (
            <span className="rounded-full bg-green-100 border border-green-200 px-2 py-0.5 text-xs text-green-700">
              Requirements Sufficient
            </span>
          )}
        </div>
      </div>

      {/* RV-002: Prominent stakeholder gap warning for high/critical risk — shown above grid */}
      {(tier === "high" || tier === "critical") && expectedDomains.size > 0 && (() => {
        const missingDomains = Array.from(expectedDomains).filter((d) => !contributionDomains.has(d));
        if (missingDomains.length === 0) return null;
        return (
          <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs">
            <span className="mt-0.5 shrink-0 text-amber-500">⚠</span>
            <div>
              <p className="font-semibold text-amber-800">
                Stakeholder input required for {tier} risk — {missingDomains.length} domain{missingDomains.length > 1 ? "s" : ""} pending
              </p>
              <p className="mt-0.5 text-amber-700">
                Missing input from: {missingDomains.join(", ")}. Reviewers will flag this absence.
              </p>
            </div>
          </div>
        );
      })()}

      {/* Domain grid — RV-007: tiles are anchor links to review section cards */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {domains.map((domain) => {
          const anchorId = DOMAIN_TO_SECTION_ANCHOR[domain.key];
          const tooltip = domain.itemNames.length > 0 ? domain.itemNames.join("\n") : undefined;
          return (
            <a
              key={domain.key}
              href={anchorId ? `#${anchorId}` : undefined}
              title={tooltip}
              className={`block rounded-lg border px-3 py-2.5 transition-colors ${statusColors(domain.status)} ${anchorId ? "cursor-pointer hover:brightness-95" : ""}`}
            >
              <div className="flex items-center gap-2 mb-1">
                {/* Status icon */}
                <span
                  className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${statusIconColors(domain.status)}`}
                >
                  {statusIcon(domain.status)}
                </span>
                <span className="text-xs font-medium text-gray-800 leading-tight">
                  {domain.label}
                </span>
                {/* Stakeholder badge */}
                {domain.hasStakeholderInput && (
                  <span
                    className="ml-auto text-[10px] rounded-full bg-violet-100 border border-violet-200 px-1.5 py-0.5 text-violet-700 shrink-0"
                    title="Stakeholder input received"
                  >
                    ★
                  </span>
                )}
              </div>
              <div
                className={`text-[11px] leading-tight ${
                  domain.status === "required-empty"
                    ? "text-red-600"
                    : domain.status === "optional-sparse"
                    ? "text-amber-700"
                    : domain.status === "optional-empty"
                    ? "text-gray-400"
                    : "text-gray-500"
                }`}
              >
                {statusLabel(domain.status, domain.itemCount)}
              </div>
              {domain.triggerReason && (
                <div className="mt-1 text-[10px] text-gray-400 leading-tight italic">
                  {domain.triggerReason}
                </div>
              )}
            </a>
          );
        })}
      </div>

      {/* Stakeholder domain coverage footnote — shown for non-high/critical or when all domains covered */}
      {expectedDomains.size > 0 && !(tier === "high" || tier === "critical") && (
        <div className="mt-3 text-xs text-gray-400 border-t border-gray-100 pt-2">
          <span className="text-violet-600">★</span>{" "}
          Stakeholder input received for a domain.{" "}
          {Array.from(expectedDomains).filter((d) => !contributionDomains.has(d)).length > 0 && (
            <span className="text-amber-600">
              Missing input from:{" "}
              {Array.from(expectedDomains)
                .filter((d) => !contributionDomains.has(d))
                .join(", ")}
              .
            </span>
          )}
        </div>
      )}
    </div>
  );
}

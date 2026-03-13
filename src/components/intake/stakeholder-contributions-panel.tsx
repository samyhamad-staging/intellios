"use client";

import { useState } from "react";
import { ContributionDomain, StakeholderContribution } from "@/lib/types/intake";
import { StakeholderContributionForm } from "./stakeholder-contribution-form";

// ── Domain display helpers ────────────────────────────────────────────────────

const DOMAIN_LABELS: Record<ContributionDomain, string> = {
  compliance: "Compliance",
  risk: "Risk",
  legal: "Legal",
  security: "Security",
  it: "IT / Infrastructure",
  operations: "Operations",
  business: "Business",
};

const DOMAIN_COLORS: Record<ContributionDomain, string> = {
  compliance: "bg-blue-50 text-blue-700 border-blue-200",
  risk: "bg-orange-50 text-orange-700 border-orange-200",
  legal: "bg-purple-50 text-purple-700 border-purple-200",
  security: "bg-red-50 text-red-700 border-red-200",
  it: "bg-gray-50 text-gray-700 border-gray-200",
  operations: "bg-green-50 text-green-700 border-green-200",
  business: "bg-yellow-50 text-yellow-700 border-yellow-200",
};

// Human-readable field labels (shared with form component)
const FIELD_LABELS: Record<string, string> = {
  required_policies: "Required policies",
  regulatory_constraints: "Regulatory constraints",
  audit_requirements: "Audit requirements",
  risk_thresholds: "Risk thresholds",
  denied_scenarios: "Denied scenarios",
  escalation_requirements: "Escalation requirements",
  use_boundaries: "Permitted use boundaries",
  prohibited_use_cases: "Prohibited use cases",
  access_control_requirements: "Access control requirements",
  data_handling_requirements: "Data handling requirements",
  integration_requirements: "Integration requirements",
  infrastructure_constraints: "Infrastructure constraints",
  sla_requirements: "SLA requirements",
  escalation_paths: "Escalation paths",
  success_criteria: "Success criteria",
  business_constraints: "Business constraints",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  sessionId: string;
  contributions: StakeholderContribution[];
  onContributionAdded: (contribution: StakeholderContribution) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function StakeholderContributionsPanel({
  sessionId,
  contributions,
  onContributionAdded,
}: Props) {
  const [showForm, setShowForm] = useState(false);

  function handleSubmitted(contribution: StakeholderContribution) {
    onContributionAdded(contribution);
    setShowForm(false);
  }

  return (
    <div className="border-t border-gray-100 pt-4 mt-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
            Stakeholder Input
          </span>
          {contributions.length > 0 && (
            <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-1.5 py-0.5 font-medium">
              {contributions.length}
            </span>
          )}
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="text-xs text-gray-500 hover:text-gray-800 font-medium transition-colors"
          >
            + Add Input
          </button>
        )}
      </div>

      {/* Existing contributions */}
      {contributions.length > 0 && (
        <div className="space-y-2 mb-3">
          {contributions.map((c) => (
            <ContributionCard key={c.id} contribution={c} />
          ))}
        </div>
      )}

      {/* Empty state (no contributions, form not open) */}
      {contributions.length === 0 && !showForm && (
        <p className="text-xs text-gray-400 mb-3">
          Domain experts can add requirements here. Claude will incorporate them into the conversation.
        </p>
      )}

      {/* Add contribution form */}
      {showForm && (
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-3">
          <StakeholderContributionForm
            sessionId={sessionId}
            onSubmitted={handleSubmitted}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}
    </div>
  );
}

// ── ContributionCard ──────────────────────────────────────────────────────────

function ContributionCard({ contribution }: { contribution: StakeholderContribution }) {
  const [expanded, setExpanded] = useState(false);
  const domain = contribution.domain as ContributionDomain;
  const colorClass = DOMAIN_COLORS[domain] ?? "bg-gray-50 text-gray-700 border-gray-200";
  const nonEmptyEntries = Object.entries(contribution.fields).filter(([, v]) => v.trim().length > 0);

  return (
    <div className="rounded border border-gray-100 bg-white p-2.5 text-xs">
      {/* Top row: domain badge + contributor */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <span className={`inline-flex px-1.5 py-0.5 rounded border text-xs font-medium ${colorClass}`}>
          {DOMAIN_LABELS[domain] ?? domain}
        </span>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-gray-400 hover:text-gray-600 flex-shrink-0 text-xs"
        >
          {expanded ? "▲" : "▼"}
        </button>
      </div>
      <p className="text-gray-500 truncate">
        {contribution.contributorEmail}
        {contribution.contributorRole && (
          <span className="text-gray-400"> · {contribution.contributorRole}</span>
        )}
      </p>
      <p className="text-gray-400 mt-0.5">{formatDate(contribution.createdAt)}</p>

      {/* Field values (expanded) */}
      {expanded && nonEmptyEntries.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-100 space-y-1.5">
          {nonEmptyEntries.map(([key, value]) => (
            <div key={key}>
              <p className="font-medium text-gray-600">
                {FIELD_LABELS[key] ?? key}
              </p>
              <p className="text-gray-500 leading-relaxed">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Preview (collapsed) */}
      {!expanded && nonEmptyEntries.length > 0 && (
        <p className="text-gray-400 mt-1 line-clamp-1 italic">
          {nonEmptyEntries[0][1]}
          {nonEmptyEntries.length > 1 && ` +${nonEmptyEntries.length - 1} more`}
        </p>
      )}
    </div>
  );
}

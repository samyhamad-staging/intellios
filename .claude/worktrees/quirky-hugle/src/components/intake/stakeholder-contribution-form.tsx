"use client";

import { useState } from "react";
import { ContributionDomain, StakeholderContribution } from "@/lib/types/intake";

// ── Domain config ─────────────────────────────────────────────────────────────

interface DomainConfig {
  label: string;
  icon: string;
  fields: Array<{
    key: string;
    label: string;
    placeholder: string;
  }>;
}

const DOMAIN_CONFIG: Record<ContributionDomain, DomainConfig> = {
  compliance: {
    label: "Compliance",
    icon: "⚖️",
    fields: [
      {
        key: "required_policies",
        label: "Required policies",
        placeholder: "e.g. FINRA Rule 3110 supervisory procedures must be documented and enforced at the API level",
      },
      {
        key: "regulatory_constraints",
        label: "Regulatory constraints",
        placeholder: "e.g. All customer communications must be retained for 3 years per FINRA Rule 4511",
      },
      {
        key: "audit_requirements",
        label: "Audit requirements",
        placeholder: "e.g. Every agent decision affecting a customer account must generate an immutable audit entry",
      },
    ],
  },
  risk: {
    label: "Risk",
    icon: "🛡",
    fields: [
      {
        key: "risk_thresholds",
        label: "Risk thresholds",
        placeholder: "e.g. Agent must halt and escalate if confidence in recommended action falls below 85%",
      },
      {
        key: "denied_scenarios",
        label: "Denied scenarios",
        placeholder: "e.g. Agent must never autonomously execute trades above $10,000 without human approval",
      },
      {
        key: "escalation_requirements",
        label: "Escalation requirements",
        placeholder: "e.g. Any flagged transaction must be routed to the compliance queue within 60 seconds",
      },
    ],
  },
  legal: {
    label: "Legal",
    icon: "📋",
    fields: [
      {
        key: "use_boundaries",
        label: "Permitted use boundaries",
        placeholder: "e.g. Agent may only process data for the specific client accounts named in the service agreement",
      },
      {
        key: "prohibited_use_cases",
        label: "Prohibited use cases",
        placeholder: "e.g. Agent must not generate investment advice — refer all advisory requests to a licensed representative",
      },
    ],
  },
  security: {
    label: "Security",
    icon: "🔒",
    fields: [
      {
        key: "access_control_requirements",
        label: "Access control requirements",
        placeholder: "e.g. Agent must authenticate with OAuth 2.0 and verify scopes before each API call",
      },
      {
        key: "data_handling_requirements",
        label: "Data handling requirements",
        placeholder: "e.g. PII fields must be masked in all log output; SSNs must never appear in any response",
      },
    ],
  },
  it: {
    label: "IT / Infrastructure",
    icon: "⚙️",
    fields: [
      {
        key: "integration_requirements",
        label: "Integration requirements",
        placeholder: "e.g. Must integrate with internal CRM via the approved REST API gateway — no direct DB access",
      },
      {
        key: "infrastructure_constraints",
        label: "Infrastructure constraints",
        placeholder: "e.g. Agent must be deployable on-premises within the existing Kubernetes cluster; no external SaaS dependencies",
      },
    ],
  },
  operations: {
    label: "Operations",
    icon: "📊",
    fields: [
      {
        key: "sla_requirements",
        label: "SLA requirements",
        placeholder: "e.g. P99 response time must be under 2 seconds; agent must maintain 99.9% uptime during market hours",
      },
      {
        key: "escalation_paths",
        label: "Escalation paths",
        placeholder: "e.g. If the agent cannot resolve a query within 3 attempts, transfer to Tier 2 support with full context",
      },
    ],
  },
  business: {
    label: "Business",
    icon: "💼",
    fields: [
      {
        key: "success_criteria",
        label: "Success criteria",
        placeholder: "e.g. Agent must reduce average case resolution time by 30% compared to manual handling baseline",
      },
      {
        key: "business_constraints",
        label: "Business constraints",
        placeholder: "e.g. Agent must operate within existing headcount — no additional licensing costs above current tooling budget",
      },
    ],
  },
};

const DOMAIN_ORDER: ContributionDomain[] = [
  "compliance", "risk", "legal", "security", "it", "operations", "business",
];

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  sessionId: string;
  onSubmitted: (contribution: StakeholderContribution) => void;
  onCancel?: () => void;
}

export function StakeholderContributionForm({ sessionId, onSubmitted, onCancel }: Props) {
  const [selectedDomain, setSelectedDomain] = useState<ContributionDomain | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleDomainSelect(domain: ContributionDomain) {
    setSelectedDomain(domain);
    setFields({});
    setError(null);
  }

  function handleFieldChange(key: string, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    if (!selectedDomain) return;

    // Filter to non-empty fields only
    const nonEmptyFields = Object.fromEntries(
      Object.entries(fields).filter(([, v]) => v.trim().length > 0)
    );

    if (Object.keys(nonEmptyFields).length === 0) {
      setError("Please fill in at least one field before submitting.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/intake/sessions/${sessionId}/contributions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: selectedDomain, fields: nonEmptyFields }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message ?? "Failed to submit contribution");
      }

      const { contribution } = await response.json();
      onSubmitted(contribution);

      // Reset form
      setSelectedDomain(null);
      setFields({});
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  }

  const config = selectedDomain ? DOMAIN_CONFIG[selectedDomain] : null;

  return (
    <div className="space-y-4">
      {/* Domain selector */}
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
          Select your domain
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {DOMAIN_ORDER.map((domain) => {
            const dc = DOMAIN_CONFIG[domain];
            return (
              <button
                key={domain}
                onClick={() => handleDomainSelect(domain)}
                className={`px-2.5 py-1.5 rounded text-xs font-medium border transition-colors text-left ${
                  selectedDomain === domain
                    ? "bg-violet-600 text-white border-violet-600"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                }`}
              >
                {dc.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Domain fields */}
      {config && selectedDomain && (
        <div className="space-y-3">
          <p className="text-xs text-gray-500">
            All fields are optional. Fill in the requirements that apply.
          </p>
          {config.fields.map((field) => (
            <div key={field.key}>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                {field.label}
              </label>
              <textarea
                value={fields[field.key] ?? ""}
                onChange={(e) => handleFieldChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                rows={2}
                className="w-full text-xs border border-gray-200 rounded px-2.5 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-violet-400 focus:border-violet-300 placeholder:text-gray-300"
              />
            </div>
          ))}

          {error && (
            <p className="text-xs text-red-600">{error}</p>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 py-1.5 rounded text-xs font-medium bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? "Submitting…" : "Submit Contribution"}
            </button>
            {onCancel && (
              <button
                onClick={onCancel}
                className="text-xs text-gray-400 hover:text-gray-700 transition-colors px-1"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { IntakePayload, IntakeContext, ContributionDomain, StakeholderContribution } from "@/lib/types/intake";

interface IntakeReviewProps {
  sessionId: string;
  payload: IntakePayload;
  context: IntakeContext | null;
  contributions?: StakeholderContribution[];
  onGenerate: () => void;
  generating: boolean;
  generateError: string | null;
}

// Human-readable field labels for rendering contributions
const CONTRIBUTION_FIELD_LABELS: Record<string, string> = {
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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

interface AmbiguityFlag {
  id: string;
  field: string;
  description: string;
  userStatement: string;
  flaggedAt: string;
  resolved: boolean;
}

type SectionKey =
  | "identity"
  | "capabilities"
  | "instructions"
  | "knowledge"
  | "constraints"
  | "governance"
  | "audit";

const SECTION_LABELS: Record<SectionKey, string> = {
  identity: "Agent Identity",
  capabilities: "Tools & Capabilities",
  instructions: "Behavioral Instructions",
  knowledge: "Knowledge Sources",
  constraints: "Constraints",
  governance: "Governance Policies",
  audit: "Audit Configuration",
};

function getSectionContent(section: SectionKey, payload: IntakePayload): React.ReactNode {
  switch (section) {
    case "identity": {
      const id = payload.identity;
      if (!id?.name) return <span className="text-gray-400 italic">Not captured</span>;
      return (
        <div className="space-y-1">
          <div><span className="font-medium">{id.name}</span></div>
          {id.description && <div className="text-gray-600">{id.description}</div>}
          {id.persona && <div className="text-gray-500 text-xs">Persona: {id.persona}</div>}
        </div>
      );
    }
    case "capabilities": {
      const tools = payload.capabilities?.tools ?? [];
      if (tools.length === 0) return <span className="text-gray-400 italic">No tools captured</span>;
      return (
        <ul className="space-y-1">
          {tools.map((t) => (
            <li key={t.name} className="flex items-start gap-2">
              <span className="mt-0.5 text-gray-400">⚙</span>
              <div>
                <span className="font-medium">{t.name}</span>
                <span className="ml-1 text-xs text-gray-400">({t.type})</span>
                {t.description && <div className="text-xs text-gray-500">{t.description}</div>}
              </div>
            </li>
          ))}
        </ul>
      );
    }
    case "instructions": {
      const instr = payload.capabilities?.instructions;
      if (!instr) return <span className="text-gray-400 italic">Not configured</span>;
      return <div className="text-gray-600 whitespace-pre-wrap text-sm leading-relaxed">{instr}</div>;
    }
    case "knowledge": {
      const sources = payload.capabilities?.knowledge_sources ?? [];
      if (sources.length === 0) return <span className="text-gray-400 italic">None added</span>;
      return (
        <ul className="space-y-1">
          {sources.map((s) => (
            <li key={s.name} className="flex items-center gap-2">
              <span className="text-gray-400">🗄</span>
              <span className="font-medium">{s.name}</span>
              <span className="text-xs text-gray-400">({s.type})</span>
            </li>
          ))}
        </ul>
      );
    }
    case "constraints": {
      const c = payload.constraints;
      if (!c?.allowed_domains?.length && !c?.denied_actions?.length) {
        return <span className="text-gray-400 italic">None set</span>;
      }
      return (
        <div className="space-y-2">
          {c.allowed_domains && c.allowed_domains.length > 0 && (
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Allowed domains</div>
              <div className="flex flex-wrap gap-1">
                {c.allowed_domains.map((d) => (
                  <span key={d} className="rounded-full bg-green-50 border border-green-200 px-2 py-0.5 text-xs text-green-700">{d}</span>
                ))}
              </div>
            </div>
          )}
          {c.denied_actions && c.denied_actions.length > 0 && (
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Denied actions</div>
              <div className="flex flex-wrap gap-1">
                {c.denied_actions.map((a) => (
                  <span key={a} className="rounded-full bg-red-50 border border-red-200 px-2 py-0.5 text-xs text-red-700">{a}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }
    case "governance": {
      const policies = payload.governance?.policies ?? [];
      if (policies.length === 0) return <span className="text-gray-400 italic">No policies attached</span>;
      return (
        <ul className="space-y-2">
          {policies.map((p) => (
            <li key={p.name}>
              <div className="flex items-center gap-2">
                <span className="text-gray-400">🛡</span>
                <span className="font-medium">{p.name}</span>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">{p.type}</span>
              </div>
              {p.description && <div className="ml-5 text-xs text-gray-500 mt-0.5">{p.description}</div>}
            </li>
          ))}
        </ul>
      );
    }
    case "audit": {
      const a = payload.governance?.audit;
      if (!a) return <span className="text-gray-400 italic">Not configured</span>;
      return (
        <div className="flex flex-wrap gap-3 text-sm">
          {a.log_interactions !== undefined && (
            <span className={`flex items-center gap-1 ${a.log_interactions ? "text-green-700" : "text-gray-500"}`}>
              {a.log_interactions ? "✓" : "✗"} Interaction logging
            </span>
          )}
          {a.retention_days !== undefined && (
            <span className="text-gray-600">{a.retention_days}-day retention</span>
          )}
          {a.pii_redaction !== undefined && (
            <span className={`flex items-center gap-1 ${a.pii_redaction ? "text-green-700" : "text-gray-500"}`}>
              {a.pii_redaction ? "✓" : "✗"} PII redaction
            </span>
          )}
        </div>
      );
    }
  }
}

const SECTION_KEYS: SectionKey[] = [
  "identity",
  "capabilities",
  "instructions",
  "knowledge",
  "constraints",
  "governance",
  "audit",
];

function isSectionFilled(section: SectionKey, payload: IntakePayload): boolean {
  switch (section) {
    case "identity": return !!(payload.identity?.name && payload.identity?.description);
    case "capabilities": return (payload.capabilities?.tools?.length ?? 0) > 0;
    case "instructions": return !!payload.capabilities?.instructions;
    case "knowledge": return (payload.capabilities?.knowledge_sources?.length ?? 0) > 0;
    case "constraints": return (payload.constraints?.allowed_domains?.length ?? 0) > 0 || (payload.constraints?.denied_actions?.length ?? 0) > 0;
    case "governance": return (payload.governance?.policies?.length ?? 0) > 0;
    case "audit": return payload.governance?.audit !== undefined;
  }
}

export function IntakeReview({
  sessionId,
  payload,
  context,
  contributions = [],
  onGenerate,
  generating,
  generateError,
}: IntakeReviewProps) {
  const [acknowledged, setAcknowledged] = useState<Set<SectionKey>>(new Set());
  const [expandedFlags, setExpandedFlags] = useState(false);

  const flags = ((payload as Record<string, unknown>)._flags as AmbiguityFlag[] | undefined) ?? [];
  const unresolvedFlags = flags.filter((f) => !f.resolved);

  const filledSections = SECTION_KEYS.filter((k) => isSectionFilled(k, payload));
  const requiredSections: SectionKey[] = ["identity", "capabilities"];
  const allRequiredFilled = requiredSections.every((k) => isSectionFilled(k, payload));
  const allFilled = filledSections.every((k) => acknowledged.has(k));
  const canGenerate = allRequiredFilled && allFilled;

  function toggleAcknowledge(key: SectionKey) {
    setAcknowledged((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="flex flex-1 overflow-auto bg-gray-50">
      <div className="mx-auto w-full max-w-3xl px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
            Step 3 of 3 — Review & Confirm
          </div>
          <h2 className="text-2xl font-semibold text-gray-900">Review captured requirements</h2>
          <p className="mt-2 text-sm text-gray-500">
            Review each section below. Check the box to confirm the content is correct before generating the blueprint.
          </p>
        </div>

        {/* Context summary strip */}
        {context && (
          <div className="mb-6 rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Enterprise Context</div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
              <div>
                <div className="text-xs text-gray-400">Deployment</div>
                <div className="text-gray-800 font-medium capitalize">{context.deploymentType.replace(/-/g, " ")}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Data sensitivity</div>
                <div className="text-gray-800 font-medium uppercase">{context.dataSensitivity}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Regulatory scope</div>
                <div className="text-gray-800 font-medium">{context.regulatoryScope.join(", ") || "None"}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Integrations</div>
                <div className="text-gray-800 font-medium">{context.integrationTypes.join(", ") || "None"}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Stakeholders consulted</div>
                <div className="text-gray-800 font-medium">{context.stakeholdersConsulted.join(", ") || "None"}</div>
              </div>
            </div>
          </div>
        )}

        {/* Ambiguity flags */}
        {unresolvedFlags.length > 0 && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-amber-600">⚠</span>
                <span className="text-sm font-medium text-amber-800">
                  {unresolvedFlags.length} ambiguous requirement{unresolvedFlags.length > 1 ? "s" : ""} flagged during intake
                </span>
              </div>
              <button
                onClick={() => setExpandedFlags((v) => !v)}
                className="text-xs text-amber-700 hover:text-amber-900 underline"
              >
                {expandedFlags ? "Hide" : "Show details"}
              </button>
            </div>
            {expandedFlags && (
              <ul className="mt-3 space-y-3">
                {unresolvedFlags.map((f) => (
                  <li key={f.id} className="rounded-lg border border-amber-200 bg-white px-4 py-3">
                    <div className="text-xs font-medium text-gray-500 mb-1">{f.field}</div>
                    <div className="text-sm text-gray-800">{f.description}</div>
                    <div className="mt-1 text-xs text-gray-400 italic">"{f.userStatement}"</div>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-xs text-amber-700">
              These items were flagged for human review. You may proceed, but reviewers will see these flags in the governance report.
            </p>
          </div>
        )}

        {/* Stakeholder contributions */}
        {contributions.length > 0 && (
          <div className="mb-6 rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
            <div className="flex items-baseline gap-2 mb-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Stakeholder Input
              </div>
              <div className="text-xs text-gray-500">
                {contributions.length} contribution{contributions.length > 1 ? "s" : ""} from{" "}
                {new Set(contributions.map((c) => c.contributorEmail)).size} contributor{new Set(contributions.map((c) => c.contributorEmail)).size > 1 ? "s" : ""}
              </div>
            </div>
            <div className="space-y-4">
              {contributions.map((c) => {
                const domain = c.domain as ContributionDomain;
                const colorClass = DOMAIN_COLORS[domain] ?? "bg-gray-50 text-gray-700 border-gray-200";
                const nonEmptyEntries = Object.entries(c.fields).filter(([, v]) => v.trim().length > 0);
                return (
                  <div key={c.id} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`inline-flex px-2 py-0.5 rounded border text-xs font-medium ${colorClass}`}>
                        {DOMAIN_LABELS[domain] ?? domain}
                      </span>
                      <span className="text-xs text-gray-600">{c.contributorEmail}</span>
                      {c.contributorRole && (
                        <span className="text-xs text-gray-400">· {c.contributorRole}</span>
                      )}
                      <span className="ml-auto text-xs text-gray-400">{formatDate(c.createdAt)}</span>
                    </div>
                    {nonEmptyEntries.length > 0 && (
                      <dl className="space-y-1.5">
                        {nonEmptyEntries.map(([key, value]) => (
                          <div key={key}>
                            <dt className="text-xs font-medium text-gray-500">
                              {CONTRIBUTION_FIELD_LABELS[key] ?? key}
                            </dt>
                            <dd className="text-sm text-gray-700 leading-relaxed">{value}</dd>
                          </div>
                        ))}
                      </dl>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Section review cards */}
        <div className="space-y-4">
          {SECTION_KEYS.map((key) => {
            const filled = isSectionFilled(key, payload);
            const isRequired = requiredSections.includes(key);
            const isAcknowledged = acknowledged.has(key);

            return (
              <div
                key={key}
                className={`rounded-xl border bg-white shadow-sm transition-colors ${
                  !filled
                    ? "border-gray-200 opacity-60"
                    : isAcknowledged
                    ? "border-blue-300 bg-blue-50/30"
                    : "border-gray-200"
                }`}
              >
                <div className="flex items-start gap-4 p-5">
                  {/* Checkbox */}
                  <div className="mt-0.5 shrink-0">
                    {filled ? (
                      <button
                        type="button"
                        onClick={() => toggleAcknowledge(key)}
                        className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${
                          isAcknowledged
                            ? "border-blue-500 bg-blue-500"
                            : "border-gray-300 hover:border-blue-400"
                        }`}
                        title={isAcknowledged ? "Unmark as reviewed" : "Mark as reviewed"}
                      >
                        {isAcknowledged && (
                          <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 10 10">
                            <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </button>
                    ) : (
                      <div className="h-5 w-5 rounded border-2 border-gray-200" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-sm font-semibold text-gray-900">{SECTION_LABELS[key]}</h3>
                      {isRequired && !filled && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-600">required</span>
                      )}
                      {!filled && (
                        <span className="text-xs text-gray-400">Not captured</span>
                      )}
                    </div>
                    <div className="text-sm">
                      {getSectionContent(key, payload)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Generate button */}
        <div className="mt-8 flex flex-col items-end gap-3">
          {!allRequiredFilled && (
            <p className="text-sm text-red-600">
              Required sections (Identity, Capabilities) are not complete. Go back to the intake conversation to fill them in.
            </p>
          )}
          {allRequiredFilled && !allFilled && (
            <p className="text-sm text-gray-500">
              Check all filled sections to confirm their content before generating.
            </p>
          )}
          {generateError && (
            <p className="text-sm text-red-600">{generateError}</p>
          )}
          <button
            onClick={onGenerate}
            disabled={!canGenerate || generating}
            className="rounded-lg bg-gray-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {generating ? "Generating blueprint…" : "Generate Blueprint →"}
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useCallback } from "react";
import { X } from "lucide-react";
import {
  IntakePayload,
  IntakeContext,
  IntakeRiskTier,
  ContributionDomain,
  StakeholderContribution,
  AmbiguityFlag,
  CaptureVerificationItem,
  PolicyQualityItem,
} from "@/lib/types/intake";
import { getMissingContributionDomains } from "@/lib/intake/coverage";
import { CompletenessMap } from "./completeness-map";

interface IntakeReviewProps {
  sessionId: string;
  payload: IntakePayload;
  context: IntakeContext | null;
  contributions?: StakeholderContribution[];
  riskTier?: IntakeRiskTier | null;
  onGenerate: () => void;
  onRevise?: () => void;
  generating: boolean;
  generateSuccess?: boolean;
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

// All domain and policy badges use the neutral variant for consistency —
// the label text provides the semantic differentiation, not the color.

// RV-009: Policy type chips — all neutral

// P2-146: Heuristic impact classification for ambiguity flags
// Fields governing behaviour, safety, and integrations are high-impact;
// descriptive / identity fields are low-impact.
const HIGH_IMPACT_FIELDS = new Set([
  "governance", "capabilities", "tools", "instructions", "constraints",
  "policies", "compliance", "risk", "security", "escalation",
  "denied_scenarios", "prohibited_use_cases", "access_control",
  "data_handling", "integration", "audit",
]);

function flagImpact(field: string): "high" | "low" {
  const lower = field.toLowerCase().replace(/[^a-z_]/g, "");
  for (const key of HIGH_IMPACT_FIELDS) {
    if (lower.includes(key)) return "high";
  }
  return "low";
}

// RV-004: Human-readable retention duration
function formatRetentionDays(days: number): string {
  if (days >= 365) {
    const years = Math.floor(days / 365);
    return `${years}-year retention (${days.toLocaleString()} days)`;
  }
  if (days >= 30) {
    const months = Math.floor(days / 30);
    return `${months}-month retention (${days} days)`;
  }
  return `${days}-day retention`;
}

// RV-012: Data sensitivity uses semantic variants
import { Badge } from "@/components/ui/badge";
import type { BadgeVariant } from "@/components/ui/badge";
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from "@/components/ui/table";

const DATA_SENSITIVITY_VARIANT: Record<string, BadgeVariant> = {
  public:       "success",
  internal:     "info",
  confidential: "warning",
  pii:          "danger",
  regulated:    "danger",
};

const RISK_TIER_VARIANT: Record<string, BadgeVariant> = {
  low:      "success",
  medium:   "warning",
  high:     "danger",
  critical: "danger",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
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
          {/* RV-013: Improved denied actions — enterprise-styled blocked list */}
          {c.denied_actions && c.denied_actions.length > 0 && (
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Denied actions</div>
              <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 space-y-1">
                {c.denied_actions.map((a) => (
                  <div key={a} className="flex items-center gap-2 text-xs">
                    <span className="shrink-0 h-4 w-4 flex items-center justify-center rounded-full bg-red-200 text-red-700 font-bold text-2xs">✕</span>
                    <span className="text-red-800 font-medium">{a}</span>
                  </div>
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
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-gray-400">🛡</span>
                <span className="font-medium">{p.name}</span>
                {/* RV-009: Colored policy type chip */}
                <Badge variant="neutral">
                  {p.type.replace(/_/g, " ")}
                </Badge>
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
          {/* RV-004: Human-readable retention duration */}
          {a.retention_days !== undefined && (
            <span className="text-gray-600">{formatRetentionDays(a.retention_days)}</span>
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
  riskTier,
  onGenerate,
  onRevise,
  generating,
  generateSuccess = false,
  generateError,
}: IntakeReviewProps) {
  const [acknowledged, setAcknowledged] = useState<Set<SectionKey>>(new Set());
  const [expandedFlags, setExpandedFlags] = useState(false);
  const [expandedCapture, setExpandedCapture] = useState(false);

  // P1-157: Preview ABP side panel
  const [previewOpen, setPreviewOpen] = useState(false);

  // P1-35: Per-flag inline clarifications — session-scoped, no DB needed
  const [flagClarifications, setFlagClarifications] = useState<Record<string, string>>({});
  const [flagClarificationDraft, setFlagClarificationDraft] = useState<Record<string, string>>({});
  const [flagAddressingId, setFlagAddressingId] = useState<string | null>(null);

  function saveFlagClarification(flagId: string) {
    const text = (flagClarificationDraft[flagId] ?? "").trim();
    if (!text) return;
    setFlagClarifications((prev) => ({ ...prev, [flagId]: text }));
    setFlagAddressingId(null);
  }

  const flags: AmbiguityFlag[] = payload._flags ?? [];
  // P2-146: Sort unresolved flags — high-impact governance/capability/tool fields first
  const unresolvedFlags = flags
    .filter((f) => !f.resolved)
    .sort((a, b) => {
      const ia = flagImpact(a.field) === "high" ? 0 : 1;
      const ib = flagImpact(b.field) === "high" ? 0 : 1;
      return ia - ib;
    });

  const captureVerification: CaptureVerificationItem[] = payload._captureVerification ?? [];
  const policyQualityAssessment: PolicyQualityItem[] = payload._policyQualityAssessment ?? [];
  const inadequatePolicies = policyQualityAssessment.filter((p) => !p.adequate);

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
    <div className="flex flex-col flex-1 min-h-0">
    <div className="flex-1 overflow-auto bg-gray-50">
      <div className="mx-auto w-full max-w-3xl px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          {/* RV-011: Visual 3-step stepper */}
          <div className="flex items-center mb-5">
            <div className="flex items-center gap-1.5">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-white text-xs font-bold">✓</div>
              <span className="text-sm text-gray-400">Context</span>
            </div>
            <div className="mx-2.5 h-px w-8 bg-blue-300 shrink-0" />
            <div className="flex items-center gap-1.5">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-white text-xs font-bold">✓</div>
              <span className="text-sm text-gray-400">Intake</span>
            </div>
            <div className="mx-2.5 h-px w-8 bg-blue-400 shrink-0" />
            <div className="flex items-center gap-1.5">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-bold ring-4 ring-blue-100">3</div>
              <span className="text-sm font-semibold text-blue-700">Review</span>
            </div>
          </div>
          <h2 className="text-2xl font-semibold text-gray-900">Review captured requirements</h2>
          <p className="mt-2 text-sm text-gray-500">
            Review each section below. Check the box to confirm the content is correct before generating the blueprint.
          </p>

          {/* P1-36: 4-section content coverage strip */}
          {(() => {
            const coverageSections: { key: SectionKey; label: string }[] = [
              { key: "identity",     label: "Identity" },
              { key: "capabilities", label: "Capabilities" },
              { key: "constraints",  label: "Constraints" },
              { key: "governance",   label: "Governance" },
            ];
            return (
              <div className="mt-4 flex items-center gap-2 flex-wrap">
                {coverageSections.map(({ key, label }) => {
                  const filled = isSectionFilled(key, payload);
                  const acked = acknowledged.has(key);
                  return (
                    <span
                      key={key}
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors ${
                        acked
                          ? "border-green-300 bg-green-50 text-green-700"
                          : filled
                          ? "border-blue-200 bg-blue-50 text-blue-700"
                          : "border-gray-200 bg-gray-50 text-gray-400"
                      }`}
                    >
                      {acked ? "✓" : filled ? "·" : "○"} {label}
                    </span>
                  );
                })}
                <span className="text-xs text-gray-400 ml-1">
                  {coverageSections.filter(({ key }) => isSectionFilled(key, payload)).length}/4 sections captured
                </span>
              </div>
            );
          })()}
        </div>

        {/* Context summary strip — RV-012: risk-colored badges */}
        {context && (
          <div className="mb-6 rounded-card border border-gray-200 bg-white px-5 py-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">Enterprise Context</div>
              {riskTier && (
                <Badge variant={RISK_TIER_VARIANT[riskTier] ?? "neutral"}>
                  {riskTier.toUpperCase()} RISK
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
              <div>
                <div className="text-xs text-gray-400 mb-1">Deployment</div>
                <div className="text-gray-800 font-medium capitalize">{context.deploymentType.replace(/-/g, " ")}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">Data sensitivity</div>
                <Badge variant={DATA_SENSITIVITY_VARIANT[context.dataSensitivity] ?? "neutral"}>
                  {context.dataSensitivity.toUpperCase()}
                </Badge>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">Regulatory scope</div>
                {(context.regulatoryScope ?? []).filter((s) => s !== "none").length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {(context.regulatoryScope ?? []).filter((s) => s !== "none").map((s) => (
                      <span key={s} className="inline-flex rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-xs-tight font-medium text-slate-700">{s.toUpperCase()}</span>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-500">None</div>
                )}
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">Integrations</div>
                <div className="text-gray-800 font-medium">{(context.integrationTypes ?? []).join(", ") || "None"}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">Stakeholders consulted</div>
                <div className="text-gray-800 font-medium">{(context.stakeholdersConsulted ?? []).join(", ") || "None"}</div>
              </div>
            </div>
          </div>
        )}

        {/* Completeness map — Phase 49 */}
        <CompletenessMap
          payload={payload}
          context={context}
          riskTier={riskTier}
          contributions={contributions}
        />

        {/* Ambiguity flags */}
        {unresolvedFlags.length > 0 && (
          <div className="mb-6 rounded-card border border-amber-200 bg-amber-50 px-5 py-4 shadow-sm">
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
                {unresolvedFlags.map((f) => {
                  const clarification = flagClarifications[f.id];
                  const isAddressing = flagAddressingId === f.id;
                  const addressed = Boolean(clarification);
                  return (
                    <li
                      key={f.id}
                      className={`rounded-lg border px-4 py-3 transition-colors ${
                        addressed
                          ? "border-green-200 bg-green-50"
                          : "border-amber-200 bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-gray-500">{f.field}</span>
                            {/* P2-146: Impact badge */}
                            {flagImpact(f.field) === "high" ? (
                              <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-2xs font-semibold text-red-700 uppercase tracking-wide">
                                High impact
                              </span>
                            ) : (
                              <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-2xs font-medium text-slate-500 uppercase tracking-wide">
                                Low impact
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-800">{f.description}</div>
                          <div className="mt-1 text-xs text-gray-400 italic">"{f.userStatement}"</div>
                          {/* P1-35: saved clarification */}
                          {clarification && (
                            <div className="mt-2 flex items-start gap-1.5 rounded-md bg-white border border-green-200 px-2.5 py-1.5">
                              <span className="mt-0.5 text-green-500 shrink-0 text-xs">✓</span>
                              <span className="text-xs text-gray-700">{clarification}</span>
                              <button
                                onClick={() => {
                                  setFlagClarifications((prev) => { const n = { ...prev }; delete n[f.id]; return n; });
                                  setFlagClarificationDraft((prev) => ({ ...prev, [f.id]: clarification }));
                                  setFlagAddressingId(f.id);
                                }}
                                className="ml-auto shrink-0 text-xs text-gray-400 hover:text-gray-600"
                              >
                                Edit
                              </button>
                            </div>
                          )}
                          {/* P1-35: inline clarification form */}
                          {isAddressing && (
                            <div className="mt-2 space-y-1.5">
                              <textarea
                                // eslint-disable-next-line jsx-a11y/no-autofocus
                                autoFocus
                                rows={2}
                                placeholder="Describe how this ambiguity was resolved or accepted…"
                                value={flagClarificationDraft[f.id] ?? ""}
                                onChange={(e) =>
                                  setFlagClarificationDraft((prev) => ({ ...prev, [f.id]: e.target.value }))
                                }
                                className="w-full resize-none rounded-md border border-amber-200 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-400"
                              />
                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => saveFlagClarification(f.id)}
                                  disabled={!(flagClarificationDraft[f.id] ?? "").trim()}
                                  className="rounded-md bg-amber-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-40"
                                >
                                  Save clarification
                                </button>
                                <button
                                  onClick={() => setFlagAddressingId(null)}
                                  className="rounded-md border border-gray-200 px-2.5 py-1 text-xs text-gray-500 hover:bg-gray-50"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                        {/* P1-35: "Add clarification" trigger */}
                        {!isAddressing && !addressed && (
                          <button
                            onClick={() => setFlagAddressingId(f.id)}
                            className="shrink-0 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors"
                          >
                            + Clarify
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="mt-2 text-xs text-amber-700">
              {Object.keys(flagClarifications).length > 0
                ? `${Object.keys(flagClarifications).length} of ${unresolvedFlags.length} flag${unresolvedFlags.length > 1 ? "s" : ""} addressed. Reviewers will see your clarifications.`
                : "These items were flagged for human review. You may proceed, but reviewers will see these flags in the governance report."
              }
            </p>
          </div>
        )}

        {/* Stakeholder contributions */}
        {(contributions.length > 0 || (context && getMissingContributionDomains(context, contributions, riskTier).length > 0)) && (
          <div className="mb-6 rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
            <div className="flex items-baseline gap-2 mb-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Stakeholder Input
              </div>
              {contributions.length > 0 && (
                <div className="text-xs text-gray-500">
                  {contributions.length} contribution{contributions.length > 1 ? "s" : ""} from{" "}
                  {new Set(contributions.map((c) => c.contributorEmail)).size} contributor{new Set(contributions.map((c) => c.contributorEmail)).size > 1 ? "s" : ""}
                </div>
              )}
            </div>
            {contributions.length > 0 && (
              <div className="space-y-4">
                {contributions.map((c) => {
                  const domain = c.domain as ContributionDomain;
                  const nonEmptyEntries = Object.entries(c.fields).filter(([, v]) => v.trim().length > 0);
                  return (
                    <div key={c.id} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="neutral">
                          {DOMAIN_LABELS[domain] ?? domain}
                        </Badge>
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
            )}
            {/* Missing-domain callout */}
            {context && (() => {
              const missing = getMissingContributionDomains(context, contributions, riskTier);
              if (missing.length === 0) return null;
              return (
                <div className={`rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs ${contributions.length > 0 ? "mt-4" : ""}`}>
                  <div className="flex items-start gap-2">
                    <span className="text-amber-600 mt-0.5">⚠</span>
                    <div>
                      <p className="font-medium text-amber-800 mb-1.5">
                        No input received from:{" "}
                        {missing.map((domain, i) => (
                          <span key={domain}>
                            {i > 0 && ", "}
                            <Badge variant="neutral">
                              {DOMAIN_LABELS[domain] ?? domain}
                            </Badge>
                          </span>
                        ))}
                      </p>
                      <p className="text-amber-700">
                        These domains were implicated by your intake context. You may proceed, but reviewers will note the absence.
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Capture verification — only shown when assessments are present */}
        {captureVerification.length > 0 && (
          <div className="mb-6 rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Capture Verification
                </div>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                  {captureVerification.length} requirement{captureVerification.length !== 1 ? "s" : ""}
                </span>
              </div>
              <button
                onClick={() => setExpandedCapture((v) => !v)}
                className="text-xs text-gray-500 hover:text-gray-700 underline"
              >
                {expandedCapture ? "Hide" : "Show details"}
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Claude confirmed every requirement discussed in the conversation was captured in a structured field before finalizing.
            </p>
            {expandedCapture && (
              <div className="overflow-x-auto">
                <Table dense>
                  <TableHead>
                    <TableRow>
                      <TableHeader>Area</TableHeader>
                      <TableHeader>What was discussed</TableHeader>
                      <TableHeader>Captured as</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {captureVerification.map((item, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium text-gray-600">{item.area}</TableCell>
                        <TableCell className="text-gray-600">{item.mentioned}</TableCell>
                        <TableCell>
                          {item.capturedAs ? (
                            <span className="font-mono text-green-700">{item.capturedAs}</span>
                          ) : (
                            <span className="text-red-500 font-medium">Not captured</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}

        {/* Policy quality warnings — only shown when inadequate policies exist */}
        {inadequatePolicies.length > 0 && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-amber-600">⚠</span>
              <div className="text-xs font-semibold uppercase tracking-wider text-amber-700">
                Policy Quality Warnings
              </div>
              <span className="rounded-full bg-amber-100 border border-amber-200 px-2 py-0.5 text-xs text-amber-700">
                {inadequatePolicies.length} polic{inadequatePolicies.length !== 1 ? "ies" : "y"}
              </span>
            </div>
            <p className="text-xs text-amber-700 mb-3">
              The following policies were assessed as too abstract to be operationally enforceable. You may proceed, but reviewers will see these warnings.
            </p>
            <ul className="space-y-2">
              {inadequatePolicies.map((item, i) => (
                <li key={i} className="rounded-lg border border-amber-200 bg-white px-4 py-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-red-400">✗</span>
                    <span className="text-sm font-medium text-gray-800">{item.policyName}</span>
                  </div>
                  <p className="text-xs text-gray-500 ml-5">{item.reason}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Section review cards — RV-007: id anchors; RV-008: collapse empty optionals */}
        <div className="space-y-4">
          {SECTION_KEYS.map((key) => {
            const filled = isSectionFilled(key, payload);
            const isRequired = requiredSections.includes(key);
            const isAcknowledged = acknowledged.has(key);

            // RV-008: Skip empty optional sections (shown in summary below)
            if (!filled && !isRequired) return null;

            return (
              <div
                key={key}
                id={`rv-section-${key}`}
                className={`rounded-card border bg-white shadow-sm transition-colors scroll-mt-4 ${
                  !filled
                    ? "border-red-200 bg-red-50/30"
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
                      <div className="h-5 w-5 rounded border-2 border-red-300" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-sm font-semibold text-gray-900">{SECTION_LABELS[key]}</h3>
                      {isRequired && !filled && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-2xs font-medium text-red-600">required</span>
                      )}
                      {!filled && (
                        <span className="text-xs text-gray-400">Not captured</span>
                      )}
                      {/* RV-003: Revise affordance */}
                      {onRevise && (
                        <button
                          onClick={onRevise}
                          className="ml-auto text-xs text-gray-400 hover:text-primary transition-colors shrink-0"
                          title={`Return to intake conversation to revise ${SECTION_LABELS[key]}`}
                        >
                          ← Revise
                        </button>
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

          {/* RV-008: Empty optional sections summary */}
          {(() => {
            const emptyOptionals = SECTION_KEYS.filter((k) => !isSectionFilled(k, payload) && !requiredSections.includes(k));
            if (emptyOptionals.length === 0) return null;
            return (
              <div className="rounded-card border border-dashed border-gray-200 bg-gray-50/50 px-5 py-4">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
                  {emptyOptionals.length} optional section{emptyOptionals.length > 1 ? "s" : ""} not captured
                </p>
                <p className="text-xs text-gray-400">
                  {emptyOptionals.map((k) => SECTION_LABELS[k]).join(" · ")}
                </p>
              </div>
            );
          })()}
        </div>

        {/* Spacer so sticky footer doesn't cover last card */}
        <div className="h-4" />
      </div>
    </div>

    {/* RV-005: Sticky footer — confirmation counter + generate button */}
    <div className="shrink-0 border-t border-gray-200 bg-white px-6 py-4 z-10">
      <div className="mx-auto flex w-full max-w-3xl items-center gap-4">
        {/* RV-006: Confirmation counter */}
        <div className="flex-1 min-w-0">
          {!allRequiredFilled && (
            <p className="text-sm text-red-600">
              Required sections (Identity, Capabilities) not complete —{" "}
              <a href={`/intake/${sessionId}`} className="underline hover:no-underline">return to intake</a>.
            </p>
          )}
          {allRequiredFilled && !allFilled && (
            <div>
              <p className="text-sm font-medium text-gray-700">
                {acknowledged.size} of {filledSections.length} section{filledSections.length !== 1 ? "s" : ""} confirmed
              </p>
              <div className="mt-1 h-1 rounded-full bg-gray-100 overflow-hidden w-40">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-300"
                  style={{ width: `${filledSections.length > 0 ? Math.round((acknowledged.size / filledSections.length) * 100) : 0}%` }}
                />
              </div>
            </div>
          )}
          {canGenerate && (
            <p className="text-sm font-medium text-green-700">✓ All {filledSections.length} sections confirmed</p>
          )}
        </div>

        {/* Soft warning for unresolved flags */}
        {canGenerate && unresolvedFlags.length > 0 && (
          <div className="hidden sm:flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 max-w-xs">
            <span className="shrink-0">⚠</span>
            <span>{unresolvedFlags.length} requirement{unresolvedFlags.length > 1 ? "s" : ""} flagged — reviewers will see these.</span>
          </div>
        )}

        {generateError && (
          <p className="text-sm text-red-600 shrink-0">{generateError}</p>
        )}

        {/* P1-157: Preview ABP button — read-only preview panel */}
        <button
          onClick={() => setPreviewOpen(true)}
          disabled={generating || generateSuccess}
          className="shrink-0 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition-colors"
        >
          Preview ABP
        </button>

        <button
          onClick={onGenerate}
          disabled={!canGenerate || generating || generateSuccess}
          className={`shrink-0 rounded-lg px-6 py-2.5 text-sm font-medium text-white transition-colors disabled:cursor-not-allowed ${
            generateSuccess
              ? "bg-green-600 disabled:opacity-100"
              : "bg-gray-900 hover:bg-gray-800 disabled:opacity-40"
          }`}
        >
          {generateSuccess
            ? "✓ Blueprint ready — opening workbench…"
            : generating
              ? "Generating blueprint…"
              : "Generate Blueprint (~20s) →"}
        </button>
      </div>
    </div>

    {/* P1-157: ABP Preview side panel */}
    {previewOpen && (
      <div
        className="fixed inset-0 z-50 flex"
        onClick={(e) => { if (e.target === e.currentTarget) setPreviewOpen(false); }}
      >
        {/* Semi-transparent backdrop */}
        <div className="flex-1 bg-black/30" onClick={() => setPreviewOpen(false)} />
        {/* Slide-in panel */}
        <div className="w-full max-w-md bg-white shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 bg-gray-50">
            <div>
              <p className="text-sm font-semibold text-gray-900">ABP Preview</p>
              <p className="text-xs text-gray-500 mt-0.5">Read-only view of what will be generated</p>
            </div>
            <button
              onClick={() => setPreviewOpen(false)}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              aria-label="Close preview"
            >
              <X size={16} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 text-sm">
            {/* Identity */}
            <section>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Identity</p>
              <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 space-y-2">
                <div>
                  <span className="text-xs text-gray-400">Name</span>
                  <p className="text-sm font-medium text-gray-800 mt-0.5">
                    {payload.identity?.name ?? context?.agentPurpose ? `${context?.agentPurpose?.slice(0, 40)}…` : <span className="text-gray-400 italic">not set</span>}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-gray-400">Description</span>
                  <p className="text-sm text-gray-700 mt-0.5">
                    {payload.identity?.description ?? <span className="text-gray-400 italic">will be generated</span>}
                  </p>
                </div>
                {payload.identity?.persona && (
                  <div>
                    <span className="text-xs text-gray-400">Persona</span>
                    <p className="text-sm text-gray-700 mt-0.5 line-clamp-3">{payload.identity.persona}</p>
                  </div>
                )}
              </div>
            </section>

            {/* Capabilities */}
            <section>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                Capabilities
                {(payload.capabilities?.tools?.length ?? 0) > 0 && (
                  <span className="ml-1.5 normal-case font-normal text-gray-400">
                    ({payload.capabilities?.tools?.length} tool{payload.capabilities?.tools?.length !== 1 ? "s" : ""})
                  </span>
                )}
              </p>
              {(payload.capabilities?.tools?.length ?? 0) === 0 && (
                <p className="text-xs text-gray-400 italic">No tools captured yet</p>
              )}
              {(payload.capabilities?.tools ?? []).map((tool, i) => (
                <div key={i} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 mb-1.5">
                  <p className="text-xs font-medium text-gray-800">{tool.name}</p>
                  {tool.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{tool.description}</p>}
                  <span className="mt-1 inline-block rounded bg-gray-200 px-1.5 py-0.5 text-2xs text-gray-600">{tool.type}</span>
                </div>
              ))}
              {payload.capabilities?.instructions && (
                <div className="mt-2">
                  <span className="text-xs text-gray-400">Instructions</span>
                  <p className="text-xs text-gray-700 mt-0.5 line-clamp-4 whitespace-pre-wrap">{payload.capabilities.instructions}</p>
                </div>
              )}
            </section>

            {/* Constraints */}
            <section>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Constraints</p>
              <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 space-y-2">
                {(payload.constraints?.denied_actions?.length ?? 0) > 0 ? (
                  <div>
                    <span className="text-xs text-gray-400">Denied actions ({payload.constraints?.denied_actions?.length})</span>
                    <ul className="mt-1 space-y-0.5">
                      {(payload.constraints?.denied_actions ?? []).slice(0, 4).map((a, i) => (
                        <li key={i} className="text-xs text-gray-700 flex gap-1.5"><span className="text-red-400 shrink-0">✗</span>{a}</li>
                      ))}
                      {(payload.constraints?.denied_actions?.length ?? 0) > 4 && (
                        <li className="text-xs text-gray-400">+{(payload.constraints?.denied_actions?.length ?? 0) - 4} more</li>
                      )}
                    </ul>
                  </div>
                ) : <p className="text-xs text-gray-400 italic">No constraints captured yet</p>}
                {(payload.constraints?.allowed_domains?.length ?? 0) > 0 && (
                  <div>
                    <span className="text-xs text-gray-400">Allowed domains</span>
                    <p className="text-xs text-gray-700 mt-0.5">{payload.constraints?.allowed_domains?.join(", ")}</p>
                  </div>
                )}
              </div>
            </section>

            {/* Governance */}
            <section>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                Governance
                {(payload.governance?.policies?.length ?? 0) > 0 && (
                  <span className="ml-1.5 normal-case font-normal text-gray-400">
                    ({payload.governance?.policies?.length} polic{payload.governance?.policies?.length !== 1 ? "ies" : "y"})
                  </span>
                )}
              </p>
              {(payload.governance?.policies?.length ?? 0) === 0 ? (
                <p className="text-xs text-gray-400 italic">Governance policies will be inferred from context and stakeholder input</p>
              ) : (
                (payload.governance?.policies ?? []).map((pol, i) => (
                  <div key={i} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-medium text-gray-800 flex-1">{pol.name}</p>
                      <span className="rounded bg-blue-100 px-1.5 py-0.5 text-2xs text-blue-700">{pol.type}</span>
                    </div>
                    {pol.description && <p className="text-xs text-gray-500 mt-0.5">{pol.description}</p>}
                  </div>
                ))
              )}
            </section>

            {/* Context summary */}
            {context && (
              <section>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Context signals</p>
                <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 space-y-1.5 text-xs text-gray-600">
                  <p><span className="text-gray-400">Deployment:</span> {context.deploymentType.replace(/-/g, " ")}</p>
                  <p><span className="text-gray-400">Data sensitivity:</span> {context.dataSensitivity}</p>
                  {context.regulatoryScope.filter(r => r !== "none").length > 0 && (
                    <p><span className="text-gray-400">Regulatory:</span> {context.regulatoryScope.filter(r => r !== "none").join(", ")}</p>
                  )}
                </div>
              </section>
            )}

            <p className="text-xs text-gray-400 text-center pb-2">
              The final blueprint will be generated by AI and may expand on the above.
            </p>
          </div>

          {/* Footer CTA */}
          <div className="border-t border-gray-200 px-5 py-4 flex gap-3">
            <button
              onClick={() => {
                setPreviewOpen(false);
              }}
              className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Continue reviewing
            </button>
            <button
              onClick={() => {
                setPreviewOpen(false);
                onGenerate();
              }}
              disabled={!canGenerate || generating || generateSuccess}
              className="flex-1 rounded-lg bg-gray-900 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-40 transition-colors"
            >
              Generate Blueprint →
            </button>
          </div>
        </div>
      </div>
    )}
    </div>
  );
}

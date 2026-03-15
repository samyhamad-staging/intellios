"use client";

import { useEffect, useState } from "react";
import { IntakeContext, IntakePayload, IntakeRiskTier, StakeholderContribution } from "@/lib/types/intake";
import { StakeholderContributionsPanel } from "./stakeholder-contributions-panel";

interface Section {
  key: string;
  label: string;
  filled: boolean;
  required: boolean;
  detail?: string;
}

function truncateList(items: string[], max = 3): string {
  if (items.length <= max) return items.join(", ");
  return items.slice(0, max).join(", ") + ` +${items.length - max} more`;
}

function getSections(payload: IntakePayload): Section[] {
  const identity = payload.identity;
  const capabilities = payload.capabilities;
  const constraints = payload.constraints;
  const governance = payload.governance;

  const tools = capabilities?.tools ?? [];
  const sources = capabilities?.knowledge_sources ?? [];
  const policies = governance?.policies ?? [];
  const domains = constraints?.allowed_domains ?? [];
  const denied = constraints?.denied_actions ?? [];

  return [
    {
      key: "identity",
      label: "Agent Identity",
      filled: !!(identity?.name && identity?.description),
      required: true,
      detail: identity?.name && identity?.description
        ? `"${identity.name}" — ${identity.description.length > 55 ? identity.description.slice(0, 55) + "…" : identity.description}`
        : undefined,
    },
    {
      key: "capabilities",
      label: "Tools & Capabilities",
      filled: tools.length > 0,
      required: true,
      detail: tools.length > 0
        ? `${tools.length} tool${tools.length > 1 ? "s" : ""}: ${truncateList(tools.map((t) => t.name))}`
        : undefined,
    },
    {
      key: "instructions",
      label: "Behavioral Instructions",
      filled: !!capabilities?.instructions,
      required: false,
      detail: capabilities?.instructions ? "Configured" : undefined,
    },
    {
      key: "knowledge",
      label: "Knowledge Sources",
      filled: sources.length > 0,
      required: false,
      detail: sources.length > 0
        ? `${sources.length} source${sources.length > 1 ? "s" : ""}: ${truncateList(sources.map((s) => s.name))}`
        : undefined,
    },
    {
      key: "constraints",
      label: "Constraints",
      filled: domains.length > 0 || denied.length > 0,
      required: false,
      detail:
        domains.length > 0 || denied.length > 0
          ? [
              domains.length > 0 && `${domains.length} domain${domains.length > 1 ? "s" : ""}`,
              denied.length > 0 && `${denied.length} denied action${denied.length > 1 ? "s" : ""}`,
            ]
              .filter(Boolean)
              .join(" · ")
          : undefined,
    },
    {
      key: "governance",
      label: "Governance Policies",
      filled: policies.length > 0,
      required: false,
      detail: policies.length > 0
        ? `${policies.length} polic${policies.length > 1 ? "ies" : "y"}: ${truncateList(policies.map((p) => p.name))}`
        : undefined,
    },
    {
      key: "audit",
      label: "Audit Configuration",
      filled: governance?.audit !== undefined,
      required: false,
      detail: governance?.audit
        ? [
            governance.audit.log_interactions !== undefined &&
              `Logging ${governance.audit.log_interactions ? "on" : "off"}`,
            governance.audit.retention_days !== undefined &&
              `${governance.audit.retention_days}-day retention`,
          ]
            .filter(Boolean)
            .join(" · ") || "Configured"
        : undefined,
    },
  ];
}

interface IntakeProgressProps {
  sessionId: string;
  refreshTick: number;
  contributions?: StakeholderContribution[];
  onContributionAdded?: (contribution: StakeholderContribution) => void;
  context?: IntakeContext;
  riskTier?: IntakeRiskTier | null;
}

export function IntakeProgress({ sessionId, refreshTick, contributions = [], onContributionAdded, context, riskTier }: IntakeProgressProps) {
  const [sections, setSections] = useState<Section[]>(getSections({}));
  const [agentName, setAgentName] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchPayload() {
      try {
        const res = await fetch(`/api/intake/sessions/${sessionId}/payload`);
        if (!res.ok || cancelled) return;
        const payload = (await res.json()) as IntakePayload;
        if (!cancelled) {
          setSections(getSections(payload));
          setAgentName(payload.identity?.name ?? null);
        }
      } catch {
        // Silently ignore — sidebar is non-critical
      }
    }

    fetchPayload();
    return () => { cancelled = true; };
  }, [sessionId, refreshTick]);

  const filled = sections.filter((s) => s.filled).length;
  const requiredFilled = sections.filter((s) => s.required && s.filled).length;
  const requiredTotal = sections.filter((s) => s.required).length;
  const pct = Math.round((filled / sections.length) * 100);

  return (
    <aside className="w-72 shrink-0 border-l border-gray-200 bg-white p-5 flex flex-col gap-4 overflow-y-auto">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
          Blueprint Progress
        </h2>
        {agentName && (
          <p className="text-sm font-medium text-gray-900 truncate">{agentName}</p>
        )}
      </div>

      <div>
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>{filled} of {sections.length} sections</span>
          <span>{pct}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <ul className="flex flex-col gap-2">
        {sections.map((section) => (
          <li key={section.key} className="flex items-start gap-2.5">
            <span
              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                section.filled
                  ? "bg-blue-500 text-white"
                  : section.required
                  ? "border-2 border-gray-300 text-gray-300"
                  : "border border-gray-200 text-gray-200"
              }`}
            >
              {section.filled ? "✓" : ""}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span
                  className={`text-sm ${
                    section.filled
                      ? "text-gray-900"
                      : section.required
                      ? "text-gray-500"
                      : "text-gray-400"
                  }`}
                >
                  {section.label}
                </span>
                {section.required && !section.filled && (
                  <span className="text-[10px] text-red-400">required</span>
                )}
              </div>
              {section.detail && (
                <p className="text-xs text-gray-400 truncate mt-0.5" title={section.detail}>
                  {section.detail}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>

      <div
        className={`mt-auto rounded-lg px-3 py-2 text-xs text-center ${
          requiredFilled === requiredTotal
            ? "bg-green-50 text-green-700"
            : "bg-gray-50 text-gray-500"
        }`}
      >
        {requiredFilled === requiredTotal
          ? "Ready to finalize"
          : `${requiredTotal - requiredFilled} required section${requiredTotal - requiredFilled === 1 ? "" : "s"} remaining`}
      </div>

      {/* Stakeholder contributions panel */}
      {onContributionAdded && (
        <StakeholderContributionsPanel
          sessionId={sessionId}
          contributions={contributions}
          onContributionAdded={onContributionAdded}
          context={context}
          riskTier={riskTier}
        />
      )}
    </aside>
  );
}

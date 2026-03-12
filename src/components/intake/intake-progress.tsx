"use client";

import { useEffect, useState } from "react";
import { IntakePayload } from "@/lib/types/intake";

interface Section {
  key: string;
  label: string;
  filled: boolean;
  required: boolean;
}

function getSections(payload: IntakePayload): Section[] {
  return [
    {
      key: "identity",
      label: "Agent Identity",
      filled: !!(payload.identity?.name && payload.identity?.description),
      required: true,
    },
    {
      key: "capabilities",
      label: "Tools & Capabilities",
      filled: (payload.capabilities?.tools?.length ?? 0) > 0,
      required: true,
    },
    {
      key: "instructions",
      label: "Behavioral Instructions",
      filled: !!payload.capabilities?.instructions,
      required: false,
    },
    {
      key: "knowledge",
      label: "Knowledge Sources",
      filled: (payload.capabilities?.knowledge_sources?.length ?? 0) > 0,
      required: false,
    },
    {
      key: "constraints",
      label: "Constraints",
      filled:
        (payload.constraints?.allowed_domains?.length ?? 0) > 0 ||
        (payload.constraints?.denied_actions?.length ?? 0) > 0,
      required: false,
    },
    {
      key: "governance",
      label: "Governance Policies",
      filled: (payload.governance?.policies?.length ?? 0) > 0,
      required: false,
    },
    {
      key: "audit",
      label: "Audit Configuration",
      filled: payload.governance?.audit !== undefined,
      required: false,
    },
  ];
}

interface IntakeProgressProps {
  sessionId: string;
  /** Trigger a re-fetch (increment to refresh) */
  refreshTick: number;
}

export function IntakeProgress({ sessionId, refreshTick }: IntakeProgressProps) {
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
    <aside className="w-64 shrink-0 border-l border-gray-200 bg-white p-5 flex flex-col gap-4">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
          Blueprint Progress
        </h2>
        {agentName && (
          <p className="text-sm font-medium text-gray-900 truncate">{agentName}</p>
        )}
      </div>

      {/* Progress bar */}
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

      {/* Section checklist */}
      <ul className="flex flex-col gap-1.5">
        {sections.map((section) => (
          <li key={section.key} className="flex items-center gap-2 text-sm">
            <span
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                section.filled
                  ? "bg-blue-500 text-white"
                  : section.required
                  ? "border-2 border-gray-300 text-gray-300"
                  : "border border-gray-200 text-gray-200"
              }`}
            >
              {section.filled ? "✓" : ""}
            </span>
            <span
              className={
                section.filled
                  ? "text-gray-900"
                  : section.required
                  ? "text-gray-500"
                  : "text-gray-400"
              }
            >
              {section.label}
              {section.required && !section.filled && (
                <span className="ml-1 text-[10px] text-red-400">required</span>
              )}
            </span>
          </li>
        ))}
      </ul>

      {/* Readiness indicator */}
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
    </aside>
  );
}

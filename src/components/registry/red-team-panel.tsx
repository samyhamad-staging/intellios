"use client";

import { useState } from "react";
import { ShieldAlert, ShieldCheck, AlertTriangle, Play, RefreshCw } from "lucide-react";
import type { RedTeamReport, Attack } from "@/lib/types/red-team";
import { ATTACK_CATEGORY_LABELS } from "@/lib/types/red-team";

// ─── Risk tier badge ──────────────────────────────────────────────────────────

const TIER_STYLES: Record<RedTeamReport["riskTier"], string> = {
  LOW: "bg-green-100 text-green-800",
  MEDIUM: "bg-amber-100 text-amber-800",
  HIGH: "bg-orange-100 text-orange-800",
  CRITICAL: "bg-red-100 text-red-800",
};

function RiskBadge({ tier }: { tier: RedTeamReport["riskTier"] }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${TIER_STYLES[tier]}`}>
      {tier}
    </span>
  );
}

// ─── Attack row ───────────────────────────────────────────────────────────────

function AttackRow({ attack }: { attack: Attack }) {
  const [open, setOpen] = useState(false);
  const passed = attack.verdict === "PASS";

  return (
    <div className="border border-gray-100 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        {passed ? (
          <ShieldCheck className="h-4 w-4 shrink-0 text-green-500" />
        ) : (
          <ShieldAlert className="h-4 w-4 shrink-0 text-red-500" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-400">
              {ATTACK_CATEGORY_LABELS[attack.category]}
            </span>
            <span className={`text-xs font-semibold ${passed ? "text-green-600" : "text-red-600"}`}>
              {attack.verdict}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-gray-700 truncate">{attack.prompt}</p>
        </div>
        <span className="text-gray-300 text-xs">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 bg-gray-50 border-t border-gray-100 space-y-2">
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">Attack prompt</p>
            <p className="text-sm text-gray-700 leading-relaxed">{attack.prompt}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">Evaluator verdict</p>
            <p className="text-sm text-gray-600 leading-relaxed">{attack.explanation}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Score ring ───────────────────────────────────────────────────────────────

function ScoreRing({ score, total = 10 }: { score: number; total?: number }) {
  const pct = score / total;
  const color =
    pct >= 0.9 ? "#22c55e" : pct >= 0.7 ? "#f59e0b" : pct >= 0.5 ? "#f97316" : "#ef4444";
  const r = 28;
  const circ = 2 * Math.PI * r;
  const dash = pct * circ;

  return (
    <div className="relative flex items-center justify-center w-20 h-20">
      <svg width="80" height="80" className="-rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" stroke="#f3f4f6" strokeWidth="6" />
        <circle
          cx="40" cy="40" r={r}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-gray-900">{score}</span>
        <span className="text-xs text-gray-400">/{total}</span>
      </div>
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

interface RedTeamPanelProps {
  blueprintId: string;
  agentName: string;
  version: string;
}

export function RedTeamPanel({ blueprintId, agentName, version }: RedTeamPanelProps) {
  const [report, setReport] = useState<RedTeamReport | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runTest() {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch(`/api/blueprints/${blueprintId}/simulate/red-team`, {
        method: "POST",
      });
      if (!res.ok) {
        const json = (await res.json()) as { message?: string };
        throw new Error(json.message ?? `Error ${res.status}`);
      }
      const data = (await res.json()) as RedTeamReport;
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Red-team run failed.");
    } finally {
      setRunning(false);
    }
  }

  // Empty state
  if (!report && !running) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-50">
          <ShieldAlert className="h-7 w-7 text-orange-500" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Adversarial Red-Team</h3>
          <p className="mt-1 text-sm text-gray-500 max-w-xs">
            Generate 10 tailored attack prompts and evaluate how well{" "}
            <span className="font-medium">{agentName}</span> resists them.
          </p>
          <p className="mt-1 text-xs text-gray-400">Takes ~20–30 seconds.</p>
        </div>
        <button
          onClick={runTest}
          className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
        >
          <Play className="h-3.5 w-3.5" />
          Run Red-Team
        </button>
        {error && (
          <p className="text-sm text-red-600 max-w-xs">{error}</p>
        )}
      </div>
    );
  }

  // Loading state
  if (running) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-50">
          <RefreshCw className="h-7 w-7 text-orange-500 animate-spin" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Running red-team evaluation…</h3>
          <p className="mt-1 text-sm text-gray-500">
            Generating attack prompts and evaluating responses in parallel.
          </p>
          <p className="mt-1 text-xs text-gray-400">This usually takes 20–30 seconds.</p>
        </div>
      </div>
    );
  }

  if (!report) return null;

  const passed = report.attacks.filter((a) => a.verdict === "PASS").length;
  const failed = report.attacks.filter((a) => a.verdict === "FAIL").length;

  return (
    <div className="space-y-6">
      {/* Summary header */}
      <div className="flex items-center gap-5 rounded-xl border border-gray-200 bg-white p-5">
        <ScoreRing score={report.score} />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-gray-900">
              {agentName} v{version}
            </h3>
            <RiskBadge tier={report.riskTier} />
          </div>
          <p className="text-sm text-gray-500">
            Resisted {passed} of {report.attacks.length} attacks
            {failed > 0 && (
              <span className="ml-1 text-red-500 font-medium">
                ({failed} failure{failed !== 1 ? "s" : ""})
              </span>
            )}
          </p>
          <p className="mt-0.5 text-xs text-gray-400">
            Run at {new Date(report.runAt).toLocaleString()}
          </p>
        </div>
        <button
          onClick={runTest}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Re-run
        </button>
      </div>

      {/* Risk guidance */}
      {report.riskTier === "CRITICAL" || report.riskTier === "HIGH" ? (
        <div className="flex items-start gap-3 rounded-xl border border-orange-200 bg-orange-50 p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
          <p className="text-sm text-orange-800">
            <span className="font-semibold">{report.riskTier} risk — </span>
            {report.riskTier === "CRITICAL"
              ? "This agent failed 6 or more attacks. Review failures and strengthen constraints before production deployment."
              : "This agent failed 4–5 attacks. Address the failures below before promoting to deployed status."}
          </p>
        </div>
      ) : null}

      {/* Attack list */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          Attack Results
        </h4>
        {report.attacks.map((attack) => (
          <AttackRow key={attack.id} attack={attack} />
        ))}
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}

"use client";

import { useState, useCallback, useEffect } from "react";
import { ShieldAlert, ShieldCheck, AlertTriangle, Play, RefreshCw, Download } from "lucide-react";
import type { RedTeamReport, Attack } from "@/lib/types/red-team";
import { ATTACK_CATEGORY_LABELS } from "@/lib/types/red-team";
import { SectionHeading } from "@/components/ui/section-heading";

// ─── Risk tier badge ──────────────────────────────────────────────────────────

const TIER_STYLES: Record<RedTeamReport["riskTier"], string> = {
  LOW: "bg-green-100 dark:bg-emerald-900/40 text-green-800 dark:text-emerald-200",
  MEDIUM: "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200",
  HIGH: "bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-200",
  CRITICAL: "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200",
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
    <div className="border border-border-subtle rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-raised transition-colors"
      >
        {passed ? (
          <ShieldCheck className="h-4 w-4 shrink-0 text-green-500" />
        ) : (
          <ShieldAlert className="h-4 w-4 shrink-0 text-red-500 dark:text-red-400" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-text-tertiary">
              {ATTACK_CATEGORY_LABELS[attack.category]}
            </span>
            <span className={`text-xs font-semibold ${passed ? "text-green-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
              {attack.verdict}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-text truncate">{attack.prompt}</p>
        </div>
        <span className="text-text-disabled text-xs">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 bg-surface-raised border-t border-border-subtle space-y-2">
          <div>
            <p className="text-xs font-medium text-text-secondary mb-1">Attack prompt</p>
            <p className="text-sm text-text leading-relaxed">{attack.prompt}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-text-secondary mb-1">Evaluator verdict</p>
            <p className="text-sm text-text-secondary leading-relaxed">{attack.explanation}</p>
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
        <circle cx="40" cy="40" r={r} fill="none" stroke="#d1d5db" strokeWidth="6" />
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
        <span className="text-xl font-bold text-text">{score}</span>
        <span className="text-xs text-text-tertiary">/{total}</span>
      </div>
    </div>
  );
}

// ─── P2-240: Run history types ────────────────────────────────────────────────

interface RunHistoryEntry {
  version: string;
  riskTier: RedTeamReport["riskTier"];
  score: number;
  total: number;
  runAt: string;
}

const RISK_TIER_COLORS: Record<RedTeamReport["riskTier"], string> = {
  LOW: "bg-green-100 dark:bg-emerald-900/40 text-green-800 dark:text-emerald-200 border-green-200 dark:border-emerald-800",
  MEDIUM: "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-800",
  HIGH: "bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-200 border-orange-200 dark:border-orange-800",
  CRITICAL: "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800",
};

function useRunHistory(blueprintId: string) {
  const KEY = `redteam-history-${blueprintId}`;
  const [history, setHistory] = useState<RunHistoryEntry[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as RunHistoryEntry[]) : [];
    } catch { return []; }
  });

  function recordRun(entry: RunHistoryEntry) {
    setHistory((prev) => {
      // De-dupe by version — keep latest run per version, newest first
      const filtered = prev.filter((h) => h.version !== entry.version);
      const next = [entry, ...filtered].slice(0, 5);
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* quota */ }
      return next;
    });
  }

  return { history, recordRun };
}

// ─── P2-276: Cross-version comparison strip ──────────────────────────────────

interface ComparisonStripProps {
  current: { version: string; score: number; total: number; riskTier: RedTeamReport["riskTier"] };
  previous: RunHistoryEntry;
}

function ComparisonStrip({ current, previous }: ComparisonStripProps) {
  const scoreDiff = current.score - previous.score;
  const improved = scoreDiff > 0;
  const same = scoreDiff === 0;

  const TIER_ORDER: Record<RedTeamReport["riskTier"], number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  const tierImproved = TIER_ORDER[current.riskTier] > TIER_ORDER[previous.riskTier];
  const tierSame = current.riskTier === previous.riskTier;

  return (
    <div className="rounded-lg border border-border bg-surface-raised px-4 py-3">
      <SectionHeading className="mb-2">
        Version Comparison
      </SectionHeading>
      <div className="flex items-center gap-3 flex-wrap">
        {/* Previous */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-text-secondary">v{previous.version}</span>
          <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${TIER_STYLES[previous.riskTier]}`}>
            {previous.riskTier}
          </span>
          <span className="text-xs text-text-secondary">{previous.score}/{previous.total}</span>
        </div>

        {/* Arrow */}
        <span className="text-text-disabled text-sm">→</span>

        {/* Current */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-text">v{current.version}</span>
          <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${TIER_STYLES[current.riskTier]}`}>
            {current.riskTier}
          </span>
          <span className="text-xs font-medium text-text-secondary">{current.score}/{current.total}</span>
        </div>

        {/* Delta */}
        {!same && (
          <span className={`text-xs font-semibold ${improved ? "text-green-600 dark:text-emerald-400" : "text-red-500"}`}>
            {improved ? `↑ +${scoreDiff}` : `↓ ${scoreDiff}`} attacks resisted
          </span>
        )}
        {!tierSame && (
          <span className={`text-xs font-medium ${tierImproved ? "text-green-600 dark:text-emerald-400" : "text-orange-600 dark:text-orange-400"}`}>
            · risk {tierImproved ? "improved" : "increased"}
          </span>
        )}
        {same && tierSame && (
          <span className="text-xs text-text-tertiary">· no change</span>
        )}
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

// P1-275: Total attack count is fixed at 10; estimated runtime is 25s.
// Since the API runs all attacks in parallel we simulate per-attack progress
// with a time-bucketed ticker (fires every 2.5s) so architects see
// "Running attack N of 10 · ~Xs remaining" instead of a blank spinner.
const TOTAL_ATTACKS = 10;
const ESTIMATED_SECONDS = 25;
const TICK_MS = (ESTIMATED_SECONDS / TOTAL_ATTACKS) * 1_000; // 2 500 ms

export function RedTeamPanel({ blueprintId, agentName, version }: RedTeamPanelProps) {
  const [report, setReport] = useState<RedTeamReport | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // P2-240: Run history
  const { history, recordRun } = useRunHistory(blueprintId);

  // P1-275: Simulated per-attack progress counter
  const [runProgress, setRunProgress] = useState(0);
  useEffect(() => {
    if (!running) {
      setRunProgress(0);
      return;
    }
    const id = setInterval(() => {
      setRunProgress((p) => Math.min(p + 1, TOTAL_ATTACKS - 1));
    }, TICK_MS);
    return () => clearInterval(id);
  }, [running]);

  const handleExport = useCallback(() => {
    if (!report) return;
    const payload = {
      agentName,
      version,
      exportedAt: new Date().toISOString(),
      report,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safeName = agentName.replace(/\s+/g, "-").toLowerCase();
    a.download = `red-team-report-${safeName}-v${version}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [report, agentName, version]);

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
      // P2-240: Persist this run to history
      recordRun({
        version,
        riskTier: data.riskTier,
        score: data.score,
        total: data.attacks.length,
        runAt: data.runAt,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Red-team run failed.");
    } finally {
      setRunning(false);
    }
  }

  // Empty state
  if (!report && !running) {
    return (
      <div className="space-y-5">
        {/* P2-240: Run history strip — shown when prior runs exist */}
        {history.length > 0 && (
          <div className="rounded-lg border border-border bg-surface-raised px-4 py-3">
            <SectionHeading className="mb-2">
              Run history
            </SectionHeading>
            <div className="flex items-center gap-2 flex-wrap">
              {history.map((h) => (
                <div
                  key={h.runAt}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${RISK_TIER_COLORS[h.riskTier]}`}
                  title={`Run at ${new Date(h.runAt).toLocaleString()}`}
                >
                  <span>v{h.version}</span>
                  <span className="opacity-60">·</span>
                  <span>{h.riskTier}</span>
                  <span className="opacity-60">·</span>
                  <span>{h.score}/{h.total}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-50 dark:bg-orange-950/30">
            <ShieldAlert className="h-7 w-7 text-orange-500 dark:text-orange-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text">Adversarial Red-Team</h3>
            <p className="mt-1 text-sm text-text-secondary max-w-xs">
              Generate 10 tailored attack prompts and evaluate how well{" "}
              <span className="font-medium">{agentName}</span> resists them.
            </p>
            <p className="mt-1 text-xs text-text-tertiary">Takes ~20–30 seconds.</p>
          </div>
          <button
            onClick={runTest}
            className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
          >
            <Play className="h-3.5 w-3.5" />
            {history.some((h) => h.version === version) ? "Re-run" : "Run Red-Team"}
          </button>
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 max-w-xs">{error}</p>
          )}
        </div>
      </div>
    );
  }

  // P1-275: Loading state with live per-attack progress
  if (running) {
    const displayAttack = runProgress + 1; // 1-indexed for display
    const elapsedSec = runProgress * (ESTIMATED_SECONDS / TOTAL_ATTACKS);
    const remainingSec = Math.max(1, Math.round(ESTIMATED_SECONDS - elapsedSec));
    const progressPct = (runProgress / TOTAL_ATTACKS) * 100;

    return (
      <div className="flex flex-col items-center justify-center h-96 gap-5 text-center px-6">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-50 dark:bg-orange-950/30">
          <RefreshCw className="h-7 w-7 text-orange-500 dark:text-orange-400 animate-spin" />
        </div>
        <div className="w-full max-w-xs">
          <h3 className="text-sm font-semibold text-text">Running red-team evaluation…</h3>
          {/* Live progress label */}
          <p className="mt-2 text-sm font-medium text-orange-600 dark:text-orange-400 tabular-nums">
            Running attack {displayAttack} of {TOTAL_ATTACKS}
            <span className="text-text-tertiary font-normal"> · ~{remainingSec}s remaining</span>
          </p>
          {/* Progress bar */}
          <div className="mt-3 h-1.5 w-full rounded-full bg-orange-100 dark:bg-orange-900/40 overflow-hidden">
            <div
              className="h-full rounded-full bg-orange-400 transition-all duration-[2400ms] ease-linear"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          {/* Attack index pips */}
          <div className="mt-3 flex items-center justify-center gap-1">
            {Array.from({ length: TOTAL_ATTACKS }).map((_, i) => (
              <span
                key={i}
                className={`inline-block h-1.5 w-1.5 rounded-full transition-colors ${
                  i < runProgress
                    ? "bg-orange-400"
                    : i === runProgress
                    ? "bg-orange-500 scale-125"
                    : "bg-text-disabled"
                }`}
              />
            ))}
          </div>
          <p className="mt-3 text-xs text-text-tertiary">
            Attacks run in parallel — evaluating responses with Claude
          </p>
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
      <div className="flex items-center gap-5 rounded-xl border border-border bg-surface p-5">
        <ScoreRing score={report.score} />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-text">
              {agentName} v{version}
            </h3>
            <RiskBadge tier={report.riskTier} />
          </div>
          <p className="text-sm text-text-secondary">
            Resisted {passed} of {report.attacks.length} attacks
            {failed > 0 && (
              <span className="ml-1 text-red-500 dark:text-red-400 font-medium">
                ({failed} failure{failed !== 1 ? "s" : ""})
              </span>
            )}
          </p>
          <p className="mt-0.5 text-xs text-text-tertiary">
            Run at {new Date(report.runAt).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-text-secondary hover:bg-surface-raised transition-colors"
            title="Download red team report as JSON" aria-label="Download red team report as JSON"
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </button>
          <button
            onClick={runTest}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-text-secondary hover:bg-surface-raised transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Re-run
          </button>
        </div>
      </div>

      {/* P2-276: Cross-version comparison strip — shown when a prior version's run exists */}
      {history.length > 0 && history[0].version !== version && (
        <ComparisonStrip
          current={{ version, score: report.score, total: report.attacks.length, riskTier: report.riskTier }}
          previous={history[0]}
        />
      )}

      {/* Risk guidance */}
      {report.riskTier === "CRITICAL" || report.riskTier === "HIGH" ? (
        <div className="flex items-start gap-3 rounded-xl border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/30 p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange-600 dark:text-orange-400" />
          <p className="text-sm text-orange-800 dark:text-orange-200">
            <span className="font-semibold">{report.riskTier} risk — </span>
            {report.riskTier === "CRITICAL"
              ? "This agent failed 6 or more attacks. Review failures and strengthen constraints before production deployment."
              : "This agent failed 4–5 attacks. Address the failures below before promoting to deployed status."}
          </p>
        </div>
      ) : null}

      {/* Attack list */}
      <div className="space-y-2">
        <SectionHeading>
          Attack Results
        </SectionHeading>
        {report.attacks.map((attack) => (
          <AttackRow key={attack.id} attack={attack} />
        ))}
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 dark:bg-red-950/30 px-3 py-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}

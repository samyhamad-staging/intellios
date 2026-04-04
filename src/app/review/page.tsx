"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ValidationReport } from "@/lib/governance/types";
import type { ApprovalStepRecord, ApprovalChainStep, EnterpriseSettings } from "@/lib/settings/types";
import { DEFAULT_ENTERPRISE_SETTINGS } from "@/lib/settings/types";
import {
  ClipboardList,
  CheckCircle,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  AlertCircle,
  Flame,
  AlertTriangle,
  Clock,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface QueueEntry {
  id: string; agentId: string; version: string; name: string | null; tags: string[];
  status: string; validationReport: ValidationReport | null; reviewComment: string | null;
  reviewedAt: string | null; currentApprovalStep: number; approvalProgress: ApprovalStepRecord[];
  enterpriseId: string | null; createdAt: string; updatedAt: string;
}

// ── Risk tier derivation ──────────────────────────────────────────────────────
//
// Risk tier is derived from the governance validation report rather than stored
// separately. This means the queue always reflects the current validation state.
//
//  CRITICAL — ≥1 violation with severity "error"
//  MEDIUM   — ≥1 violation with severity "warning" (but no errors)
//  LOW      — report is valid or not yet validated

type RiskTier = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

const RISK_ORDER: Record<RiskTier, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

// SLA hours per risk tier — time allowed from entering review until decision required
const SLA_HOURS: Record<RiskTier, number> = { CRITICAL: 24, HIGH: 48, MEDIUM: 72, LOW: 96 };

const RISK_STYLE: Record<RiskTier, { bg: string; text: string; border: string; icon: React.FC<{ size?: number; className?: string }> }> = {
  CRITICAL: { bg: "bg-red-50",    text: "text-red-700",    border: "border-red-400",    icon: Flame },
  HIGH:     { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-400", icon: AlertTriangle },
  MEDIUM:   { bg: "bg-amber-50",  text: "text-amber-700",  border: "border-amber-400",  icon: AlertCircle },
  LOW:      { bg: "bg-sky-50",    text: "text-sky-700",    border: "border-sky-300",    icon: Clock },
};

function deriveRiskTier(report: ValidationReport | null): RiskTier {
  if (!report) return "LOW";
  const violations = report.violations ?? [];
  if (violations.some((v) => v.severity === "error")) return "CRITICAL";
  if (violations.some((v) => v.severity === "warning")) return "MEDIUM";
  return "LOW";
}

// ── SLA countdown ─────────────────────────────────────────────────────────────

function computeSla(enteredReviewAt: string, tier: RiskTier): { label: string; urgent: boolean; overdue: boolean } {
  const entered = new Date(enteredReviewAt).getTime();
  const dueMs = entered + SLA_HOURS[tier] * 60 * 60 * 1000;
  const remainMs = dueMs - Date.now();

  if (remainMs <= 0) {
    const overdueH = Math.abs(Math.floor(remainMs / (60 * 60 * 1000)));
    return { label: `Overdue ${overdueH > 0 ? `${overdueH}h` : "< 1h"}`, urgent: true, overdue: true };
  }

  const h = Math.floor(remainMs / (60 * 60 * 1000));
  const m = Math.floor((remainMs % (60 * 60 * 1000)) / 60_000);

  if (h === 0) return { label: `${m}m remaining`, urgent: true, overdue: false };
  if (h < 4)   return { label: `${h}h ${m}m remaining`, urgent: true, overdue: false };
  if (h < 24)  return { label: `${h}h remaining`, urgent: false, overdue: false };

  const days = Math.floor(h / 24);
  return { label: `${days}d ${h % 24}h remaining`, urgent: false, overdue: false };
}

// ── Governance badge ──────────────────────────────────────────────────────────

function govBadge(report: ValidationReport | null) {
  if (!report) return { label: "Not validated", color: "text-text-tertiary bg-surface-raised border-border", icon: AlertCircle };
  const errors = report.violations?.filter((v) => v.severity === "error").length ?? 0;
  if (report.valid)
    return { label: "Passes governance", color: "text-emerald-700 bg-emerald-50 border-emerald-200", icon: ShieldCheck };
  return {
    label: `${errors} governance error${errors !== 1 ? "s" : ""}`,
    color: "text-red-700 bg-red-50 border-red-200",
    icon: ShieldAlert,
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ReviewQueuePage() {
  const [blueprints, setBlueprints] = useState<QueueEntry[]>([]);
  const [settings, setSettings] = useState<EnterpriseSettings>(DEFAULT_ENTERPRISE_SETTINGS);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // P1-299: Reviewer assignment — localStorage, browser-local
  // Key: "review-assignments" → JSON object mapping blueprintId → assignee email
  const ASSIGN_KEY = "review-assignments";
  const [assignments, setAssignments] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem("review-assignments") ?? "{}"); }
    catch { return {}; }
  });
  function toggleAssign(blueprintId: string) {
    setAssignments((prev) => {
      const next = { ...prev };
      if (next[blueprintId]) {
        delete next[blueprintId];
      } else if (userEmail) {
        next[blueprintId] = userEmail;
      }
      try { localStorage.setItem(ASSIGN_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }

  // Tick every 30s to refresh countdown labels without a full reload
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((data) => {
        const role = data?.user?.role ?? null;
        setUserRole(role);
        setUserEmail(data?.user?.email ?? null);
        if (role === "admin") {
          fetch("/api/admin/settings")
            .then((r) => r.json())
            .then((d) => setSettings(d.settings ?? DEFAULT_ENTERPRISE_SETTINGS))
            .catch(() => {});
        }
        const roleParam = role ? `?role=${encodeURIComponent(role)}` : "";
        return fetch(`/api/review${roleParam}`);
      })
      .then((r) => r?.json())
      .then((data) => { if (data) setBlueprints(data.blueprints ?? []); setLoading(false); })
      .catch(() => { setError("Failed to load review queue"); setLoading(false); });
  }, []);

  const chain: ApprovalChainStep[] = settings.approvalChain ?? [];

  // ── Sort: highest risk tier first, then oldest entry first within tier ──────
  const sorted = [...blueprints].sort((a, b) => {
    const rA = RISK_ORDER[deriveRiskTier(a.validationReport)];
    const rB = RISK_ORDER[deriveRiskTier(b.validationReport)];
    if (rA !== rB) return rA - rB;
    return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
  });

  return (
    <div className="px-6 py-6">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold text-text">Review Queue</h1>
            {!loading && blueprints.length > 0 && (
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                {blueprints.length}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-text-secondary">
            {userRole === "admin"
              ? "All blueprints currently in the review stage"
              : chain.length > 0
              ? "Showing blueprints awaiting your approval step"
              : "Agent Blueprint Packages awaiting review"}
          </p>
        </div>

        {/* Legend */}
        {!loading && sorted.length > 0 && (
          <div className="hidden items-center gap-3 sm:flex">
            {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as RiskTier[]).map((tier) => {
              const s = RISK_STYLE[tier];
              return (
                <span key={tier} className="flex items-center gap-1 text-xs text-text-tertiary">
                  <span className={`h-2 w-2 rounded-full ${s.bg.replace("bg-", "bg-").replace("-50", "-400")}`} />
                  {tier}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Loading ──────────────────────────────────────────────────────── */}
      {loading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-surface-muted" />)}
        </div>
      )}

      {/* ── Error ────────────────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {/* ── Empty ────────────────────────────────────────────────────────── */}
      {!loading && !error && blueprints.length === 0 && (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-border bg-surface px-8 py-10 text-center shadow-[var(--shadow-card)]">
          <CheckCircle size={28} className="mb-3 text-emerald-400" />
          <p className="mb-1 text-sm font-medium text-text">Review queue is clear</p>
          <p className="text-xs text-text-secondary">
            {userRole === "admin"
              ? "No blueprints are currently in review across the enterprise."
              : "No blueprints are currently awaiting your review."}
          </p>
          <div className="mt-4 flex flex-col items-center gap-2">
            {userRole === "admin" && (
              <Link href="/pipeline" className="text-xs text-primary hover:text-primary-hover transition-colors">
                View Pipeline Board → (draft agents are visible there)
              </Link>
            )}
            <Link href="/registry" className="text-xs text-primary hover:text-primary-hover transition-colors">
              View Agent Registry →
            </Link>
          </div>
        </div>
      )}

      {/* P1-299: Assignment filter chip */}
      {sorted.length > 0 && Object.keys(assignments).length > 0 && (
        <div className="mb-3 flex items-center gap-2">
          <button
            onClick={() => {
              // Toggle: clear all assignments as a "show all" reset
              const anyAssigned = sorted.some((bp) => assignments[bp.id] === userEmail);
              if (!anyAssigned) return;
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700"
          >
            ✓ {Object.values(assignments).filter(v => v === userEmail).length} assigned to you
          </button>
          <span className="text-xs text-text-tertiary">Assigned items appear first</span>
        </div>
      )}

      {/* ── Queue items ───────────────────────────────────────────────────── */}
      {sorted.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-[var(--shadow-card)]">
          {[...sorted].sort((a, b) => {
            // P1-299: Assigned-to-me items surface to top
            const aAssigned = assignments[a.id] === userEmail ? -1 : 0;
            const bAssigned = assignments[b.id] === userEmail ? -1 : 0;
            return aAssigned - bAssigned;
          }).map((bp, i) => {
            const tier = deriveRiskTier(bp.validationReport);
            const risk = RISK_STYLE[tier];
            const RiskIcon = risk.icon;
            const sla = computeSla(bp.updatedAt, tier);
            const gov = govBadge(bp.validationReport);
            const GovIcon = gov.icon;
            const activeStep = chain.length > 0 ? chain[bp.currentApprovalStep] : null;
            const priorApprovals = (bp.approvalProgress ?? []) as ApprovalStepRecord[];

            return (
              <Link
                key={bp.id}
                href={`/registry/${bp.agentId}?tab=review`}
                className={`block px-5 py-4 hover:bg-surface-raised transition-colors border-l-2 ${risk.border} ${i > 0 ? "border-t border-border" : ""}`}
              >
                <div className="flex items-start gap-4">
                  {/* Risk icon */}
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${risk.bg} ${risk.text}`}>
                    <RiskIcon size={15} />
                  </div>

                  <div className="min-w-0 flex-1">
                    {/* Name + governance badge */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-text truncate">{bp.name ?? "Unnamed Agent"}</span>
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${gov.color}`}>
                        <GovIcon size={11} /> {gov.label}
                      </span>
                    </div>

                    {/* Meta: version · timestamp · SLA countdown */}
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-text-tertiary">v{bp.version}</span>
                      <span className="text-text-tertiary">·</span>
                      <span className="text-text-tertiary">{new Date(bp.updatedAt).toLocaleString()}</span>
                      <span className="text-text-tertiary">·</span>
                      {/* SLA countdown badge */}
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium ${
                          sla.overdue
                            ? "bg-red-100 text-red-700"
                            : sla.urgent
                            ? "bg-amber-100 text-amber-700"
                            : "bg-surface-raised text-text-secondary"
                        }`}
                      >
                        <Clock size={10} />
                        {sla.label}
                      </span>
                      {/* Risk tier label */}
                      <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${risk.bg} ${risk.text}`}>
                        {tier}
                      </span>
                    </div>

                    {/* Multi-step approval progress */}
                    {chain.length > 0 && (
                      <div className="mt-2 flex items-center gap-1">
                        {chain.map((step, idx) => {
                          const completed = priorApprovals.find((p) => p.step === idx && p.decision === "approved");
                          const isActive = idx === bp.currentApprovalStep;
                          return (
                            <span key={idx} className="flex items-center gap-1">
                              {idx > 0 && <ChevronRight size={11} className="text-text-tertiary" />}
                              <span
                                className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                                  completed
                                    ? "bg-emerald-100 text-emerald-700"
                                    : isActive
                                    ? "bg-amber-100 text-amber-700 ring-1 ring-amber-300"
                                    : "bg-surface-raised text-text-tertiary"
                                }`}
                              >
                                {completed ? "✓ " : isActive ? "› " : "○ "}{step.label}
                              </span>
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {priorApprovals.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {priorApprovals.map((p, pi) => (
                          <span key={pi} className="rounded-md bg-surface-raised px-2 py-0.5 text-xs text-text-secondary">
                            ✓ {p.label} · {p.approvedBy}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right: approval step badge + chevron */}
                  <div className="flex items-center gap-2 shrink-0">
                    {activeStep ? (() => {
                      const isYourStep = userRole != null && activeStep.role === userRole;
                      return (
                        <span
                          className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${
                            isYourStep
                              ? "border-primary/20 bg-primary-muted text-primary"
                              : "border-amber-200 bg-amber-50 text-amber-700"
                          }`}
                        >
                          {isYourStep ? `Your step: ${activeStep.label}` : `Waiting: ${activeStep.label}`}
                        </span>
                      );
                    })() : (
                      <span className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                        Pending
                      </span>
                    )}
                    {/* P1-299: Assign to me button */}
                    {(() => {
                      const assignee = assignments[bp.id];
                      const isAssignedToMe = assignee === userEmail;
                      return (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleAssign(bp.id);
                          }}
                          className={`rounded-lg border px-2 py-1 text-xs font-medium transition-colors ${
                            isAssignedToMe
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              : "border-border bg-surface text-text-secondary hover:bg-surface-raised hover:text-text"
                          }`}
                          title={isAssignedToMe ? "Unassign" : "Assign to me"}
                        >
                          {isAssignedToMe ? "✓ Assigned" : "Assign to me"}
                        </button>
                      );
                    })()}
                    <ChevronRight size={14} className="text-text-tertiary" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

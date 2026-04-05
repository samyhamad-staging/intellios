"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import Link from "next/link";
import { ValidationReport } from "@/lib/governance/types";
import type { ApprovalStepRecord, ApprovalChainStep, EnterpriseSettings } from "@/lib/settings/types";
import { DEFAULT_ENTERPRISE_SETTINGS } from "@/lib/settings/types";
import { Heading, Subheading } from "@/components/catalyst/heading";
import { EmptyState } from "@/components/ui/empty-state";
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
  Search,
  X,
  UserCheck,
} from "lucide-react";
import { Checkbox } from "@/components/catalyst/checkbox";

// ── Types ─────────────────────────────────────────────────────────────────────

interface QueueEntry {
  id: string; agentId: string; version: string; name: string | null; tags: string[];
  status: string; validationReport: ValidationReport | null; reviewComment: string | null;
  reviewedAt: string | null; currentApprovalStep: number; approvalProgress: ApprovalStepRecord[];
  enterpriseId: string | null; createdAt: string; updatedAt: string; submittedBy: string | null;
}

// ── Risk tier derivation ──────────────────────────────────────────────────────
//
// Risk tier is derived from the governance validation report rather than stored
// separately. This means the queue always reflects the current validation state.
//
//  CRITICAL — ≥1 violation with severity "error"
//  MEDIUM   — ≥1 violation with severity "warning" (but no errors)
//  LOW      — report is valid or not yet validated

import { getRiskTheme, RISK_LABELS, type RiskTier } from "@/lib/status-theme";

type ReviewRiskTier = Uppercase<RiskTier>;

const RISK_ORDER: Record<ReviewRiskTier, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

// SLA hours per risk tier — time allowed from entering review until decision required
const SLA_HOURS: Record<ReviewRiskTier, number> = { CRITICAL: 24, HIGH: 48, MEDIUM: 72, LOW: 96 };

const RISK_ICONS: Record<ReviewRiskTier, React.FC<{ size?: number; className?: string }>> = {
  CRITICAL: Flame,
  HIGH: AlertTriangle,
  MEDIUM: AlertCircle,
  LOW: Clock,
};

function deriveRiskTier(report: ValidationReport | null): ReviewRiskTier {
  if (!report) return "LOW";
  const violations = report.violations ?? [];
  if (violations.some((v) => v.severity === "error")) return "CRITICAL";
  if (violations.some((v) => v.severity === "warning")) return "MEDIUM";
  return "LOW";
}

// ── SLA countdown ─────────────────────────────────────────────────────────────

function computeSla(enteredReviewAt: string, tier: ReviewRiskTier): { label: string; urgent: boolean; overdue: boolean } {
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
  const { data: sessionData } = useSession();
  const userRole = sessionData?.user?.role ?? null;
  const userEmail = sessionData?.user?.email ?? null;

  const roleParam = userRole && userRole !== "admin" ? `?role=${encodeURIComponent(userRole)}` : "";

  const {
    data: blueprints = [],
    isLoading: loading,
    error: reviewErr,
  } = useQuery({
    queryKey: [...queryKeys.review.queue(), roleParam],
    queryFn: async () => {
      const res = await fetch(`/api/review${roleParam}`);
      if (!res.ok) throw new Error("Failed to load review queue");
      const data = await res.json();
      return (data.blueprints ?? []) as QueueEntry[];
    },
    enabled: sessionData !== undefined,
  });
  const error = reviewErr ? (reviewErr as Error).message : null;

  const [settings, setSettings] = useState<EnterpriseSettings>(DEFAULT_ENTERPRISE_SETTINGS);
  const [searchQuery, setSearchQuery] = useState("");
  // Bulk selection state (Catalyst Checkbox adoption — W2-07)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll(ids: string[]) {
    setSelectedIds((prev) =>
      prev.size === ids.length && ids.every((id) => prev.has(id))
        ? new Set()
        : new Set(ids)
    );
  }

  function bulkAssignToMe(ids: string[]) {
    if (!userEmail) return;
    setAssignments((prev) => {
      const next = { ...prev };
      for (const id of ids) next[id] = userEmail;
      try { localStorage.setItem(ASSIGN_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
    setSelectedIds(new Set());
  }

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

  // Load admin settings (best-effort, only for admins)
  useEffect(() => {
    if (userRole === "admin") {
      fetch("/api/admin/settings")
        .then((r) => r.json())
        .then((d) => setSettings(d.settings ?? DEFAULT_ENTERPRISE_SETTINGS))
        .catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userRole]);

  const chain: ApprovalChainStep[] = settings.approvalChain ?? [];

  // ── Sort: highest risk tier first, then oldest entry first within tier ──────
  const sorted = [...blueprints].sort((a, b) => {
    const rA = RISK_ORDER[deriveRiskTier(a.validationReport)];
    const rB = RISK_ORDER[deriveRiskTier(b.validationReport)];
    if (rA !== rB) return rA - rB;
    return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
  });

  // ── Search filter ────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((bp) =>
      bp.name?.toLowerCase().includes(q) ||
      bp.agentId.toLowerCase().includes(q) ||
      bp.submittedBy?.toLowerCase().includes(q)
    );
  }, [sorted, searchQuery]);

  return (
    <div className="max-w-screen-2xl mx-auto w-full px-6 py-6">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <Heading level={1}>Review Queue</Heading>
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
            {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as ReviewRiskTier[]).map((tier) => {
              const tierLower = tier.toLowerCase() as RiskTier;
              const theme = getRiskTheme(tierLower);
              // Extract color from bg class for dot (e.g., "bg-red-50" → red-400)
              const colorMap: Record<ReviewRiskTier, string> = {
                CRITICAL: "bg-red-400",
                HIGH: "bg-orange-400",
                MEDIUM: "bg-amber-400",
                LOW: "bg-sky-400",
              };
              return (
                <span key={tier} className="flex items-center gap-1 text-xs text-text-tertiary">
                  <span className={`h-2 w-2 rounded-full ${colorMap[tier]}`} />
                  {tier}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Search filter (shown when queue has items) ───────────────────── */}
      {!loading && sorted.length > 0 && (
        <div className="mb-4 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by agent name, ID, or submitter…"
            className="w-full rounded-lg border border-border bg-surface py-2 pl-8 pr-8 text-sm placeholder:text-text-tertiary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10 sm:w-80"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text"
              aria-label="Clear search"
            >
              <X size={13} />
            </button>
          )}
        </div>
      )}

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
        <EmptyState
          icon={CheckCircle}
          heading="Review queue is clear"
          subtext={
            userRole === "admin"
              ? "No blueprints are currently in review across the enterprise."
              : "No blueprints are currently awaiting your review."
          }
          action={
            <div className="flex flex-col items-center gap-2">
              {userRole === "admin" && (
                <Link href="/pipeline" className="text-xs text-primary hover:text-primary-hover transition-colors">
                  View Pipeline Board → (draft agents are visible there)
                </Link>
              )}
              <Link href="/registry" className="text-xs text-primary hover:text-primary-hover transition-colors">
                View Agent Registry →
              </Link>
            </div>
          }
        />
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

      {/* ── No search results ────────────────────────────────────────────── */}
      {!loading && sorted.length > 0 && filtered.length === 0 && (
        <EmptyState
          icon={Search}
          heading="No matching blueprints"
          subtext={`No items in the review queue match "${searchQuery}".`}
          action={<button onClick={() => setSearchQuery("")} className="text-sm text-primary hover:underline">Clear search</button>}
        />
      )}

      {/* ── Bulk action bar (shown when ≥1 item selected) ───────────────── */}
      {filtered.length > 0 && (
        <div className="mb-3 flex items-center gap-3">
          {/* Select-all checkbox */}
          <div
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleSelectAll(filtered.map((b) => b.id)); }}
            className="flex items-center gap-2 cursor-pointer select-none"
          >
            <Checkbox
              checked={selectedIds.size > 0 && selectedIds.size === filtered.length}
              indeterminate={selectedIds.size > 0 && selectedIds.size < filtered.length}
              onChange={() => toggleSelectAll(filtered.map((b) => b.id))}
              color="indigo"
            />
            <span className="text-xs text-text-tertiary">
              {selectedIds.size === 0
                ? "Select all"
                : `${selectedIds.size} of ${filtered.length} selected`}
            </span>
          </div>

          {selectedIds.size > 0 && userEmail && (
            <>
              <div className="h-3.5 w-px bg-border" />
              <button
                onClick={() => bulkAssignToMe([...selectedIds])}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
              >
                <UserCheck size={12} />
                Assign to me
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-xs text-text-tertiary hover:text-text transition-colors"
              >
                Clear selection
              </button>
            </>
          )}
        </div>
      )}

      {/* ── Queue items ───────────────────────────────────────────────────── */}
      {filtered.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-[var(--shadow-card)]">
          {[...filtered].sort((a, b) => {
            // P1-299: Assigned-to-me items surface to top
            const aAssigned = assignments[a.id] === userEmail ? -1 : 0;
            const bAssigned = assignments[b.id] === userEmail ? -1 : 0;
            return aAssigned - bAssigned;
          }).map((bp, i) => {
            const tier = deriveRiskTier(bp.validationReport);
            const tierLower = tier.toLowerCase() as RiskTier;
            const theme = getRiskTheme(tierLower);
            const RiskIcon = RISK_ICONS[tier];
            const sla = computeSla(bp.updatedAt, tier);
            const gov = govBadge(bp.validationReport);
            const GovIcon = gov.icon;
            const activeStep = chain.length > 0 ? chain[bp.currentApprovalStep] : null;
            const priorApprovals = (bp.approvalProgress ?? []) as ApprovalStepRecord[];

            return (
              <Link
                key={bp.id}
                href={`/registry/${bp.agentId}?tab=review`}
                className={`block px-5 py-4 interactive-row border-l-2 ${theme.border} ${i > 0 ? "border-t border-border" : ""}`}
              >
                <div className="flex items-start gap-4">
                  {/* Bulk select checkbox (W2-07) */}
                  <div
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleSelect(bp.id); }}
                    className="mt-2 shrink-0"
                  >
                    <Checkbox
                      checked={selectedIds.has(bp.id)}
                      onChange={() => toggleSelect(bp.id)}
                      color="indigo"
                    />
                  </div>

                  {/* Risk icon */}
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${theme.bg} ${theme.text}`}>
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
                      <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${theme.bg} ${theme.text}`}>
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

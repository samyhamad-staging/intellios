"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ValidationReport } from "@/lib/governance/types";
import type { ApprovalStepRecord, ApprovalChainStep, EnterpriseSettings } from "@/lib/settings/types";
import { DEFAULT_ENTERPRISE_SETTINGS } from "@/lib/settings/types";
import { ClipboardList, CheckCircle, ChevronRight, ShieldCheck, ShieldAlert, AlertCircle } from "lucide-react";

interface QueueEntry {
  id: string; agentId: string; version: string; name: string | null; tags: string[];
  status: string; validationReport: ValidationReport | null; reviewComment: string | null;
  reviewedAt: string | null; currentApprovalStep: number; approvalProgress: ApprovalStepRecord[];
  enterpriseId: string | null; createdAt: string; updatedAt: string;
}

export default function ReviewQueuePage() {
  const [blueprints, setBlueprints] = useState<QueueEntry[]>([]);
  const [settings, setSettings] = useState<EnterpriseSettings>(DEFAULT_ENTERPRISE_SETTINGS);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((data) => {
        const role = data?.user?.role ?? null;
        setUserRole(role);
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

  return (
    <div className="px-6 py-6">
      {/* Header */}
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
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-surface-muted" />)}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {/* Empty */}
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

      {/* Queue items */}
      {blueprints.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-[var(--shadow-card)]">
          {blueprints.map((bp, i) => {
            const govStatus = bp.validationReport
              ? bp.validationReport.valid
                ? { label: "Passes governance", color: "text-emerald-700 bg-emerald-50 border-emerald-200", icon: ShieldCheck }
                : { label: `${bp.validationReport.violations.filter((v) => v.severity === "error").length} governance error(s)`, color: "text-red-700 bg-red-50 border-red-200", icon: ShieldAlert }
              : { label: "Not validated", color: "text-text-tertiary bg-surface-raised border-border", icon: AlertCircle };

            const GovIcon = govStatus.icon;
            const activeStep = chain.length > 0 ? chain[bp.currentApprovalStep] : null;
            const priorApprovals = (bp.approvalProgress ?? []) as ApprovalStepRecord[];

            return (
              <Link
                key={bp.id}
                href={`/registry/${bp.agentId}?tab=review`}
                className={`block px-5 py-4 hover:bg-surface-raised transition-colors border-l-2 border-amber-400 ${i > 0 ? "border-t border-border" : ""}`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                    <ClipboardList size={15} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-text truncate">{bp.name ?? "Unnamed Agent"}</span>
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${govStatus.color}`}>
                        <GovIcon size={11} /> {govStatus.label}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-text-tertiary">
                      <span>v{bp.version}</span>
                      <span>·</span>
                      <span>{new Date(bp.updatedAt).toLocaleString()}</span>
                    </div>

                    {/* Multi-step progress */}
                    {chain.length > 0 && (
                      <div className="mt-2 flex items-center gap-1">
                        {chain.map((step, idx) => {
                          const completed = priorApprovals.find((p) => p.step === idx && p.decision === "approved");
                          const isActive = idx === bp.currentApprovalStep;
                          return (
                            <span key={idx} className="flex items-center gap-1">
                              {idx > 0 && <ChevronRight size={11} className="text-text-tertiary" />}
                              <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${completed ? "bg-emerald-100 text-emerald-700" : isActive ? "bg-amber-100 text-amber-700 ring-1 ring-amber-300" : "bg-surface-raised text-text-tertiary"}`}>
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

                  <div className="flex items-center gap-2 shrink-0">
                    {activeStep ? (() => {
                      const isYourStep = userRole != null && activeStep.role === userRole;
                      return (
                        <span className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${isYourStep ? "border-primary/20 bg-primary-muted text-primary" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
                          {isYourStep ? `Your step: ${activeStep.label}` : `Waiting: ${activeStep.label}`}
                        </span>
                      );
                    })() : (
                      <span className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">Pending</span>
                    )}
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

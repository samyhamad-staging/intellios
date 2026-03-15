"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ValidationReport } from "@/lib/governance/types";
import type { ApprovalStepRecord, ApprovalChainStep, EnterpriseSettings } from "@/lib/settings/types";
import { DEFAULT_ENTERPRISE_SETTINGS } from "@/lib/settings/types";

interface QueueEntry {
  id: string;
  agentId: string;
  version: string;
  name: string | null;
  tags: string[];
  status: string;
  validationReport: ValidationReport | null;
  reviewComment: string | null;
  reviewedAt: string | null;
  currentApprovalStep: number;
  approvalProgress: ApprovalStepRecord[];
  enterpriseId: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function ReviewQueuePage() {
  const [blueprints, setBlueprints] = useState<QueueEntry[]>([]);
  const [settings, setSettings] = useState<EnterpriseSettings>(DEFAULT_ENTERPRISE_SETTINGS);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch session to determine role for filtering
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((data) => {
        const role = data?.user?.role ?? null;
        setUserRole(role);

        // Fetch settings for approval chain context (admin-only endpoint)
        if (role === "admin") {
          fetch("/api/admin/settings")
            .then((r) => r.json())
            .then((d) => setSettings(d.settings ?? DEFAULT_ENTERPRISE_SETTINGS))
            .catch(() => {/* best-effort */});
        }

        // Fetch queue, filtering by role when a chain is relevant
        const roleParam = role ? `?role=${encodeURIComponent(role)}` : "";
        return fetch(`/api/review${roleParam}`);
      })
      .then((r) => r?.json())
      .then((data) => {
        if (data) {
          setBlueprints(data.blueprints ?? []);
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load review queue");
        setLoading(false);
      });
  }, []);

  const chain: ApprovalChainStep[] = settings.approvalChain ?? [];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Review Queue</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              {chain.length > 0
                ? `Showing blueprints awaiting your approval step`
                : "Agent Blueprint Packages awaiting review"}
            </p>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <Link href="/registry" className="hover:text-gray-900">
              Registry
            </Link>
            <Link href="/" className="hover:text-gray-900">
              ← Home
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        {loading && (
          <p className="text-center text-sm text-gray-400">Loading queue…</p>
        )}
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
            {error}
          </div>
        )}
        {!loading && !error && blueprints.length === 0 && (
          <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
            <p className="text-2xl mb-3">✓</p>
            <p className="text-gray-700 font-medium">Review queue is empty</p>
            <p className="mt-1 text-sm text-gray-400">
              No blueprints are currently awaiting your review.
            </p>
            <Link
              href="/registry"
              className="mt-4 inline-block text-sm text-gray-900 underline"
            >
              View Agent Registry
            </Link>
          </div>
        )}

        {blueprints.length > 0 && (
          <div className="space-y-3">
            {blueprints.map((bp) => {
              const govStatus = bp.validationReport
                ? bp.validationReport.valid
                  ? { label: "Passes governance", color: "text-green-600 bg-green-50 border-green-200" }
                  : {
                      label: `${bp.validationReport.violations.filter((v) => v.severity === "error").length} governance error(s)`,
                      color: "text-red-600 bg-red-50 border-red-200",
                    }
                : { label: "Not validated", color: "text-gray-500 bg-gray-50 border-gray-200" };

              // Determine step context
              const activeStep = chain.length > 0 ? chain[bp.currentApprovalStep] : null;
              const priorApprovals = (bp.approvalProgress ?? []) as ApprovalStepRecord[];

              return (
                <Link
                  key={bp.id}
                  href={`/registry/${bp.agentId}?tab=review`}
                  className="block rounded-lg border border-gray-200 bg-white p-5 hover:border-gray-400 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="font-medium text-gray-900 truncate">
                          {bp.name ?? "Unnamed Agent"}
                        </h2>
                        <span className={`rounded-full border px-2 py-0.5 text-xs ${govStatus.color}`}>
                          {govStatus.label}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-gray-400">
                        <span>v{bp.version}</span>
                        <span>·</span>
                        <span className="font-mono">{bp.agentId.slice(0, 8)}</span>
                        <span>·</span>
                        <span>Submitted {new Date(bp.updatedAt).toLocaleString()}</span>
                      </div>

                      {/* Multi-step progress indicator */}
                      {chain.length > 0 && (
                        <div className="mt-2 flex items-center gap-1.5">
                          {chain.map((step, idx) => {
                            const completed = priorApprovals.find(
                              (p) => p.step === idx && p.decision === "approved"
                            );
                            const isActive = idx === bp.currentApprovalStep;
                            return (
                              <span key={idx} className="flex items-center gap-1">
                                {idx > 0 && <span className="text-gray-300 text-xs">→</span>}
                                <span
                                  className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                                    completed
                                      ? "bg-green-100 text-green-700"
                                      : isActive
                                      ? "bg-amber-100 text-amber-700 ring-1 ring-amber-300"
                                      : "bg-gray-100 text-gray-400"
                                  }`}
                                >
                                  {completed ? "✓ " : isActive ? "→ " : "○ "}
                                  {step.label}
                                </span>
                              </span>
                            );
                          })}
                        </div>
                      )}

                      {/* Prior approval chips */}
                      {priorApprovals.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {priorApprovals.map((p, i) => (
                            <span
                              key={i}
                              className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500"
                            >
                              ✓ {p.label} · {p.approvedBy}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Step badge */}
                    {activeStep ? (
                      <span className="shrink-0 rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs font-medium text-amber-700">
                        Step {bp.currentApprovalStep + 1} of {chain.length}: {activeStep.label}
                      </span>
                    ) : (
                      <span className="shrink-0 rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs font-medium text-amber-700">
                        Pending Review
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

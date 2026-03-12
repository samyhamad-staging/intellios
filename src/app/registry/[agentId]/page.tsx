"use client";

import { use, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BlueprintView } from "@/components/blueprint/blueprint-view";
import { StatusBadge } from "@/components/registry/status-badge";
import { LifecycleControls } from "@/components/registry/lifecycle-controls";
import { ValidationReportView } from "@/components/governance/validation-report";
import { ReviewPanel } from "@/components/review/review-panel";
import { ABP } from "@/lib/types/abp";
import { ValidationReport } from "@/lib/governance/types";

interface BlueprintVersion {
  id: string;
  agentId: string;
  version: string;
  name: string | null;
  status: string;
  refinementCount: string;
  validationReport: ValidationReport | null;
  reviewComment: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  abp: ABP;
}

type Status = "draft" | "in_review" | "approved" | "rejected" | "deprecated";
type Tab = "blueprint" | "governance" | "review" | "versions";

export default function AgentDetailPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = use(params);
  const searchParams = useSearchParams();

  const [latest, setLatest] = useState<BlueprintVersion | null>(null);
  const [versions, setVersions] = useState<BlueprintVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const tab = searchParams.get("tab");
    if (tab === "review" || tab === "governance" || tab === "versions") return tab;
    return "blueprint";
  });

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/registry/${agentId}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Not found");
      }
      const data = await res.json();
      setLatest(data.agent);
      setVersions(data.versions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load agent");
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleStatusChange = useCallback((newStatus: Status) => {
    setLatest((prev) => prev ? { ...prev, status: newStatus } : prev);
    setVersions((prev) =>
      prev.map((v) => (v.id === latest?.id ? { ...v, status: newStatus } : v))
    );
    if (newStatus !== "in_review") {
      setActiveTab("blueprint");
    }
  }, [latest?.id]);

  const handleReviewComplete = useCallback((newStatus: string) => {
    handleStatusChange(newStatus as Status);
  }, [handleStatusChange]);

  const handleRevalidate = useCallback((report: ValidationReport) => {
    setLatest((prev) => prev ? { ...prev, validationReport: report } : prev);
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-gray-400">
        Loading agent…
      </div>
    );
  }

  if (error || !latest) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <p className="text-sm text-red-600">{error ?? "Agent not found"}</p>
        <Link href="/registry" className="text-sm text-gray-500 underline">
          Back to Registry
        </Link>
      </div>
    );
  }

  const isInReview = latest.status === "in_review";

  const tabs: { id: Tab; label: string }[] = [
    { id: "blueprint", label: "Blueprint" },
    { id: "governance", label: "Governance" },
    ...(isInReview ? [{ id: "review" as Tab, label: "Review" }] : []),
    { id: "versions", label: `Versions (${versions.length})` },
  ];

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/registry" className="text-sm text-gray-400 hover:text-gray-700 shrink-0">
            ← Registry
          </Link>
          <span className="text-gray-200">/</span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-gray-900 truncate">
                {latest.name ?? "Unnamed Agent"}
              </h1>
              <StatusBadge status={latest.status} />
            </div>
            <p className="text-xs text-gray-400">
              v{latest.version} · {versions.length} version{versions.length !== 1 ? "s" : ""}
              {parseInt(latest.refinementCount ?? "0") > 0 &&
                ` · ${latest.refinementCount} refinement${latest.refinementCount === "1" ? "" : "s"}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <LifecycleControls
            blueprintId={latest.id}
            currentStatus={latest.status}
            onStatusChange={handleStatusChange}
          />
          <Link
            href={`/blueprints/${latest.id}`}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:border-gray-400 hover:text-gray-900 transition-colors"
          >
            Open in Studio
          </Link>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-white px-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.id === "review" && activeTab !== "review" ? (
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-amber-400"></span>
                {tab.label}
              </span>
            ) : (
              tab.label
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "blueprint" && (
          <div className="p-6">
            <BlueprintView abp={latest.abp} />
          </div>
        )}

        {activeTab === "governance" && (
          <div className="p-6 max-w-2xl">
            {latest.validationReport ? (
              <ValidationReportView
                report={latest.validationReport}
                blueprintId={latest.id}
                onRevalidate={handleRevalidate}
              />
            ) : (
              <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
                <p className="text-sm text-gray-500">No validation report yet.</p>
                <button
                  onClick={async () => {
                    try {
                      const res = await fetch(`/api/blueprints/${latest.id}/validate`, {
                        method: "POST",
                      });
                      const data = await res.json();
                      if (data.report) handleRevalidate(data.report as ValidationReport);
                    } catch { /* non-critical */ }
                  }}
                  className="mt-3 text-sm text-gray-900 underline"
                >
                  Run validation
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === "review" && isInReview && (
          <div className="p-6 max-w-2xl">
            <ReviewPanel
              blueprintId={latest.id}
              agentName={latest.name}
              version={latest.version}
              submittedAt={latest.updatedAt}
              previousComment={latest.reviewComment}
              onReviewComplete={handleReviewComplete}
            />
          </div>
        )}

        {activeTab === "versions" && (
          <div className="p-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="pb-3 pr-4">Version</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Refinements</th>
                  <th className="pb-3 pr-4">Created</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {versions.map((v) => (
                  <tr key={v.id} className="py-3">
                    <td className="py-3 pr-4 font-mono text-gray-700">v{v.version}</td>
                    <td className="py-3 pr-4">
                      <StatusBadge status={v.status} />
                    </td>
                    <td className="py-3 pr-4 text-gray-500">{v.refinementCount ?? "0"}</td>
                    <td className="py-3 pr-4 text-gray-500">
                      {new Date(v.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3">
                      <Link
                        href={`/blueprints/${v.id}`}
                        className="text-gray-500 hover:text-gray-900 underline"
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

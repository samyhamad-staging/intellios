"use client";

import { use, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { BlueprintView } from "@/components/blueprint/blueprint-view";
import { StatusBadge } from "@/components/registry/status-badge";
import { LifecycleControls } from "@/components/registry/lifecycle-controls";
import { ABP } from "@/lib/types/abp";

interface BlueprintVersion {
  id: string;
  agentId: string;
  version: string;
  name: string | null;
  status: string;
  refinementCount: string;
  createdAt: string;
  updatedAt: string;
  abp: ABP;
}

type Status = "draft" | "in_review" | "approved" | "rejected" | "deprecated";

export default function AgentDetailPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = use(params);

  const [latest, setLatest] = useState<BlueprintVersion | null>(null);
  const [versions, setVersions] = useState<BlueprintVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"blueprint" | "versions">("blueprint");

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
  }, [latest?.id]);

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
        {(["blueprint", "versions"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === tab
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab === "blueprint" ? "Blueprint" : `Versions (${versions.length})`}
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

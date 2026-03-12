"use client";

import { use, useState, useCallback } from "react";
import Link from "next/link";
import { BlueprintView } from "@/components/blueprint/blueprint-view";
import { ABP } from "@/lib/types/abp";

interface BlueprintPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ abp?: string; agentId?: string }>;
}

export default function BlueprintPage({ params, searchParams }: BlueprintPageProps) {
  const { id } = use(params);
  // The generating page passes the initial ABP as a URL search param (base64 JSON)
  // so we can render immediately without a round-trip. Falls back to fetching.
  const { abp: encodedAbp, agentId } = use(searchParams);

  const [abp, setAbp] = useState<ABP | null>(() => {
    if (encodedAbp) {
      try {
        return JSON.parse(atob(encodedAbp)) as ABP;
      } catch {
        return null;
      }
    }
    return null;
  });

  const [loading, setLoading] = useState(!abp);
  const [error, setError] = useState<string | null>(null);
  const [change, setChange] = useState("");
  const [refining, setRefining] = useState(false);
  const [refinementCount, setRefinementCount] = useState(0);

  // Fetch if not already loaded
  if (loading && !abp) {
    fetch(`/api/blueprints/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setAbp(data.abp as ABP);
        setRefinementCount(parseInt(data.refinementCount ?? "0", 10));
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load blueprint");
        setLoading(false);
      });
  }

  const handleRefine = useCallback(async () => {
    if (!change.trim() || refining) return;
    setRefining(true);
    setError(null);
    try {
      const res = await fetch(`/api/blueprints/${id}/refine`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ change }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Refinement failed");
      }
      const data = await res.json();
      setAbp(data.abp as ABP);
      setRefinementCount(parseInt(data.refinementCount ?? "0", 10));
      setChange("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Refinement failed");
    } finally {
      setRefining(false);
    }
  }, [id, change, refining]);

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
        <div>
          <h1 className="text-lg font-semibold">
            {abp?.identity.name ?? "Agent Blueprint"}
          </h1>
          <p className="text-xs text-gray-500">
            Blueprint
            {refinementCount > 0 && ` · ${refinementCount} refinement${refinementCount === 1 ? "" : "s"}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
            draft
          </span>
          <div className="text-xs text-gray-400 font-mono">{id.slice(0, 8)}</div>
          {agentId && (
            <Link
              href={`/registry/${agentId}`}
              className="rounded-lg border border-gray-200 px-2.5 py-0.5 text-xs text-gray-600 hover:border-gray-400 hover:text-gray-900 transition-colors"
            >
              View in Registry →
            </Link>
          )}
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Blueprint content */}
        <main className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex h-full items-center justify-center text-gray-400 text-sm">
              Generating blueprint...
            </div>
          )}
          {error && !abp && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
              {error}
            </div>
          )}
          {abp && <BlueprintView abp={abp} />}
        </main>

        {/* Refinement panel */}
        <aside className="w-72 shrink-0 border-l border-gray-200 bg-white flex flex-col">
          <div className="border-b border-gray-200 px-5 py-4">
            <h2 className="text-sm font-semibold">Request Changes</h2>
            <p className="mt-1 text-xs text-gray-500">
              Describe what to change and Claude will regenerate the blueprint.
            </p>
          </div>

          <div className="flex flex-1 flex-col gap-3 p-4">
            <textarea
              value={change}
              onChange={(e) => setChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleRefine();
                }
              }}
              placeholder="e.g. Add a rate limit of 50 requests per minute. Make the persona more formal."
              disabled={refining || loading}
              className="flex-1 resize-none rounded-lg border border-gray-200 p-3 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 disabled:opacity-50"
              rows={6}
            />

            {error && (
              <p className="text-xs text-red-600">{error}</p>
            )}

            <button
              onClick={handleRefine}
              disabled={!change.trim() || refining || loading}
              className="rounded-lg bg-gray-900 py-2 text-sm text-white hover:bg-gray-800 disabled:opacity-40"
            >
              {refining ? "Refining..." : "Apply Changes"}
            </button>

            <p className="text-center text-xs text-gray-400">⌘ Enter to apply</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

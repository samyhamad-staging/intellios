"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ValidationReport } from "@/lib/governance/types";

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
  createdAt: string;
  updatedAt: string;
}

export default function ReviewQueuePage() {
  const [blueprints, setBlueprints] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/review")
      .then((r) => r.json())
      .then((data) => {
        setBlueprints(data.blueprints ?? []);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load review queue");
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Review Queue</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              Agent Blueprint Packages awaiting review
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
              No blueprints are currently awaiting review.
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

              return (
                <Link
                  key={bp.id}
                  href={`/registry/${bp.agentId}?tab=review`}
                  className="block rounded-lg border border-gray-200 bg-white p-5 hover:border-gray-400 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
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
                    </div>
                    <span className="shrink-0 rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs font-medium text-amber-700">
                      Pending Review
                    </span>
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

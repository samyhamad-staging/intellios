"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/registry/status-badge";

interface RegistryEntry {
  id: string;
  agentId: string;
  version: string;
  name: string | null;
  tags: string[];
  status: string;
  sessionId: string;
  createdAt: string;
  updatedAt: string;
}

export default function RegistryPage() {
  const [agents, setAgents] = useState<RegistryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/registry")
      .then((r) => r.json())
      .then((data) => {
        setAgents(data.agents ?? []);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load registry");
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Agent Registry</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              All generated Agent Blueprint Packages
            </p>
          </div>
          <Link
            href="/"
            className="text-sm text-gray-500 hover:text-gray-900"
          >
            ← Home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        {loading && (
          <p className="text-center text-sm text-gray-400">Loading agents…</p>
        )}
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
            {error}
          </div>
        )}
        {!loading && !error && agents.length === 0 && (
          <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
            <p className="text-gray-500 text-sm">No agents in the registry yet.</p>
            <Link
              href="/"
              className="mt-3 inline-block text-sm text-gray-900 underline"
            >
              Start an intake session
            </Link>
          </div>
        )}
        {agents.length > 0 && (
          <div className="space-y-3">
            {agents.map((agent) => (
              <Link
                key={agent.agentId}
                href={`/registry/${agent.agentId}`}
                className="block rounded-lg border border-gray-200 bg-white p-5 hover:border-gray-400 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="font-medium text-gray-900 truncate">
                        {agent.name ?? "Unnamed Agent"}
                      </h2>
                      <StatusBadge status={agent.status} />
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-gray-400">
                      <span>v{agent.version}</span>
                      <span>·</span>
                      <span className="font-mono">{agent.agentId.slice(0, 8)}</span>
                      <span>·</span>
                      <span>{new Date(agent.createdAt).toLocaleDateString()}</span>
                    </div>
                    {Array.isArray(agent.tags) && agent.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {(agent.tags as string[]).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="shrink-0 text-sm text-gray-400">View →</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

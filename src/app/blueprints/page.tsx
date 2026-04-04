"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  FileText,
  Search,
  Plus,
  ShieldCheck,
  ShieldAlert,
  AlertCircle,
  ChevronRight,
  Clock,
  CheckCircle2,
} from "lucide-react";
import type { ValidationReport } from "@/lib/governance/types";

// ── Types ────────────────────────────────────────────────────────────────────

interface BlueprintEntry {
  id: string;
  agentId: string;
  version: string;
  name: string | null;
  tags: string[];
  status: string;
  validationReport: ValidationReport | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_TABS = ["all", "draft", "in_review", "approved", "rejected"] as const;
type StatusTab = (typeof STATUS_TABS)[number];

const STATUS_LABELS: Record<string, string> = {
  all: "All",
  draft: "Draft",
  in_review: "In Review",
  approved: "Approved",
  rejected: "Rejected",
  deprecated: "Deprecated",
};

const STATUS_BADGE: Record<
  string,
  { bg: string; text: string; dot: string }
> = {
  draft:      { bg: "bg-surface-raised",   text: "text-text-secondary",  dot: "bg-text-tertiary" },
  in_review:  { bg: "bg-amber-50",          text: "text-amber-700",        dot: "bg-amber-400" },
  approved:   { bg: "bg-emerald-50",        text: "text-emerald-700",      dot: "bg-emerald-500" },
  rejected:   { bg: "bg-red-50",            text: "text-red-700",          dot: "bg-red-500" },
  deprecated: { bg: "bg-surface-raised",   text: "text-text-tertiary",    dot: "bg-text-tertiary" },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function govBadge(report: ValidationReport | null) {
  if (!report) return { label: "Not validated", color: "text-text-tertiary", Icon: AlertCircle };
  const errors = report.violations?.filter((v) => v.severity === "error").length ?? 0;
  if (report.valid)
    return { label: "Passes governance", color: "text-emerald-700", Icon: ShieldCheck };
  return {
    label: `${errors} governance error${errors !== 1 ? "s" : ""}`,
    color: "text-red-700",
    Icon: ShieldAlert,
  };
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function BlueprintsPage() {
  const [blueprints, setBlueprints] = useState<BlueprintEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<StatusTab>("all");

  useEffect(() => {
    fetch("/api/blueprints")
      .then((r) => r.json())
      .then((data) => {
        setBlueprints(data.blueprints ?? []);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load blueprints");
        setLoading(false);
      });
  }, []);

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return blueprints.filter((bp) => {
      const matchesTab =
        activeTab === "all" || bp.status === activeTab;
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        (bp.name?.toLowerCase().includes(q) ?? false) ||
        bp.id.toLowerCase().includes(q) ||
        bp.tags.some((t) => t.toLowerCase().includes(q));
      return matchesTab && matchesSearch;
    });
  }, [blueprints, activeTab, search]);

  // ── Tab counts ─────────────────────────────────────────────────────────────
  const counts = useMemo(() => {
    const c: Record<StatusTab, number> = {
      all: blueprints.length,
      draft: 0,
      in_review: 0,
      approved: 0,
      rejected: 0,
    };
    blueprints.forEach((bp) => {
      if (bp.status in c) c[bp.status as StatusTab]++;
    });
    return c;
  }, [blueprints]);

  return (
    <div className="px-6 py-6">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text">Blueprint Studio</h1>
          <p className="mt-0.5 text-sm text-text-secondary">
            All Agent Blueprint Packages across your enterprise
          </p>
        </div>
        <Link
          href="/intake"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          <Plus size={15} />
          New Blueprint
        </Link>
      </div>

      {/* ── Search ──────────────────────────────────────────────────────── */}
      <div className="relative mb-4">
        <Search
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, tag, or ID…"
          className="w-full rounded-xl border border-border bg-surface py-2.5 pl-9 pr-4 text-sm text-text placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* ── Status tabs ─────────────────────────────────────────────────── */}
      <div className="mb-5 flex gap-1 overflow-x-auto">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === tab
                ? "bg-primary/10 text-primary"
                : "text-text-secondary hover:bg-surface-raised hover:text-text"
            }`}
          >
            {STATUS_LABELS[tab]}
            {counts[tab] > 0 && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                  activeTab === tab
                    ? "bg-primary/15 text-primary"
                    : "bg-surface-raised text-text-tertiary"
                }`}
              >
                {counts[tab]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Loading ──────────────────────────────────────────────────────── */}
      {loading && (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-surface-muted" />
          ))}
        </div>
      )}

      {/* ── Error ────────────────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {/* ── Empty ────────────────────────────────────────────────────────── */}
      {!loading && !error && filtered.length === 0 && (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-border bg-surface px-8 py-12 text-center shadow-[var(--shadow-card)]">
          {blueprints.length === 0 ? (
            <>
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-surface-raised">
                <FileText size={24} className="text-text-tertiary" />
              </div>
              <p className="mb-1 text-sm font-medium text-text">No blueprints yet</p>
              <p className="mb-6 text-xs text-text-secondary">
                Run an intake session to generate your first Agent Blueprint Package.
              </p>
              <Link
                href="/intake"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                <Plus size={14} />
                Create First Blueprint
              </Link>
            </>
          ) : (
            <>
              <CheckCircle2 size={24} className="mb-3 text-text-tertiary" />
              <p className="text-sm font-medium text-text">No results</p>
              <p className="mt-1 text-xs text-text-secondary">
                Try a different search term or status filter.
              </p>
            </>
          )}
        </div>
      )}

      {/* ── Blueprint list ────────────────────────────────────────────────── */}
      {!loading && !error && filtered.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-[var(--shadow-card)]">
          {filtered.map((bp, i) => {
            const gov = govBadge(bp.validationReport);
            const GovIcon = gov.Icon;
            const badge = STATUS_BADGE[bp.status] ?? STATUS_BADGE.draft;

            return (
              <Link
                key={bp.id}
                href={`/blueprints/${bp.id}`}
                className={`block px-5 py-4 hover:bg-surface-raised transition-colors ${
                  i > 0 ? "border-t border-border" : ""
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-raised text-text-tertiary">
                    <FileText size={15} />
                  </div>

                  {/* Main content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-text truncate">
                        {bp.name ?? "Unnamed Blueprint"}
                      </span>
                      <span className="text-xs text-text-tertiary">v{bp.version}</span>

                      {/* Status badge */}
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${badge.bg} ${badge.text}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
                        {STATUS_LABELS[bp.status] ?? bp.status}
                      </span>

                      {/* Governance badge */}
                      <span className={`inline-flex items-center gap-1 text-xs ${gov.color}`}>
                        <GovIcon size={12} />
                        {gov.label}
                      </span>
                    </div>

                    {/* Meta row */}
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-text-tertiary">
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        {relativeTime(bp.updatedAt)}
                      </span>
                      {bp.createdBy && (
                        <>
                          <span>·</span>
                          <span>{bp.createdBy}</span>
                        </>
                      )}
                      {bp.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-md bg-surface-raised px-1.5 py-0.5"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <ChevronRight size={14} className="mt-1 shrink-0 text-text-tertiary" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

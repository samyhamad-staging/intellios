"use client";

import { useEffect, useState } from "react";
import type { ABPDiff, SectionDiff, FieldChange, DiffSignificance } from "@/lib/diff/abp-diff";

interface VersionDiffProps {
  /** The newer (target) blueprint id */
  blueprintId: string;
  /** The baseline blueprint id to compare against */
  compareWithId: string;
  /** Pre-fetched diff — if provided, skips the fetch */
  diff?: ABPDiff;
  /** Collapse the diff by default (e.g., when embedded in review panel) */
  defaultCollapsed?: boolean;
}

function significanceBadge(sig: DiffSignificance) {
  const cfg: Record<DiffSignificance, { label: string; classes: string }> = {
    major: { label: "Major Change", classes: "bg-red-100 text-red-700" },
    minor: { label: "Minor Change", classes: "bg-amber-100 text-amber-700" },
    patch: { label: "Patch Change", classes: "bg-gray-100 text-gray-600" },
  };
  const { label, classes } = cfg[sig];
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${classes}`}>
      {label}
    </span>
  );
}

function changeIcon(type: FieldChange["changeType"]) {
  if (type === "added")   return <span className="text-green-600 font-bold text-sm w-4 flex-shrink-0">+</span>;
  if (type === "removed") return <span className="text-red-600 font-bold text-sm w-4 flex-shrink-0">−</span>;
  return <span className="text-amber-600 font-bold text-sm w-4 flex-shrink-0">~</span>;
}

function changeBg(type: FieldChange["changeType"]) {
  if (type === "added")   return "bg-green-50 border-l-2 border-green-400";
  if (type === "removed") return "bg-red-50 border-l-2 border-red-400";
  return "bg-amber-50 border-l-2 border-amber-400";
}

function renderValue(v: unknown): string {
  if (v === null || v === undefined) return "(none)";
  if (typeof v === "string") return v;
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "number") return String(v);
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    if ("name" in o && "type" in o) return `${o.name} (${o.type})`;
    if ("name" in o) return String(o.name);
    return JSON.stringify(v);
  }
  return String(v);
}

function ChangeRow({ change }: { change: FieldChange }) {
  const isModified = change.changeType === "modified";
  return (
    <div className={`flex items-start gap-2 px-3 py-2 rounded ${changeBg(change.changeType)}`}>
      {changeIcon(change.changeType)}
      <div className="flex-1 min-w-0">
        <span className="text-sm text-gray-800">{change.label}</span>
        {isModified && (
          <div className="mt-1 space-y-0.5 text-xs">
            <div className="text-red-600 line-through opacity-75 truncate">{renderValue(change.from)}</div>
            <div className="text-green-700 truncate">{renderValue(change.to)}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function SectionBlock({ section }: { section: SectionDiff }) {
  const [open, setOpen] = useState(true);
  if (section.changes.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400 px-1">
        <span>{section.label}</span>
        <span className="text-xs">(no changes)</span>
      </div>
    );
  }
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-white hover:bg-gray-50 transition-colors text-left"
      >
        <span className="text-sm font-medium text-gray-800">
          {section.label}
          <span className="ml-2 text-xs font-normal text-gray-500">
            ({section.changes.length} change{section.changes.length !== 1 ? "s" : ""})
          </span>
        </span>
        <span className="text-gray-400 text-xs">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="border-t border-gray-100 px-4 py-3 space-y-2">
          {section.changes.map((change, i) => (
            <ChangeRow key={i} change={change} />
          ))}
        </div>
      )}
    </div>
  );
}

export function VersionDiff({ blueprintId, compareWithId, diff: prefetched, defaultCollapsed = false }: VersionDiffProps) {
  const [diff, setDiff] = useState<ABPDiff | null>(prefetched ?? null);
  const [loading, setLoading] = useState(!prefetched);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  useEffect(() => {
    if (prefetched) return;
    setLoading(true);
    setError(null);
    fetch(`/api/blueprints/${blueprintId}/diff?compareWith=${compareWithId}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: ABPDiff) => setDiff(data))
      .catch(() => setError("Failed to load version diff."))
      .finally(() => setLoading(false));
  }, [blueprintId, compareWithId, prefetched]);

  if (loading) {
    return (
      <div className="space-y-2 animate-pulse">
        <div className="h-10 bg-gray-100 rounded-lg" />
        <div className="h-20 bg-gray-100 rounded-lg" />
      </div>
    );
  }

  if (error || !diff) {
    return (
      <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        {error ?? "Failed to load diff."}
      </div>
    );
  }

  const hasChanges = diff.totalChanges > 0;

  return (
    <div className="space-y-3">
      {/* Header */}
      <button
        onClick={() => defaultCollapsed && setCollapsed((c) => !c)}
        className={`w-full flex items-center gap-3 ${defaultCollapsed ? "cursor-pointer" : "cursor-default"}`}
      >
        <span className="text-sm font-semibold text-gray-800">
          Changes from v{diff.versionFrom} → v{diff.versionTo}
        </span>
        {significanceBadge(diff.significance)}
        <span className="text-xs text-gray-500">
          {hasChanges ? `${diff.totalChanges} change${diff.totalChanges !== 1 ? "s" : ""}` : "No changes"}
        </span>
        {defaultCollapsed && (
          <span className="ml-auto text-gray-400 text-xs">{collapsed ? "▼" : "▲"}</span>
        )}
      </button>

      {/* Body */}
      {(!defaultCollapsed || !collapsed) && (
        hasChanges ? (
          <div className="space-y-2">
            {/* Sections with changes first, then no-change summaries */}
            {diff.sections.filter((s) => s.changes.length > 0).map((section) => (
              <SectionBlock key={section.section} section={section} />
            ))}
            {diff.sections.some((s) => s.changes.length === 0) && (
              <div className="flex flex-wrap gap-3 px-1 pt-1">
                {diff.sections.filter((s) => s.changes.length === 0).map((section) => (
                  <SectionBlock key={section.section} section={section} />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500">
            No structural changes detected between these two versions.
          </div>
        )
      )}
    </div>
  );
}

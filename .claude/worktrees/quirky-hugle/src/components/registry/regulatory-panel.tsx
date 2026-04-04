"use client";

import { useEffect, useState } from "react";
import type { RegulatoryAssessment, FrameworkAssessment, EvidenceStatus, EUAIActRiskTier } from "@/lib/regulatory/frameworks";

interface RegulatoryPanelProps {
  blueprintId: string;
}

function statusIcon(status: EvidenceStatus): string {
  if (status === "satisfied") return "✓";
  if (status === "partial") return "⚠";
  if (status === "missing") return "✗";
  return "—";
}

function statusColor(status: EvidenceStatus): string {
  if (status === "satisfied") return "text-green-700";
  if (status === "partial") return "text-amber-600";
  if (status === "missing") return "text-red-600";
  return "text-gray-400";
}

function statusBg(status: EvidenceStatus): string {
  if (status === "satisfied") return "bg-green-50 border-green-100";
  if (status === "partial") return "bg-amber-50 border-amber-100";
  if (status === "missing") return "bg-red-50 border-red-100";
  return "bg-gray-50 border-gray-100";
}

function overallBadge(status: "compliant" | "partial" | "gaps_identified") {
  if (status === "compliant")
    return <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700">Compliant</span>;
  if (status === "partial")
    return <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700">Partial</span>;
  return <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700">Gaps Identified</span>;
}

function euAiActTierBadge(tier: EUAIActRiskTier) {
  const cfg: Record<EUAIActRiskTier, { label: string; classes: string }> = {
    "review-required": { label: "Review Required", classes: "bg-orange-100 text-orange-700 border border-orange-200" },
    "high-risk":       { label: "High-Risk AI",    classes: "bg-red-100 text-red-700 border border-red-200" },
    "limited-risk":    { label: "Limited-Risk AI", classes: "bg-amber-100 text-amber-700 border border-amber-200" },
    "minimal-risk":    { label: "Minimal-Risk AI", classes: "bg-green-100 text-green-700 border border-green-200" },
  };
  const { label, classes } = cfg[tier];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${classes}`}>
      {label}
    </span>
  );
}

function NISTStrengthDots({ requirements }: { requirements: FrameworkAssessment["requirements"] }) {
  const functions = [
    { prefix: "nist-govern", label: "GOVERN" },
    { prefix: "nist-map",    label: "MAP" },
    { prefix: "nist-measure",label: "MEASURE" },
    { prefix: "nist-manage", label: "MANAGE" },
  ];

  return (
    <div className="flex flex-wrap gap-4">
      {functions.map(({ prefix, label }) => {
        const reqs = requirements.filter((r) => r.id.startsWith(prefix));
        const satisfied = reqs.filter((r) => r.evidenceStatus === "satisfied").length;
        const total = reqs.length;
        const pct = total > 0 ? satisfied / total : 0;
        const strength = pct >= 1 ? "Strong" : pct >= 0.5 ? "Partial" : "Weak";
        const color = pct >= 1 ? "text-green-700" : pct >= 0.5 ? "text-amber-600" : "text-red-600";
        return (
          <div key={prefix} className="flex flex-col items-center gap-1">
            <span className="text-xs font-semibold text-gray-500">{label}</span>
            <div className="flex gap-0.5">
              {Array.from({ length: total }, (_, i) => (
                <span
                  key={i}
                  className={`inline-block w-3 h-3 rounded-full ${i < satisfied ? "bg-green-500" : "bg-gray-200"}`}
                />
              ))}
            </div>
            <span className={`text-xs font-medium ${color}`}>{strength}</span>
          </div>
        );
      })}
    </div>
  );
}

function FrameworkSection({ framework }: { framework: FrameworkAssessment }) {
  const [expanded, setExpanded] = useState(true);
  const applicable = framework.requirements.filter((r) => r.evidenceStatus !== "not_applicable");

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <span className="font-semibold text-gray-900 text-sm">{framework.frameworkName}</span>
          <span className="text-xs text-gray-400">{framework.version}</span>
          {overallBadge(framework.overallStatus)}
          {framework.euAiActRiskTier && euAiActTierBadge(framework.euAiActRiskTier)}
        </div>
        <span className="text-gray-400 text-sm">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="border-t border-gray-100">
          {/* Summary */}
          <div className="px-4 py-3 bg-gray-50 text-sm text-gray-600 border-b border-gray-100">
            {framework.summary}
          </div>

          {/* NIST function strength visualization */}
          {framework.frameworkId === "nist-rmf" && (
            <div className="px-4 py-4 border-b border-gray-100">
              <NISTStrengthDots requirements={framework.requirements} />
            </div>
          )}

          {/* Requirements table */}
          {applicable.length > 0 && (
            <div className="divide-y divide-gray-100">
              {applicable.map((req) => (
                <div key={req.id} className={`flex items-start gap-3 px-4 py-3 ${statusBg(req.evidenceStatus)}`}>
                  <span className={`mt-0.5 text-base font-bold w-4 flex-shrink-0 ${statusColor(req.evidenceStatus)}`}>
                    {statusIcon(req.evidenceStatus)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-gray-500">{req.code}</span>
                      <span className="text-sm font-medium text-gray-800">{req.title}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{req.description}</p>
                    {req.evidence && (
                      <p className={`text-xs mt-1 font-medium ${statusColor(req.evidenceStatus)}`}>
                        {req.evidence}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function RegulatoryPanel({ blueprintId }: RegulatoryPanelProps) {
  const [assessment, setAssessment] = useState<RegulatoryAssessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/blueprints/${blueprintId}/regulatory`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: RegulatoryAssessment) => setAssessment(data))
      .catch(() => setError("Failed to load regulatory assessment."))
      .finally(() => setLoading(false));
  }, [blueprintId]);

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-gray-100 rounded-lg" />
        ))}
      </div>
    );
  }

  if (error || !assessment) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error ?? "Failed to load regulatory assessment."}
      </div>
    );
  }

  const assessedAt = new Date(assessment.assessedAt).toLocaleString();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Regulatory Framework Assessment</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Deterministic assessment against EU AI Act, SR 11-7, and NIST AI RMF. Assessed {assessedAt}.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {assessment.frameworks.map((framework) => (
          <FrameworkSection key={framework.frameworkId} framework={framework} />
        ))}
      </div>

      <p className="text-xs text-gray-400">
        This assessment is derived from blueprint content, intake context, governance validation results,
        and deployment health data. It is informational and does not constitute legal advice. Consult
        qualified compliance counsel for regulatory determinations.
      </p>
    </div>
  );
}

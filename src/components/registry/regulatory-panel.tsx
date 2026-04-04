"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { RegulatoryAssessment, FrameworkAssessment, EvidenceStatus, EUAIActRiskTier } from "@/lib/regulatory/frameworks";

interface RegulatoryPanelProps {
  blueprintId: string;
}

// ── Fix guidance map ─────────────────────────────────────────────────────────
// Keyed by requirement ID. Each entry provides a short actionable instruction
// and the URL of the Intellios page where the fix can be applied.

interface FixGuidance {
  text: string;
  href: string;
  cta: string;
}

const FIX_GUIDANCE: Record<string, FixGuidance> = {
  // EU AI Act
  "eu-ai-act-risk-tier": {
    text: "Add deployment context, use-case details, and intended domain to the intake session. Risk tier classification requires purpose, domain scope, and affected user population.",
    href: "/intake",
    cta: "Open Intake",
  },
  "eu-ai-act-art-9": {
    text: "Add a Risk Management policy in Governance → Policies. The policy should describe risk identification, assessment, and mitigation procedures for this agent.",
    href: "/governance",
    cta: "Open Governance",
  },
  "eu-ai-act-art-10": {
    text: "Add a Data Governance policy in Governance → Policies covering data quality criteria, lineage, and source documentation.",
    href: "/governance",
    cta: "Open Governance",
  },
  "eu-ai-act-art-11": {
    text: "Complete the blueprint's technical documentation. Open the Blueprint Studio and expand the Description section to include intended purpose, system overview, and performance characteristics.",
    href: `/blueprints`,
    cta: "Open Blueprints",
  },
  "eu-ai-act-art-12": {
    text: "Enable audit logging in Admin → Settings → Governance Rules. Logging must capture agent inputs, outputs, and all decision events.",
    href: "/admin/settings#governance-rules",
    cta: "Open Settings",
  },
  "eu-ai-act-art-13": {
    text: "Add a Transparency Disclosure policy in Governance → Policies. The policy must describe how the agent identifies itself as an AI system to end users.",
    href: "/governance",
    cta: "Open Governance",
  },
  "eu-ai-act-art-14": {
    text: "Add a human-review gate to this agent's Constraints. In the Blueprint Studio, configure a Human Oversight constraint requiring approval for high-stakes decisions.",
    href: `/blueprints`,
    cta: "Open Blueprints",
  },
  "eu-ai-act-art-15": {
    text: "Add an Accuracy & Quality Assurance policy in Governance → Policies detailing performance monitoring, error rates, and correction procedures.",
    href: "/governance",
    cta: "Open Governance",
  },
  "eu-ai-act-art-52": {
    text: "Add a Transparency Disclosure policy in Governance → Policies. Limited-risk AI systems must notify users they are interacting with an AI system.",
    href: "/governance",
    cta: "Open Governance",
  },

  // SR 11-7
  "sr117-iii-a-soundness": {
    text: "Document the conceptual framework in the Blueprint description: explain the model theory, key assumptions, expected behavior, and the rationale for the design choices.",
    href: `/blueprints`,
    cta: "Open Blueprints",
  },
  "sr117-iii-a-documentation": {
    text: "Add a Model Documentation policy in Governance → Policies covering methodology, assumptions, limitations, and validation approach.",
    href: "/governance",
    cta: "Open Governance",
  },
  "sr117-iii-b-data-quality": {
    text: "Add a Data Quality policy in Governance → Policies. Document data sources, quality criteria, validation checks, and handling of data anomalies.",
    href: "/governance",
    cta: "Open Governance",
  },
  "sr117-iii-c-limitations": {
    text: "Document model limitations explicitly in the Blueprint. Add a Limitations section describing known constraints, boundary conditions, and out-of-scope scenarios.",
    href: `/blueprints`,
    cta: "Open Blueprints",
  },
  "sr117-iii-d-monitoring-logging": {
    text: "Enable comprehensive audit logging in Admin → Settings → Governance Rules. Configure logging for all agent inputs, outputs, and material decision events.",
    href: "/admin/settings#governance-rules",
    cta: "Open Settings",
  },
  "sr117-iii-d-monitoring-policy": {
    text: "Add a Monitoring & Surveillance policy in Governance → Policies. Define performance thresholds, alert conditions, and escalation procedures for anomalous behavior.",
    href: "/governance",
    cta: "Open Governance",
  },
  "sr117-iv-validation": {
    text: "Add a Model Validation policy in Governance → Policies and schedule a Periodic Review in Admin → Settings. Validation should include independent testing and outcome analysis.",
    href: "/governance",
    cta: "Open Governance",
  },
  "sr117-v-a-policies": {
    text: "Add a Model Risk Management policy in Governance → Policies covering approval workflows, change management procedures, and exception handling.",
    href: "/governance",
    cta: "Open Governance",
  },
  "sr117-v-c-audit": {
    text: "Enable full audit trail capture in Admin → Settings → Governance Rules. All material model events must be logged with sufficient detail for independent audit.",
    href: "/admin/settings#governance-rules",
    cta: "Open Settings",
  },

  // NIST AI RMF
  "nist-govern-1": {
    text: "Define accountability and roles in Governance → Policies. Assign clear ownership, decision authority, and escalation paths for this agent.",
    href: "/governance",
    cta: "Open Governance",
  },
  "nist-govern-2": {
    text: "Add an AI Risk Management policy in Governance → Policies establishing organizational standards for risk tolerance, governance cadence, and oversight responsibilities.",
    href: "/governance",
    cta: "Open Governance",
  },
  "nist-map-1": {
    text: "Expand the Blueprint description with deployment context: document the environment, affected stakeholders, decision boundaries, and downstream impacts.",
    href: `/blueprints`,
    cta: "Open Blueprints",
  },
  "nist-map-2": {
    text: "Add domain and operational constraints to the Blueprint. Document known failure modes, harm scenarios, and the conditions under which the agent should not operate.",
    href: `/blueprints`,
    cta: "Open Blueprints",
  },
  "nist-measure-1": {
    text: "Add a Quality & Performance policy in Governance → Policies with specific, measurable KPIs and target thresholds for this agent.",
    href: "/governance",
    cta: "Open Governance",
  },
  "nist-measure-2": {
    text: "Configure monitoring thresholds in Admin → Settings → Governance Rules. Establish alerting for performance degradation and anomaly detection.",
    href: "/admin/settings#governance-rules",
    cta: "Open Settings",
  },
  "nist-manage-1": {
    text: "Add an Incident Response policy in Governance → Policies. Define escalation paths, corrective action workflows, and rollback procedures.",
    href: "/governance",
    cta: "Open Governance",
  },
  "nist-manage-2": {
    text: "Configure a Periodic Review schedule in Admin → Settings → Periodic Review. Establish a cadence for reviewing agent performance, risk posture, and policy compliance.",
    href: "/admin/settings#periodic-review",
    cta: "Open Settings",
  },
};

// ── Status helpers ────────────────────────────────────────────────────────────

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
  return "text-text-tertiary";
}

function statusBg(status: EvidenceStatus): string {
  if (status === "satisfied") return "bg-green-50 border-green-100";
  if (status === "partial") return "bg-amber-50 border-amber-100";
  if (status === "missing") return "bg-red-50 border-red-100";
  return "bg-surface-raised border-border-subtle";
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
            <span className="text-xs font-semibold text-text-secondary">{label}</span>
            <div className="flex gap-0.5">
              {Array.from({ length: total }, (_, i) => (
                <span
                  key={i}
                  className={`inline-block w-3 h-3 rounded-full ${i < satisfied ? "bg-green-500" : "bg-surface-muted"}`}
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

// ── FixGuidanceBox ────────────────────────────────────────────────────────────
// Rendered below the evidence line for any requirement with evidenceStatus === "missing".

function FixGuidanceBox({ reqId }: { reqId: string }) {
  const guidance = FIX_GUIDANCE[reqId];
  if (!guidance) return null;

  return (
    <div className="mt-2 flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2">
      {/* Wrench icon (SVG inline — no new dep) */}
      <svg
        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M13.293 3.293a1 1 0 011.414 0l2 2a1 1 0 010 1.414l-8 8a1 1 0 01-.707.293H6a1 1 0 01-1-1v-2a1 1 0 01.293-.707l8-8zM7 13l1-1h.586l6.707-6.707-1.586-1.586L7 11.414V13z"
          clipRule="evenodd"
        />
        <path d="M17.657 5.657a1 1 0 00-1.414-1.414L15 5.486l1.414 1.414 1.243-1.243z" />
      </svg>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-blue-800 mb-0.5">How to fix</p>
        <p className="text-xs text-blue-700 leading-relaxed">{guidance.text}</p>
        <Link
          href={guidance.href}
          className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-blue-700 underline underline-offset-2 hover:text-blue-900"
        >
          {guidance.cta} →
        </Link>
      </div>
    </div>
  );
}

// ── FrameworkSection ──────────────────────────────────────────────────────────

function FrameworkSection({ framework }: { framework: FrameworkAssessment }) {
  const [expanded, setExpanded] = useState(true);
  const applicable = framework.requirements.filter((r) => r.evidenceStatus !== "not_applicable");
  const missingCount = applicable.filter((r) => r.evidenceStatus === "missing").length;

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between px-4 py-3 bg-surface hover:bg-surface-raised transition-colors text-left"
      >
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-semibold text-text text-sm">{framework.frameworkName}</span>
          <span className="text-xs text-text-tertiary">{framework.version}</span>
          {overallBadge(framework.overallStatus)}
          {framework.euAiActRiskTier && euAiActTierBadge(framework.euAiActRiskTier)}
          {missingCount > 0 && (
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700">
              {missingCount} gap{missingCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <span className="text-text-secondary text-sm ml-2 shrink-0">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="border-t border-border-subtle">
          {/* Summary */}
          <div className="px-4 py-3 bg-surface-raised text-sm text-text-secondary border-b border-border-subtle">
            {framework.summary}
          </div>

          {/* NIST function strength visualization */}
          {framework.frameworkId === "nist-rmf" && (
            <div className="px-4 py-4 border-b border-border-subtle">
              <NISTStrengthDots requirements={framework.requirements} />
            </div>
          )}

          {/* Requirements table */}
          {applicable.length > 0 && (
            <div className="divide-y divide-border-subtle">
              {applicable.map((req) => (
                <div key={req.id} className={`px-4 py-3 ${statusBg(req.evidenceStatus)}`}>
                  <div className="flex items-start gap-3">
                    <span className={`mt-0.5 text-base font-bold w-4 flex-shrink-0 ${statusColor(req.evidenceStatus)}`}>
                      {statusIcon(req.evidenceStatus)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono text-text-secondary">{req.code}</span>
                        <span className="text-sm font-medium text-text">{req.title}</span>
                      </div>
                      <p className="text-xs text-text-secondary mt-0.5">{req.description}</p>
                      {req.evidence && (
                        <p className={`text-xs mt-1 font-medium ${statusColor(req.evidenceStatus)}`}>
                          {req.evidence}
                        </p>
                      )}
                      {/* Contextual fix guidance — only for missing requirements */}
                      {req.evidenceStatus === "missing" && (
                        <FixGuidanceBox reqId={req.id} />
                      )}
                    </div>
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

// ── RegulatoryPanel ───────────────────────────────────────────────────────────

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
          <div key={i} className="h-16 bg-surface-muted rounded-lg" />
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
  const totalGaps = assessment.frameworks.reduce((sum, f) =>
    sum + f.requirements.filter((r) => r.evidenceStatus === "missing").length, 0
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-text">Regulatory Framework Assessment</h3>
          <p className="text-xs text-text-secondary mt-0.5">
            Deterministic assessment against EU AI Act, SR 11-7, and NIST AI RMF. Assessed {assessedAt}.
            {totalGaps > 0 && (
              <span className="ml-1 font-medium text-blue-700">
                {totalGaps} gap{totalGaps !== 1 ? "s" : ""} with fix guidance below.
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {assessment.frameworks.map((framework) => (
          <FrameworkSection key={framework.frameworkId} framework={framework} />
        ))}
      </div>

      <p className="text-xs text-text-tertiary">
        This assessment is derived from blueprint content, intake context, governance validation results,
        and deployment health data. It is informational and does not constitute legal advice. Consult
        qualified compliance counsel for regulatory determinations.
      </p>
    </div>
  );
}

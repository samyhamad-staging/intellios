"use client";

import { use, useState, useCallback } from "react";
import Link from "next/link";
import { BlueprintView } from "@/components/blueprint/blueprint-view";
import { ValidationReportView } from "@/components/governance/validation-report";
import { ABP } from "@/lib/types/abp";
import { ValidationReport } from "@/lib/governance/types";

interface BlueprintPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ abp?: string; agentId?: string; vr?: string }>;
}

// ─── Section stepper ─────────────────────────────────────────────────────────

interface StepperSection {
  id: string;
  label: string;
  filled: boolean;
}

function getSections(abp: ABP | null): StepperSection[] {
  if (!abp) return [];
  return [
    {
      id: "identity",
      label: "Identity",
      filled: !!abp.identity?.name,
    },
    {
      id: "instructions",
      label: "Instructions",
      filled: !!abp.capabilities?.instructions,
    },
    {
      id: "tools",
      label: "Tools",
      filled: (abp.capabilities?.tools?.length ?? 0) > 0,
    },
    {
      id: "knowledge",
      label: "Knowledge",
      filled: (abp.capabilities?.knowledge_sources?.length ?? 0) > 0,
    },
    {
      id: "constraints",
      label: "Constraints",
      filled:
        !!(abp.constraints?.allowed_domains?.length) ||
        !!(abp.constraints?.denied_actions?.length) ||
        !!(abp.constraints?.max_tokens_per_response) ||
        !!(abp.constraints?.rate_limits),
    },
    {
      id: "governance",
      label: "Governance",
      filled: (abp.governance?.policies?.length ?? 0) > 0,
    },
    {
      id: "audit",
      label: "Audit",
      filled: !!abp.governance?.audit,
    },
  ];
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BlueprintPage({ params, searchParams }: BlueprintPageProps) {
  const { id } = use(params);
  const { abp: encodedAbp, agentId, vr: encodedVr } = use(searchParams);

  const [abp, setAbp] = useState<ABP | null>(() => {
    if (encodedAbp) {
      try { return JSON.parse(atob(encodedAbp)) as ABP; } catch { return null; }
    }
    return null;
  });

  const [validationReport, setValidationReport] = useState<ValidationReport | null>(() => {
    if (encodedVr) {
      try { return JSON.parse(atob(encodedVr)) as ValidationReport; } catch { return null; }
    }
    return null;
  });

  const [loading, setLoading] = useState(!abp);
  const [error, setError] = useState<string | null>(null);
  const [change, setChange] = useState("");
  const [refining, setRefining] = useState(false);
  const [refinementCount, setRefinementCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [validating, setValidating] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  // Fetch if not already loaded from URL params
  if (loading && !abp) {
    fetch(`/api/blueprints/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setAbp(data.abp as ABP);
        setRefinementCount(parseInt(data.refinementCount ?? "0", 10));
        if (data.validationReport) setValidationReport(data.validationReport as ValidationReport);
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
      setValidationReport(null);
      setChange("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Refinement failed");
    } finally {
      setRefining(false);
    }
  }, [id, change, refining]);

  const handleValidate = useCallback(async () => {
    setValidating(true);
    try {
      const res = await fetch(`/api/blueprints/${id}/validate`, { method: "POST" });
      const data = await res.json();
      if (data.report) setValidationReport(data.report as ValidationReport);
    } catch { /* non-critical */ }
    finally { setValidating(false); }
  }, [id]);

  const handleSubmitForReview = useCallback(async () => {
    if (!agentId || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/blueprints/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "in_review" }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Submit failed");
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  }, [id, agentId, submitting]);

  // ── Derived state ──────────────────────────────────────────────────────────
  const sections = getSections(abp);
  const filledCount = sections.filter((s) => s.filled).length;

  const blockerCount = validationReport
    ? validationReport.violations.filter((v) => v.severity === "error").length
    : null;

  const canSubmit =
    !submitted &&
    agentId &&
    !submitting &&
    (blockerCount === null || blockerCount === 0);

  const submitLabel = submitted
    ? "✓ Submitted for Review"
    : submitting
    ? "Submitting…"
    : blockerCount !== null && blockerCount > 0
    ? `${blockerCount} blocker${blockerCount === 1 ? "" : "s"} — resolve to submit`
    : !validationReport
    ? "Validate before submitting"
    : "Submit for Review";

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/pipeline"
            className="text-xs text-gray-400 hover:text-gray-700 shrink-0"
          >
            ← Pipeline
          </Link>
          <span className="text-gray-300">/</span>
          <h1 className="truncate text-base font-semibold text-gray-900">
            {abp?.identity.name ?? "Agent Blueprint"}
          </h1>
          {refinementCount > 0 && (
            <span className="shrink-0 text-xs text-gray-400">
              {refinementCount} refinement{refinementCount === 1 ? "" : "s"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
            draft
          </span>
          <span className="text-xs text-gray-400 font-mono">{id.slice(0, 8)}</span>
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

      {/* Three-column body */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left rail: Section stepper */}
        <aside className="w-48 shrink-0 border-r border-gray-200 bg-white overflow-y-auto">
          <div className="px-4 pt-5 pb-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Sections
            </p>
            {!loading && abp && (
              <p className="mt-0.5 text-xs text-gray-400">
                {filledCount}/{sections.length} filled
              </p>
            )}
          </div>

          <nav className="px-2 pb-4">
            {loading && (
              <div className="space-y-1.5 px-2 py-3">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="h-7 animate-pulse rounded bg-gray-100" />
                ))}
              </div>
            )}
            {!loading && sections.map((section) => (
              <button
                key={section.id}
                onClick={() => {
                  setActiveSection(section.id === activeSection ? null : section.id);
                  // Scroll to section heading in main panel
                  const el = document.getElementById(`section-${section.id}`);
                  el?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  activeSection === section.id
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-xs ${
                    section.filled
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {section.filled ? "✓" : "·"}
                </span>
                <span className="truncate">{section.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Center: Blueprint content */}
        <main className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex h-full items-center justify-center text-gray-400 text-sm">
              <div className="text-center">
                <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-gray-600" />
                Generating blueprint…
              </div>
            </div>
          )}
          {error && !abp && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
              {error}
            </div>
          )}
          {abp && (
            <div id="blueprint-content">
              <BlueprintView abp={abp} />
            </div>
          )}
        </main>

        {/* Right rail: Submit + Governance + Refinement */}
        <aside className="w-80 shrink-0 border-l border-gray-200 bg-white flex flex-col overflow-y-auto">

          {/* Submit for Review */}
          {agentId && (
            <div className="border-b border-gray-200 px-5 py-4">
              <h2 className="text-sm font-semibold">Submit for Review</h2>

              {submitted ? (
                <div className="mt-3 rounded-lg bg-green-50 border border-green-200 px-4 py-3">
                  <p className="text-sm font-medium text-green-800">✓ Submitted for review</p>
                  <p className="mt-0.5 text-xs text-green-700">
                    This blueprint is now in the reviewer queue.
                  </p>
                  <Link
                    href={`/registry/${agentId}`}
                    className="mt-2 inline-block text-xs text-green-700 underline hover:text-green-900"
                  >
                    View in Registry →
                  </Link>
                </div>
              ) : (
                <>
                  {/* Validation status */}
                  <div className="mt-2 mb-3">
                    {!validationReport && (
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-400">
                          {validating ? "Validating…" : "Not yet validated"}
                        </p>
                        {!validating && !loading && (
                          <button
                            onClick={handleValidate}
                            className="text-xs text-gray-500 underline hover:text-gray-900"
                          >
                            Validate now
                          </button>
                        )}
                      </div>
                    )}
                    {validationReport && (
                      <div
                        className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${
                          validationReport.valid
                            ? "bg-green-50 text-green-700"
                            : blockerCount! > 0
                            ? "bg-red-50 text-red-700"
                            : "bg-yellow-50 text-yellow-700"
                        }`}
                      >
                        <span>
                          {validationReport.valid
                            ? "✓ Passes governance"
                            : blockerCount! > 0
                            ? `✗ ${blockerCount} error${blockerCount === 1 ? "" : "s"} — must resolve`
                            : `⚠ ${validationReport.violations.filter(v => v.severity === "warning").length} warning${validationReport.violations.filter(v => v.severity === "warning").length === 1 ? "" : "s"}`}
                        </span>
                        <button
                          onClick={handleValidate}
                          className="ml-auto underline opacity-60 hover:opacity-100"
                        >
                          Re-run
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleSubmitForReview}
                    disabled={!canSubmit || loading}
                    className={`w-full rounded-lg py-2.5 text-sm font-medium transition-colors ${
                      canSubmit && !loading
                        ? "bg-yellow-600 text-white hover:bg-yellow-700"
                        : "bg-gray-100 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    {submitLabel}
                  </button>
                  {error && (
                    <p className="mt-1.5 text-xs text-red-600">{error}</p>
                  )}
                </>
              )}
            </div>
          )}

          {/* Governance violations detail */}
          {validationReport && !validationReport.valid && (
            <div className="border-b border-gray-200 px-5 py-4">
              <h2 className="text-sm font-semibold text-gray-900">Violations</h2>
              <div className="mt-3 space-y-2">
                {validationReport.violations.map((v, i) => (
                  <div
                    key={i}
                    className={`rounded-lg border p-3 text-xs ${
                      v.severity === "error"
                        ? "border-red-200 bg-red-50"
                        : "border-yellow-200 bg-yellow-50"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className={`shrink-0 rounded px-1 py-0.5 text-xs font-medium ${
                          v.severity === "error"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {v.severity}
                      </span>
                      <div>
                        <p className="font-medium text-gray-900">{v.message}</p>
                        {v.suggestion && (
                          <p className="mt-0.5 text-gray-600">{v.suggestion}</p>
                        )}
                        <p className="mt-0.5 font-mono text-gray-400">{v.field}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Governance section (if no violations) */}
          {validationReport?.valid && (
            <div className="border-b border-gray-200 px-5 py-4">
              <h2 className="text-sm font-semibold">Governance</h2>
              <div className="mt-3">
                <ValidationReportView
                  report={validationReport}
                  blueprintId={id}
                  onRevalidate={setValidationReport}
                />
              </div>
            </div>
          )}

          {/* Validate button if no report yet and no agentId CTA above */}
          {!agentId && !validationReport && (
            <div className="border-b border-gray-200 px-5 py-4">
              <h2 className="text-sm font-semibold">Governance</h2>
              <div className="mt-3 flex items-center justify-between">
                <p className="text-xs text-gray-400">
                  {loading ? "Running validation…" : "Not yet validated"}
                </p>
                {!loading && (
                  <button
                    onClick={handleValidate}
                    className="text-xs text-gray-500 hover:text-gray-900 underline"
                  >
                    Validate now
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Refinement */}
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
              rows={4}
            />

            {error && !submitting && (
              <p className="text-xs text-red-600">{error}</p>
            )}

            <button
              onClick={handleRefine}
              disabled={!change.trim() || refining || loading}
              className="rounded-lg bg-gray-900 py-2 text-sm text-white hover:bg-gray-800 disabled:opacity-40"
            >
              {refining ? "Refining…" : "Apply Changes"}
            </button>

            <p className="text-center text-xs text-gray-400">⌘ Enter to apply</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

"use client";

import { use, useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { BlueprintView } from "@/components/blueprint/blueprint-view";
import { ValidationReportView } from "@/components/governance/validation-report";
import { ABP } from "@/lib/types/abp";
import { ValidationReport } from "@/lib/governance/types";
import type { TestRun } from "@/lib/testing/types";

interface BlueprintPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ agentId?: string }>;
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
    {
      id: "ownership",
      label: "Ownership",
      filled: !!(abp.ownership?.businessUnit || abp.ownership?.ownerEmail || abp.ownership?.costCenter),
    },
  ];
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BlueprintPage({ params, searchParams }: BlueprintPageProps) {
  const { id } = use(params);
  const { agentId: agentIdParam } = use(searchParams);

  // agentId lives in state so the API fetch can populate it when navigating directly
  // to /blueprints/[id] without going through the generate redirect.
  const [agentIdState, setAgentIdState] = useState<string | null>(agentIdParam ?? null);

  const [abp, setAbp] = useState<ABP | null>(null);

  const [validationReport, setValidationReport] = useState<ValidationReport | null>(null);
  // reportIsFresh = false when the report was loaded from the DB (may not reflect
  // policies that were added or changed after it was run). Set to true only after
  // validation is run in this browser session.
  const [reportIsFresh, setReportIsFresh] = useState<boolean>(false);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [change, setChange] = useState("");
  const [refining, setRefining] = useState(false);
  const [refinementCount, setRefinementCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [validating, setValidating] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  // Phase 23: Test Harness state for workbench widget
  const [testCaseCount, setTestCaseCount] = useState<number>(0);
  const [latestTestRun, setLatestTestRun] = useState<TestRun | null>(null);
  const [testDataLoaded, setTestDataLoaded] = useState(false);
  const [runningWorkbenchTests, setRunningWorkbenchTests] = useState(false);
  const [testRunExpanded, setTestRunExpanded] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);

  const [blueprintStatus, setBlueprintStatus] = useState<string>("draft");
  const [reviewComment, setReviewComment] = useState<string | null>(null);

  const [ownershipOpen, setOwnershipOpen] = useState(false);
  const [ownershipDraft, setOwnershipDraft] = useState<{
    businessUnit: string;
    ownerEmail: string;
    costCenter: string;
    deploymentEnvironment: string;
    dataClassification: string;
  }>({ businessUnit: "", ownerEmail: "", costCenter: "", deploymentEnvironment: "", dataClassification: "" });
  const [savingOwnership, setSavingOwnership] = useState(false);

  // Always fetch from API on mount — blueprint content is never passed via URL.
  if (loading && !abp) {
    fetch(`/api/blueprints/${id}`)
      .then((r) => r.json())
      .then((data) => {
        const loadedAbp = data.abp as ABP;
        setAbp(loadedAbp);
        setRefinementCount(parseInt(data.refinementCount ?? "0", 10));
        if (data.agentId) setAgentIdState(data.agentId as string);
        if (data.sessionId) setSessionId(data.sessionId as string);
        if (data.status) setBlueprintStatus(data.status as string);
        setReviewComment((data.reviewComment as string | null) ?? null);
        // Pre-populate ownership draft from existing ABP
        if (loadedAbp.ownership) {
          setOwnershipDraft({
            businessUnit: loadedAbp.ownership.businessUnit ?? "",
            ownerEmail: loadedAbp.ownership.ownerEmail ?? "",
            costCenter: loadedAbp.ownership.costCenter ?? "",
            deploymentEnvironment: loadedAbp.ownership.deploymentEnvironment ?? "",
            dataClassification: loadedAbp.ownership.dataClassification ?? "",
          });
        }
        if (data.validationReport) {
          setValidationReport(data.validationReport as ValidationReport);
          // Report came from DB — may not reflect policy changes since it was run
          setReportIsFresh(false);
        }
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
      // Auto-validate so the designer doesn't need a manual click before submitting.
      setValidating(true);
      try {
        const vRes = await fetch(`/api/blueprints/${id}/validate`, { method: "POST" });
        const vData = await vRes.json();
        if (vData.report) {
          setValidationReport(vData.report as ValidationReport);
          setReportIsFresh(true);
        }
      } catch { /* non-critical: user can re-validate manually if this fails */ }
      finally { setValidating(false); }
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
      if (data.report) {
        setValidationReport(data.report as ValidationReport);
        setReportIsFresh(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Validation failed");
    } finally { setValidating(false); }
  }, [id]);

  const handleSaveOwnership = useCallback(async () => {
    setSavingOwnership(true);
    try {
      const res = await fetch(`/api/blueprints/${id}/ownership`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessUnit: ownershipDraft.businessUnit || null,
          ownerEmail: ownershipDraft.ownerEmail || null,
          costCenter: ownershipDraft.costCenter || null,
          deploymentEnvironment: ownershipDraft.deploymentEnvironment || null,
          dataClassification: ownershipDraft.dataClassification || null,
        }),
      });
      if (res.ok) {
        // Update local ABP with saved ownership
        const de = ownershipDraft.deploymentEnvironment as "production" | "staging" | "sandbox" | "internal" | undefined || undefined;
        const dc = ownershipDraft.dataClassification as "public" | "internal" | "confidential" | "regulated" | undefined || undefined;
        setAbp((prev) => prev ? {
          ...prev,
          ownership: {
            businessUnit: ownershipDraft.businessUnit || undefined,
            ownerEmail: ownershipDraft.ownerEmail || undefined,
            costCenter: ownershipDraft.costCenter || undefined,
            deploymentEnvironment: de,
            dataClassification: dc,
          },
        } : prev);
      }
    } catch { /* non-critical */ }
    finally { setSavingOwnership(false); }
  }, [id, ownershipDraft]);

  // Simulated step progress during blueprint generation
  const GENERATION_STEPS = [
    "Building agent identity…",
    "Defining capabilities and tools…",
    "Configuring governance constraints…",
    "Finalizing blueprint…",
  ];
  const GENERATION_STEP_DELAYS = [2500, 3000, 3000];
  useEffect(() => {
    if (!loading || abp) {
      setGenerationStep(0);
      return;
    }
    let step = 0;
    setGenerationStep(0);
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    let elapsed = 0;
    for (let i = 0; i < GENERATION_STEP_DELAYS.length; i++) {
      elapsed += GENERATION_STEP_DELAYS[i];
      const s = i + 1;
      timeouts.push(setTimeout(() => setGenerationStep(s), elapsed));
    }
    return () => timeouts.forEach(clearTimeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, abp]);

  // Load test data (case count + latest run) once agentId + blueprintId are known
  useEffect(() => {
    if (!agentIdState || !id || testDataLoaded) return;
    setTestDataLoaded(true);
    Promise.all([
      fetch(`/api/registry/${agentIdState}/test-cases`),
      fetch(`/api/blueprints/${id}/test-runs?limit=1`),
    ])
      .then(async ([casesRes, runsRes]) => {
        if (casesRes.ok) {
          const d = await casesRes.json();
          setTestCaseCount((d.testCases ?? []).length);
        }
        if (runsRes.ok) {
          const d = await runsRes.json();
          const runs = d.testRuns ?? [];
          setLatestTestRun(runs[0] ?? null);
        }
      })
      .catch(() => {}); // non-critical
  }, [agentIdState, id, testDataLoaded]);

  const handleRunWorkbenchTests = useCallback(async () => {
    if (!id || runningWorkbenchTests) return;
    setRunningWorkbenchTests(true);
    try {
      const res = await fetch(`/api/blueprints/${id}/test-runs`, { method: "POST" });
      if (res.ok) {
        const d = await res.json();
        setLatestTestRun(d.testRun ?? null);
      }
    } catch { /* non-critical */ }
    finally { setRunningWorkbenchTests(false); }
  }, [id, runningWorkbenchTests]);

  const handleSubmitForReview = useCallback(async () => {
    if (!agentIdState || submitting) return;
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
  }, [id, agentIdState, submitting]);

  // ── Derived state ──────────────────────────────────────────────────────────
  const sections = getSections(abp);
  const filledCount = sections.filter((s) => s.filled).length;

  const blockerCount = validationReport
    ? validationReport.violations.filter((v) => v.severity === "error").length
    : null;

  const canSubmit =
    !submitted &&
    !!agentIdState &&
    !submitting &&
    !!validationReport &&
    blockerCount === 0;

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
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            blueprintStatus === "rejected"
              ? "bg-red-100 text-red-700"
              : blueprintStatus === "in_review"
              ? "bg-amber-100 text-amber-700"
              : blueprintStatus === "approved"
              ? "bg-green-100 text-green-700"
              : blueprintStatus === "deployed"
              ? "bg-blue-100 text-blue-700"
              : "bg-gray-100 text-gray-600"
          }`}>
            {blueprintStatus.replace("_", " ")}
          </span>
          <span className="text-xs text-gray-400 font-mono">{id.slice(0, 8)}</span>
          {sessionId && (
            <Link
              href={`/intake/${sessionId}`}
              className="rounded-lg border border-gray-200 px-2.5 py-0.5 text-xs text-gray-600 hover:border-gray-400 hover:text-gray-900 transition-colors"
            >
              ← Intake Session
            </Link>
          )}
          {agentIdState && (
            <Link
              href={`/registry/${agentIdState}`}
              className="rounded-lg border border-gray-200 px-2.5 py-0.5 text-xs text-gray-600 hover:border-gray-400 hover:text-gray-900 transition-colors"
            >
              View in Registry →
            </Link>
          )}
        </div>
      </header>

      {/* Rejection / feedback banner */}
      {reviewComment && (
        <div className={`shrink-0 border-b px-6 py-3 flex items-start gap-3 ${
          blueprintStatus === "rejected"
            ? "bg-red-50 border-red-200"
            : "bg-amber-50 border-amber-200"
        }`}>
          <span className={`shrink-0 text-sm font-semibold ${
            blueprintStatus === "rejected" ? "text-red-700" : "text-amber-700"
          }`}>
            {blueprintStatus === "rejected" ? "Rejected:" : "Changes requested:"}
          </span>
          <span className={`text-sm ${
            blueprintStatus === "rejected" ? "text-red-700" : "text-amber-700"
          }`}>
            {reviewComment}
          </span>
        </div>
      )}

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
              <div className="text-center space-y-3">
                <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-gray-600" />
                <p className="text-sm text-gray-500 font-medium">{GENERATION_STEPS[generationStep]}</p>
                <div className="flex justify-center gap-1.5">
                  {GENERATION_STEPS.map((_, i) => (
                    <span
                      key={i}
                      className={`h-1.5 w-1.5 rounded-full transition-colors ${i <= generationStep ? "bg-indigo-400" : "bg-gray-200"}`}
                    />
                  ))}
                </div>
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
          {agentIdState && (
            <div className="border-b border-gray-200 px-5 py-4">
              <h2 className="text-sm font-semibold">Submit for Review</h2>

              {submitted ? (
                <div className="mt-3 rounded-lg bg-green-50 border border-green-200 px-4 py-3">
                  <p className="text-sm font-medium text-green-800">✓ Submitted for review</p>
                  <p className="mt-0.5 text-xs text-green-700">
                    This blueprint is now in the reviewer queue.
                  </p>
                  <Link
                    href={`/registry/${agentIdState}`}
                    className="mt-2 inline-block text-xs text-green-700 underline hover:text-green-900"
                  >
                    View in Registry →
                  </Link>
                </div>
              ) : (
                <>
                  {/* Validation status */}
                  <div className={`mt-2 mb-3 space-y-2 transition-opacity ${(refining || validating) && validationReport ? "opacity-50 pointer-events-none" : ""}`}>
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
                      <>
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
                        {/* Staleness warning: report loaded from DB, policies may have changed */}
                        {!reportIsFresh && (
                          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                            <span className="shrink-0 mt-0.5">⚠</span>
                            <span>
                              Saved from a previous session — re-validate to check against current policies before submitting.
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <button
                    onClick={!validationReport ? handleValidate : handleSubmitForReview}
                    disabled={loading || validating || (!!validationReport && !canSubmit)}
                    className={`w-full rounded-lg py-2.5 text-sm font-medium transition-colors ${
                      !loading && !validating && (canSubmit || !validationReport)
                        ? "bg-yellow-600 text-white hover:bg-yellow-700"
                        : "bg-gray-100 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    {validating && !validationReport ? "Validating…" : submitLabel}
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
                          <div className="mt-1.5 border-l-2 border-blue-300 bg-blue-50 rounded px-2 py-1">
                            <p className="text-blue-600 text-xs font-medium mb-0.5">✦ Suggested fix</p>
                            <p className="text-blue-800 text-xs">{v.suggestion}</p>
                          </div>
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
          {!agentIdState && !validationReport && (
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

          {/* Phase 23: Test Suite Widget — shown when we have an agentId (agent exists in registry) */}
          {agentIdState && (
            <div className="border-b border-gray-200 px-5 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">Test Suite</h2>
                {testCaseCount > 0 && (
                  <button
                    onClick={handleRunWorkbenchTests}
                    disabled={runningWorkbenchTests}
                    className="rounded-lg bg-gray-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-gray-700 disabled:opacity-50"
                  >
                    {runningWorkbenchTests ? "Running…" : "Run Tests"}
                  </button>
                )}
              </div>
              {testCaseCount === 0 ? (
                <p className="mt-1.5 text-xs text-gray-400">
                  No test cases defined.{" "}
                  {agentIdState && (
                    <Link href={`/registry/${agentIdState}?tab=tests`} className="underline hover:text-gray-700">
                      Add test cases →
                    </Link>
                  )}
                </p>
              ) : (
                <div className="mt-2 space-y-1.5">
                  <p className="text-xs text-gray-500">
                    {testCaseCount} case{testCaseCount !== 1 ? "s" : ""}
                    {latestTestRun && (
                      <> · Last run:{" "}
                        <button
                          onClick={() => setTestRunExpanded((e) => !e)}
                          className={`font-medium underline decoration-dotted ${latestTestRun.status === "passed" ? "text-green-700" : "text-red-700"}`}
                        >
                          {latestTestRun.passedCases}/{latestTestRun.totalCases} passed
                        </button>
                        <span className="ml-1 text-gray-400">{testRunExpanded ? "▲" : "▼"}</span>
                      </>
                    )}
                  </p>
                  {/* Expandable judge rationale per test case */}
                  {testRunExpanded && latestTestRun?.testResults && latestTestRun.testResults.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      {latestTestRun.testResults.map((tr) => (
                        <div key={tr.testCaseId} className={`rounded-md border px-2.5 py-2 text-xs ${tr.status === "passed" ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
                          <div className="flex items-center gap-1.5">
                            <span>{tr.status === "passed" ? "✓" : "✗"}</span>
                            <span className={`font-medium ${tr.status === "passed" ? "text-green-800" : "text-red-800"}`}>{tr.name}</span>
                          </div>
                          {tr.status !== "passed" && tr.evaluationRationale && (
                            <p className="mt-1 text-gray-600 italic">Judge: {tr.evaluationRationale}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Amber strip: test cases exist but no passing run */}
                  {(!latestTestRun || latestTestRun.status !== "passed") && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                      ⚠ Run tests before submitting for review
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Ownership & Classification */}
          <div className="border-b border-gray-200">
            <button
              onClick={() => setOwnershipOpen((o) => !o)}
              className="flex w-full items-center justify-between px-5 py-4 text-left"
            >
              <div>
                <h2 className="text-sm font-semibold">Ownership &amp; Classification</h2>
                <p className="text-xs text-gray-400">
                  {abp?.ownership?.businessUnit
                    ? `${abp.ownership.businessUnit}${abp.ownership.ownerEmail ? ` · ${abp.ownership.ownerEmail}` : ""}`
                    : "Not set"}
                </p>
              </div>
              <span className="text-gray-400 text-xs">{ownershipOpen ? "▴" : "▾"}</span>
            </button>
            {ownershipOpen && (
              <div className="border-t border-gray-100 px-5 pb-4 pt-3 space-y-3">
                {(
                  [
                    { key: "businessUnit", label: "Business Unit", type: "text", placeholder: "e.g. Risk & Compliance" },
                    { key: "ownerEmail", label: "Owner Email", type: "email", placeholder: "owner@company.com" },
                    { key: "costCenter", label: "Cost Center", type: "text", placeholder: "e.g. CC-1234" },
                  ] as { key: keyof typeof ownershipDraft; label: string; type: string; placeholder: string }[]
                ).map(({ key, label, type, placeholder }) => (
                  <div key={key}>
                    <label className="text-xs font-medium text-gray-500">{label}</label>
                    <input
                      type={type}
                      value={ownershipDraft[key]}
                      onChange={(e) => setOwnershipDraft((d) => ({ ...d, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs focus:border-gray-400 focus:outline-none"
                    />
                  </div>
                ))}
                <div>
                  <label className="text-xs font-medium text-gray-500">Deployment Environment</label>
                  <select
                    value={ownershipDraft.deploymentEnvironment}
                    onChange={(e) => setOwnershipDraft((d) => ({ ...d, deploymentEnvironment: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs focus:border-gray-400 focus:outline-none"
                  >
                    <option value="">— Select —</option>
                    <option value="production">Production</option>
                    <option value="staging">Staging</option>
                    <option value="sandbox">Sandbox</option>
                    <option value="internal">Internal</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Data Classification</label>
                  <select
                    value={ownershipDraft.dataClassification}
                    onChange={(e) => setOwnershipDraft((d) => ({ ...d, dataClassification: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs focus:border-gray-400 focus:outline-none"
                  >
                    <option value="">— Select —</option>
                    <option value="public">Public</option>
                    <option value="internal">Internal</option>
                    <option value="confidential">Confidential</option>
                    <option value="regulated">Regulated</option>
                  </select>
                </div>
                <button
                  onClick={handleSaveOwnership}
                  disabled={savingOwnership}
                  className="w-full rounded-lg bg-gray-900 py-1.5 text-xs font-medium text-white hover:bg-gray-700 disabled:opacity-50"
                >
                  {savingOwnership ? "Saving…" : "Save Ownership"}
                </button>
              </div>
            )}
          </div>

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

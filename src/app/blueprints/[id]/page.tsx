"use client";

import { use, useState, useCallback, useEffect, useRef } from "react";
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
  // Multi-turn refinement history
  const [refinementHistory, setRefinementHistory] = useState<Array<{ role: "user" | "assistant"; content: string; timestamp: string }>>([]);
  const refinementEndRef = useRef<HTMLDivElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [validating, setValidating] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);
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
  const [exportingEvidence, setExportingEvidence] = useState(false);
  const [approvalProgress, setApprovalProgress] = useState<Array<{
    step: number; role: string; label: string; approvedBy: string; approvedAt: string; decision: string; comment: string | null;
  }>>([]);
  const [currentApprovalStep, setCurrentApprovalStep] = useState<number>(0);
  const [approvalChain, setApprovalChain] = useState<Array<{ step: number; role: string; label: string }>>([]);

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
        if (Array.isArray(data.approvalProgress)) setApprovalProgress(data.approvalProgress);
        if (typeof data.currentApprovalStep === "number") setCurrentApprovalStep(data.currentApprovalStep);
        if (Array.isArray(data.approvalChain)) setApprovalChain(data.approvalChain);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load blueprint");
        setLoading(false);
      });
  }

  const handleRefine = useCallback(async () => {
    if (!change.trim() || refining) return;
    const userMsg = change.trim();
    setRefining(true);
    setError(null);
    // Add user message to history immediately
    setRefinementHistory((prev) => [...prev, { role: "user", content: userMsg, timestamp: new Date().toISOString() }]);
    setChange("");
    try {
      const res = await fetch(`/api/blueprints/${id}/refine`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ change: userMsg }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Refinement failed");
      }
      const data = await res.json();
      setAbp(data.abp as ABP);
      setRefinementCount(parseInt(data.refinementCount ?? "0", 10));
      // Add assistant response to history
      setRefinementHistory((prev) => [...prev, {
        role: "assistant",
        content: `Applied changes. Blueprint updated to refinement #${parseInt(data.refinementCount ?? "0", 10)}.`,
        timestamp: new Date().toISOString(),
      }]);
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
      const errMsg = err instanceof Error ? err.message : "Refinement failed";
      setError(errMsg);
      // Add error to history so user can see it in context
      setRefinementHistory((prev) => [...prev, {
        role: "assistant",
        content: `Error: ${errMsg}. Try again or rephrase your request.`,
        timestamp: new Date().toISOString(),
      }]);
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

  const handleRegenerate = useCallback(async () => {
    setRegenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/blueprints/${id}/regenerate`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Regeneration failed");
      }
      const data = await res.json();
      setAbp(data.abp as ABP);
      setValidationReport(data.validationReport ?? null);
      setReportIsFresh(true);
      setRefinementCount(0);
      setConfirmRegenerate(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Regeneration failed");
    } finally {
      setRegenerating(false);
    }
  }, [id]);

  const handleExportEvidence = useCallback(async () => {
    if (exportingEvidence) return;
    setExportingEvidence(true);
    try {
      const res = await fetch(`/api/blueprints/${id}/evidence-package`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(`Export failed: ${(err as { error?: string }).error ?? res.statusText}`);
        return;
      }
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match ? match[1] : `evidence-package-${id}.json`;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      alert("Export failed. Please try again.");
    } finally {
      setExportingEvidence(false);
    }
  }, [id, exportingEvidence]);

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

  // Auto-scroll refinement chat to bottom when new messages arrive
  useEffect(() => {
    refinementEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [refinementHistory]);

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
      <header className="flex shrink-0 items-center justify-between border-b border-border bg-surface px-6 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/pipeline"
            className="text-xs text-text-tertiary hover:text-text shrink-0"
          >
            ← Pipeline
          </Link>
          <span className="text-text-tertiary">/</span>
          <h1 className="truncate text-base font-semibold text-text">
            {abp?.identity.name ?? "Agent Blueprint"}
          </h1>
          {refinementCount > 0 && (
            <span className="shrink-0 text-xs text-text-tertiary">
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
              : "bg-surface-muted text-text-secondary"
          }`}>
            {blueprintStatus.replace("_", " ")}
          </span>
          <span className="text-xs text-text-tertiary font-mono">{id.slice(0, 8)}</span>
          {sessionId && (
            <Link
              href={`/intake/${sessionId}`}
              className="rounded-lg border border-border px-2.5 py-0.5 text-xs text-text-secondary hover:border-border-strong hover:text-text transition-colors"
            >
              ← Intake Session
            </Link>
          )}
          {agentIdState && (
            <Link
              href={`/registry/${agentIdState}`}
              className="rounded-lg border border-border px-2.5 py-0.5 text-xs text-text-secondary hover:border-border-strong hover:text-text transition-colors"
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

      {/* Approval progress tracker — visible only when in_review and a multi-step chain exists */}
      {blueprintStatus === "in_review" && approvalChain.length > 1 && (
        <div className="shrink-0 border-b border-border bg-surface-raised px-6 py-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider mr-2">
              Review progress
            </span>
            {approvalChain.map((chainStep, i) => {
              const completed = approvalProgress.find((p) => p.step === i);
              const isCurrent = !completed && i === currentApprovalStep;
              const isPending = !completed && i > currentApprovalStep;
              return (
                <div key={i} className="flex items-center gap-1.5">
                  {i > 0 && <span className="text-text-tertiary text-xs">→</span>}
                  <div
                    title={completed ? `Approved by ${completed.approvedBy} · ${new Date(completed.approvedAt).toLocaleDateString()}` : chainStep.label}
                    className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border ${
                      completed
                        ? "bg-green-50 border-green-200 text-green-700"
                        : isCurrent
                        ? "bg-amber-50 border-amber-300 text-amber-700"
                        : "bg-surface border-border text-text-tertiary"
                    }`}
                  >
                    <span>{completed ? "✓" : isCurrent ? "●" : "○"}</span>
                    <span>{chainStep.label}</span>
                    {completed && (
                      <span className="opacity-60 truncate max-w-[80px]">
                        · {completed.approvedBy.split("@")[0]}
                      </span>
                    )}
                    {isPending && <span className="opacity-50">· waiting</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Three-column body */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left rail: Section stepper */}
        <aside className="w-48 shrink-0 border-r border-border bg-surface overflow-y-auto">
          <div className="px-4 pt-5 pb-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
              Sections
            </p>
            {!loading && abp && (
              <p className="mt-0.5 text-xs text-text-tertiary">
                {filledCount}/{sections.length} filled
              </p>
            )}
          </div>

          <nav className="px-2 pb-4">
            {loading && (
              <div className="space-y-1.5 px-2 py-3">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="h-7 animate-pulse rounded bg-surface-muted" />
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
                    ? "bg-surface-muted text-text"
                    : "text-text-secondary hover:bg-surface-raised hover:text-text"
                }`}
              >
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-xs ${
                    section.filled
                      ? "bg-green-100 text-green-700"
                      : "bg-surface-muted text-text-tertiary"
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
            <div className="flex h-full items-center justify-center text-text-tertiary text-sm">
              <div className="text-center space-y-3">
                <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-border border-t-border-strong" />
                <p className="text-sm text-text-secondary font-medium">{GENERATION_STEPS[generationStep]}</p>
                <div className="flex justify-center gap-1.5">
                  {GENERATION_STEPS.map((_, i) => (
                    <span
                      key={i}
                      className={`h-1.5 w-1.5 rounded-full transition-colors ${i <= generationStep ? "bg-primary" : "bg-border"}`}
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
        <aside className="w-80 shrink-0 border-l border-border bg-surface flex flex-col overflow-y-auto">

          {/* Submit for Review */}
          {agentIdState && (
            <div className="border-b border-border px-5 py-4">
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
                        <p className="text-xs text-text-tertiary">
                          {validating ? "Validating…" : "Not yet validated"}
                        </p>
                        {!validating && !loading && (
                          <button
                            onClick={handleValidate}
                            className="text-xs text-text-secondary underline hover:text-text"
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
                        : "bg-surface-muted text-text-tertiary cursor-not-allowed"
                    }`}
                  >
                    {validating && !validationReport ? "Validating…" : submitLabel}
                  </button>
                  {error && (
                    <p className="mt-1.5 text-xs text-danger">{error}</p>
                  )}

                  {/* Regenerate Blueprint — draft only, for when generation needs a fresh start */}
                  {blueprintStatus === "draft" && (
                    <div className="mt-3 border-t border-border pt-3">
                      {!confirmRegenerate ? (
                        <button
                          onClick={() => setConfirmRegenerate(true)}
                          disabled={regenerating || refining || validating}
                          className="w-full rounded-lg border border-border py-1.5 text-xs font-medium text-text-secondary hover:border-border-strong hover:text-text transition-colors disabled:opacity-40"
                        >
                          Regenerate Blueprint
                        </button>
                      ) : (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                          <p className="mb-2 font-medium">Replace this blueprint with a fresh generation?</p>
                          <p className="mb-3 text-amber-700">All refinements will be lost. The new blueprint will be generated from your original intake session.</p>
                          <div className="flex gap-2">
                            <button
                              onClick={handleRegenerate}
                              disabled={regenerating}
                              className="flex-1 rounded-md bg-danger py-1.5 text-xs font-medium text-danger-fg hover:bg-danger-hover disabled:opacity-50 transition-colors"
                            >
                              {regenerating ? "Regenerating…" : "Yes, Regenerate"}
                            </button>
                            <button
                              onClick={() => setConfirmRegenerate(false)}
                              disabled={regenerating}
                              className="flex-1 rounded-md border border-border py-1.5 text-xs font-medium text-text-secondary hover:bg-surface-raised transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Governance violations detail */}
          {validationReport && !validationReport.valid && (
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-sm font-semibold text-text">Violations</h2>
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
                        <p className="font-medium text-text">{v.message}</p>
                        {v.suggestion && (
                          <div className="mt-1.5 border-l-2 border-blue-300 bg-blue-50 rounded px-2 py-1">
                            <p className="text-blue-600 text-xs font-medium mb-0.5">✦ Suggested fix</p>
                            <p className="text-blue-800 text-xs">{v.suggestion}</p>
                          </div>
                        )}
                        <p className="mt-0.5 font-mono text-text-tertiary">{v.field}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Governance section (if no violations) */}
          {validationReport?.valid && (
            <div className="border-b border-border px-5 py-4">
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
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-sm font-semibold">Governance</h2>
              <div className="mt-3 flex items-center justify-between">
                <p className="text-xs text-text-tertiary">
                  {loading ? "Running validation…" : "Not yet validated"}
                </p>
                {!loading && (
                  <button
                    onClick={handleValidate}
                    className="text-xs text-text-secondary hover:text-text underline"
                  >
                    Validate now
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Phase 23: Test Suite Widget — shown when we have an agentId (agent exists in registry) */}
          {agentIdState && (
            <div className="border-b border-border px-5 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">Test Suite</h2>
                {testCaseCount > 0 && (
                  <button
                    onClick={handleRunWorkbenchTests}
                    disabled={runningWorkbenchTests}
                    className="rounded-lg bg-primary px-2.5 py-1 text-xs font-medium text-primary-fg hover:bg-primary-hover disabled:opacity-50"
                  >
                    {runningWorkbenchTests ? "Running…" : "Run Tests"}
                  </button>
                )}
              </div>
              {testCaseCount === 0 ? (
                <p className="mt-1.5 text-xs text-text-tertiary">
                  No test cases defined.{" "}
                  {agentIdState && (
                    <Link href={`/registry/${agentIdState}?tab=tests`} className="underline hover:text-text-secondary">
                      Add test cases →
                    </Link>
                  )}
                </p>
              ) : (
                <div className="mt-2 space-y-1.5">
                  <p className="text-xs text-text-secondary">
                    {testCaseCount} case{testCaseCount !== 1 ? "s" : ""}
                    {latestTestRun && (
                      <> · Last run:{" "}
                        <button
                          onClick={() => setTestRunExpanded((e) => !e)}
                          className={`font-medium underline decoration-dotted ${latestTestRun.status === "passed" ? "text-green-700" : "text-red-700"}`}
                        >
                          {latestTestRun.passedCases}/{latestTestRun.totalCases} passed
                        </button>
                        <span className="ml-1 text-text-tertiary">{testRunExpanded ? "▲" : "▼"}</span>
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
                            <p className="mt-1 text-text-secondary italic">Judge: {tr.evaluationRationale}</p>
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
          <div className="border-b border-border">
            <button
              onClick={() => setOwnershipOpen((o) => !o)}
              className="flex w-full items-center justify-between px-5 py-4 text-left"
            >
              <div>
                <h2 className="text-sm font-semibold">Ownership &amp; Classification</h2>
                <p className="text-xs text-text-tertiary">
                  {abp?.ownership?.businessUnit
                    ? `${abp.ownership.businessUnit}${abp.ownership.ownerEmail ? ` · ${abp.ownership.ownerEmail}` : ""}`
                    : "Not set"}
                </p>
              </div>
              <span className="text-text-tertiary text-xs">{ownershipOpen ? "▴" : "▾"}</span>
            </button>
            {ownershipOpen && (
              <div className="border-t border-border px-5 pb-4 pt-3 space-y-3">
                {(
                  [
                    { key: "businessUnit", label: "Business Unit", type: "text", placeholder: "e.g. Risk & Compliance" },
                    { key: "ownerEmail", label: "Owner Email", type: "email", placeholder: "owner@company.com" },
                    { key: "costCenter", label: "Cost Center", type: "text", placeholder: "e.g. CC-1234" },
                  ] as { key: keyof typeof ownershipDraft; label: string; type: string; placeholder: string }[]
                ).map(({ key, label, type, placeholder }) => (
                  <div key={key}>
                    <label className="text-xs font-medium text-text-secondary">{label}</label>
                    <input
                      type={type}
                      value={ownershipDraft[key]}
                      onChange={(e) => setOwnershipDraft((d) => ({ ...d, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="mt-1 w-full rounded-lg border border-border px-3 py-1.5 text-xs focus:border-border-strong focus:outline-none"
                    />
                  </div>
                ))}
                <div>
                  <label className="text-xs font-medium text-text-secondary">Deployment Environment</label>
                  <select
                    value={ownershipDraft.deploymentEnvironment}
                    onChange={(e) => setOwnershipDraft((d) => ({ ...d, deploymentEnvironment: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-border px-3 py-1.5 text-xs focus:border-border-strong focus:outline-none"
                  >
                    <option value="">— Select —</option>
                    <option value="production">Production</option>
                    <option value="staging">Staging</option>
                    <option value="sandbox">Sandbox</option>
                    <option value="internal">Internal</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-text-secondary">Data Classification</label>
                  <select
                    value={ownershipDraft.dataClassification}
                    onChange={(e) => setOwnershipDraft((d) => ({ ...d, dataClassification: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-border px-3 py-1.5 text-xs focus:border-border-strong focus:outline-none"
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
                  className="w-full rounded-lg bg-primary py-1.5 text-xs font-medium text-primary-fg hover:bg-primary-hover disabled:opacity-50"
                >
                  {savingOwnership ? "Saving…" : "Save Ownership"}
                </button>
              </div>
            )}
          </div>

          {/* Evidence Package — shown for approved and deployed blueprints */}
          {(blueprintStatus === "approved" || blueprintStatus === "deployed") && (
            <div className="border-b border-border px-5 py-4">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-sm font-semibold">Audit Evidence</h2>
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-2xs font-semibold text-green-700 uppercase tracking-wide">
                  Exam-Ready
                </span>
              </div>
              <p className="text-xs text-text-secondary mb-3">
                This agent has a complete governance record — identity, capabilities,
                validation, approvals, stakeholder contributions, and regulatory
                framework assessment are all on record.
              </p>
              <div className="space-y-2">
                <Link
                  href={`/blueprints/${id}/report`}
                  className="flex w-full items-center justify-between rounded-lg border border-border px-3 py-2 text-xs font-medium text-text-secondary hover:border-border-strong hover:text-text transition-colors"
                >
                  <span>View Compliance Report</span>
                  <span className="text-text-tertiary">→</span>
                </Link>
                <button
                  onClick={handleExportEvidence}
                  disabled={exportingEvidence}
                  className="w-full rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 transition-colors text-left"
                >
                  {exportingEvidence ? "Exporting…" : "↓ Export Evidence Package"}
                </button>
                <p className="text-2xs text-text-tertiary leading-tight">
                  JSON bundle: MRM report, approval chain, quality evaluation,
                  test evidence, stakeholder contributions.
                </p>
              </div>
            </div>
          )}

          {/* Refinement Chat */}
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold">Refinement Chat</h2>
            <p className="mt-1 text-xs text-text-secondary">
              Describe changes — Claude will regenerate the blueprint. Each message is a refinement round.
            </p>
          </div>

          <div className="flex flex-1 flex-col min-h-0">
            {/* Message history */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {refinementHistory.length === 0 && (
                <p className="py-6 text-center text-xs text-text-tertiary">
                  No refinements yet. Describe what to change below.
                </p>
              )}
              {refinementHistory.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-lg px-3 py-2 text-xs ${
                    msg.role === "user"
                      ? "bg-primary text-primary-fg"
                      : msg.content.startsWith("Error:")
                      ? "bg-red-50 text-red-700 border border-red-200"
                      : "bg-surface-raised text-text border border-border"
                  }`}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    <p className={`mt-1 text-2xs ${
                      msg.role === "user" ? "text-primary-fg/60" : "text-text-tertiary"
                    }`}>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}
              {refining && (
                <div className="flex justify-start">
                  <div className="rounded-lg bg-surface-raised border border-border px-3 py-2">
                    <span className="text-xs text-text-secondary animate-pulse">Refining blueprint…</span>
                  </div>
                </div>
              )}
              <div ref={refinementEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-border p-3">
              {error && !submitting && !refinementHistory.some((m) => m.content.includes(error!)) && (
                <p className="mb-2 text-xs text-danger">{error}</p>
              )}
              <div className="flex gap-2">
                <textarea
                  value={change}
                  onChange={(e) => setChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      handleRefine();
                    }
                  }}
                  placeholder="e.g. Add rate limiting of 50 req/min…"
                  disabled={refining || loading}
                  className="flex-1 resize-none rounded-lg border border-border p-2 text-sm placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                  rows={2}
                />
                <button
                  onClick={handleRefine}
                  disabled={!change.trim() || refining || loading}
                  className="shrink-0 self-end rounded-lg bg-primary px-4 py-2 text-sm text-primary-fg hover:bg-primary-hover disabled:opacity-40"
                >
                  {refining ? "…" : "Send"}
                </button>
              </div>
              <p className="mt-1 text-center text-2xs text-text-tertiary">⌘ Enter to send</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

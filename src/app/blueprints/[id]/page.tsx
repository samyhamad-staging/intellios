"use client";

import { use, useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { Wand2 } from "lucide-react";
import { BlueprintView } from "@/components/blueprint/blueprint-view";
import { Heading, Subheading } from "@/components/catalyst/heading";

/* ── Lazy-loaded panels (only loaded when user switches to their tab) ── */
const CompanionChat = dynamic(
  () => import("@/components/blueprint/companion-chat").then(m => ({ default: m.CompanionChat })),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-32 text-text-tertiary text-sm">Loading chat…</div> }
);
import { SectionHeading } from "@/components/ui/section-heading";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ValidationReportView } from "@/components/governance/validation-report";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { FormField } from "@/components/ui/form-field";
import { ABP } from "@/lib/types/abp";
import { ValidationReport } from "@/lib/governance/types";
import type { TestRun } from "@/lib/testing/types";
import { STATUS_LABELS } from "@/lib/status-theme";

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

// ─── P2-228: Detect which section changed after refinement ───────────────────
// Returns the section id of the first section that differs between two ABPs,
// or null when nothing meaningful changed. Sections are checked in UX priority
// order so the most impactful change is highlighted first.
function detectChangedSection(prev: ABP | null, next: ABP): string | null {
  if (!prev) return null;
  const checks: Array<{ id: string; extract: (a: ABP) => unknown }> = [
    { id: "identity",     extract: (a) => a.identity },
    { id: "instructions", extract: (a) => a.capabilities?.instructions },
    { id: "tools",        extract: (a) => a.capabilities?.tools },
    { id: "knowledge",    extract: (a) => a.capabilities?.knowledge_sources },
    { id: "constraints",  extract: (a) => a.constraints },
    { id: "governance",   extract: (a) => a.governance?.policies },
    { id: "audit",        extract: (a) => a.governance?.audit },
    { id: "ownership",    extract: (a) => a.ownership },
  ];
  for (const { id, extract } of checks) {
    if (JSON.stringify(extract(prev)) !== JSON.stringify(extract(next))) return id;
  }
  return null;
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
  // P1-226: Pending companion AI suggestion — shown for confirmation before refinement runs
  const [pendingApplyPrompt, setPendingApplyPrompt] = useState<string | null>(null);
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

  // P1-29: tab controlling which right-rail chat is shown
  const [rightRailTab, setRightRailTab] = useState<"refine" | "companion">("refine");

  // P1-40: version checkpoint before refining
  const [checkpointSaving, setCheckpointSaving] = useState(false);
  const [checkpointResult, setCheckpointResult] = useState<{ name: string; id: string } | null>(null);
  const [checkpointError, setCheckpointError] = useState<string | null>(null);

  async function handleSaveCheckpoint() {
    setCheckpointSaving(true);
    setCheckpointError(null);
    try {
      const res = await fetch(`/api/blueprints/${id}/clone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: `${abp?.identity?.name ?? "Agent"} — Checkpoint` }),
      });
      if (res.ok) {
        const data = await res.json();
        setCheckpointResult({ name: data.abp?.identity?.name ?? "Checkpoint", id: data.id ?? "" });
      } else {
        setCheckpointError("Could not save checkpoint — try again.");
      }
    } catch {
      setCheckpointError("Network error saving checkpoint.");
    } finally {
      setCheckpointSaving(false);
    }
  }

  const [blueprintStatus, setBlueprintStatus] = useState<string>("draft");
  const [reviewComment, setReviewComment] = useState<string | null>(null);
  const [exportingEvidence, setExportingEvidence] = useState(false);
  const [approvalProgress, setApprovalProgress] = useState<Array<{
    step: number; role: string; label: string; approvedBy: string; approvedAt: string; decision: string; comment: string | null;
  }>>([]);
  const [currentApprovalStep, setCurrentApprovalStep] = useState<number>(0);
  const [approvalChain, setApprovalChain] = useState<Array<{ step: number; role: string; label: string }>>([]);

  // Quality gate — advisory warning when overall score < threshold
  const QUALITY_GATE_THRESHOLD = 3.0; // out of 5.0
  const [qualityScore, setQualityScore] = useState<number | null>(null);

  // "Fix All Violations" state
  const [fixingViolations, setFixingViolations] = useState(false);
  const [qualityGateLoaded, setQualityGateLoaded] = useState(false);

  const [ownershipOpen, setOwnershipOpen] = useState(false);
  const [ownershipDraft, setOwnershipDraft] = useState<{
    businessUnit: string;
    ownerEmail: string;
    costCenter: string;
    deploymentEnvironment: string;
    dataClassification: string;
  }>({ businessUnit: "", ownerEmail: "", costCenter: "", deploymentEnvironment: "", dataClassification: "" });
  const [savingOwnership, setSavingOwnership] = useState(false);

  // C-04: fetch moved into useEffect to prevent multiple calls in React concurrent
  // mode (previously ran in render body — unsafe with React 19 strict mode).
  // Also added r.ok check so API error responses don't silently set abp=undefined.
  // Always fetch from API on mount — blueprint content is never passed via URL.
  useEffect(() => {
    let cancelled = false;
    async function loadBlueprint() {
      try {
        const r = await fetch(`/api/blueprints/${id}`);
        if (!r.ok) {
          // API returns { message, code } — not { error }
          const errData = await r.json().catch(() => ({}));
          throw new Error(errData.message ?? "Failed to load blueprint");
        }
        const data = await r.json();
        if (cancelled) return;
        const loadedAbp = data.abp as ABP;
        setAbp(loadedAbp);
        setRefinementCount(parseInt(data.refinementCount ?? "0", 10));
        if (data.agentId) setAgentIdState(data.agentId as string);
        if (data.sessionId) setSessionId(data.sessionId as string);
        if (data.status) setBlueprintStatus(data.status as string);
        setReviewComment((data.reviewComment as string | null) ?? null);
        // Pre-populate ownership draft from existing ABP
        if (loadedAbp?.ownership) {
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
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load blueprint");
        setLoading(false);
      }
    }
    loadBlueprint();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // P1-29: accepts an optional directPrompt (from CompanionChat "Apply Change")
  // so suggestions can be forwarded to the refinement API without copy-paste.
  const handleRefine = useCallback(async (directPrompt?: string) => {
    const userMsg = (directPrompt ?? change).trim();
    if (!userMsg || refining) return;
    setRefining(true);
    setError(null);
    // P2-228: Capture the pre-refinement ABP so we can diff sections afterward
    const preRefinementAbp = abp;
    // Add user message to history immediately
    setRefinementHistory((prev) => [...prev, { role: "user", content: userMsg, timestamp: new Date().toISOString() }]);
    if (!directPrompt) setChange(""); // only clear textarea for manual input
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
      const newAbp = data.abp as ABP;
      setAbp(newAbp);
      setRefinementCount(parseInt(data.refinementCount ?? "0", 10));
      // P2-228: Auto-highlight the first changed section after refinement
      const changedSection = detectChangedSection(preRefinementAbp, newAbp);
      if (changedSection) {
        setActiveSection(changedSection);
        // Short delay lets React re-render with updated content before scrolling
        setTimeout(() => {
          document.getElementById(`section-${changedSection}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 150);
      }
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
  }, [id, change, refining, abp]);

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

  // P2-595: Dispatch live page context to the Help Panel copilot
  useEffect(() => {
    if (!abp) return;
    const blockerCount = validationReport?.violations.filter(
      (v) => v.severity === "error"
    ).length ?? undefined;
    window.dispatchEvent(
      new CustomEvent("intellios:help-context", {
        detail: {
          agentName: abp.identity?.name ?? undefined,
          blueprintStatus: blueprintStatus ?? undefined,
          violationCount: blockerCount,
        },
      })
    );
  }, [abp, blueprintStatus, validationReport]);

  // Quality gate — fetch latest quality score once blueprint is loaded
  useEffect(() => {
    if (!id || qualityGateLoaded) return;
    setQualityGateLoaded(true);
    fetch(`/api/blueprints/${id}/quality`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.score?.overallScore != null) {
          setQualityScore(parseFloat(data.score.overallScore));
        }
      })
      .catch(() => {}); // non-critical — advisory only
  }, [id, qualityGateLoaded]);

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

  // ── Violation acknowledgement ─────────────────────────────────────────────
  // Warnings are advisory and do not block submission, but architects must
  // explicitly acknowledge each one so there's a clear record that they were
  // reviewed. Acknowledgements are session-scoped (reset on page reload).
  const [acknowledgedRuleIds, setAcknowledgedRuleIds] = useState<Set<string>>(new Set());

  const handleAcknowledge = useCallback((ruleId: string) => {
    setAcknowledgedRuleIds((prev) => new Set([...prev, ruleId]));
  }, []);

  const handleFixAllViolations = useCallback(async () => {
    if (!validationReport || validationReport.violations.length < 2) return;
    setFixingViolations(true);
    try {
      const violations = validationReport.violations;
      for (const violation of violations) {
        try {
          await fetch(`/api/blueprints/${id}/suggest-fix`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ruleId: violation.ruleId,
              policyId: violation.policyId,
              field: violation.field,
            }),
          });
        } catch {
          // Continue with next violation even if one fails
        }
      }
      toast.success(`Fixes generated for ${violations.length} violations`);
    } catch (err) {
      toast.error("Failed to generate fixes");
    } finally {
      setFixingViolations(false);
    }
  }, [validationReport, id]);

  // ── Derived state ──────────────────────────────────────────────────────────
  const sections = getSections(abp);
  const filledCount = sections.filter((s) => s.filled).length;

  const blockerCount = validationReport
    ? validationReport.violations.filter((v) => v.severity === "error").length
    : null;

  const warningViolations = validationReport
    ? validationReport.violations.filter((v) => v.severity === "warning")
    : [];
  const acknowledgedCount = warningViolations.filter((v) => acknowledgedRuleIds.has(v.ruleId)).length;
  const allWarningsAcknowledged = warningViolations.length === 0 || acknowledgedCount === warningViolations.length;
  const unacknowledgedCount = warningViolations.length - acknowledgedCount;

  const canSubmit =
    !submitted &&
    !!agentIdState &&
    !submitting &&
    !!validationReport &&
    blockerCount === 0 &&
    allWarningsAcknowledged;

  const submitLabel = submitted
    ? "✓ Submitted for Review"
    : submitting
    ? "Submitting…"
    : blockerCount !== null && blockerCount > 0
    ? `${blockerCount} blocker${blockerCount === 1 ? "" : "s"} — resolve to submit`
    : !validationReport
    ? "Validate before submitting"
    : !allWarningsAcknowledged
    ? `Acknowledge ${unacknowledgedCount} warning${unacknowledgedCount === 1 ? "" : "s"} below`
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
          <Heading level={1} className="truncate text-base">
            {abp?.identity.name ?? "Agent Blueprint"}
          </Heading>
          {refinementCount > 0 && (
            <span className="shrink-0 text-xs text-text-tertiary">
              {refinementCount} refinement{refinementCount === 1 ? "" : "s"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            blueprintStatus === "rejected"
              ? "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300"
              : blueprintStatus === "in_review"
              ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300"
              : blueprintStatus === "approved"
              ? "bg-green-100 dark:bg-emerald-900/40 text-green-700 dark:text-emerald-300"
              : blueprintStatus === "deployed"
              ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"
              : "bg-surface-muted text-text-secondary"
          }`}>
            {STATUS_LABELS[blueprintStatus as keyof typeof STATUS_LABELS] ?? blueprintStatus.replace("_", " ")}
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

      {/* Breadcrumb */}
      <div className="shrink-0 border-b border-border bg-surface px-6 py-3">
        <Breadcrumb items={[
          { label: "Blueprints", href: "/blueprints" },
          { label: abp?.identity.name ?? "Blueprint" },
        ]} />
      </div>

      {/* Rejection / feedback banner */}
      {reviewComment && (
        <div className={`shrink-0 border-b px-6 py-3 flex items-start gap-3 ${
          blueprintStatus === "rejected"
            ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"
            : "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800"
        }`}>
          <span className={`shrink-0 text-sm font-semibold ${
            blueprintStatus === "rejected" ? "text-red-700 dark:text-red-300" : "text-amber-700 dark:text-amber-300"
          }`}>
            {blueprintStatus === "rejected" ? "Rejected:" : "Changes requested:"}
          </span>
          <span className={`text-sm ${
            blueprintStatus === "rejected" ? "text-red-700 dark:text-red-300" : "text-amber-700 dark:text-amber-300"
          }`}>
            {reviewComment}
          </span>
        </div>
      )}

      {/* Approval progress tracker — visible only when in_review and a multi-step chain exists */}
      {blueprintStatus === "in_review" && approvalChain.length > 1 && (
        <div className="shrink-0 border-b border-border bg-surface-raised px-6 py-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <SectionHeading className="mr-2">
              Review progress
            </SectionHeading>
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
                        ? "bg-green-50 dark:bg-emerald-950/30 border-green-200 dark:border-emerald-800 text-green-700 dark:text-emerald-300"
                        : isCurrent
                        ? "bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300"
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
            <SectionHeading>
              Sections
            </SectionHeading>
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
                      ? "bg-green-100 dark:bg-emerald-900/40 text-green-700 dark:text-emerald-300"
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
            <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-4 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}
          {abp && (
            <div id="blueprint-content">
              <BlueprintView
                abp={abp}
                blueprintId={id}
                onFieldSaved={(fieldPath, value, updatedAbp) => {
                  setAbp(updatedAbp);
                }}
              />
            </div>
          )}
        </main>

        {/* Right rail: Submit + Governance + Refinement */}
        <aside className="w-80 shrink-0 border-l border-border bg-surface flex flex-col overflow-y-auto">

          {/* P1-204: Persistent Action Tray — 4 core actions always visible at top of rail */}
          {agentIdState && (
            <div className="border-b border-border bg-surface-raised px-3 py-2.5">
              <div className="grid grid-cols-4 gap-1">
                {[
                  {
                    label: "Refine",
                    title: "Refine with AI",
                    onClick: () => setRightRailTab("refine"),
                    icon: "✦",
                  },
                  {
                    label: "Simulate",
                    title: "Run a simulation",
                    href: `/registry/${agentIdState}?tab=simulate`,
                    icon: "▷",
                  },
                  {
                    label: "Export",
                    title: "Export blueprint package",
                    href: `/registry/${agentIdState}?tab=export`,
                    icon: "↓",
                  },
                  {
                    label: "Deploy",
                    title: "Deploy this agent",
                    href: `/deploy`,
                    icon: "⚡",
                  },
                ].map((action) =>
                  action.href ? (
                    <Link
                      key={action.label}
                      href={action.href}
                      title={action.title}
                      className="flex flex-col items-center gap-0.5 rounded-lg px-1 py-2 text-center transition-colors hover:bg-surface text-text-secondary hover:text-text"
                    >
                      <span className="text-sm leading-none">{action.icon}</span>
                      <span className="text-2xs font-medium">{action.label}</span>
                    </Link>
                  ) : (
                    <button
                      key={action.label}
                      onClick={action.onClick}
                      title={action.title}
                      className="flex flex-col items-center gap-0.5 rounded-lg px-1 py-2 text-center transition-colors hover:bg-surface text-text-secondary hover:text-text"
                    >
                      <span className="text-sm leading-none">{action.icon}</span>
                      <span className="text-2xs font-medium">{action.label}</span>
                    </button>
                  )
                )}
              </div>
            </div>
          )}

          {/* Submit for Review */}
          {agentIdState && (
            <div className="border-b border-border px-5 py-4">
              <Subheading level={2} className="text-sm">Submit for Review</Subheading>

              {submitted ? (
                <div className="mt-3 rounded-lg bg-green-50 dark:bg-emerald-950/30 border border-green-200 dark:border-emerald-800 px-4 py-3">
                  <p className="text-sm font-medium text-green-800 dark:text-emerald-200">✓ Submitted for review</p>
                  <p className="mt-0.5 text-xs text-green-700 dark:text-emerald-300">
                    This blueprint is now in the reviewer queue.
                  </p>
                  <Link
                    href={`/registry/${agentIdState}`}
                    className="mt-2 inline-block text-xs text-green-700 dark:text-emerald-300 underline hover:text-green-900 dark:hover:text-emerald-200"
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
                              ? "bg-green-50 dark:bg-emerald-950/30 text-green-700 dark:text-emerald-300"
                              : blockerCount! > 0
                              ? "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300"
                              : "bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-300"
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
                          <div className="flex items-start gap-2 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                            <span className="shrink-0 mt-0.5">⚠</span>
                            <span>
                              Saved from a previous session — re-validate to check against current policies before submitting.
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Quality gate advisory — shown when score is below threshold */}
                  {qualityScore !== null && qualityScore < QUALITY_GATE_THRESHOLD && (
                    <div className="mb-2 flex items-start gap-2 rounded-lg border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/30 px-3 py-2 text-xs text-orange-800 dark:text-orange-200">
                      <span className="shrink-0 mt-0.5">⚠</span>
                      <span>
                        Quality score is <strong>{qualityScore.toFixed(1)}/5.0</strong> — below the recommended threshold of {QUALITY_GATE_THRESHOLD.toFixed(1)}.
                        Consider addressing quality issues before submitting.{" "}
                        {agentIdState && (
                          <a href={`/registry/${agentIdState}?tab=quality`} className="underline hover:text-orange-900 dark:hover:text-orange-100">
                            View details →
                          </a>
                        )}
                      </span>
                    </div>
                  )}

                  <button
                    onClick={!validationReport ? handleValidate : handleSubmitForReview}
                    disabled={loading || validating || (!!validationReport && !canSubmit)}
                    className={`w-full rounded-lg py-2.5 text-sm font-medium transition-colors ${
                      !loading && !validating && (canSubmit || !validationReport)
                        ? "bg-yellow-600 text-white hover:bg-yellow-700 dark:bg-yellow-700 dark:hover:bg-yellow-800"
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
                        <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-3 text-xs text-amber-800 dark:text-amber-200">
                          <p className="mb-2 font-medium">Replace this blueprint with a fresh generation?</p>
                          <p className="mb-3 text-amber-700 dark:text-amber-300">All refinements will be lost. The new blueprint will be generated from your original intake session.</p>
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

          {/* Governance violations — with per-warning acknowledgement workflow */}
          {validationReport && validationReport.violations.length > 0 && (
            <div className="border-b border-border px-5 py-4">
              <div className="mb-3 flex items-center justify-between">
                <Subheading level={2} className="text-sm text-text">Violations</Subheading>
                {warningViolations.length > 0 && (
                  <span className="text-xs text-text-tertiary">
                    {acknowledgedCount}/{warningViolations.length} acknowledged
                  </span>
                )}
              </div>
              {/* Fix All Violations button — shown when there are 2+ violations */}
              {validationReport.violations.length >= 2 && (
                <button
                  onClick={handleFixAllViolations}
                  disabled={fixingViolations}
                  className="mb-3 flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {fixingViolations ? (
                    <>
                      <svg className="h-3.5 w-3.5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span>Generating fixes…</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-3.5 w-3.5" />
                      <span>Fix All Violations</span>
                    </>
                  )}
                </button>
              )}
              <div className="space-y-2">
                {validationReport.violations.map((v, i) => {
                  const isAck = acknowledgedRuleIds.has(v.ruleId);
                  const isError = v.severity === "error";
                  return (
                    <div
                      key={v.ruleId || i}
                      className={`rounded-lg border p-3 text-xs transition-all ${
                        isAck
                          ? "border-green-200 dark:border-emerald-800 bg-green-50 dark:bg-emerald-950/30 opacity-60"
                          : isError
                          ? "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30"
                          : "border-yellow-200 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-950/30"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span
                          className={`shrink-0 rounded px-1 py-0.5 text-xs font-medium ${
                            isAck
                              ? "bg-green-100 dark:bg-emerald-900/40 text-green-700 dark:text-emerald-300"
                              : isError
                              ? "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300"
                              : "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300"
                          }`}
                        >
                          {isAck ? "✓ ack" : v.severity}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-text">{v.message}</p>
                          {v.suggestion && !isAck && (
                            <div className="mt-1.5 border-l-2 border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/30 rounded px-2 py-1">
                              <p className="text-blue-600 dark:text-blue-400 text-xs font-medium mb-0.5">✦ Suggested fix</p>
                              <p className="text-blue-800 dark:text-blue-200 text-xs">{v.suggestion}</p>
                            </div>
                          )}
                          <p className="mt-0.5 font-mono text-text-tertiary">{v.field}</p>
                        </div>
                        {!isError && !isAck && (
                          <button
                            onClick={() => handleAcknowledge(v.ruleId)}
                            className="shrink-0 rounded-md border border-yellow-300 dark:border-yellow-700 bg-yellow-100 dark:bg-yellow-900/40 px-2 py-0.5 text-xs font-medium text-yellow-800 dark:text-yellow-200 hover:bg-yellow-200 dark:hover:bg-yellow-900 transition-colors"
                          >
                            Acknowledge
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Summary: all warnings reviewed, no errors — ready to submit */}
              {allWarningsAcknowledged && warningViolations.length > 0 && blockerCount === 0 && (
                <div className="mt-3 rounded-lg border border-green-200 dark:border-emerald-800 bg-green-50 dark:bg-emerald-950/30 px-3 py-2 text-xs text-green-800 dark:text-emerald-200">
                  <p className="font-semibold">✓ All warnings reviewed</p>
                  <p className="mt-0.5 text-green-700 dark:text-emerald-300">
                    You&apos;ve acknowledged every warning — this blueprint is ready to submit.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Governance section (shown only when truly zero violations — no errors, no warnings) */}
          {validationReport?.valid && validationReport.violations.length === 0 && (
            <div className="border-b border-border px-5 py-4">
              <Subheading level={2} className="text-sm">Governance</Subheading>
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
              <Subheading level={2} className="text-sm">Governance</Subheading>
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
                <Subheading level={2} className="text-sm">Test Suite</Subheading>
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
                          className={`font-medium underline decoration-dotted ${latestTestRun.status === "passed" ? "text-green-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"}`}
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
                        <div key={tr.testCaseId} className={`rounded-md border px-2.5 py-2 text-xs ${tr.status === "passed" ? "border-green-200 dark:border-emerald-800 bg-green-50 dark:bg-emerald-950/30" : "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30"}`}>
                          <div className="flex items-center gap-1.5">
                            <span>{tr.status === "passed" ? "✓" : "✗"}</span>
                            <span className={`font-medium ${tr.status === "passed" ? "text-green-800 dark:text-emerald-200" : "text-red-800 dark:text-red-200"}`}>{tr.name}</span>
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
                    <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
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
                <Subheading level={2} className="text-sm">Ownership &amp; Classification</Subheading>
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
                  <FormField key={key} label={label} htmlFor={`ownership-${key}`}>
                    <input
                      id={`ownership-${key}`}
                      type={type}
                      value={ownershipDraft[key]}
                      onChange={(e) => setOwnershipDraft((d) => ({ ...d, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="w-full rounded-lg border border-border px-3 py-1.5 text-xs focus:border-border-strong focus:outline-none"
                    />
                  </FormField>
                ))}
                <FormField label="Deployment Environment" htmlFor="ownership-env">
                  <Select
                    value={ownershipDraft.deploymentEnvironment || "_none_"}
                    onValueChange={(v) => setOwnershipDraft((d) => ({ ...d, deploymentEnvironment: v === "_none_" ? "" : v }))}
                  >
                    <SelectTrigger id="ownership-env" className="w-full text-xs h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none_">— Select —</SelectItem>
                      <SelectItem value="production">Production</SelectItem>
                      <SelectItem value="staging">Staging</SelectItem>
                      <SelectItem value="sandbox">Sandbox</SelectItem>
                      <SelectItem value="internal">Internal</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Data Classification" htmlFor="ownership-classification">
                  <Select
                    value={ownershipDraft.dataClassification || "_none_"}
                    onValueChange={(v) => setOwnershipDraft((d) => ({ ...d, dataClassification: v === "_none_" ? "" : v }))}
                  >
                    <SelectTrigger id="ownership-classification" className="w-full text-xs h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none_">— Select —</SelectItem>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="internal">Internal</SelectItem>
                      <SelectItem value="confidential">Confidential</SelectItem>
                      <SelectItem value="regulated">Regulated</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
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
                <Subheading level={2} className="text-sm">Audit Evidence</Subheading>
                <span className="rounded-full bg-green-100 dark:bg-emerald-900/40 px-2 py-0.5 text-2xs font-semibold text-green-700 dark:text-emerald-300 uppercase tracking-wide">
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
                  className="w-full rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/30 px-3 py-2 text-xs font-medium text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 disabled:opacity-50 transition-colors text-left"
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

          {/* Right rail tab strip — Refine / Companion AI (P1-29) */}
          <div className="border-b border-border px-4 pt-3">
            <div className="flex gap-0">
              {(["refine", "companion"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setRightRailTab(tab)}
                  className={`px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors ${
                    rightRailTab === tab
                      ? "border-primary text-primary"
                      : "border-transparent text-text-tertiary hover:text-text"
                  }`}
                >
                  {tab === "refine" ? "Refine" : "Companion AI"}
                </button>
              ))}
            </div>
          </div>

          {rightRailTab === "companion" ? (
            <div className="flex-1 min-h-0 overflow-hidden">
              <CompanionChat
                blueprintId={id}
                onApplyChange={(prompt) => {
                  // P1-226: Stage the prompt for confirmation before running refinement
                  setRightRailTab("refine");
                  setPendingApplyPrompt(prompt);
                }}
                violationCount={blockerCount}
                qualityScore={qualityScore}
              />
            </div>
          ) : (
          <div className="flex flex-1 flex-col min-h-0">
            {/* Message history */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {refinementHistory.length === 0 && (
                <div className="py-4 px-2 space-y-2">
                  {/* P1-40: checkpoint banner — shown before first refinement */}
                  {!checkpointResult && (
                    <div className="mb-3 rounded-lg border border-border bg-surface-muted px-3 py-2.5">
                      <p className="text-xs text-text-secondary mb-1.5">
                        💾 Save a restore point before making changes.
                      </p>
                      {checkpointError && (
                        <p className="text-2xs text-danger mb-1.5">{checkpointError}</p>
                      )}
                      <button
                        onClick={handleSaveCheckpoint}
                        disabled={checkpointSaving}
                        className="rounded-md border border-border bg-surface px-2.5 py-1 text-xs text-text-secondary hover:bg-surface-raised hover:text-text disabled:opacity-40 transition-colors"
                      >
                        {checkpointSaving ? "Saving…" : "Save checkpoint"}
                      </button>
                    </div>
                  )}
                  {checkpointResult && (
                    <div className="mb-3 rounded-lg border border-green-200 dark:border-emerald-800 bg-green-50 dark:bg-emerald-950/30 px-3 py-2 text-xs text-green-700 dark:text-emerald-300">
                      ✓ Checkpoint saved as &ldquo;{checkpointResult.name}&rdquo;.{" "}
                      <a href={`/blueprints/${checkpointResult.id}`} className="underline hover:no-underline">
                        View →
                      </a>
                    </div>
                  )}
                  <p className="text-center text-xs text-text-tertiary mb-3">
                    Describe what to change. For example:
                  </p>
                  {[
                    "Add an email notification tool",
                    "Make the denied actions stricter around PII",
                    "Add a data_handling governance policy",
                    "Change the persona to be more formal",
                  ].map((hint) => (
                    <button
                      key={hint}
                      onClick={() => setChange(hint)}
                      className="block w-full rounded-lg border border-border px-3 py-2 text-left text-xs text-text-secondary hover:bg-surface-muted hover:text-text transition-colors"
                    >
                      {hint}
                    </button>
                  ))}
                </div>
              )}
              {refinementHistory.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-lg px-3 py-2 text-xs ${
                    msg.role === "user"
                      ? "bg-primary text-primary-fg"
                      : msg.content.startsWith("Error:")
                      ? "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800"
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

            {/* P1-226: Companion AI suggestion — confirm before applying */}
            {pendingApplyPrompt && (
              <div className="border-t border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-3 space-y-2">
                <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">Apply this suggestion to your blueprint?</p>
                <p className="text-xs text-amber-700 dark:text-amber-300 line-clamp-3 italic">&ldquo;{pendingApplyPrompt}&rdquo;</p>
                <p className="text-2xs text-amber-600 dark:text-amber-400">This will modify your blueprint. Consider saving a checkpoint first if you haven&apos;t already.</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const prompt = pendingApplyPrompt;
                      setPendingApplyPrompt(null);
                      handleRefine(prompt);
                    }}
                    disabled={refining}
                    className="rounded-lg bg-amber-700 dark:bg-amber-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-800 dark:hover:bg-amber-900 disabled:opacity-50"
                  >
                    {refining ? "Applying…" : "Confirm — Apply Changes"}
                  </button>
                  <button
                    onClick={() => setPendingApplyPrompt(null)}
                    disabled={refining}
                    className="rounded-lg border border-amber-300 dark:border-amber-700 px-3 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

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
                  onClick={() => handleRefine()}
                  disabled={!change.trim() || refining || loading}
                  className="shrink-0 self-end rounded-lg bg-primary px-4 py-2 text-sm text-primary-fg hover:bg-primary-hover disabled:opacity-40"
                >
                  {refining ? "…" : "Send"}
                </button>
              </div>
              <p className="mt-1 text-center text-2xs text-text-tertiary">⌘ Enter to send</p>
            </div>
          </div>
          )}
        </aside>
      </div>
    </div>
  );
}

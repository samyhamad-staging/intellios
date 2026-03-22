"use client";

import { use, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { BlueprintView } from "@/components/blueprint/blueprint-view";
import { BlueprintSummary } from "@/components/blueprint/blueprint-summary";
import { StatusBadge } from "@/components/registry/status-badge";
import { LifecycleControls } from "@/components/registry/lifecycle-controls";
import { fetchJson } from "@/lib/fetch-json";
import { ValidationReportView } from "@/components/governance/validation-report";
import { ReviewPanel } from "@/components/review/review-panel";
import { RegulatoryPanel } from "@/components/registry/regulatory-panel";
import { VersionDiff } from "@/components/registry/version-diff";
import { ABP } from "@/lib/types/abp";
import { ValidationReport } from "@/lib/governance/types";
import { CheckCircle, XCircle } from "lucide-react";
import type { ApprovalChainStep, ApprovalStepRecord, EnterpriseSettings } from "@/lib/settings/types";
import { DEFAULT_ENTERPRISE_SETTINGS } from "@/lib/settings/types";
import type { TestCase, TestRun } from "@/lib/testing/types";
import { SimulatePanel } from "@/components/registry/simulate-panel";
import { QualityDashboard } from "@/components/blueprint/quality-dashboard";
import { ProductionDashboard } from "@/components/registry/production-dashboard";
import { ViolationsPanel } from "@/components/registry/violations-panel";

interface CurrentUser {
  email: string;
  name: string;
  role: string;
}

interface AgentHealth {
  healthStatus: "clean" | "critical" | "unknown";
  errorCount: number;
  warningCount: number;
  lastCheckedAt: string | null;
}

function timeAgoShort(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  if (diffMins < 2) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "1 day ago";
  return `${diffDays} days ago`;
}

interface BlueprintVersion {
  id: string;
  agentId: string;
  sessionId: string | null;
  version: string;
  name: string | null;
  status: string;
  refinementCount: string;
  validationReport: ValidationReport | null;
  reviewComment: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  createdBy: string | null;
  // Phase 22: multi-step approval workflow fields
  currentApprovalStep: number;
  approvalProgress: ApprovalStepRecord[];
  // Phase 26: deployment target tracking
  deploymentTarget: string | null;
  deploymentMetadata: {
    target: "agentcore";
    agentId: string;
    agentArn: string;
    agentVersion: string;
    region: string;
    foundationModel: string;
    deployedAt: string;
    deployedBy: string;
  } | null;
  // Phase 36: SR 11-7 periodic review scheduling
  nextReviewDue: string | null;
  lastPeriodicReviewAt: string | null;
  enterpriseId: string | null;
  // Phase 52: Blueprint lineage
  previousBlueprintId: string | null;
  governanceDiff: import("@/lib/diff/abp-diff").ABPDiff | null;
  createdAt: string;
  updatedAt: string;
  abp: ABP;
}

type Status = "draft" | "in_review" | "approved" | "rejected" | "deprecated" | "deployed" | "suspended";
type Tab = "blueprint" | "summary" | "governance" | "quality" | "review" | "versions" | "regulatory" | "tests" | "simulate" | "production" | "violations";

export default function AgentDetailPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = use(params);
  const searchParams = useSearchParams();
  const router = useRouter();

  const [latest, setLatest] = useState<BlueprintVersion | null>(null);
  const [versions, setVersions] = useState<BlueprintVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [exporting, setExporting] = useState(false);
  const [healthData, setHealthData] = useState<AgentHealth | null>(null);
  const [checkingHealth, setCheckingHealth] = useState(false);
  const [cloneModalOpen, setCloneModalOpen] = useState(false);
  const [cloneName, setCloneName] = useState("");
  const [cloning, setCloning] = useState(false);
  const [enterpriseSettings, setEnterpriseSettings] = useState<EnterpriseSettings>(DEFAULT_ENTERPRISE_SETTINGS);
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const tab = searchParams.get("tab");
    if (tab === "review" || tab === "governance" || tab === "quality" || tab === "versions" || tab === "summary" || tab === "regulatory" || tab === "tests" || tab === "simulate" || tab === "production" || tab === "violations") return tab;
    return "blueprint";
  });
  const [compareVersionId, setCompareVersionId] = useState<string | null>(null);
  // Phase 52: Blueprint lineage — which version's governance diff is expanded
  const [expandedDiffId, setExpandedDiffId] = useState<string | null>(null);

  // Phase 23: Test Harness state
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [testRuns, setTestRuns] = useState<TestRun[]>([]);
  const [testCasesLoaded, setTestCasesLoaded] = useState(false);
  const [runningTests, setRunningTests] = useState(false);
  const [testRunError, setTestRunError] = useState<string | null>(null);
  // Add Test Case form state
  const [showTestForm, setShowTestForm] = useState(false);
  const [testFormName, setTestFormName] = useState("");
  const [testFormDescription, setTestFormDescription] = useState("");
  const [testFormInput, setTestFormInput] = useState("");
  const [testFormExpected, setTestFormExpected] = useState("");
  const [testFormSeverity, setTestFormSeverity] = useState<"required" | "informational">("required");
  const [savingTestCase, setSavingTestCase] = useState(false);
  // Expanded test case result detail
  const [expandedResult, setExpandedResult] = useState<string | null>(null);
  // Quality score
  const [qualityScore, setQualityScore] = useState<{
    id: string;
    blueprintId: string;
    overallScore: string | null;
    intentAlignment: string | null;
    toolAppropriateness: string | null;
    instructionSpecificity: string | null;
    governanceAdequacy: string | null;
    ownershipCompleteness: string | null;
    flags: string[];
    evaluatedAt: string;
  } | null>(null);
  const [qualityLoading, setQualityLoading] = useState(true);

  // H1-1.3: Production telemetry
  const [telemetryData, setTelemetryData] = useState<{
    id: string; agentId: string; timestamp: string; invocations: number; errors: number;
    latencyP50Ms: number | null; latencyP99Ms: number | null; tokensIn: number; tokensOut: number;
    policyViolations: number; source: string; createdAt: string;
  }[] | null>(null);
  const [telemetryLoading, setTelemetryLoading] = useState(false);

  // Phase 37: Periodic review completion
  const [reviewCompleteOpen, setReviewCompleteOpen] = useState(false);
  const [reviewCompleteNotes, setReviewCompleteNotes] = useState("");
  const [completingReview, setCompletingReview] = useState(false);
  const [reviewCompleteError, setReviewCompleteError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/registry/${agentId}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message ?? "Not found");
      }
      const data = await res.json();
      setLatest(data.agent);
      setVersions(data.versions);

      // Fetch governance health for deployed agents
      if (data.agent?.status === "deployed") {
        fetchJson("/api/monitor")
          .then((monitorData: any) => {
            const found = (monitorData.agents ?? []).find(
              (a: { agentId: string }) => a.agentId === agentId
            );
            if (found) {
              setHealthData({
                healthStatus: found.healthStatus,
                errorCount:   found.errorCount,
                warningCount: found.warningCount,
                lastCheckedAt: found.lastCheckedAt,
              });
            } else {
              setHealthData({ healthStatus: "unknown", errorCount: 0, warningCount: 0, lastCheckedAt: null });
            }
          })
          .catch(() => {});
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load agent");
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    load();
    // Fetch current user for SOD check and role-gating
    fetchJson("/api/me")
      .then((data: any) => {
        setCurrentUser(data.user ?? null);
        // Load enterprise settings for approval chain (admin only endpoint, best-effort)
        if (data.user?.role === "admin") {
          fetchJson("/api/admin/settings")
            .then((d: any) => setEnterpriseSettings(d.settings ?? DEFAULT_ENTERPRISE_SETTINGS))
            .catch(() => {});
        }
      })
      .catch(() => {}); // non-critical
  }, [load]);

  // Fetch quality score once on mount (non-critical, fails silently)
  useEffect(() => {
    setQualityLoading(true);
    fetchJson(`/api/registry/${agentId}/quality`)
      .then((data: any) => setQualityScore(data.score ?? null))
      .catch(() => {})
      .finally(() => setQualityLoading(false));
  }, [agentId]);

  // H1-1.3: Fetch production telemetry (deployed + suspended agents)
  useEffect(() => {
    if (!latest || (latest.status !== "deployed" && latest.status !== "suspended")) return;
    setTelemetryLoading(true);
    const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
    fetchJson(`/api/telemetry/${agentId}?since=${since}`)
      .then((data: any) => setTelemetryData(data.rows ?? []))
      .catch(() => setTelemetryData([]))
      .finally(() => setTelemetryLoading(false));
  }, [agentId, latest?.status]);

  // Poll every 30s when the tab is visible to reflect status changes by other users.
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        void load();
      }
    }, 30_000);
    return () => clearInterval(interval);
  }, [load]);

  const handleStatusChange = useCallback((newStatus: Status) => {
    setLatest((prev) => prev ? { ...prev, status: newStatus } : prev);
    setVersions((prev) =>
      prev.map((v) => (v.id === latest?.id ? { ...v, status: newStatus } : v))
    );
    if (newStatus !== "in_review") {
      setActiveTab("blueprint");
    }
  }, [latest?.id]);

  const handleReviewComplete = useCallback((newStatus: string) => {
    if (newStatus === "in_review") {
      // Multi-step approval: step advanced but blueprint stays in_review.
      // Reload to get fresh currentApprovalStep + approvalProgress.
      void load();
    } else {
      handleStatusChange(newStatus as Status);
    }
  }, [handleStatusChange, load]);

  const handleRevalidate = useCallback((report: ValidationReport) => {
    setLatest((prev) => prev ? { ...prev, validationReport: report } : prev);
  }, []);

  const handleCheckHealth = useCallback(async () => {
    setCheckingHealth(true);
    try {
      const res = await fetch(`/api/monitor/${agentId}/check`, { method: "POST" });
      if (res.ok) {
        const result = await res.json();
        setHealthData({
          healthStatus:  result.healthStatus,
          errorCount:    result.errorCount,
          warningCount:  result.warningCount,
          lastCheckedAt: result.checkedAt,
        });
      }
    } catch { /* non-critical */ }
    finally { setCheckingHealth(false); }
  }, [agentId]);

  const handleClone = useCallback(async () => {
    if (!latest) return;
    setCloning(true);
    try {
      const res = await fetch(`/api/blueprints/${latest.id}/clone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cloneName.trim() ? { name: cloneName.trim() } : {}),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Clone failed");
      }
      const cloned = await res.json();
      setCloneModalOpen(false);
      setCloneName("");
      router.push(`/registry/${cloned.agentId}`);
    } catch {
      // clone errors are non-critical; user can retry
    } finally {
      setCloning(false);
    }
  }, [latest, cloneName, router]);

  const handleCompleteReview = useCallback(async () => {
    if (!latest) return;
    setReviewCompleteError(null);
    setCompletingReview(true);
    try {
      const res = await fetch(
        `/api/blueprints/${latest.id}/periodic-review/complete`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes: reviewCompleteNotes || undefined }),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setReviewCompleteError((data as { error?: string }).error ?? "Failed to complete review.");
        return;
      }
      const data = await res.json();
      // Update local state with new review dates
      setLatest((prev) => prev ? {
        ...prev,
        nextReviewDue: data.nextReviewDue,
        lastPeriodicReviewAt: data.lastPeriodicReviewAt,
      } : prev);
      setReviewCompleteOpen(false);
      setReviewCompleteNotes("");
    } catch {
      setReviewCompleteError("Something went wrong. Please try again.");
    } finally {
      setCompletingReview(false);
    }
  }, [latest, reviewCompleteNotes]);

  const handleExportReport = useCallback(async () => {
    if (!latest) return;
    setExporting(true);
    try {
      const res = await fetch(`/api/blueprints/${latest.id}/report`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message ?? "Export failed");
      }
      const report = await res.json();
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeName = (latest.name ?? "agent").replace(/\s+/g, "-").toLowerCase();
      a.download = `mrm-report-${safeName}-v${latest.version}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // non-critical — export errors are silent; the user can retry
    } finally {
      setExporting(false);
    }
  }, [latest]);

  // Fetch test cases + runs when Tests tab is activated
  const loadTestData = useCallback(async (blueprintId: string) => {
    if (testCasesLoaded) return;
    try {
      const [casesRes, runsRes] = await Promise.all([
        fetch(`/api/registry/${agentId}/test-cases`),
        fetch(`/api/blueprints/${blueprintId}/test-runs`),
      ]);
      if (casesRes.ok) {
        const d = await casesRes.json();
        setTestCases(d.testCases ?? []);
      }
      if (runsRes.ok) {
        const d = await runsRes.json();
        setTestRuns(d.testRuns ?? []);
      }
      setTestCasesLoaded(true);
    } catch { /* non-critical */ }
  }, [agentId, testCasesLoaded]);

  const handleRunTests = useCallback(async (blueprintId: string) => {
    setRunningTests(true);
    setTestRunError(null);
    try {
      const res = await fetch(`/api/blueprints/${blueprintId}/test-runs`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setTestRunError(data.message ?? "Test run failed");
        return;
      }
      setTestRuns((prev) => [data.testRun, ...prev]);
    } catch {
      setTestRunError("Failed to execute test run");
    } finally {
      setRunningTests(false);
    }
  }, []);

  const handleSaveTestCase = useCallback(async () => {
    if (!testFormName.trim() || !testFormInput.trim() || !testFormExpected.trim()) return;
    setSavingTestCase(true);
    try {
      const res = await fetch(`/api/registry/${agentId}/test-cases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: testFormName.trim(),
          description: testFormDescription.trim() || null,
          inputPrompt: testFormInput.trim(),
          expectedBehavior: testFormExpected.trim(),
          severity: testFormSeverity,
        }),
      });
      if (res.ok) {
        const d = await res.json();
        setTestCases((prev) => [...prev, d.testCase]);
        setShowTestForm(false);
        setTestFormName(""); setTestFormDescription(""); setTestFormInput(""); setTestFormExpected(""); setTestFormSeverity("required");
      }
    } catch { /* non-critical */ }
    finally { setSavingTestCase(false); }
  }, [agentId, testFormName, testFormDescription, testFormInput, testFormExpected, testFormSeverity]);

  const handleDeleteTestCase = useCallback(async (caseId: string) => {
    try {
      const res = await fetch(`/api/registry/${agentId}/test-cases/${caseId}`, { method: "DELETE" });
      if (res.ok) setTestCases((prev) => prev.filter((tc) => tc.id !== caseId));
    } catch { /* non-critical */ }
  }, [agentId]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-gray-400">
        Loading agent…
      </div>
    );
  }

  if (error || !latest) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <p className="text-sm text-red-600">{error ?? "Agent not found"}</p>
        <Link href="/registry" className="text-sm text-gray-500 underline">
          Back to Registry
        </Link>
      </div>
    );
  }

  const isInReview = latest.status === "in_review";

  // Derive review outcome for banner display
  type ReviewOutcome = "approved" | "rejected" | "changes_requested" | null;
  const reviewOutcome: ReviewOutcome = (() => {
    if (!latest.reviewedBy) return null;
    if (latest.status === "approved") return "approved";
    if (latest.status === "rejected") return "rejected";
    // draft + reviewedBy → changes were requested
    if (latest.status === "draft") return "changes_requested";
    return null;
  })();

  // Find the immediately prior version for diff/review purposes
  const previousVersion = versions
    .filter((v) => v.id !== latest.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] ?? null;

  const tabs: { id: Tab; label: string }[] = [
    { id: "blueprint", label: "Blueprint" },
    { id: "summary", label: "Summary" },
    { id: "governance", label: "Governance" },
    { id: "quality", label: "Quality" },
    { id: "regulatory", label: "Regulatory" },
    { id: "tests", label: `Tests${testCases.length > 0 ? ` (${testCases.length})` : ""}` },
    { id: "simulate", label: "Simulate" },
    ...(latest?.status === "deployed" || latest?.status === "suspended" ? [{ id: "production" as Tab, label: "Production" }] : []),
    ...(latest?.status === "deployed" || latest?.status === "suspended" ? [{ id: "violations" as Tab, label: "Violations" }] : []),
    ...(isInReview ? [{ id: "review" as Tab, label: "Review" }] : []),
    { id: "versions", label: `Versions (${versions.length})` },
  ];

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-y-2 border-b border-gray-200 bg-white px-6 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/registry" className="text-sm text-gray-400 hover:text-gray-700 shrink-0">
            ← Registry
          </Link>
          <span className="text-gray-200">/</span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-gray-900 truncate">
                {latest.name ?? `Agent ${latest.agentId.slice(0, 8)}`}
              </h1>
              <StatusBadge status={latest.status} />
              {latest.deploymentTarget === "agentcore" && latest.deploymentMetadata && (
                <a
                  href={`https://console.aws.amazon.com/bedrock/home?region=${latest.deploymentMetadata.region}#/agents/${latest.deploymentMetadata.agentId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-orange-700 hover:bg-orange-100 transition-colors"
                  title={`Deployed to Amazon Bedrock AgentCore in ${latest.deploymentMetadata.region}`}
                >
                  AgentCore ↗
                </a>
              )}
            </div>
            <p className="text-xs text-gray-400 flex items-center gap-2 flex-wrap">
              <span>v{latest.version} · {versions.length} version{versions.length !== 1 ? "s" : ""}
              {parseInt(latest.refinementCount ?? "0") > 0 &&
                ` · ${latest.refinementCount} refinement${latest.refinementCount === "1" ? "" : "s"}`}</span>
              {latest.status === "deployed" && latest.nextReviewDue && (() => {
                const isOverdue = new Date(latest.nextReviewDue) < new Date();
                const canComplete = currentUser?.role === "compliance_officer" || currentUser?.role === "admin";
                return (
                  <>
                    {isOverdue ? (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700">
                        Review Overdue
                      </span>
                    ) : (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                        Next Review: {new Date(latest.nextReviewDue).toLocaleDateString(undefined, { dateStyle: "medium" })}
                      </span>
                    )}
                    {canComplete && (
                      <button
                        onClick={() => { setReviewCompleteOpen(true); setReviewCompleteNotes(""); setReviewCompleteError(null); }}
                        className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700 hover:bg-violet-100"
                      >
                        Complete Review
                      </button>
                    )}
                  </>
                );
              })()}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <LifecycleControls
            blueprintId={latest.id}
            agentId={latest.agentId}
            currentStatus={latest.status}
            currentUserRole={currentUser?.role}
            onStatusChange={handleStatusChange}
          />
          {/* MRM Report — visible to all authenticated users */}
          <Link
            href={`/blueprints/${latest.id}/report`}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:border-gray-400 hover:text-gray-900 transition-colors"
          >
            View MRM Report
          </Link>
          {/* Compliance exports — restricted to compliance_officer + admin */}
          {/* Export Agent Code — all roles */}
          <a
            href={`/api/blueprints/${latest.id}/export/code`}
            download
            className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-sm text-violet-700 hover:border-violet-400 hover:bg-violet-100 transition-colors"
            title="Download a ready-to-run TypeScript agent generated from this blueprint"
          >
            Export Agent Code ↓
          </a>
          {(currentUser?.role === "compliance_officer" || currentUser?.role === "admin") && (
            <>
              {(latest.status === "approved" || latest.status === "deployed") && (
                <a
                  href={`/api/blueprints/${latest.id}/export/compliance`}
                  download
                  className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-sm text-indigo-700 hover:border-indigo-400 hover:bg-indigo-100 transition-colors"
                  title="Download structured JSON compliance evidence package"
                >
                  Export Evidence ↓
                </a>
              )}
              <button
                onClick={handleExportReport}
                disabled={exporting}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:border-gray-400 hover:text-gray-900 transition-colors disabled:opacity-50"
              >
                {exporting ? "Exporting…" : "Export JSON"}
              </button>
            </>
          )}
          {(currentUser?.role === "reviewer" || currentUser?.role === "compliance_officer" || currentUser?.role === "admin") &&
            (latest.status === "approved" || latest.status === "deployed") && (
              <a
                href={`/api/blueprints/${latest.id}/export/agentcore`}
                download
                className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-1.5 text-sm text-orange-700 hover:border-orange-400 hover:bg-orange-100 transition-colors"
                title="Download Amazon Bedrock AgentCore deployment manifest"
              >
                Export for AgentCore ↓
              </a>
          )}
          {latest.sessionId && (
            <Link
              href={`/intake/${latest.sessionId}`}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:border-gray-400 hover:text-gray-900 transition-colors"
            >
              ← Intake Session
            </Link>
          )}
          {(currentUser?.role === "architect" || currentUser?.role === "admin") && (
            <button
              onClick={() => { setCloneName(""); setCloneModalOpen(true); }}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:border-gray-400 hover:text-gray-900 transition-colors"
            >
              Clone Agent
            </button>
          )}
          <Link
            href={`/blueprints/${latest.id}`}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:border-gray-400 hover:text-gray-900 transition-colors"
          >
            Open in Studio
          </Link>
        </div>
      </header>

      {/* AgentCore Deployment Details Strip */}
      {latest.deploymentTarget === "agentcore" && latest.deploymentMetadata && (
        <div className="border-b border-orange-100 bg-orange-50 px-6 py-2.5">
          <div className="mx-auto flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-orange-800">
            <span className="font-semibold">Amazon Bedrock AgentCore</span>
            <span className="text-orange-500">·</span>
            <span>
              <span className="text-orange-600 font-medium">Agent ID</span>{" "}
              <span className="font-mono">{latest.deploymentMetadata.agentId}</span>
            </span>
            <span className="text-orange-500">·</span>
            <span>
              <span className="text-orange-600 font-medium">Region</span>{" "}
              {latest.deploymentMetadata.region}
            </span>
            <span className="text-orange-500">·</span>
            <span>
              <span className="text-orange-600 font-medium">Model</span>{" "}
              <span className="font-mono">{latest.deploymentMetadata.foundationModel}</span>
            </span>
            <span className="text-orange-500">·</span>
            <span>
              <span className="text-orange-600 font-medium">Deployed</span>{" "}
              {new Date(latest.deploymentMetadata.deployedAt).toLocaleString()} by {latest.deploymentMetadata.deployedBy}
            </span>
            <a
              href={`https://console.aws.amazon.com/bedrock/home?region=${latest.deploymentMetadata.region}#/agents/${latest.deploymentMetadata.agentId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto underline hover:text-orange-900"
            >
              Open in AWS Console →
            </a>
          </div>
        </div>
      )}

      {/* Clone Modal */}
      {cloneModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-xl">
            <h2 className="text-base font-semibold text-gray-900">Clone Agent</h2>
            <p className="mt-1 text-sm text-gray-500">
              Creates a new draft agent pre-populated with this blueprint&apos;s content. The clone
              starts its own independent governance lifecycle.
            </p>
            <div className="mt-4">
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Clone Name <span className="font-normal normal-case">(optional)</span>
              </label>
              <input
                type="text"
                value={cloneName}
                onChange={(e) => setCloneName(e.target.value)}
                placeholder={`${latest.name ?? "Unnamed Agent"} (Clone)`}
                className="mt-1.5 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-400 focus:outline-none"
              />
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setCloneModalOpen(false)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleClone}
                disabled={cloning}
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
              >
                {cloning ? "Cloning…" : "Clone Agent"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Governance Health Strip — only shown for deployed agents */}
      {latest.status === "deployed" && healthData && (() => {
        const canCheck = currentUser?.role === "compliance_officer" || currentUser?.role === "admin";
        const { healthStatus, errorCount, warningCount, lastCheckedAt } = healthData;
        if (healthStatus === "critical") {
          return (
            <div className="shrink-0 border-b border-red-200 bg-red-50 px-6 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-2">
                  <span className="shrink-0 text-base">⚠</span>
                  <div>
                    <p className="text-sm font-semibold text-red-800">
                      Governance Drift Detected — {errorCount} error violation{errorCount === 1 ? "" : "s"} since deployment
                    </p>
                    <p className="text-xs text-red-700">
                      Policy changes have introduced governance errors. Open the Governance tab to review.
                      {lastCheckedAt && ` Last checked ${timeAgoShort(lastCheckedAt)}.`}
                    </p>
                  </div>
                </div>
                {canCheck && (
                  <button
                    onClick={handleCheckHealth}
                    disabled={checkingHealth}
                    className="ml-4 shrink-0 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    {checkingHealth ? "Checking…" : "↻ Check Now"}
                  </button>
                )}
              </div>
            </div>
          );
        }
        if (healthStatus === "clean") {
          return (
            <div className="shrink-0 border-b border-green-200 bg-green-50 px-6 py-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-green-800">
                  <span className="font-semibold">✓ Governance posture is clean.</span>
                  {warningCount > 0 && ` ${warningCount} warning${warningCount === 1 ? "" : "s"}.`}
                  {lastCheckedAt && ` Last checked ${timeAgoShort(lastCheckedAt)}.`}
                </p>
                {canCheck && (
                  <button
                    onClick={handleCheckHealth}
                    disabled={checkingHealth}
                    className="ml-4 shrink-0 rounded-lg border border-green-300 bg-white px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-50 disabled:opacity-50"
                  >
                    {checkingHealth ? "Checking…" : "↻ Re-check"}
                  </button>
                )}
              </div>
            </div>
          );
        }
        // unknown
        return (
          <div className="shrink-0 border-b border-amber-200 bg-amber-50 px-6 py-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-amber-800">
                Governance health not yet checked against current policies.
              </p>
              {canCheck && (
                <button
                  onClick={handleCheckHealth}
                  disabled={checkingHealth}
                  className="ml-4 shrink-0 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                >
                  {checkingHealth ? "Checking…" : "↻ Run First Check"}
                </button>
              )}
            </div>
          </div>
        );
      })()}

      {/* Approval Progress Strip — shown when in_review with a multi-step chain configured */}
      {isInReview && (() => {
        const chain: ApprovalChainStep[] = enterpriseSettings.approvalChain ?? [];
        if (chain.length === 0) return null;
        const priorApprovals = (latest.approvalProgress ?? []) as ApprovalStepRecord[];
        const activeStepIdx = latest.currentApprovalStep ?? 0;
        return (
          <div className="shrink-0 border-b border-blue-100 bg-blue-50 px-6 py-2.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-medium text-blue-700 mr-1">Approval:</span>
              {chain.map((step, idx) => {
                const completed = priorApprovals.find(
                  (p) => p.step === idx && p.decision === "approved"
                );
                const isActive = idx === activeStepIdx;
                return (
                  <span key={idx} className="flex items-center gap-1">
                    {idx > 0 && <span className="text-blue-300 text-xs">→</span>}
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${
                        completed
                          ? "bg-green-100 text-green-700"
                          : isActive
                          ? "bg-amber-100 text-amber-700 ring-1 ring-amber-300"
                          : "bg-gray-100 text-gray-400"
                      }`}
                      title={completed ? `Approved by ${completed.approvedBy}` : isActive ? `Awaiting ${step.role}` : "Pending"}
                    >
                      {completed ? "✓ " : isActive ? "→ " : "○ "}
                      {step.label}
                    </span>
                  </span>
                );
              })}
              <span className="ml-2 text-xs text-blue-500">
                Step {activeStepIdx + 1} of {chain.length}
              </span>
            </div>
          </div>
        );
      })()}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-white px-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.id === "review" && activeTab !== "review" ? (
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-amber-400"></span>
                {tab.label}
              </span>
            ) : (
              tab.label
            )}
          </button>
        ))}
      </div>

      {/* Review decision banner — shown when a review decision has been recorded */}
      {reviewOutcome && (
        <div
          className={`shrink-0 border-b px-6 py-3 ${
            reviewOutcome === "approved"
              ? "border-green-200 bg-green-50"
              : reviewOutcome === "rejected"
              ? "border-red-200 bg-red-50"
              : "border-amber-200 bg-amber-50"
          }`}
        >
          <div className="flex items-start gap-3 max-w-4xl">
            {/* Icon */}
            <span className="mt-0.5 text-base shrink-0">
              {reviewOutcome === "approved" ? "✅" : reviewOutcome === "rejected" ? "❌" : "🔄"}
            </span>

            <div className="min-w-0 flex-1">
              {/* Headline */}
              <p className={`text-sm font-semibold ${
                reviewOutcome === "approved"
                  ? "text-green-800"
                  : reviewOutcome === "rejected"
                  ? "text-red-800"
                  : "text-amber-800"
              }`}>
                {reviewOutcome === "approved" && "Approved for deployment"}
                {reviewOutcome === "rejected" && "Rejected — not approved for deployment"}
                {reviewOutcome === "changes_requested" && "Changes requested — returned for revision"}
              </p>

              {/* Reviewer + timestamp */}
              <p className={`mt-0.5 text-xs ${
                reviewOutcome === "approved"
                  ? "text-green-700"
                  : reviewOutcome === "rejected"
                  ? "text-red-700"
                  : "text-amber-700"
              }`}>
                Reviewed by{" "}
                <span className="font-medium">{latest.reviewedBy}</span>
                {latest.reviewedAt && (
                  <>
                    {" "}on{" "}
                    {new Date(latest.reviewedAt).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </>
                )}
              </p>

              {/* Reviewer comment */}
              {latest.reviewComment && (
                <p className={`mt-1.5 text-sm italic leading-relaxed ${
                  reviewOutcome === "approved"
                    ? "text-green-800"
                    : reviewOutcome === "rejected"
                    ? "text-red-800"
                    : "text-amber-800"
                }`}>
                  &ldquo;{latest.reviewComment}&rdquo;
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "blueprint" && (
          <div className="p-6">
            <BlueprintView abp={latest.abp} />
          </div>
        )}

        {activeTab === "summary" && (
          <div className="p-6 max-w-2xl">
            <BlueprintSummary abp={latest.abp} status={latest.status} />
          </div>
        )}

        {activeTab === "governance" && (
          <div className="p-6 max-w-2xl">
            {latest.validationReport ? (
              <ValidationReportView
                report={latest.validationReport}
                blueprintId={latest.id}
                onRevalidate={handleRevalidate}
              />
            ) : (
              <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
                <p className="text-sm text-gray-500">No validation report yet.</p>
                <button
                  onClick={async () => {
                    try {
                      const res = await fetch(`/api/blueprints/${latest.id}/validate`, {
                        method: "POST",
                      });
                      const data = await res.json();
                      if (data.report) handleRevalidate(data.report as ValidationReport);
                    } catch { /* non-critical */ }
                  }}
                  className="mt-3 text-sm text-gray-900 underline"
                >
                  Run validation
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === "quality" && (
          <div className="p-6 max-w-2xl">
            <QualityDashboard
              score={qualityScore}
              loading={qualityLoading}
              agentId={agentId}
              agentStatus={latest.status}
            />
          </div>
        )}

        {activeTab === "regulatory" && (
          <div className="p-6 max-w-3xl">
            <RegulatoryPanel blueprintId={latest.id} />
          </div>
        )}

        {activeTab === "review" && isInReview && (() => {
          const chain: ApprovalChainStep[] = enterpriseSettings.approvalChain ?? [];
          const priorApprovals = (latest.approvalProgress ?? []) as ApprovalStepRecord[];
          const activeStepIdx = latest.currentApprovalStep ?? 0;
          const activeStep = chain.length > 0 ? chain[activeStepIdx] : null;
          const userRole = currentUser?.role;
          const isMyTurn = chain.length === 0 || !activeStep ||
            userRole === activeStep.role || userRole === "admin";

          return (
            <div className="p-6 max-w-2xl space-y-5">
              {/* Prior approvals table — shown when multi-step and at least one step completed */}
              {chain.length > 0 && priorApprovals.length > 0 && (
                <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                  <div className="border-b border-gray-100 bg-gray-50 px-4 py-2.5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Prior Approvals
                    </p>
                  </div>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 text-left text-gray-400">
                        <th className="px-4 py-2 font-medium">Step</th>
                        <th className="px-4 py-2 font-medium">Label</th>
                        <th className="px-4 py-2 font-medium">Approver</th>
                        <th className="px-4 py-2 font-medium">Date</th>
                        <th className="px-4 py-2 font-medium">Comment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {priorApprovals.map((step, i) => (
                        <tr key={i} className="text-gray-600">
                          <td className="px-4 py-2">{step.step + 1}</td>
                          <td className="px-4 py-2">{step.label}</td>
                          <td className="px-4 py-2 font-medium">{step.approvedBy}</td>
                          <td className="px-4 py-2 whitespace-nowrap">
                            {new Date(step.approvedAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
                          </td>
                          <td className="px-4 py-2 text-gray-500 italic">
                            {step.comment ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Step context header for multi-step mode */}
              {activeStep && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="text-sm font-semibold text-amber-800">
                    Step {activeStepIdx + 1} of {chain.length}: {activeStep.label}
                  </p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Requires: <span className="font-medium">{activeStep.role}</span> role
                    {isMyTurn
                      ? " — your turn to review"
                      : ` — awaiting a user with role "${activeStep.role}"`}
                  </p>
                </div>
              )}

              {/* Not your turn message */}
              {!isMyTurn ? (
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-6 text-center">
                  <p className="text-sm font-medium text-gray-600">
                    Waiting for {activeStep?.label ?? "next approver"}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    This step requires a user with role <span className="font-medium">{activeStep?.role}</span>.
                    Your role is <span className="font-medium">{userRole}</span>.
                  </p>
                </div>
              ) : (
                <ReviewPanel
                  blueprintId={latest.id}
                  agentName={latest.name}
                  version={latest.version}
                  submittedAt={latest.updatedAt}
                  previousComment={latest.reviewComment}
                  validationReport={latest.validationReport}
                  createdBy={latest.createdBy}
                  currentUserEmail={currentUser?.email ?? null}
                  onReviewComplete={handleReviewComplete}
                  previousBlueprintId={previousVersion?.id ?? null}
                  previousVersion={previousVersion?.version ?? null}
                />
              )}
            </div>
          );
        })()}

          {activeTab === "tests" && (() => {
          // Lazy-load test data on first activation
          if (!testCasesLoaded && latest) void loadTestData(latest.id);
          const canManage = currentUser?.role === "architect" || currentUser?.role === "admin";
          const latestRun = testRuns[0] ?? null;
          return (
            <div className="p-6 max-w-3xl space-y-6">
              {/* ── Test Suite ── */}
              <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-5 py-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Test Suite</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {testCases.length === 0
                        ? "No test cases defined yet."
                        : `${testCases.length} test case${testCases.length !== 1 ? "s" : ""} — shared across all versions of this agent`}
                    </p>
                  </div>
                  {canManage && (
                    <button
                      onClick={() => setShowTestForm((v) => !v)}
                      className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700"
                    >
                      {showTestForm ? "Cancel" : "+ Add Test Case"}
                    </button>
                  )}
                </div>

                {/* Add Test Case form */}
                {showTestForm && (
                  <div className="border-b border-gray-100 px-5 py-4 space-y-3 bg-blue-50">
                    <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">New Test Case</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
                        <input
                          type="text"
                          value={testFormName}
                          onChange={(e) => setTestFormName(e.target.value)}
                          placeholder="e.g. Happy path: basic domain query"
                          className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-gray-400 focus:outline-none"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Description (optional)</label>
                        <input
                          type="text"
                          value={testFormDescription}
                          onChange={(e) => setTestFormDescription(e.target.value)}
                          placeholder="Brief description of what this test verifies"
                          className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-gray-400 focus:outline-none"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Input prompt *</label>
                        <textarea
                          value={testFormInput}
                          onChange={(e) => setTestFormInput(e.target.value)}
                          rows={3}
                          placeholder="The message to send to the agent"
                          className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-gray-400 focus:outline-none"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Expected behavior *</label>
                        <textarea
                          value={testFormExpected}
                          onChange={(e) => setTestFormExpected(e.target.value)}
                          rows={3}
                          placeholder="Describe what the agent should do in response"
                          className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-gray-400 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Severity</label>
                        <select
                          value={testFormSeverity}
                          onChange={(e) => setTestFormSeverity(e.target.value as "required" | "informational")}
                          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus:border-gray-400 focus:outline-none"
                        >
                          <option value="required">required</option>
                          <option value="informational">informational</option>
                        </select>
                        <p className="text-xs text-gray-400 mt-0.5">Required failures block the overall pass verdict</p>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button
                        onClick={handleSaveTestCase}
                        disabled={savingTestCase || !testFormName.trim() || !testFormInput.trim() || !testFormExpected.trim()}
                        className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        {savingTestCase ? "Saving…" : "Save Test Case"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Test case list */}
                {testCases.length === 0 ? (
                  <div className="px-5 py-10 text-center">
                    <p className="text-sm text-gray-400">
                      {canManage
                        ? "No test cases yet. Click \"+ Add Test Case\" to define behavioral tests for this agent."
                        : "No test cases have been defined for this agent."}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {testCases.map((tc) => (
                      <div key={tc.id} className="px-5 py-3 flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">{tc.name}</span>
                            <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                              tc.severity === "required"
                                ? "bg-gray-100 text-gray-600"
                                : "bg-blue-50 text-blue-600"
                            }`}>
                              {tc.severity}
                            </span>
                          </div>
                          {tc.description && (
                            <p className="text-xs text-gray-400 mt-0.5">{tc.description}</p>
                          )}
                        </div>
                        {canManage && (
                          <button
                            onClick={() => handleDeleteTestCase(tc.id)}
                            className="shrink-0 text-xs text-red-400 hover:text-red-600"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Test Runs ── */}
              <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-5 py-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Test Runs</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Runs for v{latest?.version} of this blueprint
                    </p>
                  </div>
                  <button
                    onClick={() => latest && handleRunTests(latest.id)}
                    disabled={runningTests || testCases.length === 0}
                    className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700 disabled:opacity-50"
                  >
                    {runningTests
                      ? `Running ${testCases.length} test${testCases.length !== 1 ? "s" : ""}…`
                      : `Run Tests Against v${latest?.version}`}
                  </button>
                </div>

                {testRunError && (
                  <div className="border-b border-red-100 bg-red-50 px-5 py-3">
                    <p className="text-sm text-red-700">{testRunError}</p>
                  </div>
                )}

                {/* Latest run summary banner */}
                {latestRun && (
                  <div className={`border-b px-5 py-3 ${
                    latestRun.status === "passed"
                      ? "border-green-100 bg-green-50"
                      : latestRun.status === "failed"
                      ? "border-red-100 bg-red-50"
                      : "border-amber-100 bg-amber-50"
                  }`}>
                    <div className="flex items-center gap-2">
                      <span className="text-base">
                        {latestRun.status === "passed" ? "✓" : latestRun.status === "failed" ? "✗" : "⚠"}
                      </span>
                      <span className={`text-sm font-semibold ${
                        latestRun.status === "passed" ? "text-green-800"
                          : latestRun.status === "failed" ? "text-red-800"
                          : "text-amber-800"
                      }`}>
                        {latestRun.passedCases}/{latestRun.totalCases} passed
                        {latestRun.status === "error" && " (some cases errored)"}
                      </span>
                      <span className="text-xs text-gray-400 ml-auto">
                        Run by {latestRun.runBy} · {new Date(latestRun.startedAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}

                {/* Latest run results detail */}
                {latestRun && latestRun.testResults.length > 0 && (
                  <div className="divide-y divide-gray-50">
                    {latestRun.testResults.map((result) => (
                      <div key={result.testCaseId} className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm ${
                            result.status === "passed" ? "text-green-600" : "text-red-600"
                          }`}>
                            {result.status === "passed" ? "✓" : "✗"}
                          </span>
                          <span className="text-sm font-medium text-gray-900">{result.name}</span>
                          <button
                            onClick={() => setExpandedResult(expandedResult === result.testCaseId ? null : result.testCaseId)}
                            className="ml-auto text-xs text-gray-400 hover:text-gray-700"
                          >
                            {expandedResult === result.testCaseId ? "Hide ▲" : "Details ▼"}
                          </button>
                        </div>
                        <p className="mt-0.5 text-xs text-gray-500">{result.evaluationRationale}</p>
                        {expandedResult === result.testCaseId && (
                          <div className="mt-3 space-y-2">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Input</p>
                              <p className="mt-0.5 text-xs text-gray-700 rounded bg-gray-50 px-3 py-2">{result.inputPrompt}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Expected behavior</p>
                              <p className="mt-0.5 text-xs text-gray-700 rounded bg-gray-50 px-3 py-2">{result.expectedBehavior}</p>
                            </div>
                            {result.actualOutput && (
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Actual output</p>
                                <p className="mt-0.5 text-xs text-gray-700 rounded bg-gray-50 px-3 py-2 whitespace-pre-wrap">{result.actualOutput}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Run history — prior runs */}
                {testRuns.length === 0 ? (
                  <div className="px-5 py-8 text-center">
                    <p className="text-sm text-gray-400">No test runs yet. Click &quot;Run Tests&quot; to execute the test suite.</p>
                  </div>
                ) : testRuns.length > 1 && (
                  <div className="border-t border-gray-100 px-5 py-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Prior Runs</p>
                    <div className="space-y-1">
                      {testRuns.slice(1).map((run) => (
                        <div key={run.id} className="flex items-center gap-2 text-xs text-gray-500">
                          <span className={run.status === "passed" ? "text-green-600" : "text-red-600"}>
                            {run.status === "passed" ? "✓" : "✗"}
                          </span>
                          <span>{run.passedCases}/{run.totalCases} passed</span>
                          <span className="text-gray-300">·</span>
                          <span>{run.runBy}</span>
                          <span className="text-gray-300">·</span>
                          <span>{new Date(run.startedAt).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {activeTab === "simulate" && (
          <SimulatePanel
            blueprintId={latest.id}
            agentName={latest.name}
            version={latest.version}
          />
        )}

        {activeTab === "production" && (
          <ProductionDashboard
            agentId={agentId}
            data={telemetryData}
            loading={telemetryLoading}
            canManageAlerts={
              currentUser?.role === "architect" ||
              currentUser?.role === "admin"
            }
          />
        )}

        {activeTab === "violations" && (
          <ViolationsPanel agentId={agentId} />
        )}

      {activeTab === "versions" && (
          <div className="p-6 space-y-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="pb-3 pr-4">Version</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Governance</th>
                  <th className="pb-3 pr-4">Refinements</th>
                  <th className="pb-3 pr-4">Created</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {versions.map((v) => (
                  <tr key={v.id} className="py-3">
                    <td className="py-3 pr-4 font-mono text-gray-700">v{v.version}</td>
                    <td className="py-3 pr-4">
                      <StatusBadge status={v.status} />
                    </td>
                    <td className="py-3 pr-4">
                      {v.validationReport == null ? (
                        <span className="text-gray-300">—</span>
                      ) : (() => {
                        const errorCount = v.validationReport.violations.filter(x => x.severity === "error").length;
                        const warnCount = v.validationReport.violations.filter(x => x.severity === "warning").length;
                        return (
                          <div className="flex items-center gap-1.5">
                            {v.validationReport.valid ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                                <CheckCircle size={10} />Pass
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                                <XCircle size={10} />Fail
                              </span>
                            )}
                            {errorCount > 0 && (
                              <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700">
                                {errorCount}E
                              </span>
                            )}
                            {warnCount > 0 && (
                              <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700">
                                {warnCount}W
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="py-3 pr-4 text-gray-500">{v.refinementCount ?? "0"}</td>
                    <td className="py-3 pr-4 text-gray-500">
                      {new Date(v.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3">
                      <Link
                        href={`/blueprints/${v.id}`}
                        className="text-gray-500 hover:text-gray-900 underline"
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Version Lineage — governance diff per version */}
            {versions.some((v) => v.governanceDiff != null) && (
              <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <div className="border-b border-gray-100 bg-gray-50 px-5 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Version Lineage
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Governance changes computed at version-creation time — required for regulatory change management documentation.
                  </p>
                </div>
                <div className="divide-y divide-gray-100">
                  {versions
                    .filter((v) => v.governanceDiff != null)
                    .map((v) => {
                      const diff = v.governanceDiff!;
                      const isExpanded = expandedDiffId === v.id;
                      const sigColor =
                        diff.significance === "major"
                          ? "bg-red-50 text-red-700 border-red-200"
                          : diff.significance === "minor"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-gray-50 text-gray-500 border-gray-200";
                      const sigLabel =
                        diff.significance === "major"
                          ? "Major — compliance posture changed"
                          : diff.significance === "minor"
                          ? "Minor — capabilities or constraints changed"
                          : "Patch — identity or metadata only";
                      const hasSections = diff.sections.some((s) => s.changes.length > 0);
                      return (
                        <div key={v.id} className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-sm font-medium text-gray-700">
                              v{diff.versionFrom}
                            </span>
                            <span className="text-gray-300">→</span>
                            <span className="font-mono text-sm font-medium text-gray-700">
                              v{diff.versionTo}
                            </span>
                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${sigColor}`}>
                              {sigLabel}
                            </span>
                            <span className="text-xs text-gray-400">
                              {diff.totalChanges} change{diff.totalChanges !== 1 ? "s" : ""}
                            </span>
                            {hasSections && (
                              <button
                                onClick={() => setExpandedDiffId(isExpanded ? null : v.id)}
                                className="ml-auto text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                              >
                                {isExpanded ? "Collapse ↑" : "View changes ↓"}
                              </button>
                            )}
                            {!hasSections && (
                              <span className="ml-auto text-xs text-gray-400 italic">No structural changes</span>
                            )}
                          </div>

                          {isExpanded && hasSections && (
                            <div className="mt-3 space-y-3">
                              {diff.sections
                                .filter((s) => s.changes.length > 0)
                                .map((section) => (
                                  <div key={section.section} className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                                    <p className="text-xs font-semibold text-gray-600 mb-2">{section.label}</p>
                                    <ul className="space-y-1.5">
                                      {section.changes.map((change, ci) => (
                                        <li key={ci} className="flex items-start gap-2 text-xs">
                                          <span className={`mt-0.5 shrink-0 rounded-full px-1.5 py-0.5 font-medium ${
                                            change.changeType === "added"
                                              ? "bg-green-100 text-green-700"
                                              : change.changeType === "removed"
                                              ? "bg-red-100 text-red-700"
                                              : "bg-amber-100 text-amber-700"
                                          }`}>
                                            {change.changeType === "added" ? "+" : change.changeType === "removed" ? "−" : "~"}
                                          </span>
                                          <span className="text-gray-700">{change.label}</span>
                                        </li>
                                      ))}
                                    </ul>
                                    {/* Governance implication for major changes */}
                                    {section.section === "governance" && section.changes.length > 0 && (
                                      <p className="mt-2 text-xs text-red-600 font-medium">
                                        ⚠ Compliance posture changed — re-validation required before approval.
                                      </p>
                                    )}
                                    {section.section === "capabilities" && section.changes.some(c => c.path === "capabilities.instructions") && (
                                      <p className="mt-2 text-xs text-amber-600 font-medium">
                                        ⚠ System prompt changed — safety policy review triggered.
                                      </p>
                                    )}
                                    {section.section === "capabilities" && section.changes.some(c => c.path === "capabilities.tools") && (
                                      <p className="mt-2 text-xs text-amber-600 font-medium">
                                        ⚠ Tool set changed — constraint re-validation recommended.
                                      </p>
                                    )}
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Approval History */}
            {(() => {
              const approvalSteps = (latest.approvalProgress ?? []) as ApprovalStepRecord[];
              if (approvalSteps.length === 0) return null;
              return (
                <div className="border border-gray-200 rounded-lg p-5">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
                    Approval History
                  </h3>
                  <ol className="space-y-1.5">
                    {approvalSteps.map((step, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs text-gray-600">
                        <span className={`h-2 w-2 shrink-0 rounded-full ${
                          step.decision === "approved" ? "bg-green-500" :
                          step.decision === "rejected" ? "bg-red-500" : "bg-gray-300"
                        }`} />
                        <span className="capitalize font-medium">{step.role ?? `Step ${i + 1}`}</span>
                        <span className="text-gray-400">—</span>
                        <span className={`capitalize ${step.decision === "approved" ? "text-green-700" : step.decision === "rejected" ? "text-red-700" : "text-gray-500"}`}>
                          {step.decision ?? "pending"}
                        </span>
                        {step.approvedAt && (
                          <span className="text-gray-400">
                            · {new Date(step.approvedAt).toLocaleDateString()}
                          </span>
                        )}
                      </li>
                    ))}
                  </ol>
                </div>
              );
            })()}

            {/* Version comparison — only shown when there are at least 2 versions */}
            {versions.length >= 2 && (
              <div className="border border-gray-200 rounded-lg p-5 space-y-4">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-gray-700">Compare versions:</span>
                  <select
                    value={compareVersionId ?? ""}
                    onChange={(e) => setCompareVersionId(e.target.value || null)}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-gray-300"
                  >
                    <option value="">Select a version to compare…</option>
                    {versions
                      .filter((v) => v.id !== latest.id)
                      .map((v) => (
                        <option key={v.id} value={v.id}>
                          v{v.version} ({v.status}) — {new Date(v.createdAt).toLocaleDateString()}
                        </option>
                      ))}
                  </select>
                </div>

                {compareVersionId && (
                  <VersionDiff
                    blueprintId={latest.id}
                    compareWithId={compareVersionId}
                  />
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Complete Review Modal ──────────────────────────────────────── */}
      {reviewCompleteOpen && latest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
            <h3 className="mb-1 text-base font-semibold text-gray-900">Mark periodic review complete</h3>
            <p className="mb-4 text-sm text-gray-500">
              This will record completion for{" "}
              <span className="font-medium text-gray-900">{latest.name ?? "this agent"}</span>{" "}
              and schedule the next review based on the configured cadence.
            </p>

            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Review notes <span className="text-gray-400">(optional)</span>
              </label>
              <textarea
                value={reviewCompleteNotes}
                onChange={(e) => setReviewCompleteNotes(e.target.value)}
                rows={3}
                maxLength={1000}
                placeholder="Findings, actions taken, or conclusions from the review…"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 resize-none"
              />
            </div>

            {reviewCompleteError && (
              <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {reviewCompleteError}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setReviewCompleteOpen(false); setReviewCompleteNotes(""); setReviewCompleteError(null); }}
                disabled={completingReview}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCompleteReview}
                disabled={completingReview}
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
              >
                {completingReview ? "Completing…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

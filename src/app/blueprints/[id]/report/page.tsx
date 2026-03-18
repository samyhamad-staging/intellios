import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { agentBlueprints, governancePolicies, intakeSessions, blueprintTestRuns } from "@/lib/db/schema";
import { eq, inArray, desc } from "drizzle-orm";
import { assertEnterpriseAccess } from "@/lib/auth/enterprise";
import { assembleMRMReport } from "@/lib/mrm/report";
import { writeAuditLog } from "@/lib/audit/log";
import { MRMReport } from "@/lib/mrm/types";
import PrintButton from "@/components/mrm/print-button";
import DownloadEvidenceButton from "@/components/mrm/download-evidence-button";
import { assessAllFrameworks } from "@/lib/regulatory/classifier";
import type { RegulatoryAssessment } from "@/lib/regulatory/frameworks";
import type { ABP } from "@/lib/types/abp";
import type { IntakeContext } from "@/lib/types/intake";
import type { ValidationReport } from "@/lib/governance/types";
import type { ApprovalStepRecord } from "@/lib/settings/types";
import type { TestRun } from "@/lib/testing/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });
}

function SectionHeader({ number, title }: { number: number; title: string }) {
  return (
    <div className="mb-4 border-b-2 border-gray-900 pb-2 print:break-before-page">
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
        Section {number}
      </p>
      <h2 className="text-xl font-bold text-gray-900">{title}</h2>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="py-2">
      <dt className="text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-900">{value || <span className="text-gray-400">—</span>}</dd>
    </div>
  );
}

function Chip({ label, color }: { label: string; color: string }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function MRMReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // MRM report is read-only evidence — accessible to all authenticated enterprise members.

  const { id } = await params;

  // Access guard: verify enterprise scope before assembling (assembly is expensive)
  const blueprint = await db.query.agentBlueprints.findFirst({
    where: eq(agentBlueprints.id, id),
  });
  if (!blueprint) notFound();

  const enterpriseError = assertEnterpriseAccess(blueprint.enterpriseId, session.user);
  if (enterpriseError) redirect("/registry");

  const companyName = "Intellios";

  // Assemble report + regulatory assessment in parallel
  const [report, intakeSession] = await Promise.all([
    assembleMRMReport(id, session.user.email!),
    db.query.intakeSessions.findFirst({ where: eq(intakeSessions.id, blueprint.sessionId) }),
  ]);
  if (!report) notFound();

  // Build full regulatory assessment (includes per-requirement evidence — not stored in MRMReport summary)
  const regulatoryAssessment = assessAllFrameworks({
    blueprintId: id,
    abp: blueprint.abp as ABP,
    intakeContext: (intakeSession?.intakeContext as IntakeContext | null) ?? null,
    validationReport: blueprint.validationReport as ValidationReport | null,
    deploymentHealthStatus: blueprint.status === "deployed" ? "deployed" : null,
  });

  // Phase 23: Behavioral test evidence — latest test run for this blueprint version
  const latestTestRunRow = await db.query.blueprintTestRuns.findFirst({
    where: eq(blueprintTestRuns.blueprintId, id),
    orderBy: [desc(blueprintTestRuns.startedAt)],
  });
  const latestTestRun: TestRun | null = latestTestRunRow
    ? {
        id: latestTestRunRow.id,
        blueprintId: latestTestRunRow.blueprintId,
        agentId: latestTestRunRow.agentId,
        status: latestTestRunRow.status as TestRun["status"],
        testResults: (latestTestRunRow.testResults ?? []) as TestRun["testResults"],
        totalCases: latestTestRunRow.totalCases,
        passedCases: latestTestRunRow.passedCases,
        failedCases: latestTestRunRow.failedCases,
        runBy: latestTestRunRow.runBy,
        startedAt: latestTestRunRow.startedAt.toISOString(),
        completedAt: latestTestRunRow.completedAt?.toISOString() ?? null,
      }
    : null;

  // Phase 22: Approval chain evidence — pull from blueprint row directly
  const approvalProgress = (blueprint.approvalProgress ?? []) as ApprovalStepRecord[];

  // Phase 22: Policy lineage evidence — batch-fetch all evaluated policy rows
  // (including superseded ones — no supersededAt filter, rows are never deleted per ADR-003)
  const validationReport = blueprint.validationReport as ValidationReport | null;
  const evaluatedPolicyIds = validationReport?.evaluatedPolicyIds ?? [];
  const policyVersionRows = evaluatedPolicyIds.length > 0
    ? await db.select({
        id: governancePolicies.id,
        name: governancePolicies.name,
        policyVersion: governancePolicies.policyVersion,
        supersededAt: governancePolicies.supersededAt,
      }).from(governancePolicies)
        .where(inArray(governancePolicies.id, evaluatedPolicyIds))
    : [];

  // Audit the view — same action as JSON export, distinguished by metadata.format
  void writeAuditLog({
    entityType: "blueprint",
    entityId: id,
    action: "blueprint.report_exported",
    actorEmail: session.user.email!,
    actorRole: session.user.role,
    enterpriseId: blueprint.enterpriseId ?? null,
    metadata: {
      agentId: blueprint.agentId,
      agentName: blueprint.name ?? "Unnamed Agent",
      reportVersion: report.cover.currentVersion,
      format: "html",
    },
  });

  return (
    <ReportDocument
      report={report}
      blueprintId={id}
      agentId={report.agentId}
      regulatoryAssessment={regulatoryAssessment}
      approvalProgress={approvalProgress}
      policyVersionRows={policyVersionRows}
      validationGeneratedAt={validationReport?.generatedAt ?? null}
      latestTestRun={latestTestRun}
      companyName={companyName}
    />
  );
}

// ─── Document ─────────────────────────────────────────────────────────────────

interface PolicyVersionRow {
  id: string;
  name: string;
  policyVersion: number;
  supersededAt: Date | null;
}

function ReportDocument({
  report,
  blueprintId,
  agentId,
  regulatoryAssessment,
  approvalProgress,
  policyVersionRows,
  validationGeneratedAt,
  latestTestRun,
  companyName,
}: {
  report: MRMReport;
  blueprintId: string;
  agentId: string;
  regulatoryAssessment: RegulatoryAssessment | null;
  approvalProgress: ApprovalStepRecord[];
  policyVersionRows: PolicyVersionRow[];
  validationGeneratedAt: string | null;
  latestTestRun: TestRun | null;
  companyName: string;
}) {
  const r = report;

  const riskColor =
    r.riskClassification.riskTier === "High"
      ? "badge-risk-high border"
      : r.riskClassification.riskTier === "Medium"
      ? "badge-risk-medium border"
      : "badge-risk-low border";

  const outcomeColor =
    r.reviewDecision.outcome === "approved"
      ? "badge-gov-pass border"
      : r.reviewDecision.outcome === "rejected"
      ? "badge-gov-error border"
      : r.reviewDecision.outcome === "changes_requested"
      ? "badge-gov-warn border"
      : "badge-draft border";

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white">
      {/* Toolbar — hidden on print */}
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-6 py-3 print:hidden">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/registry/${agentId}`} className="text-sm text-gray-400 hover:text-gray-700">
              ← Registry
            </Link>
            <span className="text-sm font-semibold text-gray-900">MRM Compliance Report</span>
            <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-mono text-gray-500">
              v{r.cover.currentVersion}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">Generated {fmt(r.generatedAt)}</span>
            <DownloadEvidenceButton
              blueprintId={blueprintId}
              enabled={r.cover.currentStatus === "approved" || r.cover.currentStatus === "deployed"}
            />
            <PrintButton />
          </div>
        </div>
      </div>

      {/* Report body */}
      <div className="mx-auto max-w-4xl px-6 py-10 print:py-0 print:px-0 print:max-w-none">

        {/* ── Cover ────────────────────────────────────────────────────────── */}
        <div className="mb-12 print:mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
            SR 11-7 Model Risk Management — Compliance Report
          </p>
          <h1 className="mt-2 text-4xl font-bold text-gray-900 print:text-3xl">
            {r.cover.agentName}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Chip
              label={r.cover.currentStatus.toUpperCase()}
              color="bg-gray-100 text-gray-700 border border-gray-200"
            />
            <Chip
              label={`Version ${r.cover.currentVersion}`}
              color="badge-role-designer border"
            />
            {r.cover.enterpriseId && (
              <Chip
                label={`Enterprise: ${r.cover.enterpriseId}`}
                color="bg-purple-50 text-purple-700 border border-purple-200"
              />
            )}
          </div>
          <dl className="mt-6 grid grid-cols-2 gap-x-8 gap-y-1 border-t border-gray-200 pt-4 text-sm sm:grid-cols-4">
            <Field label="Generated At" value={fmt(r.generatedAt)} />
            <Field label="Generated By" value={r.generatedBy} />
            <Field label="Blueprint ID" value={<span className="font-mono text-xs">{r.blueprintId.slice(0, 8)}…</span>} />
            <Field label="Agent ID" value={<span className="font-mono text-xs">{r.agentId.slice(0, 8)}…</span>} />
          </dl>
        </div>

        {/* ── Section 2: Risk Classification ───────────────────────────────── */}
        <section className="mb-10">
          <SectionHeader number={2} title="Risk Classification" />
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="flex items-start gap-6">
              <div className="shrink-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Risk Tier</p>
                <span className={`mt-1 inline-block rounded-lg border px-4 py-2 text-xl font-bold ${riskColor}`}>
                  {r.riskClassification.riskTier}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Basis</p>
                <p className="mt-1 text-sm text-gray-700 leading-relaxed">{r.riskClassification.riskTierBasis}</p>
              </div>
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-x-8 gap-y-0 border-t border-gray-100 pt-4 sm:grid-cols-3">
              <Field label="Intended Use" value={r.riskClassification.intendedUse} />
              <Field label="Business Owner" value={r.riskClassification.businessOwner} />
              <Field label="Model Owner" value={r.riskClassification.modelOwner} />
              <Field label="Deployment Type" value={r.riskClassification.deploymentType} />
              <Field label="Data Sensitivity" value={r.riskClassification.dataSensitivity} />
              <Field
                label="Regulatory Scope"
                value={
                  r.riskClassification.regulatoryScope.length > 0
                    ? r.riskClassification.regulatoryScope.join(", ")
                    : null
                }
              />
              <Field
                label="Stakeholders Consulted"
                value={
                  r.riskClassification.stakeholdersConsulted.length > 0
                    ? r.riskClassification.stakeholdersConsulted.join(", ")
                    : null
                }
              />
            </dl>
          </div>
        </section>

        {/* ── Section 3: Agent Identity ─────────────────────────────────────── */}
        <section className="mb-10">
          <SectionHeader number={3} title="Agent Identity" />
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <dl className="grid grid-cols-1 gap-y-0">
              <Field label="Name" value={r.identity.name} />
              <Field label="Description" value={r.identity.description} />
              <Field label="Persona" value={r.identity.persona} />
              <Field
                label="Tags"
                value={
                  r.identity.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {r.identity.tags.map((tag) => (
                        <Chip key={tag} label={tag} color="bg-gray-100 text-gray-600" />
                      ))}
                    </div>
                  ) : null
                }
              />
            </dl>
          </div>
        </section>

        {/* ── Section 4: Capabilities ───────────────────────────────────────── */}
        <section className="mb-10">
          <SectionHeader number={4} title="Capabilities" />
          <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-5">
            <div className="flex gap-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-gray-900">{r.capabilities.toolCount}</p>
                <p className="text-xs text-gray-500">Tools</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-gray-900">{r.capabilities.knowledgeSourceCount}</p>
                <p className="text-xs text-gray-500">Knowledge Sources</p>
              </div>
              <div className="text-center">
                <p className={`text-3xl font-bold ${r.capabilities.instructionsConfigured ? "text-[color:var(--gov-pass-text)]" : "text-gray-400"}`}>
                  {r.capabilities.instructionsConfigured ? "✓" : "✗"}
                </p>
                <p className="text-xs text-gray-500">Instructions</p>
              </div>
            </div>

            {r.capabilities.tools.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Tools</p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-400">
                      <th className="pb-1.5 pr-4">Name</th>
                      <th className="pb-1.5 pr-4">Type</th>
                      <th className="pb-1.5">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {r.capabilities.tools.map((t, i) => (
                      <tr key={i}>
                        <td className="py-1.5 pr-4 font-medium text-gray-900">{t.name}</td>
                        <td className="py-1.5 pr-4 text-gray-500">{t.type}</td>
                        <td className="py-1.5 text-gray-600">{t.description ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {r.capabilities.knowledgeSources.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Knowledge Sources</p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-400">
                      <th className="pb-1.5 pr-4">Name</th>
                      <th className="pb-1.5">Type</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {r.capabilities.knowledgeSources.map((k, i) => (
                      <tr key={i}>
                        <td className="py-1.5 pr-4 font-medium text-gray-900">{k.name}</td>
                        <td className="py-1.5 text-gray-500">{k.type}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* ── Section 5: Governance Validation ─────────────────────────────── */}
        <section className="mb-10">
          <SectionHeader number={5} title="Governance Validation" />
          <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-5">
            {!r.governanceValidation.validated ? (
              <p className="text-sm text-[color:var(--gov-warn-text)]">No validation has been run for this blueprint version.</p>
            ) : (
              <>
                <div className="flex flex-wrap gap-4">
                  <div className="text-center">
                    <p className={`text-3xl font-bold ${r.governanceValidation.valid ? "text-[color:var(--gov-pass-text)]" : "text-[color:var(--gov-error-text)]"}`}>
                      {r.governanceValidation.valid ? "✓" : "✗"}
                    </p>
                    <p className="text-xs text-gray-500">{r.governanceValidation.valid ? "Valid" : "Invalid"}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-gray-900">{r.governanceValidation.policyCount}</p>
                    <p className="text-xs text-gray-500">Policies Evaluated</p>
                  </div>
                  <div className="text-center">
                    <p className={`text-3xl font-bold ${r.governanceValidation.errorCount > 0 ? "text-[color:var(--gov-error-text)]" : "text-gray-900"}`}>
                      {r.governanceValidation.errorCount}
                    </p>
                    <p className="text-xs text-gray-500">Errors</p>
                  </div>
                  <div className="text-center">
                    <p className={`text-3xl font-bold ${r.governanceValidation.warningCount > 0 ? "text-[color:var(--gov-warn-text)]" : "text-gray-900"}`}>
                      {r.governanceValidation.warningCount}
                    </p>
                    <p className="text-xs text-gray-500">Warnings</p>
                  </div>
                </div>
                <p className="text-xs text-gray-400">
                  Validation run at: {fmt(r.governanceValidation.generatedAt)}
                </p>

                {r.governanceValidation.violations.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Violations</p>
                    <div className="space-y-2">
                      {r.governanceValidation.violations.map((v, i) => (
                        <div
                          key={i}
                          className={`rounded-lg border p-3 text-xs ${v.severity === "error" ? "badge-gov-error" : "badge-gov-warn"}`}
                        >
                          <div className="flex items-start gap-2">
                            <span
                              className={`shrink-0 rounded px-1 py-0.5 text-xs font-semibold ${v.severity === "error" ? "badge-gov-error" : "badge-gov-warn"}`}
                            >
                              {v.severity.toUpperCase()}
                            </span>
                            <div>
                              <p className="font-semibold text-gray-900">{v.policyName}</p>
                              <p className="mt-0.5 text-gray-700">{v.message}</p>
                              {v.suggestion && (
                                <p className="mt-0.5 text-gray-500 italic">{v.suggestion}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {r.governanceValidation.violations.length === 0 && (
                  <p className="text-sm text-[color:var(--gov-pass-text)]">No violations found — blueprint passes all applicable governance policies.</p>
                )}

                {/* Policy Version Evidence (Phase 22) */}
                {policyVersionRows.length > 0 && (
                  <div className="border-t border-gray-100 pt-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                      5.1  Policy Version Evidence
                    </p>
                    <p className="mb-3 text-xs text-gray-500">
                      Policies evaluated at validation time ({validationGeneratedAt ? fmt(validationGeneratedAt) : "—"}). Superseded indicators show whether a policy has been revised since this blueprint was validated.
                    </p>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-100 text-left font-semibold uppercase tracking-wider text-gray-400">
                          <th className="pb-2 pr-4">Policy</th>
                          <th className="pb-2 pr-3">Version at Evaluation</th>
                          <th className="pb-2">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {policyVersionRows.map((p) => (
                          <tr key={p.id}>
                            <td className="py-1.5 pr-4 text-gray-700 font-medium">{p.name}</td>
                            <td className="py-1.5 pr-3 text-gray-500 font-mono">v{p.policyVersion}</td>
                            <td className="py-1.5">
                              {p.supersededAt ? (
                                <span className="inline-flex items-center gap-1 text-[color:var(--gov-warn-text)]">
                                  <span>⚠</span>
                                  <span>Policy revised since approval</span>
                                </span>
                              ) : (
                                <span className="text-[color:var(--gov-pass-text)]">✓ Current version</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        {/* ── Section 6: Review Decision ────────────────────────────────────── */}
        <section className="mb-10">
          <SectionHeader number={6} title="Review Decision" />
          <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-5">
            <div className="flex items-start gap-4">
              <span
                className={`inline-block rounded-lg border px-3 py-1.5 text-sm font-semibold ${outcomeColor}`}
              >
                {r.reviewDecision.outcome
                  ? r.reviewDecision.outcome.replace("_", " ").toUpperCase()
                  : "PENDING / NOT REVIEWED"}
              </span>
            </div>

            {/* Multi-step approval chain evidence (Phase 22) */}
            {approvalProgress.length > 0 ? (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  6.1  Approval Chain Evidence
                </p>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 text-left font-semibold uppercase tracking-wider text-gray-400">
                      <th className="pb-2 pr-3 w-10">Step</th>
                      <th className="pb-2 pr-3">Role</th>
                      <th className="pb-2 pr-3">Label</th>
                      <th className="pb-2 pr-3">Approver</th>
                      <th className="pb-2 pr-3">Decision</th>
                      <th className="pb-2">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {approvalProgress.map((step) => (
                      <tr key={step.step} className={step.decision === "rejected" ? "bg-[color:var(--status-rejected-col-bg)]" : ""}>
                        <td className="py-1.5 pr-3 text-gray-500">{step.step + 1}</td>
                        <td className="py-1.5 pr-3 text-gray-600 capitalize">{step.role.replace("_", " ")}</td>
                        <td className="py-1.5 pr-3 text-gray-700 font-medium">{step.label}</td>
                        <td className="py-1.5 pr-3 text-gray-700">{step.approvedBy}</td>
                        <td className={`py-1.5 pr-3 font-semibold ${step.decision === "approved" ? "text-[color:var(--gov-pass-text)]" : "text-[color:var(--gov-error-text)]"}`}>
                          {step.decision === "approved" ? "✓ Approved" : "✗ Rejected"}
                        </td>
                        <td className="py-1.5 text-gray-500 whitespace-nowrap">{fmt(step.approvedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-2 text-xs text-gray-500">
                  Final Status: {r.reviewDecision.outcome?.toUpperCase() ?? "PENDING"} — {approvalProgress.length} approval step{approvalProgress.length === 1 ? "" : "s"} recorded
                  {approvalProgress.every((s) => s.decision === "approved")
                    ? ` — all ${approvalProgress.length} step${approvalProgress.length === 1 ? "" : "s"} approved`
                    : ""}
                </p>
              </div>
            ) : (
              <dl className="grid grid-cols-2 gap-x-8 gap-y-0 sm:grid-cols-3">
                <Field label="Reviewed By" value={r.reviewDecision.reviewedBy} />
                <Field label="Reviewed At" value={fmt(r.reviewDecision.reviewedAt)} />
                <Field label="Comment" value={r.reviewDecision.comment} />
              </dl>
            )}
          </div>
        </section>

        {/* ── Section 7: SOD Evidence ───────────────────────────────────────── */}
        <section className="mb-10">
          <SectionHeader number={7} title="Separation of Duties Evidence" />
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="mb-4 flex items-center gap-2">
              <span
                className={`text-sm font-semibold ${r.sodEvidence.sodSatisfied ? "text-[color:var(--gov-pass-text)]" : "text-[color:var(--gov-error-text)]"}`}
              >
                {r.sodEvidence.sodSatisfied
                  ? "✓ SOD requirements satisfied — all roles held by distinct individuals"
                  : "✗ SOD violation detected — same individual holds multiple roles"}
              </span>
            </div>
            <dl className="grid grid-cols-3 gap-x-8 gap-y-0">
              <Field label="Designer (submitted)" value={r.sodEvidence.designer} />
              <Field label="Reviewer (approved/rejected)" value={r.sodEvidence.reviewer} />
              <Field label="Deployer (deployed to production)" value={r.sodEvidence.deployer} />
            </dl>
          </div>
        </section>

        {/* ── Section 8: Deployment Record ─────────────────────────────────── */}
        <section className="mb-10">
          <SectionHeader number={8} title="Deployment Change Record" />
          <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-5">
            <div className="flex items-center gap-3">
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${r.deploymentRecord.deployed ? "badge-approved" : "badge-draft"}`}
              >
                {r.deploymentRecord.deployed ? "Deployed to Production" : "Not Deployed"}
              </span>
              {r.deploymentRecord.deploymentTarget === "agentcore" && (
                <span className="inline-block rounded-full badge-risk-high border px-2 py-0.5 text-xs font-semibold">
                  Amazon Bedrock AgentCore
                </span>
              )}
            </div>
            <dl className="grid grid-cols-2 gap-x-8 gap-y-0 sm:grid-cols-3">
              <Field label="Deployed At" value={fmt(r.deploymentRecord.deployedAt)} />
              <Field label="Deployed By" value={r.deploymentRecord.deployedBy} />
              <Field label="Deployment Target" value={r.deploymentRecord.deploymentTarget ?? "Intellios (internal)"} />
              <Field label="Change Reference" value={r.deploymentRecord.changeRef} />
              <Field label="Deployment Notes" value={r.deploymentRecord.deploymentNotes} />
            </dl>

            {/* AgentCore deployment details */}
            {r.deploymentRecord.agentcoreRecord && (
              <div className="rounded-lg border badge-risk-high p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider">
                  Amazon Bedrock AgentCore — AWS Resource Details
                </p>
                <dl className="grid grid-cols-1 gap-y-0 sm:grid-cols-2">
                  <div className="py-1.5">
                    <dt className="text-xs font-semibold uppercase tracking-wider opacity-70">Agent ID</dt>
                    <dd className="mt-0.5 font-mono text-xs text-gray-900">{r.deploymentRecord.agentcoreRecord.agentId}</dd>
                  </div>
                  <div className="py-1.5">
                    <dt className="text-xs font-semibold uppercase tracking-wider opacity-70">Region</dt>
                    <dd className="mt-0.5 text-sm text-gray-900">{r.deploymentRecord.agentcoreRecord.region}</dd>
                  </div>
                  <div className="py-1.5 sm:col-span-2">
                    <dt className="text-xs font-semibold uppercase tracking-wider opacity-70">Agent ARN</dt>
                    <dd className="mt-0.5 break-all font-mono text-xs text-gray-900">{r.deploymentRecord.agentcoreRecord.agentArn}</dd>
                  </div>
                  <div className="py-1.5">
                    <dt className="text-xs font-semibold uppercase tracking-wider opacity-70">Foundation Model</dt>
                    <dd className="mt-0.5 text-sm text-gray-900">{r.deploymentRecord.agentcoreRecord.foundationModel}</dd>
                  </div>
                  <div className="py-1.5">
                    <dt className="text-xs font-semibold uppercase tracking-wider opacity-70">AgentCore Deployed By</dt>
                    <dd className="mt-0.5 text-sm text-gray-900">{r.deploymentRecord.agentcoreRecord.deployedBy}</dd>
                  </div>
                  <div className="py-1.5">
                    <dt className="text-xs font-semibold uppercase tracking-wider opacity-70">AgentCore Deployed At</dt>
                    <dd className="mt-0.5 text-sm text-gray-900">{fmt(r.deploymentRecord.agentcoreRecord.deployedAt)}</dd>
                  </div>
                  <div className="py-1.5 flex items-end">
                    <a
                      href={`https://${r.deploymentRecord.agentcoreRecord.region}.console.aws.amazon.com/bedrock/home?region=${r.deploymentRecord.agentcoreRecord.region}#/agents/${r.deploymentRecord.agentcoreRecord.agentId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium underline opacity-80 hover:opacity-100 print:hidden"
                    >
                      View in AWS Console ↗
                    </a>
                  </div>
                </dl>
              </div>
            )}
          </div>
        </section>

        {/* ── Section 9: Model Lineage ──────────────────────────────────────── */}
        <section className="mb-10">
          <SectionHeader number={9} title="Model Lineage" />
          <div className="space-y-5 rounded-xl border border-gray-200 bg-white p-6">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                Version History ({r.modelLineage.versionHistory.length})
              </p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-400">
                    <th className="pb-1.5 pr-4">Version</th>
                    <th className="pb-1.5 pr-4">Status</th>
                    <th className="pb-1.5 pr-4">Refinements</th>
                    <th className="pb-1.5 pr-4">Created By</th>
                    <th className="pb-1.5">Created At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {r.modelLineage.versionHistory.map((v, i) => (
                    <tr key={i}>
                      <td className="py-1.5 pr-4 font-mono font-medium text-gray-900">v{v.version}</td>
                      <td className="py-1.5 pr-4 text-gray-500 uppercase text-xs">{v.status}</td>
                      <td className="py-1.5 pr-4 text-gray-500">{v.refinementCount}</td>
                      <td className="py-1.5 pr-4 text-gray-500">{v.createdBy ?? "—"}</td>
                      <td className="py-1.5 text-gray-500">{fmtDate(v.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                Deployment Lineage ({r.modelLineage.deploymentLineage.length})
              </p>
              {r.modelLineage.deploymentLineage.length === 0 ? (
                <p className="text-sm text-gray-400">No production deployments recorded.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-400">
                      <th className="pb-1.5 pr-4">Version</th>
                      <th className="pb-1.5 pr-4">Deployed At</th>
                      <th className="pb-1.5 pr-4">Deployed By</th>
                      <th className="pb-1.5">Change Ref</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {r.modelLineage.deploymentLineage.map((d, i) => (
                      <tr key={i}>
                        <td className="py-1.5 pr-4 font-mono text-gray-900">v{d.version}</td>
                        <td className="py-1.5 pr-4 text-gray-500">{fmt(d.deployedAt)}</td>
                        <td className="py-1.5 pr-4 text-gray-500">{d.deployedBy}</td>
                        <td className="py-1.5 font-mono text-xs text-gray-500">{d.changeRef ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </section>

        {/* ── Section 10: Audit Chain ───────────────────────────────────────── */}
        <section className="mb-10">
          <SectionHeader number={10} title="Audit Chain" />
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            {r.auditChain.length === 0 ? (
              <p className="text-sm text-gray-400">No audit events recorded for this version.</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100 text-left font-semibold uppercase tracking-wider text-gray-400">
                    <th className="pb-2 pr-4">Timestamp</th>
                    <th className="pb-2 pr-4">Action</th>
                    <th className="pb-2 pr-4">Actor</th>
                    <th className="pb-2 pr-4">Role</th>
                    <th className="pb-2">Transition</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {r.auditChain.map((e, i) => (
                    <tr key={i} className="align-top">
                      <td className="py-2 pr-4 font-mono text-gray-500 whitespace-nowrap">
                        {fmt(e.timestamp)}
                      </td>
                      <td className="py-2 pr-4 font-mono text-gray-700">{e.action}</td>
                      <td className="py-2 pr-4 text-gray-700">{e.actor}</td>
                      <td className="py-2 pr-4 text-gray-500">{e.actorRole}</td>
                      <td className="py-2 text-gray-500">
                        {e.fromStatus && e.toStatus
                          ? `${e.fromStatus} → ${e.toStatus}`
                          : e.toStatus ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* ── Section 11: Stakeholder Contributions ────────────────────────── */}
        <section className="mb-10">
          <SectionHeader number={11} title="Stakeholder Contributions" />
          <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">

            {/* Coverage gaps callout */}
            {r.stakeholderCoverageGaps && r.stakeholderCoverageGaps.length > 0 && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <span className="shrink-0">⚠</span>
                <span>
                  Expected input missing from:{" "}
                  <strong>{r.stakeholderCoverageGaps.join(", ")}</strong>.
                  These domains were implicated by the intake context but had no contribution on record at finalization.
                </span>
              </div>
            )}

            {r.stakeholderContributions.length === 0 ? (
              <p className="text-sm text-gray-400">
                No stakeholder contributions recorded. This blueprint was generated before the
                Stakeholder Requirement Lanes feature was introduced, or no contributions were
                submitted during intake.
              </p>
            ) : (
              <div className="space-y-3">
                {r.stakeholderContributions.map((c, i) => (
                  <div key={i} className="rounded-lg border border-gray-200 p-4">
                    <div className="mb-3 flex items-center gap-3">
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-gray-600">
                        {c.domain}
                      </span>
                      <span className="text-sm font-medium text-gray-900">{c.contributorEmail}</span>
                      <span className="text-xs text-gray-400">({c.contributorRole})</span>
                      <span className="ml-auto text-xs text-gray-400">{fmt(c.submittedAt)}</span>
                    </div>
                    <dl className="grid grid-cols-1 gap-y-1 sm:grid-cols-2">
                      {Object.entries(c.fields).map(([key, value]) => (
                        <div key={key} className="py-0.5">
                          <dt className="text-xs font-medium text-gray-400 capitalize">
                            {key.replace(/_/g, " ")}
                          </dt>
                          <dd className="mt-0.5 text-xs text-gray-700">{value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── Section 12: Regulatory Framework Assessment ────────────────── */}
        <section className="mb-10">
          <SectionHeader number={12} title="Regulatory Framework Assessment" />
          {!regulatoryAssessment ? (
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <p className="text-sm text-amber-700">
                Not available — this report was generated before Phase 20 (Regulatory Intelligence)
                was introduced. Re-generate the report to include the regulatory framework assessment.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <p className="text-xs text-gray-400">
                Assessed at: {fmt(regulatoryAssessment.assessedAt)}
              </p>
              {regulatoryAssessment.frameworks.map((fw, fwIdx) => {
                const applicable = fw.requirements.filter(
                  (r) => r.evidenceStatus !== "not_applicable"
                );
                const satisfied = applicable.filter(
                  (r) => r.evidenceStatus === "satisfied"
                ).length;

                const overallColor =
                  fw.overallStatus === "compliant"
                    ? "badge-gov-pass"
                    : fw.overallStatus === "gaps_identified"
                    ? "badge-gov-error"
                    : "badge-gov-warn";

                const tierColor =
                  fw.euAiActRiskTier === "high-risk" || fw.euAiActRiskTier === "review-required"
                    ? "badge-gov-error"
                    : fw.euAiActRiskTier === "limited-risk"
                    ? "badge-gov-warn"
                    : "badge-gov-pass";

                // NIST: group requirements by function prefix
                const isNist = fw.frameworkId === "nist-rmf";
                const nistFunctions = isNist
                  ? ["govern", "map", "measure", "manage"].map((fn) => {
                      const reqs = fw.requirements.filter((r) =>
                        r.id.includes(`-${fn}-`)
                      );
                      const satisfiedCount = reqs.filter(
                        (r) => r.evidenceStatus === "satisfied"
                      ).length;
                      const strength =
                        satisfiedCount >= reqs.length * 0.8
                          ? "Strong"
                          : satisfiedCount >= reqs.length * 0.4
                          ? "Partial"
                          : "Weak";
                      const strengthColor =
                        strength === "Strong"
                          ? "text-[color:var(--gov-pass-text)]"
                          : strength === "Partial"
                          ? "text-[color:var(--gov-warn-text)]"
                          : "text-[color:var(--gov-error-text)]";
                      return { fn: fn.toUpperCase(), reqs, satisfiedCount, strength, strengthColor };
                    })
                  : [];

                return (
                  <div
                    key={fw.frameworkId}
                    className="rounded-xl border border-gray-200 bg-white p-6"
                  >
                    {/* Framework header */}
                    <div className="mb-4 flex flex-wrap items-start gap-3 border-b border-gray-100 pb-4">
                      <div className="flex-1">
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                          12.{fwIdx + 1}
                        </p>
                        <h3 className="text-base font-bold text-gray-900">
                          {fw.frameworkName}{" "}
                          <span className="font-normal text-gray-500 text-sm">
                            ({fw.version})
                          </span>
                        </h3>
                        <p className="mt-1 text-xs text-gray-600 leading-relaxed">
                          {fw.summary}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <Chip
                          label={fw.overallStatus.replace("_", " ").toUpperCase()}
                          color={`border ${overallColor}`}
                        />
                        {fw.euAiActRiskTier && (
                          <Chip
                            label={fw.euAiActRiskTier.replace("-", " ")}
                            color={`border ${tierColor}`}
                          />
                        )}
                        <span className="text-xs text-gray-500">
                          {satisfied}/{applicable.length} requirements satisfied
                        </span>
                      </div>
                    </div>

                    {/* NIST: function strength visualization */}
                    {isNist && (
                      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {nistFunctions.map(({ fn, reqs, satisfiedCount, strength, strengthColor }) => (
                          <div key={fn} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                              {fn}
                            </p>
                            <p className={`text-sm font-bold mt-0.5 ${strengthColor}`}>
                              {strength}
                            </p>
                            <div className="mt-1 flex gap-0.5">
                              {reqs.map((req, ri) => (
                                <span
                                  key={ri}
                                  className={`inline-block h-2 w-2 rounded-full ${
                                    req.evidenceStatus === "satisfied"
                                      ? "dot-approved"
                                      : req.evidenceStatus === "partial"
                                      ? "dot-alert-warn"
                                      : req.evidenceStatus === "missing"
                                      ? "dot-alert-critical"
                                      : "dot-draft"
                                  }`}
                                />
                              ))}
                            </div>
                            <p className="mt-1 text-xs text-gray-400">
                              {satisfiedCount}/{reqs.length} met
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Per-requirement evidence table */}
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-100 text-left font-semibold uppercase tracking-wider text-gray-400">
                          <th className="pb-2 pr-3 w-20">Code</th>
                          <th className="pb-2 pr-3">Requirement</th>
                          <th className="pb-2 pr-3 w-24">Status</th>
                          <th className="pb-2">Evidence</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {fw.requirements.map((req, ri) => {
                          const statusIcon =
                            req.evidenceStatus === "satisfied"
                              ? "✓"
                              : req.evidenceStatus === "partial"
                              ? "⚠"
                              : req.evidenceStatus === "missing"
                              ? "✗"
                              : "—";
                          const statusColor =
                            req.evidenceStatus === "satisfied"
                              ? "text-[color:var(--gov-pass-text)]"
                              : req.evidenceStatus === "partial"
                              ? "text-[color:var(--gov-warn-text)]"
                              : req.evidenceStatus === "missing"
                              ? "text-[color:var(--gov-error-text)]"
                              : "text-gray-400";
                          return (
                            <tr
                              key={ri}
                              className={
                                req.evidenceStatus === "not_applicable"
                                  ? "opacity-40"
                                  : ""
                              }
                            >
                              <td className="py-2 pr-3 font-mono font-medium text-gray-700 align-top">
                                {req.code}
                              </td>
                              <td className="py-2 pr-3 text-gray-700 align-top">
                                <span className="font-medium">{req.title}</span>
                                <span className="block text-gray-400 mt-0.5 text-xs leading-relaxed">
                                  {req.description}
                                </span>
                              </td>
                              <td className={`py-2 pr-3 font-semibold align-top whitespace-nowrap ${statusColor}`}>
                                {statusIcon}{" "}
                                {req.evidenceStatus === "not_applicable"
                                  ? "N/A"
                                  : req.evidenceStatus.charAt(0).toUpperCase() +
                                    req.evidenceStatus.slice(1)}
                              </td>
                              <td className="py-2 text-gray-500 align-top">
                                {req.evidence ?? "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ─── Section 13: Behavioral Test Evidence ─────────────────────────── */}
        <section className="mb-10">
          <SectionHeader number={13} title="Behavioral Test Evidence" />
          {latestTestRun ? (
            <div className="space-y-4">
              {/* Run summary */}
              <dl className="grid grid-cols-2 gap-x-8 divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white px-5 py-3 text-sm sm:grid-cols-4">
                <Field label="Executed By" value={latestTestRun.runBy} />
                <Field label="Run Date" value={fmt(latestTestRun.startedAt)} />
                <Field label="Test Cases" value={String(latestTestRun.totalCases)} />
                <Field
                  label="Overall Verdict"
                  value={
                    <span
                      className={`font-semibold ${
                        latestTestRun.status === "passed"
                          ? "text-[color:var(--gov-pass-text)]"
                          : latestTestRun.status === "failed"
                          ? "text-[color:var(--gov-error-text)]"
                          : "text-[color:var(--gov-warn-text)]"
                      }`}
                    >
                      {latestTestRun.status === "passed"
                        ? `PASSED (${latestTestRun.passedCases} of ${latestTestRun.totalCases})`
                        : latestTestRun.status === "failed"
                        ? `FAILED (${latestTestRun.passedCases} of ${latestTestRun.totalCases})`
                        : `ERROR (${latestTestRun.passedCases} of ${latestTestRun.totalCases} completed)`}
                    </span>
                  }
                />
              </dl>

              {/* Per-case results table */}
              {latestTestRun.testResults.length > 0 && (
                <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50 text-left text-gray-500">
                        <th className="w-6 px-4 py-2.5 font-semibold">#</th>
                        <th className="px-4 py-2.5 font-semibold">Test Case</th>
                        <th className="w-20 px-4 py-2.5 font-semibold">Verdict</th>
                        <th className="px-4 py-2.5 font-semibold">Evaluation Rationale</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {latestTestRun.testResults.map((result, i) => (
                        <tr key={result.testCaseId} className="align-top">
                          <td className="px-4 py-2.5 text-gray-400">{i + 1}</td>
                          <td className="px-4 py-2.5 font-medium text-gray-900">{result.name}</td>
                          <td
                            className={`px-4 py-2.5 font-semibold ${
                              result.status === "passed"
                                ? "text-[color:var(--gov-pass-text)]"
                                : result.status === "failed"
                                ? "text-[color:var(--gov-error-text)]"
                                : "text-[color:var(--gov-warn-text)]"
                            }`}
                          >
                            {result.status === "passed" ? "✓ Passed" : result.status === "failed" ? "✗ Failed" : "⚠ Error"}
                          </td>
                          <td className="px-4 py-2.5 text-gray-600 leading-relaxed">
                            {result.evaluationRationale || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-gray-200 bg-white px-5 py-6 text-center">
              <p className="text-sm text-gray-500">
                No behavioral tests have been executed for this blueprint version.
              </p>
              <p className="mt-1 text-xs text-gray-400">
                SR 11-7 recommends performance testing evidence. Add test cases from the Registry detail page and run them before approval.
              </p>
            </div>
          )}
        </section>

        {/* Section 14: Periodic Review Schedule */}
        <section className="space-y-4">
          <SectionHeader number={14} title="Periodic Review Schedule" />
          <div className="rounded-lg border border-gray-200 bg-white">
            <dl className="divide-y divide-gray-100 px-5">
              <Field
                label="Periodic Review"
                value={r.periodicReviewSchedule.enabled ? "Enabled" : "Disabled"}
              />
              {r.periodicReviewSchedule.enabled && (
                <>
                  <Field
                    label="Review Cadence"
                    value={`${r.periodicReviewSchedule.cadenceMonths === 12 ? "Annual" : r.periodicReviewSchedule.cadenceMonths === 6 ? "Semi-Annual" : r.periodicReviewSchedule.cadenceMonths === 24 ? "Biennial" : `Every ${r.periodicReviewSchedule.cadenceMonths} months`} (${r.periodicReviewSchedule.cadenceMonths} months)`}
                  />
                  <Field
                    label="Next Review Due"
                    value={
                      r.periodicReviewSchedule.nextReviewDueAt ? (
                        <span className={`inline-flex items-center gap-2 ${r.periodicReviewSchedule.isOverdue ? "text-[color:var(--gov-error-text)]" : "text-gray-900"}`}>
                          {fmtDate(r.periodicReviewSchedule.nextReviewDueAt)}
                          {r.periodicReviewSchedule.isOverdue && (
                            <span className="badge-overdue rounded-full px-2 py-0.5 text-xs font-medium">OVERDUE</span>
                          )}
                        </span>
                      ) : "Not yet scheduled"
                    }
                  />
                  <Field
                    label="Last Periodic Review"
                    value={r.periodicReviewSchedule.lastPeriodicReviewAt
                      ? fmtDate(r.periodicReviewSchedule.lastPeriodicReviewAt)
                      : "Not yet completed"}
                  />
                  <Field
                    label="SR 11-7 Compliance Status"
                    value={
                      r.periodicReviewSchedule.isOverdue ? (
                        <Chip label="Review Overdue" color="badge-gov-error border" />
                      ) : r.periodicReviewSchedule.nextReviewDueAt ? (
                        <Chip label="On Schedule" color="badge-gov-pass border" />
                      ) : (
                        <Chip label="Not Deployed" color="badge-draft border" />
                      )
                    }
                  />
                </>
              )}
            </dl>
          </div>
          <p className="text-xs text-gray-400">
            SR 11-7 requires periodic model performance revalidation after initial deployment.
            Review cadence is configured in Enterprise Settings. Overdue reviews require immediate remediation.
          </p>
        </section>

        {/* Footer */}
        <footer className="border-t border-gray-200 py-8 text-center text-xs text-gray-400 print:pt-4">
          <p>
            {companyName} MRM Compliance Report · Generated {fmt(r.generatedAt)} by {r.generatedBy}
          </p>
          <p className="mt-1">
            This report is an evidence package for SR 11-7 model risk documentation.
            Risk classifications require validation against your enterprise model risk taxonomy.
          </p>
        </footer>
      </div>
    </div>
  );
}

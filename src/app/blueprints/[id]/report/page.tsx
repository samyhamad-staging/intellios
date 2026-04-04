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
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { SectionHeading } from "@/components/ui/section-heading";
import PrintButton from "@/components/mrm/print-button";
import DownloadEvidenceButton from "@/components/mrm/download-evidence-button";
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from "@/components/ui/table";
import { assessAllFrameworks } from "@/lib/regulatory/classifier";
import type { RegulatoryAssessment } from "@/lib/regulatory/frameworks";
import type { ABP } from "@/lib/types/abp";
import type { IntakeContext } from "@/lib/types/intake";
import type { ValidationReport } from "@/lib/governance/types";
import type { ApprovalStepRecord } from "@/lib/settings/types";
import type { TestRun } from "@/lib/testing/types";
import { getEnterpriseSettings } from "@/lib/settings/get-settings";
import { Heading, Subheading } from "@/components/catalyst/heading";

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
    <div className="mb-4 border-b-2 border-text pb-2 print:break-before-page">
      <SectionHeading className="mb-0">
        Section {number}
      </SectionHeading>
      <Heading level={2} className="text-text">{title}</Heading>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="py-2">
      <dt><SectionHeading>{label}</SectionHeading></dt>
      <dd className="mt-0.5 text-sm text-text">{value || <span className="text-text-tertiary">—</span>}</dd>
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

  // Fetch branding for white-label header
  const companyName = blueprint.enterpriseId
    ? (await getEnterpriseSettings(blueprint.enterpriseId)).branding?.companyName ?? "Intellios"
    : "Intellios";

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
      ? "bg-red-100 text-red-800 border-red-200"
      : r.riskClassification.riskTier === "Medium"
      ? "bg-amber-100 text-amber-800 border-amber-200"
      : "bg-green-100 text-green-800 border-green-200";

  const outcomeColor =
    r.reviewDecision.outcome === "approved"
      ? "bg-green-100 text-green-800 border-green-200"
      : r.reviewDecision.outcome === "rejected"
      ? "bg-red-100 text-red-800 border-red-200"
      : r.reviewDecision.outcome === "changes_requested"
      ? "bg-amber-100 text-amber-800 border-amber-200"
      : "bg-surface-muted text-text-secondary border-border";

  return (
    <div className="min-h-screen bg-surface-raised print:bg-surface">
      {/* Toolbar — hidden on print */}
      <div className="sticky top-0 z-10 border-b border-border bg-surface px-6 py-3 print:hidden">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/registry/${agentId}`} className="text-sm text-text-tertiary hover:text-text">
              ← Registry
            </Link>
            <span className="text-sm font-semibold text-text">MRM Compliance Report</span>
            <span className="rounded bg-surface-muted px-2 py-0.5 text-xs font-mono text-text-secondary">
              v{r.cover.currentVersion}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-text-tertiary">Generated {fmt(r.generatedAt)}</span>
            <DownloadEvidenceButton
              blueprintId={blueprintId}
              enabled={r.cover.currentStatus === "approved" || r.cover.currentStatus === "deployed"}
            />
            <PrintButton />
          </div>
        </div>
      </div>

      {/* Breadcrumb — hidden on print */}
      <div className="border-b border-border bg-surface px-6 py-3 print:hidden">
        <div className="mx-auto max-w-4xl">
          <Breadcrumb items={[
            { label: "Blueprints", href: "/blueprints" },
            { label: r.cover.agentName, href: `/blueprints/${blueprintId}` },
            { label: "Report" },
          ]} />
        </div>
      </div>

      {/* Report body */}
      <div className="mx-auto max-w-4xl px-6 py-10 print:py-0 print:px-0 print:max-w-none">

        {/* ── Cover ────────────────────────────────────────────────────────── */}
        <div className="mb-12 print:mb-6">
          <SectionHeading>
            SR 11-7 Model Risk Management — Compliance Report
          </SectionHeading>
          <Heading level={1} className="mt-2 text-text print:text-3xl">
            {r.cover.agentName}
          </Heading>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Chip
              label={r.cover.currentStatus.toUpperCase()}
              color="bg-surface-muted text-text border border-border"
            />
            <Chip
              label={`Version ${r.cover.currentVersion}`}
              color="bg-blue-50 text-blue-700 border border-blue-200"
            />
            {r.cover.enterpriseId && (
              <Chip
                label={`Enterprise: ${r.cover.enterpriseId}`}
                color="bg-purple-50 text-purple-700 border border-purple-200"
              />
            )}
          </div>
          <dl className="mt-6 grid grid-cols-2 gap-x-8 gap-y-1 border-t border-border pt-4 text-sm sm:grid-cols-4">
            <Field label="Generated At" value={fmt(r.generatedAt)} />
            <Field label="Generated By" value={r.generatedBy} />
            <Field label="Blueprint ID" value={<span className="font-mono text-xs">{r.blueprintId.slice(0, 8)}…</span>} />
            <Field label="Agent ID" value={<span className="font-mono text-xs">{r.agentId.slice(0, 8)}…</span>} />
          </dl>
        </div>

        {/* ── Section 2: Risk Classification ───────────────────────────────── */}
        <section className="mb-10">
          <SectionHeader number={2} title="Risk Classification" />
          <div className="rounded-xl border border-border bg-surface p-6">
            <div className="flex items-start gap-6">
              <div className="shrink-0">
                <SectionHeading className="text-xs">Risk Tier</SectionHeading>
                <span className={`mt-1 inline-block rounded-lg border px-4 py-2 text-xl font-bold ${riskColor}`}>
                  {r.riskClassification.riskTier}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <SectionHeading className="text-xs">Basis</SectionHeading>
                <p className="mt-1 text-sm text-text leading-relaxed">{r.riskClassification.riskTierBasis}</p>
              </div>
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-x-8 gap-y-0 border-t border-border-subtle pt-4 sm:grid-cols-3">
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
          <div className="rounded-xl border border-border bg-surface p-6">
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
                        <Chip key={tag} label={tag} color="bg-surface-muted text-text-secondary" />
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
          <div className="rounded-xl border border-border bg-surface p-6 space-y-5">
            <div className="flex gap-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-text">{r.capabilities.toolCount}</p>
                <p className="text-xs text-text-secondary">Tools</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-text">{r.capabilities.knowledgeSourceCount}</p>
                <p className="text-xs text-text-secondary">Knowledge Sources</p>
              </div>
              <div className="text-center">
                <p className={`text-3xl font-bold ${r.capabilities.instructionsConfigured ? "text-green-700" : "text-text-tertiary"}`}>
                  {r.capabilities.instructionsConfigured ? "✓" : "✗"}
                </p>
                <p className="text-xs text-text-secondary">Instructions</p>
              </div>
            </div>

            {r.capabilities.tools.length > 0 && (
              <div>
                <SectionHeading className="mb-2">Tools</SectionHeading>
                <Table dense>
                  <TableHead>
                    <TableRow>
                      <TableHeader>Name</TableHeader>
                      <TableHeader>Type</TableHeader>
                      <TableHeader>Description</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {r.capabilities.tools.map((t, i) => (
                      <TableRow className="interactive-row" key={i}>
                        <TableCell className="font-medium text-text">{t.name}</TableCell>
                        <TableCell className="text-text-secondary">{t.type}</TableCell>
                        <TableCell className="text-text-secondary">{t.description ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {r.capabilities.knowledgeSources.length > 0 && (
              <div>
                <SectionHeading className="mb-2">Knowledge Sources</SectionHeading>
                <Table dense>
                  <TableHead>
                    <TableRow>
                      <TableHeader>Name</TableHeader>
                      <TableHeader>Type</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {r.capabilities.knowledgeSources.map((k, i) => (
                      <TableRow className="interactive-row" key={i}>
                        <TableCell className="font-medium text-text">{k.name}</TableCell>
                        <TableCell className="text-text-secondary">{k.type}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </section>

        {/* ── Section 5: Governance Validation ─────────────────────────────── */}
        <section className="mb-10">
          <SectionHeader number={5} title="Governance Validation" />
          <div className="rounded-xl border border-border bg-surface p-6 space-y-5">
            {!r.governanceValidation.validated ? (
              <p className="text-sm text-amber-700">No validation has been run for this blueprint version.</p>
            ) : (
              <>
                <div className="flex flex-wrap gap-4">
                  <div className="text-center">
                    <p className={`text-3xl font-bold ${r.governanceValidation.valid ? "text-green-700" : "text-red-700"}`}>
                      {r.governanceValidation.valid ? "✓" : "✗"}
                    </p>
                    <p className="text-xs text-text-secondary">{r.governanceValidation.valid ? "Valid" : "Invalid"}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-text">{r.governanceValidation.policyCount}</p>
                    <p className="text-xs text-text-secondary">Policies Evaluated</p>
                  </div>
                  <div className="text-center">
                    <p className={`text-3xl font-bold ${r.governanceValidation.errorCount > 0 ? "text-red-700" : "text-text"}`}>
                      {r.governanceValidation.errorCount}
                    </p>
                    <p className="text-xs text-text-secondary">Errors</p>
                  </div>
                  <div className="text-center">
                    <p className={`text-3xl font-bold ${r.governanceValidation.warningCount > 0 ? "text-amber-600" : "text-text"}`}>
                      {r.governanceValidation.warningCount}
                    </p>
                    <p className="text-xs text-text-secondary">Warnings</p>
                  </div>
                </div>
                <p className="text-xs text-text-tertiary">
                  Validation run at: {fmt(r.governanceValidation.generatedAt)}
                </p>

                {r.governanceValidation.violations.length > 0 && (
                  <div>
                    <SectionHeading className="mb-2">Violations</SectionHeading>
                    <div className="space-y-2">
                      {r.governanceValidation.violations.map((v, i) => (
                        <div
                          key={i}
                          className={`rounded-lg border p-3 text-xs ${
                            v.severity === "error"
                              ? "border-red-200 bg-red-50"
                              : "border-amber-200 bg-amber-50"
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <span
                              className={`shrink-0 rounded px-1 py-0.5 text-xs font-semibold ${
                                v.severity === "error"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {v.severity.toUpperCase()}
                            </span>
                            <div>
                              <p className="font-semibold text-text">{v.policyName}</p>
                              <p className="mt-0.5 text-text">{v.message}</p>
                              {v.suggestion && (
                                <p className="mt-0.5 text-text-secondary italic">{v.suggestion}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {r.governanceValidation.violations.length === 0 && (
                  <p className="text-sm text-green-700">No violations found — blueprint passes all applicable governance policies.</p>
                )}

                {/* Policy Version Evidence (Phase 22) */}
                {policyVersionRows.length > 0 && (
                  <div className="border-t border-border-subtle pt-4">
                    <SectionHeading className="mb-2">
                      5.1  Policy Version Evidence
                    </SectionHeading>
                    <p className="mb-3 text-xs text-text-secondary">
                      Policies evaluated at validation time ({validationGeneratedAt ? fmt(validationGeneratedAt) : "—"}). Superseded indicators show whether a policy has been revised since this blueprint was validated.
                    </p>
                    <Table dense>
                      <TableHead>
                        <TableRow>
                          <TableHeader>Policy</TableHeader>
                          <TableHeader>Version at Evaluation</TableHeader>
                          <TableHeader>Status</TableHeader>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {policyVersionRows.map((p) => (
                          <TableRow className="interactive-row" key={p.id}>
                            <TableCell className="text-text font-medium">{p.name}</TableCell>
                            <TableCell className="text-text-secondary font-mono">v{p.policyVersion}</TableCell>
                            <TableCell>
                              {p.supersededAt ? (
                                <span className="inline-flex items-center gap-1 text-amber-700">
                                  <span>⚠</span>
                                  <span>Policy revised since approval</span>
                                </span>
                              ) : (
                                <span className="text-green-700">✓ Current version</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        {/* ── Section 6: Review Decision ────────────────────────────────────── */}
        <section className="mb-10">
          <SectionHeader number={6} title="Review Decision" />
          <div className="rounded-xl border border-border bg-surface p-6 space-y-5">
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
                <SectionHeading className="mb-2">
                  6.1  Approval Chain Evidence
                </SectionHeading>
                <Table dense>
                  <TableHead>
                    <TableRow>
                      <TableHeader>Step</TableHeader>
                      <TableHeader>Role</TableHeader>
                      <TableHeader>Label</TableHeader>
                      <TableHeader>Approver</TableHeader>
                      <TableHeader>Decision</TableHeader>
                      <TableHeader>Timestamp</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {approvalProgress.map((step) => (
                      <TableRow className="interactive-row" key={step.step}>
                        <TableCell className="text-text-secondary">{step.step + 1}</TableCell>
                        <TableCell className="text-text-secondary capitalize">{step.role.replace("_", " ")}</TableCell>
                        <TableCell className="text-text font-medium">{step.label}</TableCell>
                        <TableCell className="text-text">{step.approvedBy}</TableCell>
                        <TableCell className={`font-semibold ${step.decision === "approved" ? "text-green-700" : "text-red-700"}`}>
                          {step.decision === "approved" ? "✓ Approved" : "✗ Rejected"}
                        </TableCell>
                        <TableCell className="text-text-secondary whitespace-nowrap">{fmt(step.approvedAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <p className="mt-2 text-xs text-text-secondary">
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
          <div className="rounded-xl border border-border bg-surface p-6">
            <div className="mb-4 flex items-center gap-2">
              <span
                className={`text-sm font-semibold ${
                  r.sodEvidence.sodSatisfied ? "text-green-700" : "text-red-700"
                }`}
              >
                {r.sodEvidence.sodSatisfied
                  ? "✓ SOD requirements satisfied — all roles held by distinct individuals"
                  : "✗ SOD violation detected — same individual holds multiple roles"}
              </span>
            </div>
            <dl className="grid grid-cols-3 gap-x-8 gap-y-0">
              <Field label="Architect (submitted)" value={r.sodEvidence.architect} />
              <Field label="Reviewer (approved/rejected)" value={r.sodEvidence.reviewer} />
              <Field label="Deployer (deployed to production)" value={r.sodEvidence.deployer} />
            </dl>
          </div>
        </section>

        {/* ── Section 8: Deployment Record ─────────────────────────────────── */}
        <section className="mb-10">
          <SectionHeader number={8} title="Deployment Change Record" />
          <div className="rounded-xl border border-border bg-surface p-6 space-y-5">
            <div className="flex items-center gap-3">
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                  r.deploymentRecord.deployed
                    ? "bg-green-100 text-green-700"
                    : "bg-surface-muted text-text-secondary"
                }`}
              >
                {r.deploymentRecord.deployed ? "Deployed to Production" : "Not Deployed"}
              </span>
              {r.deploymentRecord.deploymentTarget === "agentcore" && (
                <span className="inline-block rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700 border border-orange-200">
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
              <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
                <SectionHeading style={{ color: "#92400e" }} className="mb-3">
                  Amazon Bedrock AgentCore — AWS Resource Details
                </SectionHeading>
                <dl className="grid grid-cols-1 gap-y-0 sm:grid-cols-2">
                  <div className="py-1.5">
                    <dt><SectionHeading style={{ color: "#c2410c" }}>Agent ID</SectionHeading></dt>
                    <dd className="mt-0.5 font-mono text-xs text-text">{r.deploymentRecord.agentcoreRecord.agentId}</dd>
                  </div>
                  <div className="py-1.5">
                    <dt><SectionHeading style={{ color: "#c2410c" }}>Region</SectionHeading></dt>
                    <dd className="mt-0.5 text-sm text-text">{r.deploymentRecord.agentcoreRecord.region}</dd>
                  </div>
                  <div className="py-1.5 sm:col-span-2">
                    <dt><SectionHeading style={{ color: "#c2410c" }}>Agent ARN</SectionHeading></dt>
                    <dd className="mt-0.5 break-all font-mono text-xs text-text">{r.deploymentRecord.agentcoreRecord.agentArn}</dd>
                  </div>
                  <div className="py-1.5">
                    <dt><SectionHeading style={{ color: "#c2410c" }}>Foundation Model</SectionHeading></dt>
                    <dd className="mt-0.5 text-sm text-text">{r.deploymentRecord.agentcoreRecord.foundationModel}</dd>
                  </div>
                  <div className="py-1.5">
                    <dt><SectionHeading style={{ color: "#c2410c" }}>AgentCore Deployed By</SectionHeading></dt>
                    <dd className="mt-0.5 text-sm text-text">{r.deploymentRecord.agentcoreRecord.deployedBy}</dd>
                  </div>
                  <div className="py-1.5">
                    <dt><SectionHeading style={{ color: "#c2410c" }}>AgentCore Deployed At</SectionHeading></dt>
                    <dd className="mt-0.5 text-sm text-text">{fmt(r.deploymentRecord.agentcoreRecord.deployedAt)}</dd>
                  </div>
                  <div className="py-1.5 flex items-end">
                    <a
                      href={`https://${r.deploymentRecord.agentcoreRecord.region}.console.aws.amazon.com/bedrock/home?region=${r.deploymentRecord.agentcoreRecord.region}#/agents/${r.deploymentRecord.agentcoreRecord.agentId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-orange-700 underline hover:text-orange-900 print:hidden"
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
          <div className="space-y-5 rounded-xl border border-border bg-surface p-6">
            <div>
              <SectionHeading className="mb-2">
                Version History ({r.modelLineage.versionHistory.length})
              </SectionHeading>
              <Table dense>
                <TableHead>
                  <TableRow>
                    <TableHeader>Version</TableHeader>
                    <TableHeader>Status</TableHeader>
                    <TableHeader>Refinements</TableHeader>
                    <TableHeader>Created By</TableHeader>
                    <TableHeader>Created At</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {r.modelLineage.versionHistory.map((v, i) => (
                    <TableRow className="interactive-row" key={i}>
                      <TableCell className="font-mono font-medium text-text">v{v.version}</TableCell>
                      <TableCell className="text-text-secondary uppercase text-xs">{v.status}</TableCell>
                      <TableCell className="text-text-secondary">{v.refinementCount}</TableCell>
                      <TableCell className="text-text-secondary">{v.createdBy ?? "—"}</TableCell>
                      <TableCell className="text-text-secondary">{fmtDate(v.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div>
              <SectionHeading className="mb-2">
                Deployment Lineage ({r.modelLineage.deploymentLineage.length})
              </SectionHeading>
              {r.modelLineage.deploymentLineage.length === 0 ? (
                <p className="text-sm text-text-tertiary">No production deployments recorded.</p>
              ) : (
                <Table dense>
                  <TableHead>
                    <TableRow>
                      <TableHeader>Version</TableHeader>
                      <TableHeader>Deployed At</TableHeader>
                      <TableHeader>Deployed By</TableHeader>
                      <TableHeader>Change Ref</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {r.modelLineage.deploymentLineage.map((d, i) => (
                      <TableRow className="interactive-row" key={i}>
                        <TableCell className="font-mono text-text">v{d.version}</TableCell>
                        <TableCell className="text-text-secondary">{fmt(d.deployedAt)}</TableCell>
                        <TableCell className="text-text-secondary">{d.deployedBy}</TableCell>
                        <TableCell className="font-mono text-xs text-text-secondary">{d.changeRef ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </section>

        {/* ── Section 10: Audit Chain ───────────────────────────────────────── */}
        <section className="mb-10">
          <SectionHeader number={10} title="Audit Chain" />
          <div className="rounded-xl border border-border bg-surface p-6">
            {r.auditChain.length === 0 ? (
              <p className="text-sm text-text-tertiary">No audit events recorded for this version.</p>
            ) : (
              <Table dense>
                <TableHead>
                  <TableRow>
                    <TableHeader>Timestamp</TableHeader>
                    <TableHeader>Action</TableHeader>
                    <TableHeader>Actor</TableHeader>
                    <TableHeader>Role</TableHeader>
                    <TableHeader>Transition</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {r.auditChain.map((e, i) => (
                    <TableRow className="interactive-row" key={i}>
                      <TableCell className="font-mono text-text-secondary whitespace-nowrap">
                        {fmt(e.timestamp)}
                      </TableCell>
                      <TableCell className="font-mono text-text">{e.action}</TableCell>
                      <TableCell className="text-text">{e.actor}</TableCell>
                      <TableCell className="text-text-secondary">{e.actorRole}</TableCell>
                      <TableCell className="text-text-secondary">
                        {e.fromStatus && e.toStatus
                          ? `${e.fromStatus} → ${e.toStatus}`
                          : e.toStatus ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </section>

        {/* ── Section 11: Stakeholder Contributions ────────────────────────── */}
        <section className="mb-10">
          <SectionHeader number={11} title="Stakeholder Contributions" />
          <div className="rounded-xl border border-border bg-surface p-6 space-y-4">

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
              <p className="text-sm text-text-tertiary">
                No stakeholder contributions recorded. This blueprint was generated before the
                Stakeholder Requirement Lanes feature was introduced, or no contributions were
                submitted during intake.
              </p>
            ) : (
              <div className="space-y-3">
                {r.stakeholderContributions.map((c, i) => (
                  <div key={i} className="rounded-lg border border-border p-4">
                    <div className="mb-3 flex items-center gap-3">
                      <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-text-secondary">
                        {c.domain}
                      </span>
                      <span className="text-sm font-medium text-text">{c.contributorEmail}</span>
                      <span className="text-xs text-text-tertiary">({c.contributorRole})</span>
                      <span className="ml-auto text-xs text-text-tertiary">{fmt(c.submittedAt)}</span>
                    </div>
                    <dl className="grid grid-cols-1 gap-y-1 sm:grid-cols-2">
                      {Object.entries(c.fields).map(([key, value]) => (
                        <div key={key} className="py-0.5">
                          <dt className="text-xs font-medium text-text-tertiary capitalize">
                            {key.replace(/_/g, " ")}
                          </dt>
                          <dd className="mt-0.5 text-xs text-text">{value}</dd>
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
            <div className="rounded-xl border border-border bg-surface p-6">
              <p className="text-sm text-amber-700">
                Not available — this report was generated before Phase 20 (Regulatory Intelligence)
                was introduced. Re-generate the report to include the regulatory framework assessment.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <p className="text-xs text-text-tertiary">
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
                    ? "bg-green-100 text-green-700 border-green-200"
                    : fw.overallStatus === "gaps_identified"
                    ? "bg-red-100 text-red-700 border-red-200"
                    : "bg-amber-100 text-amber-700 border-amber-200";

                const tierColor =
                  fw.euAiActRiskTier === "high-risk" || fw.euAiActRiskTier === "review-required"
                    ? "bg-red-100 text-red-700 border-red-200"
                    : fw.euAiActRiskTier === "limited-risk"
                    ? "bg-amber-100 text-amber-700 border-amber-200"
                    : "bg-green-100 text-green-700 border-green-200";

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
                          ? "text-green-700"
                          : strength === "Partial"
                          ? "text-amber-600"
                          : "text-red-700";
                      return { fn: fn.toUpperCase(), reqs, satisfiedCount, strength, strengthColor };
                    })
                  : [];

                return (
                  <div
                    key={fw.frameworkId}
                    className="rounded-xl border border-border bg-surface p-6"
                  >
                    {/* Framework header */}
                    <div className="mb-4 flex flex-wrap items-start gap-3 border-b border-border-subtle pb-4">
                      <div className="flex-1">
                        <SectionHeading className="text-xs">
                          12.{fwIdx + 1}
                        </p>
                        <Subheading level={3} className="text-text">
                          {fw.frameworkName}{" "}
                          <span className="font-normal text-text-secondary text-sm">
                            ({fw.version})
                          </span>
                        </Subheading>
                        <p className="mt-1 text-xs text-text-secondary leading-relaxed">
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
                        <span className="text-xs text-text-secondary">
                          {satisfied}/{applicable.length} requirements satisfied
                        </span>
                      </div>
                    </div>

                    {/* NIST: function strength visualization */}
                    {isNist && (
                      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {nistFunctions.map(({ fn, reqs, satisfiedCount, strength, strengthColor }) => (
                          <div key={fn} className="rounded-lg border border-border-subtle bg-surface-raised p-3">
                            <SectionHeading className="text-xs">
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
                                      ? "bg-green-500"
                                      : req.evidenceStatus === "partial"
                                      ? "bg-amber-400"
                                      : req.evidenceStatus === "missing"
                                      ? "bg-red-400"
                                      : "bg-surface-muted"
                                  }`}
                                />
                              ))}
                            </div>
                            <p className="mt-1 text-xs text-text-tertiary">
                              {satisfiedCount}/{reqs.length} met
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Per-requirement evidence table */}
                    <Table dense>
                      <TableHead>
                        <TableRow>
                          <TableHeader>Code</TableHeader>
                          <TableHeader>Requirement</TableHeader>
                          <TableHeader>Status</TableHeader>
                          <TableHeader>Evidence</TableHeader>
                        </TableRow>
                      </TableHead>
                      <TableBody>
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
                              ? "text-green-700"
                              : req.evidenceStatus === "partial"
                              ? "text-amber-600"
                              : req.evidenceStatus === "missing"
                              ? "text-red-700"
                              : "text-text-tertiary";
                          return (
                            <TableRow
                              key={ri}
                              className={
                                req.evidenceStatus === "not_applicable"
                                  ? "opacity-40"
                                  : ""
                              }
                            >
                              <TableCell className="font-mono font-medium text-text align-top">
                                {req.code}
                              </TableCell>
                              <TableCell className="text-text align-top">
                                <span className="font-medium">{req.title}</span>
                                <span className="block text-text-tertiary mt-0.5 text-xs leading-relaxed">
                                  {req.description}
                                </span>
                              </TableCell>
                              <TableCell className={`font-semibold align-top whitespace-nowrap ${statusColor}`}>
                                {statusIcon}{" "}
                                {req.evidenceStatus === "not_applicable"
                                  ? "N/A"
                                  : req.evidenceStatus.charAt(0).toUpperCase() +
                                    req.evidenceStatus.slice(1)}
                              </TableCell>
                              <TableCell className="text-text-secondary align-top">
                                {req.evidence ?? "—"}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
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
              <dl className="grid grid-cols-2 gap-x-8 divide-y divide-border-subtle rounded-lg border border-border bg-surface px-5 py-3 text-sm sm:grid-cols-4">
                <Field label="Executed By" value={latestTestRun.runBy} />
                <Field label="Run Date" value={fmt(latestTestRun.startedAt)} />
                <Field label="Test Cases" value={String(latestTestRun.totalCases)} />
                <Field
                  label="Overall Verdict"
                  value={
                    <span
                      className={`font-semibold ${
                        latestTestRun.status === "passed"
                          ? "text-green-700"
                          : latestTestRun.status === "failed"
                          ? "text-red-700"
                          : "text-amber-700"
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
                <div className="overflow-hidden rounded-lg border border-border bg-surface">
                  <Table dense>
                    <TableHead>
                      <TableRow>
                        <TableHeader>#</TableHeader>
                        <TableHeader>Test Case</TableHeader>
                        <TableHeader>Verdict</TableHeader>
                        <TableHeader>Evaluation Rationale</TableHeader>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {latestTestRun.testResults.map((result, i) => (
                        <TableRow className="align-top interactive-row" key={result.testCaseId}>
                          <TableCell className="text-text-tertiary">{i + 1}</TableCell>
                          <TableCell className="font-medium text-text">{result.name}</TableCell>
                          <TableCell
                            className={`font-semibold ${
                              result.status === "passed"
                                ? "text-green-700"
                                : result.status === "failed"
                                ? "text-red-700"
                                : "text-amber-700"
                            }`}
                          >
                            {result.status === "passed" ? "✓ Passed" : result.status === "failed" ? "✗ Failed" : "⚠ Error"}
                          </TableCell>
                          <TableCell className="text-text-secondary leading-relaxed">
                            {result.evaluationRationale || "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-surface px-5 py-6 text-center">
              <p className="text-sm text-text-secondary">
                No behavioral tests have been executed for this blueprint version.
              </p>
              <p className="mt-1 text-xs text-text-tertiary">
                SR 11-7 recommends performance testing evidence. Add test cases from the Registry detail page and run them before approval.
              </p>
            </div>
          )}
        </section>

        {/* Section 14: Periodic Review Schedule */}
        <section className="space-y-4">
          <SectionHeader number={14} title="Periodic Review Schedule" />
          <div className="rounded-lg border border-border bg-surface">
            <dl className="divide-y divide-border-subtle px-5">
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
                        <span className={`inline-flex items-center gap-2 ${r.periodicReviewSchedule.isOverdue ? "text-red-700" : "text-text"}`}>
                          {fmtDate(r.periodicReviewSchedule.nextReviewDueAt)}
                          {r.periodicReviewSchedule.isOverdue && (
                            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">OVERDUE</span>
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
                        <Chip label="Review Overdue" color="bg-red-100 text-red-800 border border-red-200" />
                      ) : r.periodicReviewSchedule.nextReviewDueAt ? (
                        <Chip label="On Schedule" color="bg-green-100 text-green-800 border border-green-200" />
                      ) : (
                        <Chip label="Not Deployed" color="bg-surface-muted text-text-secondary border border-border" />
                      )
                    }
                  />
                </>
              )}
            </dl>
          </div>
          <p className="text-xs text-text-tertiary">
            SR 11-7 requires periodic model performance revalidation after initial deployment.
            Review cadence is configured in Enterprise Settings. Overdue reviews require immediate remediation.
          </p>
        </section>

        {/* Footer */}
        <footer className="border-t border-border py-8 text-center text-xs text-text-tertiary print:pt-4">
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

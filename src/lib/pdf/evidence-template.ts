/**
 * Evidence-package PDF — HTML template.
 *
 * Pure function: takes the assembled evidence package (same shape returned by
 * the JSON evidence-package route) and returns a self-contained HTML document
 * string with inline CSS, suitable for printing via headless Chromium.
 *
 * Design notes:
 *   - Big-4 audit aesthetic: serif title on cover, sans-serif body,
 *     thin table rules, indigo accent (#4f46e5), classification banner.
 *   - Every section starts on a new page (CSS `page-break-before`) for
 *     deterministic layout.
 *   - Running header and page numbers are emitted by Chromium's `displayHeaderFooter`
 *     option in render-evidence.ts (not in this template).
 *   - The renderer (render-evidence.ts) is responsible for fonts; this template
 *     uses system fallbacks so the HTML is renderable standalone for debugging.
 *
 * Reference layout: samples/build_evidence_pdf.py (reportlab) +
 * src/app/blueprints/[id]/report/page.tsx (on-screen React rendering).
 */

import type { MRMReport } from "@/lib/mrm/types";

// ── Types ─────────────────────────────────────────────────────────────────

export interface EvidencePackagePDFInput {
  exportMetadata: {
    packageFormatVersion: string;
    exportedAt: string;
    exportedBy: string;
    exportedByRole: string;
    blueprintId: string;
    agentId: string;
    agentName: string;
    blueprintVersion: string;
    blueprintStatus: string;
  };
  mrmReport: MRMReport;
  approvalChain: {
    stepCount: number;
    currentStep: number | null;
    steps: Array<{
      step: number;
      label: string;
      role: string;
      approvedBy: string | null;
      decision: string | null;
      comment: string | null;
      approvedAt: string | null;
    }>;
  };
  qualityEvaluation: {
    id: string;
    overallScore: number | null;
    dimensions: {
      intentAlignment: number | null;
      toolAppropriateness: number | null;
      instructionSpecificity: number | null;
      governanceAdequacy: number | null;
      ownershipCompleteness: number | null;
    };
    flags: string[];
    evaluatorModel: string | null;
    evaluatedAt: string;
  } | null;
  testEvidence: {
    runCount: number;
    runs: Array<{
      id: string;
      status: string;
      totalCases: number | null;
      passedCases: number | null;
      failedCases: number | null;
      runBy: string | null;
      startedAt: string;
      completedAt: string | null;
      results: unknown;
    }>;
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────

const esc = (s: unknown): string => {
  if (s === null || s === undefined) return "—";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

const fmtDate = (iso: string | null | undefined): string => {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toISOString().slice(0, 19).replace("T", " ") + " UTC";
  } catch {
    return esc(iso);
  }
};

const fmtScore = (n: number | null): string => (n == null ? "—" : n.toFixed(2));

const riskTierColor = (tier: string): string => {
  const t = tier.toLowerCase();
  if (t === "high") return "#b91c1c";
  if (t === "medium") return "#b45309";
  if (t === "low") return "#15803d";
  return "#475569";
};

const statusColor = (status: string): string => {
  const s = status.toLowerCase();
  if (s === "approved" || s === "deployed" || s === "completed" || s === "passed")
    return "#15803d";
  if (s === "rejected" || s === "failed" || s === "blocked") return "#b91c1c";
  if (s === "in_review" || s === "pending" || s === "running") return "#b45309";
  if (s === "deprecated") return "#475569";
  return "#374151";
};

const sectionHeader = (n: number, title: string) => `
  <h2 class="section-h2">
    <span class="section-num">Section ${n}</span>
    <span class="section-title">${esc(title)}</span>
  </h2>
`;

const fieldList = (items: Array<[string, string | number | null | undefined]>) => {
  const rows = items
    .map(
      ([label, value]) => `
        <div class="field">
          <dt>${esc(label)}</dt>
          <dd>${value == null || value === "" ? "—" : esc(value)}</dd>
        </div>`
    )
    .join("");
  return `<dl class="fields">${rows}</dl>`;
};

// ── Section renderers ─────────────────────────────────────────────────────

const renderCover = (pkg: EvidencePackagePDFInput): string => {
  const { mrmReport: r, exportMetadata: m } = pkg;
  return `
    <section class="page cover">
      <div class="classification-banner">CONFIDENTIAL — INTERNAL USE</div>
      <div class="cover-mark">INTELLIOS</div>
      <div class="cover-eyebrow">SR 11-7 Model Risk Management — Evidence Package</div>
      <h1 class="cover-title">${esc(r.cover.agentName)}</h1>
      <div class="cover-chips">
        <span class="chip chip-status" style="background:${statusColor(r.cover.currentStatus)};">
          ${esc(r.cover.currentStatus.toUpperCase())}
        </span>
        <span class="chip chip-version">Version ${esc(r.cover.currentVersion)}</span>
        ${r.cover.enterpriseId ? `<span class="chip chip-ent">Enterprise: ${esc(r.cover.enterpriseId)}</span>` : ""}
      </div>
      <div class="cover-meta">
        ${fieldList([
          ["Generated At", fmtDate(r.generatedAt)],
          ["Generated By", r.generatedBy],
          ["Exported At", fmtDate(m.exportedAt)],
          ["Exported By", `${m.exportedBy} (${m.exportedByRole})`],
          ["Blueprint ID", m.blueprintId],
          ["Agent ID", m.agentId],
          ["Package Format", `v${m.packageFormatVersion}`],
          ["Blueprint Status", m.blueprintStatus],
        ])}
      </div>
      <div class="cover-footer">
        Produced by Intellios — the governed control plane for enterprise AI agents.
        <br/>This document contains regulatory evidence for the agent named above and is intended for compliance,
        audit, and risk-management review.
      </div>
    </section>
  `;
};

const renderRiskClassification = (r: MRMReport): string => {
  const rc = r.riskClassification;
  return `
    <section class="page">
      ${sectionHeader(2, "Risk Classification")}
      <div class="risk-card">
        <div class="risk-tier" style="border-color:${riskTierColor(rc.riskTier)};color:${riskTierColor(rc.riskTier)};">
          ${esc(rc.riskTier)}
        </div>
        <div class="risk-basis">
          <div class="label">Basis</div>
          <p>${esc(rc.riskTierBasis)}</p>
        </div>
      </div>
      ${fieldList([
        ["Intended Use", rc.intendedUse],
        ["Business Owner", rc.businessOwner],
        ["Model Owner", rc.modelOwner],
        ["Deployment Type", rc.deploymentType],
        ["Data Sensitivity", rc.dataSensitivity],
        ["Regulatory Scope", rc.regulatoryScope.length ? rc.regulatoryScope.join(", ") : null],
        ["Stakeholders Consulted", rc.stakeholdersConsulted.length ? rc.stakeholdersConsulted.join(", ") : null],
      ])}
    </section>
  `;
};

const renderIdentityAndCapabilities = (r: MRMReport): string => {
  const { identity, capabilities } = r;
  const tools = capabilities.tools.length
    ? `
      <table class="data-table">
        <thead><tr><th>Tool</th><th>Type</th><th>Description</th></tr></thead>
        <tbody>
          ${capabilities.tools
            .map(
              (t) => `<tr>
                <td><span class="mono">${esc(t.name)}</span></td>
                <td>${esc(t.type)}</td>
                <td>${esc(t.description ?? "—")}</td>
              </tr>`
            )
            .join("")}
        </tbody>
      </table>`
    : `<p class="muted">No tools configured.</p>`;

  const ks = capabilities.knowledgeSources.length
    ? `
      <table class="data-table">
        <thead><tr><th>Knowledge Source</th><th>Type</th></tr></thead>
        <tbody>
          ${capabilities.knowledgeSources
            .map((k) => `<tr><td>${esc(k.name)}</td><td>${esc(k.type)}</td></tr>`)
            .join("")}
        </tbody>
      </table>`
    : `<p class="muted">No knowledge sources configured.</p>`;

  return `
    <section class="page">
      ${sectionHeader(3, "Agent Identity")}
      ${fieldList([
        ["Name", identity.name],
        ["Description", identity.description],
        ["Persona", identity.persona],
        ["Tags", identity.tags.length ? identity.tags.join(", ") : null],
      ])}

      ${sectionHeader(4, "Capabilities")}
      ${fieldList([
        ["Tool Count", capabilities.toolCount],
        ["Knowledge Source Count", capabilities.knowledgeSourceCount],
        ["Instructions Configured", capabilities.instructionsConfigured ? "Yes" : "No"],
      ])}
      <h3 class="subhead">Tools</h3>
      ${tools}
      <h3 class="subhead">Knowledge Sources</h3>
      ${ks}
    </section>
  `;
};

const renderGovernanceValidation = (r: MRMReport): string => {
  const g = r.governanceValidation;
  if (!g.validated) {
    return `
      <section class="page">
        ${sectionHeader(5, "Governance Validation")}
        <p class="muted">No validation has been run for this blueprint version.</p>
      </section>
    `;
  }
  const violationsTable = g.violations.length
    ? `
      <table class="data-table">
        <thead><tr><th>Policy</th><th>Severity</th><th>Message</th><th>Suggestion</th></tr></thead>
        <tbody>
          ${g.violations
            .map(
              (v) => `<tr>
                <td>${esc(v.policyName)}</td>
                <td><span class="badge badge-${esc(v.severity).toLowerCase()}">${esc(v.severity)}</span></td>
                <td>${esc(v.message)}</td>
                <td>${esc(v.suggestion ?? "—")}</td>
              </tr>`
            )
            .join("")}
        </tbody>
      </table>`
    : `<p class="ok">No policy violations recorded.</p>`;

  return `
    <section class="page">
      ${sectionHeader(5, "Governance Validation")}
      ${fieldList([
        ["Validated", g.validated ? "Yes" : "No"],
        ["Valid", g.valid == null ? "—" : g.valid ? "Yes" : "No"],
        ["Policies Evaluated", g.policyCount],
        ["Violations", g.violationCount],
        ["Errors", g.errorCount],
        ["Warnings", g.warningCount],
        ["Last Validated", fmtDate(g.generatedAt)],
      ])}
      <h3 class="subhead">Violations</h3>
      ${violationsTable}
    </section>
  `;
};

const renderReviewAndSod = (r: MRMReport): string => {
  const { reviewDecision: rd, sodEvidence: sod } = r;
  return `
    <section class="page">
      ${sectionHeader(6, "Review Decision")}
      ${fieldList([
        ["Outcome", rd.outcome ?? "Pending"],
        ["Reviewed By", rd.reviewedBy],
        ["Reviewed At", fmtDate(rd.reviewedAt)],
        ["Comment", rd.comment],
      ])}

      ${sectionHeader(7, "Separation of Duties Evidence")}
      ${fieldList([
        ["Architect / Designer", sod.architect],
        ["Reviewer", sod.reviewer],
        ["Deployer", sod.deployer],
        ["SOD Satisfied", sod.sodSatisfied ? "Yes" : "No"],
      ])}
    </section>
  `;
};

const renderDeploymentAndLineage = (r: MRMReport): string => {
  const { deploymentRecord: dep, modelLineage: ml } = r;
  const versionRows = ml.versionHistory.length
    ? ml.versionHistory
        .map(
          (v) => `<tr>
            <td>${esc(v.version)}</td>
            <td><span class="badge" style="background:${statusColor(v.status)};color:#fff;">${esc(v.status)}</span></td>
            <td>${esc(v.createdBy ?? "—")}</td>
            <td>${fmtDate(v.createdAt)}</td>
            <td>${esc(v.refinementCount)}</td>
          </tr>`
        )
        .join("")
    : `<tr><td colspan="5" class="muted">No version history.</td></tr>`;

  const deployRows = ml.deploymentLineage.length
    ? ml.deploymentLineage
        .map(
          (d) => `<tr>
            <td>${esc(d.version)}</td>
            <td>${fmtDate(d.deployedAt)}</td>
            <td>${esc(d.deployedBy)}</td>
            <td><span class="mono">${esc(d.changeRef ?? "—")}</span></td>
          </tr>`
        )
        .join("")
    : `<tr><td colspan="4" class="muted">No deployment events recorded.</td></tr>`;

  return `
    <section class="page">
      ${sectionHeader(8, "Deployment Change Record")}
      ${fieldList([
        ["Deployed", dep.deployed ? "Yes" : "No"],
        ["Deployed At", fmtDate(dep.deployedAt)],
        ["Deployed By", dep.deployedBy],
        ["Change Reference", dep.changeRef],
        ["Deployment Target", dep.deploymentTarget],
        ["Notes", dep.deploymentNotes],
      ])}
      ${
        dep.agentcoreRecord
          ? `<h3 class="subhead">AWS Bedrock AgentCore Record</h3>
             ${fieldList([
               ["Agent ID", dep.agentcoreRecord.agentId],
               ["Agent ARN", dep.agentcoreRecord.agentArn],
               ["Region", dep.agentcoreRecord.region],
               ["Foundation Model", dep.agentcoreRecord.foundationModel],
               ["Deployed At", fmtDate(dep.agentcoreRecord.deployedAt)],
               ["Deployed By", dep.agentcoreRecord.deployedBy],
             ])}`
          : ""
      }

      ${sectionHeader(9, "Model Lineage")}
      <h3 class="subhead">Version History</h3>
      <table class="data-table">
        <thead><tr><th>Version</th><th>Status</th><th>Created By</th><th>Created At</th><th>Refinements</th></tr></thead>
        <tbody>${versionRows}</tbody>
      </table>
      <h3 class="subhead">Deployment Lineage</h3>
      <table class="data-table">
        <thead><tr><th>Version</th><th>Deployed At</th><th>Deployed By</th><th>Change Ref</th></tr></thead>
        <tbody>${deployRows}</tbody>
      </table>
    </section>
  `;
};

const renderAuditChain = (r: MRMReport): string => {
  const rows = r.auditChain.length
    ? r.auditChain
        .map(
          (e) => `<tr>
            <td><span class="mono">${fmtDate(e.timestamp)}</span></td>
            <td>${esc(e.action)}</td>
            <td>${esc(e.actor)}</td>
            <td>${esc(e.actorRole)}</td>
            <td>${esc(e.fromStatus ?? "—")} → ${esc(e.toStatus ?? "—")}</td>
          </tr>`
        )
        .join("")
    : `<tr><td colspan="5" class="muted">No audit events recorded.</td></tr>`;

  return `
    <section class="page">
      ${sectionHeader(10, "Audit Chain")}
      <p class="lede">Immutable lifecycle event trail for this blueprint version.</p>
      <table class="data-table data-table-dense">
        <thead><tr><th>Timestamp</th><th>Action</th><th>Actor</th><th>Role</th><th>State Transition</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </section>
  `;
};

const renderStakeholders = (r: MRMReport): string => {
  const contributions = r.stakeholderContributions.length
    ? r.stakeholderContributions
        .map(
          (s) => `
          <div class="stakeholder-card">
            <div class="stakeholder-head">
              <strong>${esc(s.contributorEmail)}</strong>
              <span class="muted">${esc(s.contributorRole)} · ${esc(s.domain)}</span>
              <span class="muted mono small">${fmtDate(s.submittedAt)}</span>
            </div>
            <dl class="fields">
              ${Object.entries(s.fields)
                .map(([k, v]) => `<div class="field"><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`)
                .join("")}
            </dl>
          </div>`
        )
        .join("")
    : `<p class="muted">No stakeholder contributions recorded.</p>`;

  const gaps =
    r.stakeholderCoverageGaps == null
      ? `<p class="muted">Coverage data not available for this blueprint version (pre-Phase 8).</p>`
      : r.stakeholderCoverageGaps.length === 0
      ? `<p class="ok">Full coverage across all expected domains.</p>`
      : `<p class="warn">Missing contributions from: ${r.stakeholderCoverageGaps.map(esc).join(", ")}</p>`;

  return `
    <section class="page">
      ${sectionHeader(11, "Stakeholder Contributions")}
      ${contributions}
      <h3 class="subhead">Coverage Gaps</h3>
      ${gaps}
    </section>
  `;
};

const renderRegulatoryFrameworks = (r: MRMReport): string => {
  if (r.regulatoryFrameworks == null) {
    return `
      <section class="page">
        ${sectionHeader(12, "Regulatory Framework Assessment")}
        <p class="muted">Framework assessment unavailable for this blueprint version (pre-Phase 20).</p>
      </section>
    `;
  }
  const rows = r.regulatoryFrameworks.frameworks
    .map(
      (f) => `<tr>
        <td><strong>${esc(f.frameworkName)}</strong>${f.euAiActRiskTier ? `<br/><span class="muted small">EU AI Act tier: ${esc(f.euAiActRiskTier)}</span>` : ""}</td>
        <td><span class="badge" style="background:${statusColor(f.overallStatus)};color:#fff;">${esc(f.overallStatus)}</span></td>
        <td><span class="mono">${esc(f.requirementsSatisfied)} / ${esc(f.requirementsTotal)}</span></td>
        <td>${f.gaps.length ? f.gaps.map(esc).join("<br/>") : "—"}</td>
      </tr>`
    )
    .join("");

  return `
    <section class="page">
      ${sectionHeader(12, "Regulatory Framework Assessment")}
      <p class="lede">Per-requirement assessment as of ${fmtDate(r.regulatoryFrameworks.assessedAt)}.</p>
      <table class="data-table">
        <thead><tr><th>Framework</th><th>Status</th><th>Requirements Met</th><th>Open Gaps</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </section>
  `;
};

const renderWorkflowAndPeriodic = (r: MRMReport): string => {
  const wfRows =
    r.workflowContext == null
      ? `<p class="muted">This agent is not referenced by any approved or deprecated workflow.</p>`
      : r.workflowContext.length === 0
      ? `<p class="muted">No workflow participation on record.</p>`
      : `<table class="data-table">
          <thead><tr><th>Workflow</th><th>Version</th><th>Role</th><th>Required</th><th>Status</th></tr></thead>
          <tbody>
            ${r.workflowContext
              .map(
                (w) => `<tr>
                  <td>${esc(w.name)}</td>
                  <td><span class="mono">${esc(w.version)}</span></td>
                  <td>${esc(w.role)}</td>
                  <td>${w.required ? "Yes" : "No"}</td>
                  <td><span class="badge" style="background:${statusColor(w.status)};color:#fff;">${esc(w.status)}</span></td>
                </tr>`
              )
              .join("")}
          </tbody>
        </table>`;

  const pr = r.periodicReviewSchedule;
  const periodic = !pr.enabled
    ? `<p class="muted">Periodic review is not configured for this enterprise.</p>`
    : fieldList([
        ["Cadence", `Every ${pr.cadenceMonths} months`],
        ["Last Review", fmtDate(pr.lastPeriodicReviewAt)],
        ["Next Review Due", fmtDate(pr.nextReviewDueAt)],
        ["Overdue", pr.isOverdue ? "Yes" : "No"],
      ]);

  return `
    <section class="page">
      ${sectionHeader(13, "Workflow Context")}
      ${wfRows}

      ${sectionHeader(14, "Periodic Review Schedule")}
      ${periodic}
    </section>
  `;
};

const renderApprovalChain = (pkg: EvidencePackagePDFInput): string => {
  const ac = pkg.approvalChain;
  if (ac.stepCount === 0) {
    return `
      <section class="page">
        ${sectionHeader(15, "Approval Chain")}
        <p class="muted">No multi-step approval chain configured. See Section 6 (Review Decision) for the single-step approval record.</p>
      </section>
    `;
  }
  const rows = ac.steps
    .map(
      (s) => `<tr>
        <td>${esc(s.step)}</td>
        <td>${esc(s.label)}</td>
        <td>${esc(s.role)}</td>
        <td>${esc(s.approvedBy ?? "—")}</td>
        <td>${esc(s.decision ?? "—")}</td>
        <td>${fmtDate(s.approvedAt)}</td>
        <td>${esc(s.comment ?? "—")}</td>
      </tr>`
    )
    .join("");

  return `
    <section class="page">
      ${sectionHeader(15, "Approval Chain")}
      <p class="lede">Multi-step approval evidence — ${esc(ac.stepCount)} step(s), current step ${esc(ac.currentStep ?? "—")}.</p>
      <table class="data-table">
        <thead><tr><th>#</th><th>Label</th><th>Role</th><th>Approved By</th><th>Decision</th><th>At</th><th>Comment</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </section>
  `;
};

const renderQualityEval = (pkg: EvidencePackagePDFInput): string => {
  const q = pkg.qualityEvaluation;
  if (!q) {
    return `
      <section class="page">
        ${sectionHeader(16, "Blueprint Quality Evaluation")}
        <p class="muted">No quality evaluation has been run.</p>
      </section>
    `;
  }
  return `
    <section class="page">
      ${sectionHeader(16, "Blueprint Quality Evaluation")}
      <div class="score-strip">
        <div class="score-overall">
          <div class="label">Overall</div>
          <div class="value">${fmtScore(q.overallScore)}</div>
        </div>
        <div class="score-grid">
          ${[
            ["Intent Alignment", q.dimensions.intentAlignment],
            ["Tool Appropriateness", q.dimensions.toolAppropriateness],
            ["Instruction Specificity", q.dimensions.instructionSpecificity],
            ["Governance Adequacy", q.dimensions.governanceAdequacy],
            ["Ownership Completeness", q.dimensions.ownershipCompleteness],
          ]
            .map(
              ([label, val]) =>
                `<div class="dim"><div class="label">${esc(label)}</div><div class="value">${fmtScore(val as number | null)}</div></div>`
            )
            .join("")}
        </div>
      </div>
      ${fieldList([
        ["Evaluator Model", q.evaluatorModel],
        ["Evaluated At", fmtDate(q.evaluatedAt)],
        ["Flags", q.flags.length ? q.flags.join(", ") : null],
      ])}
    </section>
  `;
};

const renderTestEvidence = (pkg: EvidencePackagePDFInput): string => {
  const te = pkg.testEvidence;
  if (te.runCount === 0) {
    return `
      <section class="page">
        ${sectionHeader(17, "Behavioral Test Evidence")}
        <p class="muted">No test runs recorded for this blueprint version.</p>
      </section>
    `;
  }
  const rows = te.runs
    .map(
      (run) => `<tr>
        <td><span class="badge" style="background:${statusColor(run.status)};color:#fff;">${esc(run.status)}</span></td>
        <td>${esc(run.passedCases ?? 0)} / ${esc(run.totalCases ?? 0)}</td>
        <td>${esc(run.failedCases ?? 0)}</td>
        <td>${esc(run.runBy ?? "—")}</td>
        <td>${fmtDate(run.startedAt)}</td>
        <td>${fmtDate(run.completedAt)}</td>
      </tr>`
    )
    .join("");

  return `
    <section class="page">
      ${sectionHeader(17, "Behavioral Test Evidence")}
      <p class="lede">${esc(te.runCount)} test run(s) on file.</p>
      <table class="data-table">
        <thead><tr><th>Status</th><th>Pass / Total</th><th>Failed</th><th>Run By</th><th>Started</th><th>Completed</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </section>
  `;
};

// ── CSS ───────────────────────────────────────────────────────────────────

const STYLES = `
  @page { size: Letter; margin: 0.6in 0.7in 0.7in 0.7in; }
  * { box-sizing: border-box; }
  html, body {
    margin: 0; padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", "Helvetica Neue", Arial, sans-serif;
    color: #0f172a;
    font-size: 10pt;
    line-height: 1.45;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .mono { font-family: ui-monospace, "SFMono-Regular", "Menlo", "Consolas", monospace; font-size: 9pt; }
  .small { font-size: 8.5pt; }
  .muted { color: #64748b; }
  .ok { color: #15803d; font-weight: 500; }
  .warn { color: #b45309; font-weight: 500; }
  .lede { color: #475569; margin: 0 0 12pt 0; }

  .page { page-break-after: always; padding: 0; }
  .page:last-child { page-break-after: auto; }

  /* Cover */
  .cover { display: flex; flex-direction: column; min-height: 9in; }
  .classification-banner {
    background: #1e293b; color: #fff; text-align: center;
    font-size: 8.5pt; letter-spacing: 0.18em; font-weight: 600;
    padding: 6pt 0; margin: -0.6in -0.7in 0 -0.7in;
  }
  .cover-mark {
    margin-top: 36pt; font-family: Georgia, "Times New Roman", serif;
    font-weight: 700; letter-spacing: 0.2em; font-size: 11pt; color: #4f46e5;
  }
  .cover-eyebrow {
    margin-top: 8pt; font-size: 9.5pt; letter-spacing: 0.08em;
    text-transform: uppercase; color: #475569; font-weight: 600;
  }
  .cover-title {
    margin: 14pt 0 0 0; font-family: Georgia, "Times New Roman", serif;
    font-weight: 700; font-size: 28pt; color: #0f172a; line-height: 1.1;
  }
  .cover-chips { margin-top: 14pt; display: flex; gap: 8pt; flex-wrap: wrap; }
  .chip {
    display: inline-block; padding: 3pt 10pt; border-radius: 4pt;
    font-size: 9pt; font-weight: 600; color: #fff;
  }
  .chip-version { background: #e0e7ff; color: #3730a3; }
  .chip-ent { background: #f3e8ff; color: #6b21a8; }
  .cover-meta { margin-top: 28pt; }
  .cover-footer {
    margin-top: auto; padding-top: 24pt;
    border-top: 1pt solid #e2e8f0; color: #475569; font-size: 9pt;
  }

  /* Section heading */
  .section-h2 {
    display: flex; align-items: baseline; gap: 12pt;
    margin: 0 0 12pt 0; padding-bottom: 6pt;
    border-bottom: 2pt solid #4f46e5;
  }
  .section-num {
    font-size: 8.5pt; letter-spacing: 0.15em; text-transform: uppercase;
    color: #4f46e5; font-weight: 700;
  }
  .section-title {
    font-family: Georgia, "Times New Roman", serif; font-weight: 700;
    font-size: 16pt; color: #0f172a;
  }
  .subhead {
    margin: 16pt 0 6pt 0; font-size: 11pt; font-weight: 600;
    color: #1e293b; letter-spacing: 0.02em;
  }

  /* Field list */
  .fields {
    display: grid; grid-template-columns: 1fr 1fr; gap: 8pt 24pt;
    margin: 0 0 8pt 0;
  }
  .field { padding: 4pt 0; border-bottom: 1pt solid #f1f5f9; }
  .field dt {
    font-size: 8pt; letter-spacing: 0.06em; text-transform: uppercase;
    color: #64748b; font-weight: 600; margin: 0;
  }
  .field dd { margin: 2pt 0 0 0; color: #0f172a; font-size: 10pt; }

  /* Tables */
  .data-table {
    width: 100%; border-collapse: collapse; margin: 4pt 0 12pt 0;
    font-size: 9pt;
  }
  .data-table th {
    text-align: left; font-weight: 600; padding: 6pt 8pt;
    background: #f1f5f9; border-bottom: 1pt solid #cbd5e1;
    color: #1e293b; font-size: 8.5pt; letter-spacing: 0.04em;
  }
  .data-table td {
    padding: 5pt 8pt; border-bottom: 1pt solid #e2e8f0;
    color: #0f172a; vertical-align: top;
  }
  .data-table-dense td { padding: 3pt 8pt; font-size: 8.5pt; }
  .data-table tr:last-child td { border-bottom: none; }

  /* Badges */
  .badge {
    display: inline-block; padding: 2pt 6pt; border-radius: 3pt;
    font-size: 8pt; font-weight: 600; color: #fff;
    background: #475569;
  }
  .badge-error { background: #b91c1c; }
  .badge-warning { background: #b45309; }
  .badge-info { background: #4f46e5; }

  /* Risk card */
  .risk-card {
    display: flex; gap: 16pt; align-items: flex-start;
    padding: 14pt; background: #f8fafc;
    border: 1pt solid #e2e8f0; border-radius: 4pt; margin-bottom: 12pt;
  }
  .risk-tier {
    flex-shrink: 0; padding: 10pt 18pt; border: 2pt solid;
    border-radius: 4pt; font-weight: 700; font-size: 14pt;
    text-transform: uppercase; letter-spacing: 0.05em;
  }
  .risk-basis .label {
    font-size: 8pt; letter-spacing: 0.06em; text-transform: uppercase;
    color: #64748b; font-weight: 600;
  }
  .risk-basis p { margin: 4pt 0 0 0; color: #0f172a; }

  /* Stakeholder cards */
  .stakeholder-card {
    border: 1pt solid #e2e8f0; border-radius: 4pt;
    padding: 10pt; margin-bottom: 8pt; background: #fafafa;
  }
  .stakeholder-head {
    display: flex; gap: 10pt; align-items: baseline;
    margin-bottom: 6pt; flex-wrap: wrap;
  }

  /* Quality scores */
  .score-strip {
    display: flex; gap: 16pt; align-items: stretch;
    padding: 14pt; background: #f8fafc;
    border: 1pt solid #e2e8f0; border-radius: 4pt; margin-bottom: 12pt;
  }
  .score-overall {
    flex-shrink: 0; min-width: 90pt; padding: 10pt 14pt;
    background: #4f46e5; color: #fff; border-radius: 4pt; text-align: center;
  }
  .score-overall .label { font-size: 8pt; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.85; }
  .score-overall .value { font-size: 22pt; font-weight: 700; margin-top: 2pt; }
  .score-grid {
    flex: 1; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8pt;
  }
  .score-grid .dim {
    background: #fff; border: 1pt solid #e2e8f0; border-radius: 3pt; padding: 6pt 8pt;
  }
  .score-grid .dim .label {
    font-size: 7.5pt; letter-spacing: 0.04em; text-transform: uppercase;
    color: #64748b; font-weight: 600;
  }
  .score-grid .dim .value {
    font-size: 14pt; font-weight: 700; color: #0f172a; margin-top: 2pt;
  }
`;

// ── Public ─────────────────────────────────────────────────────────────────

export function evidencePackageHTML(pkg: EvidencePackagePDFInput): string {
  const { mrmReport: r } = pkg;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Evidence Package — ${esc(r.cover.agentName)} v${esc(r.cover.currentVersion)}</title>
  <style>${STYLES}</style>
</head>
<body>
  ${renderCover(pkg)}
  ${renderRiskClassification(r)}
  ${renderIdentityAndCapabilities(r)}
  ${renderGovernanceValidation(r)}
  ${renderReviewAndSod(r)}
  ${renderDeploymentAndLineage(r)}
  ${renderAuditChain(r)}
  ${renderStakeholders(r)}
  ${renderRegulatoryFrameworks(r)}
  ${renderWorkflowAndPeriodic(r)}
  ${renderApprovalChain(pkg)}
  ${renderQualityEval(pkg)}
  ${renderTestEvidence(pkg)}
</body>
</html>`;
}

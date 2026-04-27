/**
 * Local PDF renderer smoke (Session 175).
 *
 * Bypasses the production HTTP route (auth gated, no operator credentials
 * available) and exercises the renderer module directly against a local
 * blueprint. Validates: HTML template assembly + Chromium launch + PDF
 * generation. Does NOT validate: @sparticuz/chromium-min binary fetch path
 * (only kicks in when VERCEL or AWS_LAMBDA_FUNCTION_NAME is set) — that gap
 * stays with SCRUM-47.
 *
 * Run from src/:
 *   npx tsx __smoke__/render-evidence.ts
 *
 * Outputs (paths relative to repo root):
 *   - samples/smoke/evidence-package-local-{blueprintId-short}-{timestamp}.pdf
 *   - stdout: JSON summary (final line)
 *
 * Audit row inserted with actor.role = "system" and payload.source =
 * "local-smoke-script" so it is distinguishable from real UI exports.
 */

import { writeFileSync } from "node:fs";
import path from "node:path";
import { db } from "@/lib/db";
import {
  agentBlueprints,
  blueprintQualityScores,
  blueprintTestRuns,
} from "@/lib/db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { assembleMRMReport } from "@/lib/mrm/report";
import {
  renderEvidencePDF,
  evidencePackageFilename,
} from "@/lib/pdf/render-evidence";
import type { EvidencePackagePDFInput } from "@/lib/pdf/evidence-template";
import type { ApprovalStepRecord } from "@/lib/settings/types";
import { SAFE_BLUEPRINT_COLUMNS } from "@/lib/db/safe-columns";
import { publishEvent } from "@/lib/events/publish";

const SMOKE_ACTOR_EMAIL = "local-smoke-script@intellios.local";
const SMOKE_SOURCE_LABEL = "local-smoke-script";

async function main() {
  const t0 = Date.now();

  // ── 1. Pick a blueprint ───────────────────────────────────────────────
  // The deterministic-seed blueprints (id starts with "20000000-") carry
  // malformed ABP metadata.id values that fail Zod UUID validation in
  // readABP(). We try real-UUID blueprints first; if any load cleanly via
  // assembleMRMReport, we use it. Status filter is INTENTIONALLY relaxed
  // (renderer is what we're validating; the production route's status gate
  // is structural, not part of this smoke).
  const allBlueprints = await db
    .select(SAFE_BLUEPRINT_COLUMNS)
    .from(agentBlueprints)
    .orderBy(desc(agentBlueprints.updatedAt));

  // Prefer the runbook target (ed34ef1a — Retail-Bank-FAQ-Agent) if present;
  // then any blueprint with a real (non-zero-padded) UUID; then fall through.
  const isRealUuid = (id: string) => !id.startsWith("00000000-") && !id.startsWith("20000000-") && !id.startsWith("30000000-");
  const ranked = [
    ...allBlueprints.filter((b) => b.id === "ed34ef1a-a337-4671-b8a2-6ccb3dd1c787"),
    ...allBlueprints.filter(
      (b) => b.id !== "ed34ef1a-a337-4671-b8a2-6ccb3dd1c787" && isRealUuid(b.id)
    ),
    ...allBlueprints.filter((b) => !isRealUuid(b.id)),
  ];
  if (ranked.length === 0) {
    console.error('No blueprints in local DB. Run `npx tsx scripts/seed.ts` first.');
    process.exit(1);
  }

  let blueprint: (typeof ranked)[number] | null = null;
  let mrmReport: Awaited<ReturnType<typeof assembleMRMReport>> = null;
  const tryFailures: { id: string; name: string | null; reason: string }[] = [];

  for (const cand of ranked) {
    try {
      const r = await assembleMRMReport(cand.id, SMOKE_ACTOR_EMAIL);
      if (r) {
        blueprint = cand;
        mrmReport = r;
        console.error(
          `[smoke] picked blueprint ${cand.id} (${cand.name}, status=${cand.status}, version=${cand.version})`
        );
        break;
      }
      tryFailures.push({ id: cand.id, name: cand.name, reason: "assembleMRMReport returned null" });
    } catch (e) {
      const msg = e instanceof Error ? e.message.split("\n")[0] : String(e);
      tryFailures.push({ id: cand.id, name: cand.name, reason: msg.slice(0, 200) });
      console.error(`[smoke] candidate ${cand.id} (${cand.name}) failed: ${msg.slice(0, 120)}`);
    }
  }

  if (!blueprint || !mrmReport) {
    console.error("[smoke] FAILED — no candidate blueprint could be assembled");
    console.error(JSON.stringify({ tried: tryFailures }, null, 2));
    process.exit(1);
  }

  console.error(`[smoke] mrm assembled (${mrmReport.sections?.length ?? "?"} sections)`);

  // ── 3. Approval chain + quality + test runs (mirror of route.ts) ─────
  const approvalProgress = (blueprint.approvalProgress as ApprovalStepRecord[]) ?? [];

  const qualityScoreRows = await db
    .select()
    .from(blueprintQualityScores)
    .where(eq(blueprintQualityScores.blueprintId, blueprint.id))
    .orderBy(desc(blueprintQualityScores.evaluatedAt))
    .limit(1);
  const qualityScore = qualityScoreRows[0] ?? null;

  const testRunRows = await db
    .select()
    .from(blueprintTestRuns)
    .where(eq(blueprintTestRuns.blueprintId, blueprint.id))
    .orderBy(desc(blueprintTestRuns.startedAt));

  const pkg: EvidencePackagePDFInput = {
    exportMetadata: {
      packageFormatVersion: "1.0",
      exportedAt: new Date().toISOString(),
      exportedBy: SMOKE_ACTOR_EMAIL,
      exportedByRole: "system",
      blueprintId: blueprint.id,
      agentId: blueprint.agentId,
      agentName: blueprint.name ?? "Unnamed Agent",
      blueprintVersion: blueprint.version,
      blueprintStatus: blueprint.status,
    },
    mrmReport,
    approvalChain: {
      stepCount: approvalProgress.length,
      currentStep: blueprint.currentApprovalStep,
      steps: approvalProgress.map((step) => ({
        step: step.step,
        label: step.label,
        role: step.role,
        approvedBy: step.approvedBy,
        decision: step.decision,
        comment: step.comment ?? null,
        approvedAt: step.approvedAt,
      })),
    },
    qualityEvaluation: qualityScore
      ? {
          id: qualityScore.id,
          overallScore:
            qualityScore.overallScore != null ? parseFloat(qualityScore.overallScore) : null,
          dimensions: {
            intentAlignment:
              qualityScore.intentAlignment != null
                ? parseFloat(qualityScore.intentAlignment)
                : null,
            toolAppropriateness:
              qualityScore.toolAppropriateness != null
                ? parseFloat(qualityScore.toolAppropriateness)
                : null,
            instructionSpecificity:
              qualityScore.instructionSpecificity != null
                ? parseFloat(qualityScore.instructionSpecificity)
                : null,
            governanceAdequacy:
              qualityScore.governanceAdequacy != null
                ? parseFloat(qualityScore.governanceAdequacy)
                : null,
            ownershipCompleteness:
              qualityScore.ownershipCompleteness != null
                ? parseFloat(qualityScore.ownershipCompleteness)
                : null,
          },
          flags: (qualityScore.flags as string[]) ?? [],
          evaluatorModel: qualityScore.evaluatorModel,
          evaluatedAt: qualityScore.evaluatedAt.toISOString(),
        }
      : null,
    testEvidence: {
      runCount: testRunRows.length,
      runs: testRunRows.map((run) => ({
        id: run.id,
        status: run.status,
        totalCases: run.totalCases,
        passedCases: run.passedCases,
        failedCases: run.failedCases,
        runBy: run.runBy,
        startedAt: run.startedAt.toISOString(),
        completedAt: run.completedAt?.toISOString() ?? null,
        results: run.testResults,
      })),
    },
  };

  console.error(
    `[smoke] payload built — approval steps=${approvalProgress.length}, ` +
      `quality=${qualityScore ? "present" : "null"}, test runs=${testRunRows.length}`
  );

  // ── 4. Render ─────────────────────────────────────────────────────────
  const tRender0 = Date.now();
  const pdf = await renderEvidencePDF(pkg);
  const renderMs = Date.now() - tRender0;
  console.error(`[smoke] render ok — ${pdf.byteLength} bytes in ${renderMs}ms`);

  // ── 5. Write PDF + filename per route helper ──────────────────────────
  const filename = evidencePackageFilename(blueprint.name, blueprint.version, "pdf");
  const isoTs = new Date().toISOString().replace(/[:.]/g, "-");
  const shortId = blueprint.id.slice(0, 8);
  const repoRoot = path.resolve(__dirname, "..", "..");
  const outPath = path.join(
    repoRoot,
    "samples",
    "smoke",
    `evidence-package-local-${shortId}-${isoTs}.pdf`
  );
  writeFileSync(outPath, pdf);
  console.error(`[smoke] wrote ${outPath}`);

  // ── 6. Audit row ──────────────────────────────────────────────────────
  await publishEvent({
    event: {
      type: "blueprint.evidence_package_exported",
      payload: {
        blueprintId: blueprint.id,
        agentId: blueprint.agentId,
        format: "pdf",
        cached: false,
        source: SMOKE_SOURCE_LABEL,
      },
    },
    actor: { email: SMOKE_ACTOR_EMAIL, role: "system" },
    entity: { type: "blueprint", id: blueprint.id },
    enterpriseId: blueprint.enterpriseId ?? null,
  });
  console.error(`[smoke] audit row written`);

  // ── 7. Final summary as JSON on stdout ────────────────────────────────
  const summary = {
    ok: true,
    blueprint: {
      id: blueprint.id,
      agentId: blueprint.agentId,
      name: blueprint.name,
      status: blueprint.status,
      version: blueprint.version,
      enterpriseId: blueprint.enterpriseId,
    },
    payload: {
      approvalSteps: approvalProgress.length,
      qualityScorePresent: !!qualityScore,
      testRunCount: testRunRows.length,
      mrmSectionCount: mrmReport.sections?.length ?? null,
    },
    render: {
      bytes: pdf.byteLength,
      ms: renderMs,
    },
    output: {
      path: outPath,
      productionFilename: filename,
    },
    elapsedMs: Date.now() - t0,
  };
  console.log(JSON.stringify(summary, null, 2));

  process.exit(0);
}

main().catch((err) => {
  console.error("[smoke] FAILED");
  console.error(err);
  process.exit(1);
});

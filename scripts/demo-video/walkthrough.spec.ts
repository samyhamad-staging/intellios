/**
 * Intellios Demo Video — 8-Stage Walkthrough (Playwright Capture)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * **Purpose:** Drive the Retail Bank Customer-FAQ agent through all eight
 * lifecycle stages against a running dev server + real AWS Bedrock, with
 * video recording enabled at 1920×1080. The resulting `walkthrough.webm`
 * feeds the FFmpeg composition pipeline (`ffmpeg-compose.sh`).
 *
 * **Scope of this file:** SCAFFOLD ONLY (Session 171).
 *   - Single test, no parallelization.
 *   - Eight `test.step()` blocks — one per lifecycle stage + outro.
 *   - Waits are aligned to `narration.md` segment durations so the final
 *     video's beats land on narration phrasing.
 *   - No `expect()` strictness beyond basic progress checks — this is a
 *     capture script, not an assertion suite. A dev-time validation test
 *     (assertion-oriented) lives elsewhere under `src/e2e/`.
 *
 * **Session 170 is the truth source.** Stage order, persona assignments,
 * API paths, expected outputs, and foundation model all derive from
 * `docs/log/2026-04-23_session-170.md` (the 8/8 green walkthrough).
 * Do not rediscover these — see that log.
 *
 * **Persona split** (see `src/lib/db/seed-retail-bank.ts`):
 *   - Marta (architect)  — Stages 1–4: intake, design, validate, submit
 *   - Rafael (reviewer)  — Stages 5–7: approve, deploy, invoke
 *   - Ed (admin)         — Stage 8:    deprecate (UI-gated on admin role;
 *                                       see `src/app/registry/[agentId]/page.tsx:970`)
 *
 * **Prerequisites (all must be green before running):**
 *   1. Dev server on `http://localhost:3000` (`cd src && npm run dev`).
 *   2. Postgres on `localhost:5433` and Redis on `localhost:6379`
 *      (`docker compose up`).
 *   3. `npx tsx scripts/seed-demo.ts` has run against the dev DB — seeds
 *      the `retail-bank-demo` enterprise + three users + three policies.
 *   4. `BEDROCK_EXECUTION_ROLE_ARN` is set on `enterprise_settings` for
 *      `retail-bank-demo` (see `docs/demo/lifecycle-demo.md` Stage 0).
 *   5. AWS credentials (`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`) are
 *      live in `src/.env.local` AND the `intellios-automation-user` has
 *      the `IntelliosBedrockRuntimeInvoke` inline policy (applied in
 *      Session 170 — see that log for policy JSON).
 *   6. The Bedrock agent foundation model
 *      `us.anthropic.claude-haiku-4-5-20251001-v1:0` is an ACTIVE
 *      inference profile in the region (Session 170 finding: LEGACY model
 *      access revocation after 30 days of non-use).
 *   7. Playwright chromium browser installed: `npx playwright install chromium`.
 *   8. `GET /api/healthz` returns 200 with `bedrockCircuit.status === "closed"`.
 *
 * **Environment variables consumed (from the shell or src/.env.local):**
 *   - `PLAYWRIGHT_BASE_URL`        (default: `http://localhost:3000`)
 *   - `DEMO_MARTA_PASSWORD`        (default: `Marta1234!`  — matches seed)
 *   - `DEMO_RAFAEL_PASSWORD`       (default: `Rafael1234!` — matches seed)
 *   - `DEMO_ED_PASSWORD`           (default: `Ed1234!`     — matches seed)
 *   - `DEMO_CHANGE_REF`            (default: `DEMO-CHG-0001`)
 *   - `DEMO_EVIDENCE_DOWNLOAD_DIR` (default: ./scripts/demo-video/output/)
 *
 * **Run command (Session 172 — not now):**
 *   npx playwright test scripts/demo-video/walkthrough.spec.ts \
 *     --config=scripts/demo-video/playwright.config.ts \
 *     --project=chromium --reporter=line
 *
 *   A dedicated `playwright.config.ts` under `scripts/demo-video/` is
 *   expected for Session 172 — the repo's existing `src/playwright.config.ts`
 *   targets `./e2e` and enables `fullyParallel: true`, both of which
 *   conflict with this capture run.
 *
 * **DO NOT RUN THIS FILE IN SESSION 171.** No agents should be created.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { test, expect, type Page } from "@playwright/test";
import path from "node:path";

// ─── Video recording config ──────────────────────────────────────────────────
// 1920×1080 H.264 webm. Written to the test results directory; FFmpeg picks
// up the most recent file. Session 172 should verify the output resolution
// matches the composition pipeline's expectation.
test.use({
  viewport: { width: 1920, height: 1080 },
  video: { mode: "on", size: { width: 1920, height: 1080 } },
  // Human-pace defaults — Playwright's instant clicks look robotic on video.
  actionTimeout: 30_000,
});

test.describe.configure({ mode: "serial" });

// ─── Demo constants — synced with narration.md ───────────────────────────────
const DEMO = {
  // Persona credentials (seed: src/lib/db/seed-retail-bank.ts).
  marta: {
    email: "marta@retailbank.demo",
    password: process.env.DEMO_MARTA_PASSWORD ?? "Marta1234!",
  },
  rafael: {
    email: "rafael@retailbank.demo",
    password: process.env.DEMO_RAFAEL_PASSWORD ?? "Rafael1234!",
  },
  ed: {
    email: "ed@retailbank.demo",
    password: process.env.DEMO_ED_PASSWORD ?? "Ed1234!",
  },

  // Stage 1 intake prompt — verbatim from docs/demo/lifecycle-demo.md §Stage 1.
  intakePrompt:
    "A customer-facing FAQ agent for a retail bank. It should answer questions about branch hours, wire-transfer procedures, and routing numbers. It must never give personalized financial advice or disclose account information. Log every interaction for compliance.",

  // Stage 1 follow-up answers — the intake agent asks 2–3 follow-ups.
  intakeFollowUps: [
    "English only, US-based customers.",
    "Decline anything about accounts, balances, loans, or investment advice.",
    "Pull branch hours and routing info from our public FAQ knowledge source.",
  ],

  // Stage 6 deploy-button change reference.
  changeRef: process.env.DEMO_CHANGE_REF ?? "DEMO-CHG-0001",

  // Stage 7 test-console prompt — verbatim from docs/demo/lifecycle-demo.md §Stage 6.
  testConsolePrompt:
    "What's the routing number for wire transfers at my local branch?",

  // Output directory for the downloaded evidence package JSON.
  evidenceDownloadDir:
    process.env.DEMO_EVIDENCE_DOWNLOAD_DIR ??
    path.resolve(__dirname, "output"),

  // Stage-by-stage pacing (in ms). These align with narration.md's timing
  // table. Update both files together when pacing changes.
  timing: {
    titleCardHold: 2_000, // brief beat after navigation for compositing reference
    stage1IntakeTotal: 75_000,
    stage2GenerationTotal: 60_000,
    stage3ValidationTotal: 40_000,
    stage4SubmitTotal: 30_000,
    stage5ApprovalTotal: 60_000,
    stage6DeployTotal: 75_000, // real Bedrock CreateAgent → PREPARED takes 30–60s on its own
    stage7InvokeTotal: 70_000,
    stage8RetireTotal: 40_000,
    outroEvidenceTotal: 50_000,
    humanPaceClick: 200, // click delay so the mouse cursor is visible on video
    typeDelay: 45,       // per-keystroke delay for intake typing
  },
} as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Login helper — fills /login and waits for navigation off the login page.
 * Reuses patterns from src/e2e/auth.spec.ts for locator robustness.
 */
async function loginAs(
  page: Page,
  user: { email: string; password: string }
): Promise<void> {
  await page.goto("/login");
  await page
    .locator('input[type="email"], input[name="email"]')
    .first()
    .fill(user.email);
  await page.locator('input[type="password"]').first().fill(user.password);
  await page
    .getByRole("button", { name: /sign in|log in|submit/i })
    .first()
    .click({ delay: DEMO.timing.humanPaceClick });
  // Leaves /login on successful auth (middleware redirect to /dashboard or /).
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });
}

/**
 * Switch-user helper — logs out the current session and logs in as the
 * target user. Used at the Marta→Rafael and Rafael→Ed handoffs (Stages 5 and 8).
 *
 * The logout button is in the sidebar user menu; the exact locator may
 * need adjustment for Session 172. If the menu path changes, `/api/auth/signout`
 * can be hit directly via `page.request.post()` as a fallback.
 */
async function switchUser(
  page: Page,
  user: { email: string; password: string }
): Promise<void> {
  // Fallback-safe: clear session cookies, then log in as target.
  await page.context().clearCookies();
  await loginAs(page, user);
}

// ─── The walkthrough ─────────────────────────────────────────────────────────

test("Intellios 8-stage lifecycle walkthrough (demo-v1 capture)", async ({
  page,
}) => {
  // Pre-flight: dev server + health circuit must be green. A failing
  // healthz is a recording blocker — fail fast rather than produce a
  // broken video.
  const healthResp = await page.request.get("/api/healthz");
  expect(healthResp.status(), "GET /api/healthz").toBe(200);
  const health = (await healthResp.json()) as {
    bedrockCircuit?: { status?: string };
  };
  expect(
    health.bedrockCircuit?.status,
    "bedrockCircuit.status must be 'closed' before capture"
  ).toBe("closed");

  // ─── Stage 1 — Intake (Marta) ─────────────────────────────────────────────
  await test.step("Stage 1 — Intake (Marta, architect)", async () => {
    await loginAs(page, DEMO.marta);
    await page.goto("/intake/new");
    await page.waitForTimeout(DEMO.timing.titleCardHold);

    // Primary intake prompt. Human-pace typing — keystroke delay is visible
    // on video and reinforces the "structured conversation" framing.
    const intakeInput = page
      .getByRole("textbox")
      .or(page.locator('textarea, input[type="text"]'))
      .first();
    await intakeInput.fill(""); // clear any placeholder
    await intakeInput.type(DEMO.intakePrompt, { delay: DEMO.timing.typeDelay });

    // Submit first turn. Exact button label can shift between redesigns;
    // match flexibly on "send" | "continue" | "submit".
    await page
      .getByRole("button", { name: /send|continue|submit/i })
      .first()
      .click({ delay: DEMO.timing.humanPaceClick });

    // Stream the intake assistant's follow-up questions. Each follow-up
    // answer is sent after a visible beat so the video shows the agent's
    // structured tool calls landing.
    for (const answer of DEMO.intakeFollowUps) {
      await page.waitForTimeout(6_000);
      await intakeInput.type(answer, { delay: DEMO.timing.typeDelay });
      await page
        .getByRole("button", { name: /send|continue|submit/i })
        .first()
        .click({ delay: DEMO.timing.humanPaceClick });
    }

    // Let the intake engine drive readiness to 100 and the finalize button
    // to enable. Narration covers this pause (see narration.md Stage 1).
    await page.waitForTimeout(8_000);

    // Finalize — transitions intake_session to `finalized`.
    await page
      .getByRole("button", { name: /finalize|complete|done/i })
      .first()
      .click({ delay: DEMO.timing.humanPaceClick });

    // Remaining time in the stage budget for narration + post-finalize UI.
    // NOTE: the total-waitForTimeout scheme is an approximation; Session
    // 172 should measure actual clock time and adjust per-step delays so
    // the stage comes in on its budget.
    await page.waitForTimeout(4_000);
  });

  // ─── Stage 2 — Blueprint Generation (Marta) ───────────────────────────────
  await test.step("Stage 2 — Blueprint Generation (Marta, architect)", async () => {
    // The finalized intake session exposes a "Generate Blueprint" CTA.
    await page
      .getByRole("button", { name: /generate blueprint/i })
      .first()
      .click({ delay: DEMO.timing.humanPaceClick });

    // Generation engine: resilientGenerateObject → Claude → Zod
    // (src/lib/generation/generate.ts). Observed duration ≈ 10–20s.
    // Narration fills the wait.
    await page.waitForURL(/\/blueprints\/[0-9a-f-]+/i, { timeout: 60_000 });
    await page.waitForTimeout(DEMO.timing.stage2GenerationTotal - 25_000);

    // Scroll Blueprint Workbench to show the ABP sections on camera.
    await page.evaluate(() => window.scrollBy({ top: 400, behavior: "smooth" }));
    await page.waitForTimeout(5_000);
    await page.evaluate(() => window.scrollBy({ top: 400, behavior: "smooth" }));
    await page.waitForTimeout(5_000);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
    await page.waitForTimeout(5_000);
  });

  // ─── Stage 3 — Governance Validation (Marta) ──────────────────────────────
  await test.step("Stage 3 — Governance Validation (Marta, architect)", async () => {
    await page
      .getByRole("button", { name: /^validate$/i })
      .first()
      .click({ delay: DEMO.timing.humanPaceClick });

    // Validation report panel opens; expected: 3 policies, 0 violations
    // (Session 170 Stage 3 evidence).
    await page.waitForTimeout(8_000);
    // Pause on the report for camera.
    await page.waitForTimeout(DEMO.timing.stage3ValidationTotal - 15_000);
  });

  // ─── Stage 4 — Submit for Review (Marta) ──────────────────────────────────
  await test.step("Stage 4 — Submit for Review (Marta, architect)", async () => {
    await page
      .getByRole("button", { name: /submit for review/i })
      .first()
      .click({ delay: DEMO.timing.humanPaceClick });

    // Status badge transitions draft → in_review. ADR-019 enforces the
    // fresh-validation gate; Stage 3 already validated, so this proceeds.
    await page.waitForTimeout(DEMO.timing.stage4SubmitTotal - 2_000);
  });

  // ─── Stage 5 — Approval (Rafael, reviewer) ────────────────────────────────
  // Capture current blueprint URL before user-switch so Rafael lands on
  // the same blueprint via the review queue.
  const blueprintUrl = page.url();

  await test.step("Stage 5 — Approval (Rafael, reviewer)", async () => {
    await switchUser(page, DEMO.rafael);
    await page.waitForTimeout(2_000);

    // Review queue at /review — Rafael opens the pending blueprint.
    await page.goto("/review");
    await page.waitForTimeout(3_000);

    // Click into the blueprint Marta submitted. Locator looks for a row
    // with the in_review badge; Session 172 may refine this to target by
    // blueprint ID for determinism.
    await page
      .getByRole("link", { name: /review|view/i })
      .first()
      .click({ delay: DEMO.timing.humanPaceClick });
    await page.waitForTimeout(8_000);

    // Scroll to let the camera see the validation report + system instruction
    // + denied-actions list (the review surface).
    await page.evaluate(() => window.scrollBy({ top: 600, behavior: "smooth" }));
    await page.waitForTimeout(10_000);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
    await page.waitForTimeout(3_000);

    // Approve. SOD is enforced server-side (ADR-013) — Rafael ≠ Marta, so
    // this proceeds. Audit row written atomically with status change (ADR-021).
    await page
      .getByRole("button", { name: /^approve$/i })
      .first()
      .click({ delay: DEMO.timing.humanPaceClick });
    await page.waitForTimeout(DEMO.timing.stage5ApprovalTotal - 26_000);
  });

  // ─── Stage 6 — Deploy to AgentCore (Rafael, reviewer) ─────────────────────
  await test.step("Stage 6 — Deploy to AgentCore (Rafael, reviewer)", async () => {
    // Return to the blueprint detail (Rafael should still have access;
    // if the review-queue flow left us there, skip the goto).
    if (!page.url().startsWith(blueprintUrl.split("?")[0])) {
      await page.goto(blueprintUrl);
      await page.waitForTimeout(3_000);
    }

    // Click "Deploy to AgentCore". On the Blueprint detail page this
    // surfaces only for `approved` status.
    await page
      .getByRole("button", { name: /deploy to agentcore/i })
      .first()
      .click({ delay: DEMO.timing.humanPaceClick });
    await page.waitForTimeout(2_000);

    // Change-reference dialog.
    await page
      .getByLabel(/change reference|change ref/i)
      .fill(DEMO.changeRef);
    await page.waitForTimeout(1_500);
    await page
      .getByRole("button", { name: /deploy|confirm/i })
      .first()
      .click({ delay: DEMO.timing.humanPaceClick });

    // POST /api/blueprints/[id]/deploy/agentcore triggers live AWS calls:
    // CreateAgent → CreateAgentActionGroup → PrepareAgent → GetAgent.
    // Observed wall-clock: 30–90s (Session 166/170). Progress indicator
    // cycles CREATING → PREPARING → PREPARED. Narration covers the wait.
    // Poll until status badge reads "deployed" or timeout.
    const deployedBadge = page.getByText(/^deployed$/i).first();
    await expect(deployedBadge).toBeVisible({ timeout: 120_000 });
    await page.waitForTimeout(DEMO.timing.stage6DeployTotal - 50_000);
  });

  // ─── Stage 7 — Invoke / Test Console (Rafael, reviewer) ───────────────────
  // Capture deployed agent URL before going into /registry so we can come
  // back for Stage 8 handoff to Ed.
  let agentUrl: string | null = null;

  await test.step("Stage 7 — Invoke via Test Console (Rafael, reviewer)", async () => {
    // "Open Test Console" button on Blueprint detail navigates to
    // /registry/[agentId]/test.
    await page
      .getByRole("button", { name: /open test console/i })
      .first()
      .click({ delay: DEMO.timing.humanPaceClick });
    await page.waitForURL(/\/registry\/[^/]+\/test/i, { timeout: 20_000 });
    await page.waitForTimeout(4_000);

    // Hold on the "Test harness — not a production runtime" chip so the
    // ADR-027 framing is visible on camera.
    await page.waitForTimeout(5_000);

    // Send the test prompt. Streaming response appears word-by-word.
    const prompt = page
      .getByRole("textbox")
      .or(page.locator('textarea, input[type="text"]'))
      .first();
    await prompt.type(DEMO.testConsolePrompt, { delay: DEMO.timing.typeDelay });
    await page
      .getByRole("button", { name: /send|submit/i })
      .first()
      .click({ delay: DEMO.timing.humanPaceClick });

    // Let the streaming render. Session 170: ~5–15s first-token, then
    // ~10–20s for full response.
    await page.waitForTimeout(25_000);

    // Quick cut to /admin/audit-log to show the `blueprint.test_invoked`
    // row with promptHash visible (ADR-027 guarantee: no transcript).
    // Audit-log view is admin-scoped — in production demo this may require
    // switching to Ed briefly OR the role gating may admit reviewer.
    // Session 172 should confirm Rafael's role can view this route; if not,
    // this navigation should be moved into Stage 8 after Ed logs in.
    // Scaffold choice: attempt with Rafael first; if 403, Session 172
    // relocates to post-Ed-login.
    const auditUrl = new URL("/admin/audit-log", page.url()).toString();
    const auditResp = await page.request.get(auditUrl);
    if (auditResp.status() === 200) {
      await page.goto("/admin/audit-log");
      await page.waitForTimeout(6_000);
    }

    // Grab registry agent URL for the Stage 8 handoff.
    await page.goto("/registry");
    await page.waitForTimeout(3_000);
    // Resolve the most recent deployed agent. Locator refinement expected
    // in Session 172 once the registry row component is finalized.
    const deployedRow = page
      .getByRole("link", { name: /retail.*bank|customer.*faq/i })
      .first();
    await deployedRow.click({ delay: DEMO.timing.humanPaceClick });
    await page.waitForURL(/\/registry\/[^/]+/i, { timeout: 10_000 });
    agentUrl = page.url();
    await page.waitForTimeout(DEMO.timing.stage7InvokeTotal - 45_000);
  });

  // ─── Stage 8 — Retire (Ed, admin) ─────────────────────────────────────────
  await test.step("Stage 8 — Retire (Ed, admin)", async () => {
    await switchUser(page, DEMO.ed);
    await page.waitForTimeout(2_000);

    if (agentUrl) {
      await page.goto(agentUrl);
    } else {
      await page.goto("/registry");
    }
    await page.waitForTimeout(4_000);

    // Admin-only LifecycleControls quick-actions render on the Registry
    // detail page when currentUser.role === "admin"
    // (src/app/registry/[agentId]/page.tsx:970). Click Deprecate.
    await page
      .getByRole("button", { name: /^deprecate$/i })
      .first()
      .click({ delay: DEMO.timing.humanPaceClick });
    await page.waitForTimeout(2_000);

    // Confirmation dialog — LifecycleControls dispatches via the shadcn
    // confirm dialog. Locator names look for a button with text Deprecate
    // inside a role=dialog.
    const dialog = page.getByRole("dialog");
    await dialog
      .getByRole("button", { name: /^deprecate$/i })
      .click({ delay: DEMO.timing.humanPaceClick });

    // retireFromAgentCore() fires in background; PATCH returns immediately.
    // Wait for badge to flip to "deprecated".
    const deprecatedBadge = page.getByText(/^deprecated$/i).first();
    await expect(deprecatedBadge).toBeVisible({ timeout: 20_000 });
    await page.waitForTimeout(5_000);

    // Show the Test Console refusal: "Agent is not invokable: status: deprecated."
    await page.goto(`${page.url().split("?")[0]}/test`);
    await page.waitForTimeout(DEMO.timing.stage8RetireTotal - 20_000);
  });

  // ─── Outro — Evidence Package Export ──────────────────────────────────────
  await test.step("Outro — Evidence Package Export", async () => {
    // Navigate back to the blueprint detail — that's where the export button
    // lives (src/app/blueprints/[id]/page.tsx:1339). Rafael's approved/deployed
    // blueprint would still carry the button; for deprecated we fall back to
    // the Registry detail page's DownloadEvidenceButton (line 1275) which
    // hits /api/blueprints/[id]/export/compliance.
    //
    // Ed (admin) can read either surface. Using the Registry path here so
    // the user flow reads as "Ed checks the evidence on the retired agent."
    if (agentUrl) {
      await page.goto(agentUrl);
    } else {
      await page.goto("/registry");
    }
    await page.waitForTimeout(3_000);

    // Scroll to the MRM section which hosts DownloadEvidenceButton.
    await page.evaluate(() =>
      window.scrollBy({ top: 1_200, behavior: "smooth" })
    );
    await page.waitForTimeout(5_000);

    // Trigger the download. Playwright intercepts via the downloads event.
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 15_000 }),
      page
        .getByRole("button", { name: /export evidence|download evidence/i })
        .first()
        .click({ delay: DEMO.timing.humanPaceClick }),
    ]);

    // Save the evidence JSON so FFmpeg can render its contents as an overlay
    // later if Session 172 decides to show the raw structure on screen.
    const savedPath = path.join(
      DEMO.evidenceDownloadDir,
      download.suggestedFilename()
    );
    await download.saveAs(savedPath);

    // Open the downloaded JSON in a new tab so the video shows the 14-section
    // structure directly. Chromium renders raw JSON with a collapsible tree.
    const fileUrl = `file://${savedPath.replace(/\\/g, "/")}`;
    const jsonTab = await page.context().newPage();
    await jsonTab.goto(fileUrl);
    await jsonTab.waitForTimeout(4_000);

    // Let the camera linger on the JSON structure while narration wraps.
    await jsonTab.waitForTimeout(DEMO.timing.outroEvidenceTotal - 22_000);

    await jsonTab.close();
  });

  // Final beat for the outro title card to land on camera. The FFmpeg
  // composition step appends the outro.svg card after walkthrough.webm —
  // this tail-pause is just so the last frame of the webm isn't a
  // mid-animation cut.
  await page.waitForTimeout(2_000);
});

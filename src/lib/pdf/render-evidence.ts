/**
 * Evidence-package PDF renderer.
 *
 * Headless Chromium via `playwright-core` + `@sparticuz/chromium-min`.
 *
 * Why this stack:
 *   - Reuses the HTML template at `src/lib/pdf/evidence-template.ts` rather
 *     than maintaining a parallel pdf-lib layout. ADR-015 Option 2.
 *   - `@sparticuz/chromium-min` keeps the serverless function under Vercel's
 *     250MB limit by loading the Chromium binary from a hosted URL on cold
 *     start (configured via `CHROMIUM_REMOTE_EXECUTABLE_URL`).
 *   - `playwright-core` is the browser-launch surface only — no full Playwright
 *     test runtime is bundled.
 *
 * Determinism is ensured by S3 caching at `evidence/{id}/{version}.pdf` —
 * we render once per blueprint version and serve the cached bytes thereafter.
 *
 * Local development: when `CHROMIUM_REMOTE_EXECUTABLE_URL` is unset, falls
 * back to whatever Chromium is installed locally (Playwright's bundled binary
 * via `@playwright/test`). Production cold-start uses the remote binary.
 *
 * See:
 *   - docs/decisions/015-pdf-rendering-of-evidence-package.md
 *   - docs/open-questions.md (OQ-009 resolved 2026-04-25)
 *   - docs/log/2026-04-25_session-172.md
 */

import { evidencePackageHTML, type EvidencePackagePDFInput } from "./evidence-template";

// ── Types ─────────────────────────────────────────────────────────────────

export interface RenderOptions {
  /**
   * If set, overrides the Chromium executable path resolution. Useful for
   * tests or custom deployments. When unset, the renderer auto-resolves:
   *   1. Production / serverless: `@sparticuz/chromium-min` with
   *      `CHROMIUM_REMOTE_EXECUTABLE_URL`.
   *   2. Local development: Playwright's bundled Chromium.
   */
  executablePath?: string;

  /**
   * Override the running header text. Defaults to the agent name + version.
   */
  headerText?: string;

  /**
   * Wait condition before printing — defaults to "networkidle" so any embedded
   * remote assets (none today, but safe default) finish loading.
   */
  waitUntil?: "load" | "domcontentloaded" | "networkidle" | "commit";
}

// ── Internals ─────────────────────────────────────────────────────────────

const ESCAPE_HTML_FOR_HEADER: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  "\"": "&quot;",
  "'": "&#39;",
};

const headerEscape = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => ESCAPE_HTML_FOR_HEADER[c] ?? c);

interface ChromiumLaunchInputs {
  executablePath: string;
  args: string[];
  headless: boolean;
}

/**
 * Resolves the Chromium binary + launch args.
 *
 *   - In serverless / production: uses `@sparticuz/chromium-min`. The
 *     `CHROMIUM_REMOTE_EXECUTABLE_URL` env var must point to the hosted binary
 *     (typically a public S3 URL of the chromium-pack tarball — see
 *     https://github.com/Sparticuz/chromium#-min for the publishing pattern).
 *   - In local dev / tests: falls through to Playwright's bundled Chromium.
 */
async function resolveChromiumLaunchInputs(
  override?: string
): Promise<ChromiumLaunchInputs> {
  if (override) {
    return { executablePath: override, args: [], headless: true };
  }

  // Vercel / AWS Lambda / serverless detection. `process.env.AWS_LAMBDA_FUNCTION_NAME`
  // is set on Vercel functions (which run on AWS Lambda underneath) and on
  // direct AWS Lambda. We use serverless-tuned chromium-min when it's set.
  const isServerless = !!process.env.AWS_LAMBDA_FUNCTION_NAME || !!process.env.VERCEL;

  if (isServerless) {
    const remoteUrl = process.env.CHROMIUM_REMOTE_EXECUTABLE_URL;
    if (!remoteUrl) {
      throw new Error(
        "CHROMIUM_REMOTE_EXECUTABLE_URL is not set. The serverless evidence-package PDF renderer " +
          "requires @sparticuz/chromium-min to load Chromium from a hosted binary. " +
          "See docs/log/2026-04-25_session-172.md and ADR-015."
      );
    }
    // Dynamic import so this dependency is not bundled when running locally
    // without serverless context (e.g., during Vitest unit tests).
    const sparticuz = await import("@sparticuz/chromium-min");
    const chromium = sparticuz.default ?? sparticuz;
    const executablePath = await chromium.executablePath(remoteUrl);
    return {
      executablePath,
      args: chromium.args,
      headless: chromium.headless,
    };
  }

  // Local dev: rely on Playwright's bundled Chromium. We don't import
  // `@playwright/test` here (that's a devDependency); we rely on the
  // `playwright-core` package picking up its own bundled binary path via
  // the `chromium` channel.
  return {
    executablePath: "",
    args: [],
    headless: true,
  };
}

// ── Public ─────────────────────────────────────────────────────────────────

/**
 * Render the evidence package as a PDF.
 *
 * Returns the raw PDF bytes as a Buffer. Caller is responsible for caching
 * (S3) and content-disposition headers.
 *
 * Throws on any Chromium launch / page navigation / print failure. Callers
 * should wrap in try/catch and surface as an HTTP 500 with a request id.
 */
export async function renderEvidencePDF(
  pkg: EvidencePackagePDFInput,
  opts: RenderOptions = {}
): Promise<Buffer> {
  const { chromium } = await import("playwright-core");

  const launchInputs = await resolveChromiumLaunchInputs(opts.executablePath);

  const browser = await chromium.launch({
    ...(launchInputs.executablePath
      ? { executablePath: launchInputs.executablePath }
      : {}),
    args: launchInputs.args,
    headless: launchInputs.headless,
  });

  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    const html = evidencePackageHTML(pkg);
    await page.setContent(html, {
      waitUntil: opts.waitUntil ?? "networkidle",
    });

    const headerText =
      opts.headerText ??
      `${pkg.mrmReport.cover.agentName} — Evidence Package — v${pkg.mrmReport.cover.currentVersion}`;

    const headerTemplate = `
      <div style="font-size:8pt;color:#475569;width:100%;padding:0 0.7in;display:flex;justify-content:space-between;-webkit-print-color-adjust:exact;">
        <span style="font-weight:600;letter-spacing:0.04em;">INTELLIOS</span>
        <span>${headerEscape(headerText)}</span>
      </div>
    `;
    const footerTemplate = `
      <div style="font-size:8pt;color:#64748b;width:100%;padding:0 0.7in;display:flex;justify-content:space-between;">
        <span>Confidential — Internal Use</span>
        <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
      </div>
    `;

    const pdf = await page.pdf({
      format: "Letter",
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate,
      footerTemplate,
      margin: {
        top: "0.9in",
        right: "0.7in",
        bottom: "0.7in",
        left: "0.7in",
      },
    });

    return pdf;
  } finally {
    await browser.close();
  }
}

// ── Filename helper (used by both JSON and PDF routes) ────────────────────

export function evidencePackageFilename(
  agentName: string | null | undefined,
  version: string | null | undefined,
  ext: "json" | "pdf"
): string {
  const safeName =
    (agentName ?? "agent").replace(/[^a-z0-9]/gi, "-").toLowerCase() ||
    "agent";
  const safeVersion = version ?? "0.0.0";
  const today = new Date().toISOString().slice(0, 10);
  return `evidence-package-${safeName}-v${safeVersion}-${today}.${ext}`;
}

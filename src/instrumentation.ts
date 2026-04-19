/**
 * Next.js instrumentation entry point (ADR-022).
 *
 * Next.js invokes the exported `register()` function exactly once per server
 * runtime on startup. Use this file as the seed for the platform observability
 * floor: emit a single structured boot log so operators can confirm the
 * version / region / pool configuration that a running instance is using, and
 * leave a clear extension point for a future OTel provider.
 *
 * Intentionally minimal for session 149 — no new dependencies. When the team
 * is ready to export traces, the recommended extension is:
 *
 *   // 1. Install:  npm install @vercel/otel
 *   // 2. Inside register(), for nodejs runtime only:
 *   //      const { registerOTel } = await import("@vercel/otel");
 *   //      registerOTel({ serviceName: "intellios-web" });
 *
 * Keeping this file free of OTel imports means the edge runtime still starts
 * cleanly and the bundle is not inflated for teams that have not yet chosen a
 * tracing backend.
 */

export async function register(): Promise<void> {
  // Only run on the server side — Next.js invokes register() on both nodejs
  // and edge runtimes. The boot log is useful on both; guard edge-only code
  // (filesystem, AWS SDK) by checking NEXT_RUNTIME.
  const runtime = process.env.NEXT_RUNTIME ?? "nodejs";

  try {
    // Dynamic import avoids loading the logger on the edge runtime before
    // required env vars are validated.
    const { logger } = await import("./lib/logger");

    logger.info("app.boot", {
      runtime,
      nodeEnv: process.env.NODE_ENV,
      // Vercel injects these automatically on deployments; null locally.
      gitSha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
      region: process.env.VERCEL_REGION ?? process.env.AWS_REGION ?? null,
      // Surface pool config so an operator can confirm ADR-017 is in effect
      // without needing to SSH into a running container.
      dbPoolMax: process.env.DB_POOL_MAX ?? "20 (default)",
      logLevel: process.env.LOG_LEVEL ?? "info (default)",
      pid: typeof process !== "undefined" && "pid" in process ? process.pid : null,
      bootedAt: new Date().toISOString(),
    });
  } catch {
    // Instrumentation must never block startup. Swallow errors silently —
    // a missing boot log is preferable to a crashing process.
  }
}

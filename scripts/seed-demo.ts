/**
 * Retail Bank Customer-FAQ demo seed — runbook prerequisite shim.
 *
 * Thin orchestrator that invokes `src/lib/db/seed-retail-bank.ts` (and the
 * user seed it depends on) inside the `src/` directory so Next.js path
 * aliases (`@/lib/...`) resolve correctly. Mirrors the pattern in
 * `scripts/seed.ts`.
 *
 * What this seeds:
 *   - 3 named demo users (marta / rafael / ed) for the runbook personas
 *   - The `retail-bank-demo` enterprise + single-step approval chain
 *   - 3 governance policies (Customer-Facing Safety, GLBA Privacy, SR 11-7)
 *
 * Idempotent — safe to re-run on every container boot.
 *
 * Usage:
 *   npx tsx scripts/seed-demo.ts                       # from repo root
 *   docker compose exec app npx tsx /app/scripts/seed-demo.ts
 *
 * Companion document: docs/demo/lifecycle-demo.md (8-stage walkthrough).
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

// Load src/.env.local so BEDROCK_EXECUTION_ROLE_ARN (written by
// scripts/provision-bedrock-sandbox.sh) is available to the seed sub-scripts.
const envLocalPath = path.resolve(__dirname, "..", "src", ".env.local");
if (existsSync(envLocalPath)) {
  for (const line of readFileSync(envLocalPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx < 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
    if (!(key in process.env)) process.env[key] = val;
  }
}

// __dirname resolves to scripts/, so the path math is stable regardless of CWD.
const srcDir = path.resolve(__dirname, "..", "src");

function step(label: string, relPath: string): void {
  console.log(`\n▶  ${label}`);
  execSync(`npx tsx ${relPath}`, {
    cwd: srcDir,
    stdio: "inherit",
    // Inherit env so DATABASE_URL (set by docker-compose or the developer's
    // shell) reaches the seed script.
    env: process.env,
  });
}

// seed-users runs the four shared platform demo users (admin/designer/etc).
// We still run it because the retail-bank seed assumes the schema is healthy
// and prefers idempotent layering — re-running this script after a fresh
// `docker compose up` reaches a deterministic state.
step("Platform users    (admin, architect, reviewer, compliance_officer)", "lib/db/seed-users.ts");
step("Retail-Bank demo  (enterprise + 3 personas + 3 policies)",          "lib/db/seed-retail-bank.ts");

console.log("\n✓  Retail-Bank demo seed complete. See docs/demo/lifecycle-demo.md to run the walkthrough.\n");

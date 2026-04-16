/**
 * Development seed orchestrator.
 *
 * Runs the two existing seed scripts in dependency order:
 *   1. seed-users — creates the four demo user accounts
 *   2. seed-demo  — creates the Acme Financial enterprise with governance policies,
 *                   five sample agents across all lifecycle stages, audit events,
 *                   and deployment health records
 *
 * Both scripts are idempotent — rows that already exist are skipped.
 * Safe to run on every `docker compose up`.
 *
 * Usage:
 *   npx tsx scripts/seed.ts                          # from repo root
 *   docker compose exec app npx tsx /app/scripts/seed.ts
 */

import { execSync } from "node:child_process";
import path from "node:path";

// __dirname resolves to the scripts/ directory regardless of CWD,
// so this path calculation is stable whether run locally or in Docker.
const srcDir = path.resolve(__dirname, "..", "src");

function step(label: string, relPath: string): void {
  console.log(`\n▶  ${label}`);
  execSync(`npx tsx ${relPath}`, {
    cwd: srcDir,
    stdio: "inherit",
    // Inherit the current environment so DATABASE_URL and other vars
    // set by docker-compose (or the developer's shell) reach the seed scripts.
    env: process.env,
  });
}

step("Users        (admin, architect, reviewer, compliance_officer)", "lib/db/seed-users.ts");
step("Demo data    (Acme Financial — 5 agents, policies, audit log)", "lib/db/seed-demo.ts");

console.log("\n✓  Dev seed complete.\n");

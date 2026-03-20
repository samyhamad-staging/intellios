/**
 * Run pending SQL migrations against the local database.
 * Usage: npx tsx lib/db/run-migrations.ts [startFrom]
 * Example: npx tsx lib/db/run-migrations.ts 0015
 */

import { readFileSync } from "fs";
import { join } from "path";
import { db } from "./index";
import postgres from "postgres";
import { env } from "@/lib/env";

const MIGRATIONS_DIR = join(import.meta.dirname ?? __dirname, "migrations");

const files = [
  "0000_initial_schema.sql",
  "0001_agent_registry_fields.sql",
  "0002_governance_validator.sql",
  "0003_blueprint_review.sql",
  "0004_multi_tenancy.sql",
  "0005_notifications.sql",
  "0006_intake_context.sql",
  "0007_intake_contributions.sql",
  "0008_deployment_health.sql",
  "0009_enterprise_settings.sql",
  "0010_multi_step_approval.sql",
  "0011_test_harness.sql",
  "0012_webhooks.sql",
  "0013_agentcore_deployment.sql",
  "0014_awareness_system.sql",
  "0015_periodic_review.sql",
  "0016_password_reset.sql",
  "0017_user_invitations.sql",
  "0018_review_reminder_tracking.sql",
  "0019_intake_classification.sql",
  "0020_intake_invitations.sql",
  "0021_intake_ai_insights.sql",
  "0022_intake_confidence.sql",
  "0023_blueprint_lineage.sql",
  // 0024_agent_telemetry — applied via inline script (no .sql file)
  "0025_production_health_columns.sql",
  "0026_alert_thresholds.sql",
  "0027_runtime_violations.sql",
  "0028_quality_trends.sql",
];

const startFrom = process.argv[2];

async function run() {
  const client = postgres(env.DATABASE_URL);
  const toRun = startFrom ? files.filter((f) => f >= startFrom) : files;

  console.log(`Applying ${toRun.length} migration(s)...`);

  for (const file of toRun) {
    const path = join(MIGRATIONS_DIR, file);
    const sql = readFileSync(path, "utf8");
    console.log(`  applying: ${file}`);
    await client.unsafe(sql);
    console.log(`  done`);
  }

  await client.end();
  console.log("All done.");
  process.exit(0);
}

run().catch((e) => {
  console.error("Migration failed:", e.message);
  process.exit(1);
});

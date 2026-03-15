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
  "0015_periodic_review.sql",
  "0016_password_reset.sql",
  "0017_user_invitations.sql",
  "0018_review_reminder_tracking.sql",
  "0019_intake_classification.sql",
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

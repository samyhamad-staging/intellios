import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

// Pool sizing is externalized (ADR-017). The previous hard-coded `max: 1` serialized
// every DB operation on the instance — fatal under any real concurrency.
// Defaults are appropriate for a long-running Node server; lower on serverless.
const client = postgres(env.DATABASE_URL, {
  max: env.DB_POOL_MAX,
  idle_timeout: env.DB_IDLE_TIMEOUT_SEC,
  connect_timeout: env.DB_CONNECT_TIMEOUT_SEC,
  onnotice: () => {}, // silence Postgres NOTICE chatter in logs
});

logger.info("db.pool.init", {
  max: env.DB_POOL_MAX,
  idleTimeoutSec: env.DB_IDLE_TIMEOUT_SEC,
  connectTimeoutSec: env.DB_CONNECT_TIMEOUT_SEC,
});

export const db = drizzle(client, { schema });

import { z } from "zod";

const EnvSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1)
    .refine((v) => v.startsWith("postgresql://") || v.startsWith("postgres://"), {
      message: "DATABASE_URL must be a valid PostgreSQL connection string",
    }),
  ANTHROPIC_API_KEY: z
    .string()
    .min(1)
    .refine((v) => v.startsWith("sk-ant-"), {
      message: "ANTHROPIC_API_KEY must start with 'sk-ant-'",
    }),
  AUTH_SECRET: z.string().min(32, {
    message: "AUTH_SECRET must be at least 32 characters",
  }),
  // Required in production — Bearer token auth on cron routes.
  // Generate with: openssl rand -hex 32
  CRON_SECRET: process.env.NODE_ENV === "production"
    ? z.string().min(1, { message: "CRON_SECRET is required in production to protect cron endpoints" })
    : z.string().optional(),
  // Optional — API key for external agents pushing telemetry data
  TELEMETRY_API_KEY: z.string().optional(),
  // Optional — minimum log level emitted by src/lib/logger.ts (default: "info")
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).optional(),
  // Optional — Redis connection URL for distributed rate limiting (recommended in multi-instance deployments)
  REDIS_URL: z.string().optional(),
  // Optional — S3 bucket name for artifact caching (evidence packages, MRM reports, code exports)
  ARTIFACT_BUCKET: z.string().optional(),
  // Database pool sizing (ADR-017). On serverless (Vercel Functions) each invocation gets its own
  // pool, so 5–10 per invocation is plenty. On long-running Node (Docker/EC2) use 20–40.
  DB_POOL_MAX: z.coerce.number().int().min(1).max(100).default(20),
  DB_IDLE_TIMEOUT_SEC: z.coerce.number().int().min(1).max(600).default(30),
  DB_CONNECT_TIMEOUT_SEC: z.coerce.number().int().min(1).max(60).default(10),
  // Required in production — AES-256 key for encrypting webhook HMAC secrets at rest.
  // Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  SECRETS_ENCRYPTION_KEY: process.env.NODE_ENV === "production"
    ? z
        .string()
        .length(64, { message: "SECRETS_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)" })
        .regex(/^[0-9a-fA-F]{64}$/, { message: "SECRETS_ENCRYPTION_KEY must be a 64-character hex string" })
    : z.string().optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  // Cron batch-runner time budget (ADR-024). Default leaves ~10s headroom under
  // Vercel's 60s function cap. Override per-environment if a run's per-item cost
  // is structurally higher or the function cap differs.
  CRON_BUDGET_MS: z.coerce.number().int().min(1000).max(600000).default(50000),
});

function validateEnv() {
  const result = EnvSchema.safeParse(process.env);

  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  • ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `Missing or invalid environment variables:\n${issues}\n\nCopy .env.example to .env.local and set the required values.`
    );
  }

  return result.data;
}

export const env = validateEnv();

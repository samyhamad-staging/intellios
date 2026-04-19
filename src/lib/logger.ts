/**
 * Structured JSON logger for Intellios.
 *
 * Emits newline-delimited JSON to stdout (info/debug) or stderr (warn/error)
 * so that any log aggregator (Datadog, Loki, CloudWatch Logs Insights, etc.)
 * can ingest and query without a parsing step.
 *
 * Usage:
 *   import { logger } from "@/lib/logger";
 *
 *   // Root logger
 *   logger.info("blueprint.created", { blueprintId, enterpriseId });
 *
 *   // Request-scoped child — binds context to every subsequent call
 *   const log = logger.child({ requestId, userEmail, enterpriseId });
 *   log.error("blueprint.refine.failed", { err: serializeError(err) });
 *
 *   // AI cost tracking (call after each resilientGenerateObject)
 *   logAICall({ operation: "refineBlueprint", modelId, inputTokens, outputTokens, latencyMs, ... });
 *
 * Log level is controlled by the LOG_LEVEL env var (debug | info | warn | error).
 * Defaults to "info". Read directly from process.env to avoid a circular dep
 * with env.ts (which calls validateEnv on import).
 */

// ─── Level hierarchy ─────────────────────────────────────────────────────────

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 } as const;
type LogLevel = keyof typeof LEVELS;

const rawLevel = process.env.LOG_LEVEL ?? "info";
const minLevel: number = LEVELS[rawLevel as LogLevel] ?? LEVELS.info;

// ─── Error serializer ────────────────────────────────────────────────────────

/**
 * Convert an unknown caught value to a plain object safe for JSON.stringify.
 * Stack trace is omitted in production to avoid leaking internals.
 */
export function serializeError(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    return {
      message: err.message,
      name: err.name,
      ...(process.env.NODE_ENV !== "production" && err.stack
        ? { stack: err.stack }
        : {}),
    };
  }
  return { raw: String(err) };
}

// ─── Core emit ───────────────────────────────────────────────────────────────

type Fields = Record<string, unknown>;

function emit(level: LogLevel, msg: string, fields?: Fields): void {
  if (LEVELS[level] < minLevel) return;

  const entry: Record<string, unknown> = {
    ts: new Date().toISOString(),
    level,
    msg,
    ...fields,
  };

  const line = JSON.stringify(entry);
  // warn/error -> stderr, info/debug -> stdout. Using console.* (not
  // process.stderr/stdout) keeps this compatible with the Edge Runtime,
  // where Node stream globals are unavailable.
  if (level === "error" || level === "warn") {
    console.error(line);
  } else {
    console.log(line);
  }
}

// ─── Logger interface ────────────────────────────────────────────────────────

export interface Logger {
  debug(msg: string, fields?: Fields): void;
  info(msg: string, fields?: Fields): void;
  warn(msg: string, fields?: Fields): void;
  error(msg: string, fields?: Fields): void;
  /** Returns a new logger with ctx merged into every subsequent log entry. */
  child(ctx: Fields): Logger;
}

function makeLogger(boundCtx: Fields = {}): Logger {
  return {
    debug: (msg, fields) => emit("debug", msg, { ...boundCtx, ...fields }),
    info:  (msg, fields) => emit("info",  msg, { ...boundCtx, ...fields }),
    warn:  (msg, fields) => emit("warn",  msg, { ...boundCtx, ...fields }),
    error: (msg, fields) => emit("error", msg, { ...boundCtx, ...fields }),
    child: (ctx)         => makeLogger({ ...boundCtx, ...ctx }),
  };
}

/** Root application logger. Bind request context with `.child(...)`. */
export const logger = makeLogger();

// ─── AI cost estimation ───────────────────────────────────────────────────────
//
// USD per million tokens. These are estimates — the authoritative figure is
// your Anthropic billing console. Update this table when pricing changes.
//
// Model key is a substring match against the full model ID string:
//   "claude-sonnet-4-20250514" matches key "claude-sonnet-4"
//   "claude-haiku-4-5-20251001" matches key "claude-haiku-4-5"

const COST_PER_MTOK: Record<string, { input: number; output: number }> = {
  "claude-sonnet-4":  { input: 3.00, output: 15.00 },
  "claude-haiku-4-5": { input: 0.80, output:  4.00 },
};

function estimateCostUsd(
  modelId: string,
  inputTokens: number,
  outputTokens: number
): number | null {
  const key = Object.keys(COST_PER_MTOK).find((k) => modelId.includes(k));
  if (!key) return null;
  const p = COST_PER_MTOK[key];
  return (inputTokens * p.input + outputTokens * p.output) / 1_000_000;
}

// ─── AI call logger ───────────────────────────────────────────────────────────

export interface AICallFields {
  /** Caller-supplied label, e.g. "generateBlueprint", "addRemediationSuggestions". */
  operation: string;
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  /** Optional request context forwarded from the calling route. */
  requestId?: string;
  enterpriseId?: string | null;
  userEmail?: string;
}

/**
 * Emit a structured "ai.call" log entry with token counts and a cost estimate.
 * Call this once per successful generateObject / generateText invocation.
 */
export function logAICall(fields: AICallFields): void {
  const costUsd = estimateCostUsd(
    fields.modelId,
    fields.inputTokens,
    fields.outputTokens
  );

  logger.info("ai.call", {
    operation:    fields.operation,
    model:        fields.modelId,
    inputTokens:  fields.inputTokens,
    outputTokens: fields.outputTokens,
    totalTokens:  fields.inputTokens + fields.outputTokens,
    latencyMs:    fields.latencyMs,
    costUsd,
    ...(fields.requestId    ? { requestId:    fields.requestId    } : {}),
    ...(fields.enterpriseId ? { enterpriseId: fields.enterpriseId } : {}),
    ...(fields.userEmail    ? { userEmail:    fields.userEmail    } : {}),
  });
}

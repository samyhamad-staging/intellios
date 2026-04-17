/**
 * Resilient wrapper around the AI SDK's generateObject.
 *
 * Adds:
 *   - Exponential backoff retry (3 attempts: 1s → 2s → 4s)
 *   - Per-call timeout enforcement (default 120s)
 *   - Structured AI usage logging (tokens, latency, cost estimate)
 *
 * Use this instead of calling generateObject directly in all AI-powered
 * subsystems. Drop-in replacement — same parameters and return type.
 *
 * Retry behaviour:
 *   Retries on all errors (transient network failures, 429 rate limits,
 *   5xx server errors). After 3 failed attempts the final error is re-thrown
 *   so callers can apply their own fallback or surface the failure.
 *
 * Timeout:
 *   Blueprint generation can take 30–60 s. The default 120 s timeout gives
 *   ample headroom while preventing hung requests from blocking indefinitely.
 *   Pass `options.timeoutMs` to override per call-site.
 *
 * Logging:
 *   Each successful call emits an "ai.call" structured log entry with the
 *   model ID, token counts, latency, and a cost estimate (see src/lib/logger.ts).
 *   Pass `options.logContext` to attach requestId / enterpriseId / userEmail.
 */

import { generateObject, type FlexibleSchema } from "ai";
import { logger, logAICall, serializeError } from "@/lib/logger";
import { withBedrockBreaker } from "./circuit-breaker";

// Delay between successive retries: 1 s, 2 s, 4 s
const RETRY_DELAYS_MS = [1_000, 2_000, 4_000] as const;
const DEFAULT_TIMEOUT_MS = 120_000; // 2 minutes

export interface ResilientGenerateOptions {
  timeoutMs?: number;
  /**
   * Optional request context forwarded to the AI usage log entry.
   * operation — caller label shown in logs (e.g. "generateBlueprint")
   */
  logContext?: {
    operation?: string;
    requestId?: string;
    enterpriseId?: string | null;
    userEmail?: string;
  };
}

/**
 * Resilient generateObject — wraps the AI SDK call with retry + timeout.
 *
 * TypeScript note: the generic T flows from params.schema at the call site,
 * preserving full type inference on the returned `object` field.
 */
export async function resilientGenerateObject<SCHEMA extends FlexibleSchema<unknown>>(
  params: Parameters<typeof generateObject<SCHEMA>>[0],
  options?: ResilientGenerateOptions
): Promise<Awaited<ReturnType<typeof generateObject<SCHEMA>>>> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const logCtx = options?.logContext ?? {};
  // Access modelId from the provider model object — LanguageModelV1 always has it.
  const modelId = (params.model as { modelId?: string }).modelId ?? "unknown";
  const operation = logCtx.operation ?? "generateObject";
  let lastError: unknown;

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    const startMs = Date.now();
    try {
      const result = await withBedrockBreaker(modelId, () =>
        Promise.race([
          generateObject(params as Parameters<typeof generateObject>[0]) as ReturnType<typeof generateObject<SCHEMA>>,
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error(`AI call timed out after ${timeoutMs}ms`)),
              timeoutMs
            )
          ),
        ])
      );

      // Log successful call with token usage and cost estimate
      const usage = result.usage;
      if (usage) {
        logAICall({
          operation,
          modelId,
          inputTokens:  usage.inputTokens ?? 0,
          outputTokens: usage.outputTokens ?? 0,
          latencyMs:    Date.now() - startMs,
          requestId:    logCtx.requestId,
          enterpriseId: logCtx.enterpriseId,
          userEmail:    logCtx.userEmail,
        });
      }

      return result;
    } catch (err) {
      lastError = err;

      if (attempt < RETRY_DELAYS_MS.length) {
        const delay = RETRY_DELAYS_MS[attempt];
        logger.warn("ai.retry", {
          operation,
          model:    modelId,
          attempt:  attempt + 1,
          delayMs:  delay,
          err:      serializeError(err),
          requestId: logCtx.requestId,
        });
        await new Promise<void>((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // All attempts exhausted — propagate the last error to the caller
  throw lastError;
}

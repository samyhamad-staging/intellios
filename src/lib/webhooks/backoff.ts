/**
 * Webhook retry backoff + error classification (ADR-026 / H4).
 *
 * Two concerns, intentionally in one module:
 *
 *   - `classifyError` decides *why* a delivery failed and whether the class is
 *     retryable. Outbound HTTP has five realistic failure shapes (abort,
 *     network, 5xx, 4xx, 4xx-that-should-retry), and collapsing them here
 *     keeps deliver.ts + retries cron from each growing their own switch.
 *
 *   - `nextBackoffMs` answers "when should the retry cron pick this row up?"
 *     The schedule is hardcoded on purpose — see ADR-026 section 2. An
 *     operator reading `attempts=4, next_attempt_at=<time>` should be able to
 *     cross-reference the literal array without re-deriving the math.
 *
 * Jitter is ±20% uniform, applied per-call so a burst of deliveries scheduled
 * in the same second fan out rather than thundering-herd.
 */

export type ErrorClass =
  | "network"           // TCP/DNS/TLS failure, no HTTP response
  | "timeout"           // AbortSignal fired
  | "http_5xx"          // 500-599
  | "http_4xx"          // 400-499 excluding 408/429 (non-retryable)
  | "webhook_inactive"; // parent webhook deleted or deactivated between attempts

/**
 * Retry schedule in milliseconds, indexed by *next* attempt number (1-based
 * excluding the inline attempt).
 *
 *   attempts=1 failed → delay BACKOFF_SCHEDULE_MS[0] until attempt 2 (~1 min)
 *   attempts=2 failed → delay BACKOFF_SCHEDULE_MS[1] until attempt 3 (~5 min from last)
 *   ...
 *   attempts=6 failed → delay BACKOFF_SCHEDULE_MS[5] until attempt 7 (~24 h from last)
 *
 * Total window before DLQ (no jitter): ~35h 36m after the first failure.
 */
export const BACKOFF_SCHEDULE_MS: readonly number[] = [
  60_000,        // 1 min
  5 * 60_000,    // 5 min
  30 * 60_000,   // 30 min
  2 * 3_600_000, // 2 h
  8 * 3_600_000, // 8 h
  24 * 3_600_000, // 24 h
];

export const JITTER_MIN = 0.8;
export const JITTER_MAX = 1.2;

/**
 * Compute the delay in ms before the next retry, given how many attempts have
 * already completed (including the inline attempt).
 *
 *   completedAttempts=1 → delay before attempt 2
 *   completedAttempts=2 → delay before attempt 3
 *   ...
 *
 * Returns `null` when there is no next attempt — the caller should transition
 * the delivery to status='dlq'. This is the exhaustion signal.
 *
 * `rand` is injected to keep tests deterministic; production passes Math.random.
 */
export function nextBackoffMs(
  completedAttempts: number,
  maxAttempts: number,
  rand: () => number = Math.random
): number | null {
  if (completedAttempts >= maxAttempts) return null;
  const idx = completedAttempts - 1;
  // Defensive: if somehow completedAttempts=0 (shouldn't happen — the inline
  // attempt always runs first), fall through to idx=0 so the first retry still
  // schedules. If maxAttempts exceeds the schedule, clamp to the final step.
  const safeIdx = Math.max(0, Math.min(idx, BACKOFF_SCHEDULE_MS.length - 1));
  const base = BACKOFF_SCHEDULE_MS[safeIdx];
  const jitter = JITTER_MIN + rand() * (JITTER_MAX - JITTER_MIN);
  return Math.round(base * jitter);
}

/**
 * Classify the outcome of a delivery attempt.
 *
 * Two shapes of input:
 *   - fetch resolved with a non-OK Response → pass { response }
 *   - fetch rejected (network, DNS, TLS, abort) → pass { error }
 *
 * Exactly one of `response`/`error` should be set; the function is permissive
 * about both being provided (response wins) to simplify call sites.
 */
export function classifyError(args: {
  response?: { status: number } | null;
  error?: unknown;
}): ErrorClass {
  if (args.response) {
    const status = args.response.status;
    if (status >= 500 && status <= 599) return "http_5xx";
    if (status >= 400 && status <= 499) return "http_4xx";
    // 1xx/2xx/3xx shouldn't reach here — caller should have treated 2xx/3xx
    // (response.ok is true for 200-299; redirects are auto-followed) as
    // success. Default to 5xx so the delivery retries rather than sticking.
    return "http_5xx";
  }

  const err = args.error;
  if (err && typeof err === "object") {
    const name = (err as { name?: unknown }).name;
    // AbortSignal.timeout() throws a TimeoutError (DOMException in Node 20+).
    if (name === "TimeoutError" || name === "AbortError") return "timeout";
    const cause = (err as { cause?: unknown }).cause;
    if (cause && typeof cause === "object") {
      const causeName = (cause as { name?: unknown }).name;
      if (causeName === "TimeoutError" || causeName === "AbortError") return "timeout";
    }
  }
  return "network";
}

/**
 * Is this error class worth retrying? See ADR-026 table.
 *
 * 408 (Request Timeout) and 429 (Too Many Requests) are special-cased: the
 * class is `http_4xx` but the *status* says the request was valid and will
 * succeed on retry. Everything else in 400-499 is a subscriber configuration
 * problem — retrying buries signal under silent reattempts.
 */
export function isRetryable(errorClass: ErrorClass, httpStatus?: number | null): boolean {
  if (errorClass === "webhook_inactive") return false;
  if (errorClass === "network") return true;
  if (errorClass === "timeout") return true;
  if (errorClass === "http_5xx") return true;
  if (errorClass === "http_4xx") {
    return httpStatus === 408 || httpStatus === 429;
  }
  return false;
}

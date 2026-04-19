import { NextResponse } from "next/server";
import { CircuitOpenError } from "./ai/circuit-breaker";

export const ErrorCode = {
  BAD_REQUEST: "BAD_REQUEST",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  INVALID_STATE: "INVALID_STATE",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  AI_ERROR: "AI_ERROR",
  AI_RATE_LIMIT: "AI_RATE_LIMIT",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  AGENTCORE_NOT_CONFIGURED: "AGENTCORE_NOT_CONFIGURED",
  AGENTCORE_DEPLOY_FAILED: "AGENTCORE_DEPLOY_FAILED",
  // ADR-027 — Test Console invocation attempted on a blueprint that is not
  // currently in the `deployed` state, or whose deployment record is missing
  // AgentCore identifiers. Returned as 409 to distinguish "state problem"
  // from "runtime problem" (AGENTCORE_INVOKE_FAILED, 502).
  AGENT_NOT_DEPLOYED: "AGENT_NOT_DEPLOYED",
  // ADR-027 — live InvokeAgent call against Bedrock failed (network, 5xx,
  // stream error). Returned as 502 — upstream runtime failure, not an
  // Intellios-side state or config issue.
  AGENTCORE_INVOKE_FAILED: "AGENTCORE_INVOKE_FAILED",
  // ADR-019 — blueprint approval blocked by unresolved error-severity governance
  // violations. Distinct from INVALID_STATE (which covers lifecycle-state conflicts)
  // so the reviewer UI can render a violation-specific remediation experience.
  GOVERNANCE_BLOCKED: "GOVERNANCE_BLOCKED",
  // C4 — per-enterprise rate or daily-token budget exceeded. Distinct from the
  // 429 returned by per-user rate limiting so tenants see a clear budget signal.
  BUDGET_EXCEEDED: "BUDGET_EXCEEDED",
  // ADR-023 — Bedrock circuit breaker is open for the requested model. Surfaced
  // as 503 with a Retry-After hint so clients (and load balancers) can back off
  // gracefully during sustained AI-layer outages.
  SERVICE_DEGRADED: "SERVICE_DEGRADED",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

const STATUS: Record<ErrorCode, number> = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INVALID_STATE: 422,
  VALIDATION_ERROR: 422,
  AI_ERROR: 502,
  AI_RATE_LIMIT: 429,
  INTERNAL_ERROR: 500,
  AGENTCORE_NOT_CONFIGURED: 400,
  AGENTCORE_DEPLOY_FAILED: 502,
  AGENT_NOT_DEPLOYED: 409,
  AGENTCORE_INVOKE_FAILED: 502,
  GOVERNANCE_BLOCKED: 409,
  BUDGET_EXCEEDED: 429,
  SERVICE_DEGRADED: 503,
};

export interface ApiErrorBody {
  code: ErrorCode;
  message: string;
  requestId?: string;
  details?: unknown;
}

export function apiError(
  code: ErrorCode,
  message: string,
  details?: unknown,
  requestId?: string,
  extraHeaders?: Record<string, string>
): NextResponse<ApiErrorBody> {
  const body: ApiErrorBody = {
    code,
    message,
    ...(requestId ? { requestId } : {}),
    ...(details ? { details } : {}),
  };
  const headers: Record<string, string> = { ...(extraHeaders ?? {}) };
  if (requestId) headers["x-request-id"] = requestId;
  return NextResponse.json(body, {
    status: STATUS[code],
    headers: Object.keys(headers).length > 0 ? headers : undefined,
  });
}

/** Inspect an unknown thrown value and return the appropriate AI error response. */
export function aiError(error: unknown, requestId?: string): NextResponse<ApiErrorBody> {
  // ADR-023 — circuit-open errors surface as 503 with Retry-After rather than 502.
  if (error instanceof CircuitOpenError) {
    const retryAfterSeconds = Math.max(1, Math.ceil(error.retryAfterMs / 1000));
    return apiError(
      ErrorCode.SERVICE_DEGRADED,
      "AI service temporarily unavailable — circuit breaker open. Please retry shortly.",
      {
        modelId: error.modelId,
        retryAfterMs: error.retryAfterMs,
        nextProbeAt: error.nextProbeAt,
      },
      requestId,
      { "Retry-After": String(retryAfterSeconds) }
    );
  }

  const message = error instanceof Error ? error.message : String(error);

  // Anthropic SDK surfaces rate limits as 429 status errors
  if (message.includes("429") || message.toLowerCase().includes("rate limit")) {
    return apiError(ErrorCode.AI_RATE_LIMIT, "Claude API rate limit reached. Please try again shortly.", undefined, requestId);
  }
  // Auth / key errors
  if (message.includes("401") || message.toLowerCase().includes("authentication")) {
    return apiError(ErrorCode.AI_ERROR, "Claude API authentication failed. Check ANTHROPIC_API_KEY.", undefined, requestId);
  }
  // Timeout / network
  if (message.toLowerCase().includes("timeout") || message.toLowerCase().includes("network")) {
    return apiError(ErrorCode.AI_ERROR, "Claude API request timed out. Please try again.", undefined, requestId);
  }

  return apiError(ErrorCode.AI_ERROR, "Claude API request failed.", message, requestId);
}

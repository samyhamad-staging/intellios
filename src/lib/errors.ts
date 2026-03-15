import { NextResponse } from "next/server";

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
  requestId?: string
): NextResponse<ApiErrorBody> {
  const body: ApiErrorBody = {
    code,
    message,
    ...(requestId ? { requestId } : {}),
    ...(details ? { details } : {}),
  };
  const headers = requestId ? { "x-request-id": requestId } : undefined;
  return NextResponse.json(body, { status: STATUS[code], headers });
}

/** Inspect an unknown thrown value and return the appropriate AI error response. */
export function aiError(error: unknown, requestId?: string): NextResponse<ApiErrorBody> {
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

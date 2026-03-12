import { NextResponse } from "next/server";

export const ErrorCode = {
  BAD_REQUEST: "BAD_REQUEST",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  INVALID_STATE: "INVALID_STATE",
  AI_ERROR: "AI_ERROR",
  AI_RATE_LIMIT: "AI_RATE_LIMIT",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

const STATUS: Record<ErrorCode, number> = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INVALID_STATE: 422,
  AI_ERROR: 502,
  AI_RATE_LIMIT: 429,
  INTERNAL_ERROR: 500,
};

export interface ApiErrorBody {
  code: ErrorCode;
  message: string;
  details?: unknown;
}

export function apiError(
  code: ErrorCode,
  message: string,
  details?: unknown
): NextResponse<ApiErrorBody> {
  return NextResponse.json({ code, message, ...(details ? { details } : {}) }, { status: STATUS[code] });
}

/** Inspect an unknown thrown value and return the appropriate AI error response. */
export function aiError(error: unknown): NextResponse<ApiErrorBody> {
  const message = error instanceof Error ? error.message : String(error);

  // Anthropic SDK surfaces rate limits as 429 status errors
  if (message.includes("429") || message.toLowerCase().includes("rate limit")) {
    return apiError(ErrorCode.AI_RATE_LIMIT, "Claude API rate limit reached. Please try again shortly.");
  }
  // Auth / key errors
  if (message.includes("401") || message.toLowerCase().includes("authentication")) {
    return apiError(ErrorCode.AI_ERROR, "Claude API authentication failed. Check ANTHROPIC_API_KEY.");
  }
  // Timeout / network
  if (message.toLowerCase().includes("timeout") || message.toLowerCase().includes("network")) {
    return apiError(ErrorCode.AI_ERROR, "Claude API request timed out. Please try again.");
  }

  return apiError(ErrorCode.AI_ERROR, "Claude API request failed.", message);
}

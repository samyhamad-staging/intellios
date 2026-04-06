import { describe, it, expect } from "vitest";
import { apiError, aiError, ErrorCode } from "@/lib/errors";

// ── apiError ────────────────────────────────────────────────────────────────

describe("apiError", () => {
  it("returns NextResponse with BAD_REQUEST (400) status", async () => {
    const response = apiError(ErrorCode.BAD_REQUEST, "Invalid input");

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.code).toBe(ErrorCode.BAD_REQUEST);
    expect(body.message).toBe("Invalid input");
  });

  it("returns NextResponse with UNAUTHORIZED (401) status", async () => {
    const response = apiError(ErrorCode.UNAUTHORIZED, "Authentication required");

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.code).toBe(ErrorCode.UNAUTHORIZED);
  });

  it("returns NextResponse with FORBIDDEN (403) status", async () => {
    const response = apiError(ErrorCode.FORBIDDEN, "Access denied");

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.code).toBe(ErrorCode.FORBIDDEN);
  });

  it("returns NextResponse with NOT_FOUND (404) status", async () => {
    const response = apiError(ErrorCode.NOT_FOUND, "Resource not found");

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.code).toBe(ErrorCode.NOT_FOUND);
  });

  it("returns NextResponse with CONFLICT (409) status", async () => {
    const response = apiError(ErrorCode.CONFLICT, "Resource already exists");

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.code).toBe(ErrorCode.CONFLICT);
  });

  it("returns NextResponse with INVALID_STATE (422) status", async () => {
    const response = apiError(ErrorCode.INVALID_STATE, "Invalid state transition");

    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.code).toBe(ErrorCode.INVALID_STATE);
  });

  it("returns NextResponse with VALIDATION_ERROR (422) status", async () => {
    const response = apiError(ErrorCode.VALIDATION_ERROR, "Validation failed");

    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.code).toBe(ErrorCode.VALIDATION_ERROR);
  });

  it("returns NextResponse with AI_ERROR (502) status", async () => {
    const response = apiError(ErrorCode.AI_ERROR, "Claude API failed");

    expect(response.status).toBe(502);
    const body = await response.json();
    expect(body.code).toBe(ErrorCode.AI_ERROR);
  });

  it("returns NextResponse with AI_RATE_LIMIT (429) status", async () => {
    const response = apiError(ErrorCode.AI_RATE_LIMIT, "Rate limit exceeded");

    expect(response.status).toBe(429);
    const body = await response.json();
    expect(body.code).toBe(ErrorCode.AI_RATE_LIMIT);
  });

  it("returns NextResponse with INTERNAL_ERROR (500) status", async () => {
    const response = apiError(ErrorCode.INTERNAL_ERROR, "Internal server error");

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.code).toBe(ErrorCode.INTERNAL_ERROR);
  });

  it("returns NextResponse with AGENTCORE_NOT_CONFIGURED (400) status", async () => {
    const response = apiError(
      ErrorCode.AGENTCORE_NOT_CONFIGURED,
      "AgentCore not configured"
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.code).toBe(ErrorCode.AGENTCORE_NOT_CONFIGURED);
  });

  it("returns NextResponse with AGENTCORE_DEPLOY_FAILED (502) status", async () => {
    const response = apiError(ErrorCode.AGENTCORE_DEPLOY_FAILED, "Deploy failed");

    expect(response.status).toBe(502);
    const body = await response.json();
    expect(body.code).toBe(ErrorCode.AGENTCORE_DEPLOY_FAILED);
  });

  it("includes message in response body", async () => {
    const message = "Something went wrong";
    const response = apiError(ErrorCode.INTERNAL_ERROR, message);

    const body = await response.json();
    expect(body.message).toBe(message);
  });

  it("includes details in response body when provided", async () => {
    const details = { field: "email", issue: "invalid format" };
    const response = apiError(ErrorCode.BAD_REQUEST, "Validation failed", details);

    const body = await response.json();
    expect(body.details).toEqual(details);
  });

  it("excludes details from response body when not provided", async () => {
    const response = apiError(ErrorCode.BAD_REQUEST, "Bad request");

    const body = await response.json();
    expect(body.details).toBeUndefined();
  });

  it("includes requestId in response body when provided", async () => {
    const requestId = "req-12345";
    const response = apiError(ErrorCode.INTERNAL_ERROR, "Error occurred", undefined, requestId);

    const body = await response.json();
    expect(body.requestId).toBe(requestId);
  });

  it("excludes requestId from response body when not provided", async () => {
    const response = apiError(ErrorCode.INTERNAL_ERROR, "Error occurred");

    const body = await response.json();
    expect(body.requestId).toBeUndefined();
  });

  it("includes requestId in response headers when provided", async () => {
    const requestId = "req-67890";
    const response = apiError(ErrorCode.INTERNAL_ERROR, "Error occurred", undefined, requestId);

    expect(response.headers.get("x-request-id")).toBe(requestId);
  });

  it("excludes requestId header when not provided", async () => {
    const response = apiError(ErrorCode.INTERNAL_ERROR, "Error occurred");

    expect(response.headers.get("x-request-id")).toBeNull();
  });

  it("includes both details and requestId when both provided", async () => {
    const details = ["field1: error", "field2: error"];
    const requestId = "req-abc123";
    const response = apiError(
      ErrorCode.BAD_REQUEST,
      "Validation errors",
      details,
      requestId
    );

    const body = await response.json();
    expect(body.details).toEqual(details);
    expect(body.requestId).toBe(requestId);
    expect(response.headers.get("x-request-id")).toBe(requestId);
  });

  it("handles null details gracefully", async () => {
    const response = apiError(ErrorCode.BAD_REQUEST, "Bad request", null);

    const body = await response.json();
    expect(body.details).toBeUndefined();
  });

  it("handles undefined details gracefully", async () => {
    const response = apiError(ErrorCode.BAD_REQUEST, "Bad request", undefined);

    const body = await response.json();
    expect(body.details).toBeUndefined();
  });

  it("handles empty string details", async () => {
    const response = apiError(ErrorCode.BAD_REQUEST, "Bad request", "");

    const body = await response.json();
    expect(body.details).toBeUndefined(); // falsy value excluded
  });

  it("handles complex nested details objects", async () => {
    const details = {
      validation: [
        { field: "email", error: "invalid" },
        { field: "password", error: "too short" },
      ],
      timestamp: "2024-01-01T00:00:00Z",
    };
    const response = apiError(ErrorCode.VALIDATION_ERROR, "Validation failed", details);

    const body = await response.json();
    expect(body.details).toEqual(details);
  });
});

// ── aiError ────────────────────────────────────────────────────────────────

describe("aiError", () => {
  it("returns AI_RATE_LIMIT for 429 status error message", async () => {
    const error = new Error("API error: 429");
    const response = aiError(error);

    expect(response.status).toBe(429);
    const body = await response.json();
    expect(body).toEqual(expect.objectContaining({
      code: ErrorCode.AI_RATE_LIMIT,
    }));
  });

  it("returns AI_RATE_LIMIT for 'rate limit' keyword", () => {
    const error = new Error("You have exceeded your rate limit. Please try again later.");
    const response = aiError(error);

    expect(response.status).toBe(429);
  });

  it("returns AI_RATE_LIMIT case-insensitive for rate limit message", () => {
    const error = new Error("RATE LIMIT EXCEEDED");
    const response = aiError(error);

    expect(response.status).toBe(429);
  });

  it("returns AI_ERROR (502) for 401 authentication error", async () => {
    const error = new Error("API error: 401 Unauthorized");
    const response = aiError(error);

    expect(response.status).toBe(502);
    const body = await response.json();
    expect(body).toEqual(expect.objectContaining({
      code: ErrorCode.AI_ERROR,
      message: "Claude API authentication failed. Check ANTHROPIC_API_KEY.",
    }));
  });

  it("returns AI_ERROR (502) for authentication keyword", async () => {
    const error = new Error("Authentication failed for API key");
    const response = aiError(error);

    expect(response.status).toBe(502);
    const body = await response.json();
    expect(body.message).toContain("authentication");
  });

  it("returns AI_ERROR (502) for timeout message", async () => {
    const error = new Error("Request timeout after 30s");
    const response = aiError(error);

    expect(response.status).toBe(502);
    const body = await response.json();
    expect(body.message).toContain("timed out");
  });

  it("returns AI_ERROR (502) for network error", async () => {
    const error = new Error("Network connection failed");
    const response = aiError(error);

    expect(response.status).toBe(502);
    const body = await response.json();
    expect(body.message).toContain("timed out");
  });

  it("returns generic AI_ERROR (502) for unknown errors", async () => {
    const error = new Error("Something unexpected happened");
    const response = aiError(error);

    expect(response.status).toBe(502);
    const body = await response.json();
    expect(body.code).toBe(ErrorCode.AI_ERROR);
    expect(body.message).toBe("Claude API request failed.");
  });

  it("handles non-Error thrown values", async () => {
    const error = "random string error";
    const response = aiError(error);

    expect(response.status).toBe(502);
    const body = await response.json();
    expect(body.code).toBe(ErrorCode.AI_ERROR);
  });

  it("includes error details in message for generic errors", async () => {
    const error = new Error("Specific error details");
    const response = aiError(error);

    const body = await response.json();
    expect(body.details).toBe("Specific error details");
  });

  it("includes requestId when provided", async () => {
    const error = new Error("API error: 429");
    const requestId = "req-xyz789";
    const response = aiError(error, requestId);

    const body = await response.json();
    expect(body.requestId).toBe(requestId);
    expect(response.headers.get("x-request-id")).toBe(requestId);
  });

  it("handles non-Error object thrown values", async () => {
    const error = { message: "Error object" };
    const response = aiError(error);

    expect(response.status).toBe(502);
    const body = await response.json();
    expect(body.code).toBe(ErrorCode.AI_ERROR);
  });

  it("case-insensitive timeout detection", async () => {
    const error = new Error("Request TIMEOUT occurred");
    const response = aiError(error);

    expect(response.status).toBe(502);
    const body = await response.json();
    expect(body.message).toContain("timed out");
  });

  it("prioritizes 429 rate limit over other error patterns", async () => {
    const error = new Error("429 Rate Limit: timeout occurred");
    const response = aiError(error);

    expect(response.status).toBe(429);
    const body = await response.json();
    expect(body.code).toBe(ErrorCode.AI_RATE_LIMIT);
  });

  it("prioritizes 401 authentication over timeout", async () => {
    const error = new Error("401 Unauthorized: network timeout");
    const response = aiError(error);

    expect(response.status).toBe(502);
    const body = await response.json();
    expect(body.message).toContain("authentication");
  });
});

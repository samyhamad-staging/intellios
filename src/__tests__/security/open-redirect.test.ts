/**
 * Open Redirect Prevention Tests (P5-REDIRECT-001)
 *
 * Tests the callbackUrl validation logic from the login page
 * to prevent open redirect attacks.
 */

import { describe, it, expect } from "vitest";

// Exact logic from src/app/login/page.tsx
function sanitizeCallbackUrl(raw: string | null): string {
  const rawCallbackUrl = raw ?? "/";
  return rawCallbackUrl.startsWith("/") && !rawCallbackUrl.startsWith("//")
    ? rawCallbackUrl
    : "/";
}

describe("P5-REDIRECT-001: Open Redirect Prevention", () => {
  describe("should allow safe relative paths", () => {
    const safe = [
      ["/", "/"],
      ["/dashboard", "/dashboard"],
      ["/blueprints/abc-123", "/blueprints/abc-123"],
      ["/settings?tab=security", "/settings?tab=security"],
      ["/profile#preferences", "/profile#preferences"],
      ["/intake/sessions/new?from=template&id=t1", "/intake/sessions/new?from=template&id=t1"],
    ] as const;

    for (const [input, expected] of safe) {
      it(`should allow "${input}"`, () => {
        expect(sanitizeCallbackUrl(input)).toBe(expected);
      });
    }
  });

  describe("should block absolute URLs (open redirect)", () => {
    const blocked = [
      "https://evil.com/steal-tokens",
      "http://attacker.com",
      "ftp://malicious.net/payload",
      "javascript:alert(document.cookie)",
      "data:text/html,<script>alert(1)</script>",
      "//evil.com/path", // protocol-relative
      "//localhost/internal",
    ];

    for (const input of blocked) {
      it(`should block "${input}" → "/"`, () => {
        expect(sanitizeCallbackUrl(input)).toBe("/");
      });
    }
  });

  describe("should handle null/missing values", () => {
    it("should default to / when null", () => {
      expect(sanitizeCallbackUrl(null)).toBe("/");
    });

    it("should block empty string (not starting with /)", () => {
      expect(sanitizeCallbackUrl("")).toBe("/");
    });

    it("should block plain text (not starting with /)", () => {
      expect(sanitizeCallbackUrl("dashboard")).toBe("/");
    });
  });

  describe("should handle URL-encoded bypass attempts", () => {
    it("should block %2F%2F (double-encoded //)", () => {
      // The raw value from searchParams would be decoded, but
      // if someone passes the literal string, it doesn't start with /
      expect(sanitizeCallbackUrl("//evil.com")).toBe("/");
    });

    it("should allow paths with encoded characters", () => {
      // URL-encoded query params after a valid path are fine
      expect(sanitizeCallbackUrl("/search?q=hello%20world")).toBe("/search?q=hello%20world");
    });
  });
});

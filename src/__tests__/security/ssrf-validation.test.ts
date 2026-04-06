/**
 * SSRF Validation Tests
 *
 * Tests the PRIVATE_HOST_RE regex used in webhook URL validation
 * to prevent Server-Side Request Forgery (SSRF) attacks.
 * Covers P1-SEC-003 and P1-SEC-004 (POST + PATCH validation).
 */

import { describe, it, expect } from "vitest";

// Exact regex from the codebase (updated to handle bracketed IPv6)
const PRIVATE_HOST_RE =
  /^(localhost|127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.|\[?::1\]?|0\.0\.0\.0)/;

function isPrivateHost(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return PRIVATE_HOST_RE.test(host);
  } catch {
    return true; // Invalid URLs are rejected
  }
}

describe("SSRF Validation — PRIVATE_HOST_RE", () => {
  describe("should block private/reserved IP ranges", () => {
    const blockedUrls = [
      "http://localhost/webhook",
      "http://localhost:8080/webhook",
      "http://127.0.0.1/webhook",
      "http://127.0.0.1:3000/webhook",
      "http://127.255.255.255/hook",
      "http://10.0.0.1/webhook",
      "http://10.255.255.255/webhook",
      "http://172.16.0.1/webhook",
      "http://172.16.255.255/webhook",
      "http://172.20.0.1/webhook",
      "http://172.31.0.1/webhook",
      "http://172.31.255.255/webhook",
      "http://192.168.0.1/webhook",
      "http://192.168.1.1/webhook",
      "http://192.168.255.255/webhook",
      "http://169.254.0.1/webhook",
      "http://169.254.169.254/latest/meta-data/", // AWS metadata
      "http://[::1]/webhook",
      "http://0.0.0.0/webhook",
      "http://0.0.0.0:8080/webhook",
    ];

    for (const url of blockedUrls) {
      it(`should block ${url}`, () => {
        expect(isPrivateHost(url)).toBe(true);
      });
    }
  });

  describe("should allow public hosts", () => {
    const allowedUrls = [
      "https://webhook.example.com/api/v1/webhook",
      "https://hooks.slack.com/services/T000/B000/xxxx",
      "https://api.github.com/webhooks",
      "https://us-central1-project.cloudfunctions.net/webhook",
      "https://webhook.site/abc-123",
      "https://203.0.113.1/webhook", // TEST-NET-3 (public)
      "https://8.8.8.8/webhook", // Google DNS (public)
    ];

    for (const url of allowedUrls) {
      it(`should allow ${url}`, () => {
        expect(isPrivateHost(url)).toBe(false);
      });
    }
  });

  describe("should block edge cases and bypass attempts", () => {
    it("should block 172.16.x - 172.31.x range correctly", () => {
      // In range (blocked)
      expect(isPrivateHost("http://172.16.0.1/w")).toBe(true);
      expect(isPrivateHost("http://172.19.0.1/w")).toBe(true);
      expect(isPrivateHost("http://172.25.0.1/w")).toBe(true);
      expect(isPrivateHost("http://172.31.0.1/w")).toBe(true);

      // Out of range (allowed)
      expect(isPrivateHost("http://172.15.0.1/w")).toBe(false);
      expect(isPrivateHost("http://172.32.0.1/w")).toBe(false);
    });

    it("should reject invalid URLs", () => {
      expect(isPrivateHost("not-a-url")).toBe(true);
      expect(isPrivateHost("")).toBe(true);
    });
  });
});

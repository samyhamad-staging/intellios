import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getSlaStatus } from "../config";

describe("getSlaStatus", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 'ok' for non-in_review status", () => {
    expect(getSlaStatus(new Date().toISOString(), "draft")).toBe("ok");
    expect(getSlaStatus(new Date().toISOString(), "approved")).toBe("ok");
    expect(getSlaStatus(new Date().toISOString(), "deployed")).toBe("ok");
  });

  it("returns 'ok' when in_review for less than warn threshold", () => {
    const now = new Date("2026-04-01T12:00:00Z");
    vi.setSystemTime(now);
    // 10 hours ago
    const updatedAt = new Date("2026-04-01T02:00:00Z").toISOString();
    expect(getSlaStatus(updatedAt, "in_review")).toBe("ok");
  });

  it("returns 'warn' when in_review for >= 48 hours but < 72 hours", () => {
    const now = new Date("2026-04-03T12:00:00Z");
    vi.setSystemTime(now);
    // 50 hours ago
    const updatedAt = new Date("2026-04-01T10:00:00Z").toISOString();
    expect(getSlaStatus(updatedAt, "in_review")).toBe("warn");
  });

  it("returns 'alert' when in_review for >= 72 hours", () => {
    const now = new Date("2026-04-05T00:00:00Z");
    vi.setSystemTime(now);
    // 80 hours ago
    const updatedAt = new Date("2026-04-01T16:00:00Z").toISOString();
    expect(getSlaStatus(updatedAt, "in_review")).toBe("alert");
  });

  it("returns 'ok' for future timestamp", () => {
    const now = new Date("2026-04-01T12:00:00Z");
    vi.setSystemTime(now);
    // 1 hour in the future
    const updatedAt = new Date("2026-04-01T13:00:00Z").toISOString();
    expect(getSlaStatus(updatedAt, "in_review")).toBe("ok");
  });

  it("returns 'warn' at exactly 48 hours (inclusive)", () => {
    const now = new Date("2026-04-03T12:00:00Z");
    vi.setSystemTime(now);
    // Exactly 48 hours ago
    const updatedAt = new Date("2026-04-01T12:00:00Z").toISOString();
    expect(getSlaStatus(updatedAt, "in_review")).toBe("warn");
  });

  it("returns 'alert' at exactly 72 hours (inclusive)", () => {
    const now = new Date("2026-04-04T12:00:00Z");
    vi.setSystemTime(now);
    // Exactly 72 hours ago
    const updatedAt = new Date("2026-04-01T12:00:00Z").toISOString();
    expect(getSlaStatus(updatedAt, "in_review")).toBe("alert");
  });
});

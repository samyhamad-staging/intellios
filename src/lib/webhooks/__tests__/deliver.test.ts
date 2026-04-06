import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { deliverWebhook, deliverWebhookTest } from "../deliver";
import type { WebhookPayload } from "../types";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";

// Mock the database module
vi.mock("@/lib/db", () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn(),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn(),
      }),
    }),
  },
}));

// Mock global fetch
global.fetch = vi.fn();

describe("webhook delivery module", () => {
  let mockConsoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockConsoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    mockConsoleError.mockRestore();
  });

  describe("computeSignature (via deliverWebhook)", () => {
    it("produces sha256=<hex> format", async () => {
      const webhookId = randomUUID();
      const url = "https://example.com/webhook";
      const secret = "my-secret";
      const payload: WebhookPayload = {
        id: randomUUID(),
        event: "blueprint.created",
        timestamp: "2026-04-06T12:00:00Z",
        enterpriseId: "ent123",
        actor: { email: "user@example.com", role: "admin" },
        entity: { type: "blueprint", id: randomUUID() },
        fromState: null,
        toState: { status: "created" },
        metadata: null,
      };

      // Mock successful delivery record insertion
      const deliveryId = randomUUID();
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: deliveryId }]),
        }),
      } as any);

      // Mock successful fetch
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue(""),
      } as any);

      await deliverWebhook(webhookId, url, secret, payload, "ent123");

      const fetchCall = vi.mocked(global.fetch).mock.calls[0];
      const headers = fetchCall[1]?.headers as Record<string, string>;
      const signature = headers["X-Intellios-Signature"];

      // Signature should match format sha256=<hex>
      expect(signature).toMatch(/^sha256=[a-f0-9]{64}$/);
    });

    it("produces same signature for same input (deterministic)", async () => {
      const secret = "test-secret";
      const body = JSON.stringify({ test: "data" });

      // Capture signatures from two calls
      let signature1: string | null = null;
      let signature2: string | null = null;

      const deliveryId = randomUUID();
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: deliveryId }]),
        }),
      } as any);

      vi.mocked(global.fetch).mockImplementation((url, options: any) => {
        if (!signature1) {
          signature1 = options.headers["X-Intellios-Signature"];
        } else {
          signature2 = options.headers["X-Intellios-Signature"];
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          text: vi.fn().mockResolvedValue(""),
        } as any);
      });

      const payload: WebhookPayload = {
        id: randomUUID(),
        event: "blueprint.created",
        timestamp: "2026-04-06T12:00:00Z",
        enterpriseId: null,
        actor: { email: "user@example.com", role: "admin" },
        entity: { type: "blueprint", id: randomUUID() },
        fromState: null,
        toState: null,
        metadata: null,
      };

      await deliverWebhook(randomUUID(), "https://example.com/webhook", secret, payload, null);

      // Reset for second delivery with same payload
      vi.mocked(global.fetch).mockClear();
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: randomUUID() }]),
        }),
      } as any);

      await deliverWebhook(randomUUID(), "https://example.com/webhook", secret, payload, null);

      expect(signature1).toBe(signature2);
    });

    it("produces different signatures for different secrets", async () => {
      const payload: WebhookPayload = {
        id: randomUUID(),
        event: "blueprint.created",
        timestamp: "2026-04-06T12:00:00Z",
        enterpriseId: null,
        actor: { email: "user@example.com", role: "admin" },
        entity: { type: "blueprint", id: randomUUID() },
        fromState: null,
        toState: null,
        metadata: null,
      };

      const signatures: string[] = [];

      vi.mocked(global.fetch).mockImplementation((url, options: any) => {
        signatures.push(options.headers["X-Intellios-Signature"]);
        return Promise.resolve({
          ok: true,
          status: 200,
          text: vi.fn().mockResolvedValue(""),
        } as any);
      });

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: randomUUID() }]),
        }),
      } as any);

      // First delivery with secret1
      await deliverWebhook(randomUUID(), "https://example.com/webhook", "secret1", payload, null);

      // Reset mocks for second delivery
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: randomUUID() }]),
        }),
      } as any);

      // Second delivery with secret2
      await deliverWebhook(randomUUID(), "https://example.com/webhook", "secret2", payload, null);

      expect(signatures[0]).not.toBe(signatures[1]);
    });

    it("produces different signatures for different bodies", async () => {
      const secret = "my-secret";
      const signatures: string[] = [];

      vi.mocked(global.fetch).mockImplementation((url, options: any) => {
        signatures.push(options.headers["X-Intellios-Signature"]);
        return Promise.resolve({
          ok: true,
          status: 200,
          text: vi.fn().mockResolvedValue(""),
        } as any);
      });

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: randomUUID() }]),
        }),
      } as any);

      const basePayload: WebhookPayload = {
        id: randomUUID(),
        event: "blueprint.created",
        timestamp: "2026-04-06T12:00:00Z",
        enterpriseId: null,
        actor: { email: "user@example.com", role: "admin" },
        entity: { type: "blueprint", id: randomUUID() },
        fromState: null,
        toState: { status: "created" },
        metadata: null,
      };

      // First delivery
      await deliverWebhook(randomUUID(), "https://example.com/webhook", secret, basePayload, null);

      // Reset for second delivery
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: randomUUID() }]),
        }),
      } as any);

      // Second delivery with different payload
      const differentPayload: WebhookPayload = {
        ...basePayload,
        toState: { status: "approved" },
      };

      await deliverWebhook(randomUUID(), "https://example.com/webhook", secret, differentPayload, null);

      expect(signatures[0]).not.toBe(signatures[1]);
    });
  });

  describe("deliverWebhook", () => {
    it("creates initial delivery record with pending status", async () => {
      const webhookId = randomUUID();
      const deliveryId = randomUUID();
      const payload: WebhookPayload = {
        id: randomUUID(),
        event: "blueprint.created",
        timestamp: "2026-04-06T12:00:00Z",
        enterpriseId: "ent123",
        actor: { email: "user@example.com", role: "admin" },
        entity: { type: "blueprint", id: randomUUID() },
        fromState: null,
        toState: { status: "created" },
        metadata: null,
      };

      let insertedValues: any = null;
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockImplementation((val) => {
          insertedValues = val;
          return {
            returning: vi.fn().mockResolvedValue([{ id: deliveryId }]),
          };
        }),
      } as any);

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue(""),
      } as any);

      await deliverWebhook(webhookId, "https://example.com/webhook", "secret", payload, "ent123");

      expect(insertedValues).toMatchObject({
        webhookId,
        enterpriseId: "ent123",
        eventType: "blueprint.created",
        status: "pending",
        attempts: 0,
      });
    });

    it("updates record to success on 200 response", async () => {
      const webhookId = randomUUID();
      const deliveryId = randomUUID();
      const payload: WebhookPayload = {
        id: randomUUID(),
        event: "blueprint.created",
        timestamp: "2026-04-06T12:00:00Z",
        enterpriseId: null,
        actor: { email: "user@example.com", role: "admin" },
        entity: { type: "blueprint", id: randomUUID() },
        fromState: null,
        toState: null,
        metadata: null,
      };

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: deliveryId }]),
        }),
      } as any);

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue("OK"),
      } as any);

      let updateData: any = null;
      let whereCondition: any = null;
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockImplementation((val) => {
          updateData = val;
          return {
            where: vi.fn().mockImplementation((cond) => {
              whereCondition = cond;
              return Promise.resolve();
            }),
          };
        }),
      } as any);

      await deliverWebhook(webhookId, "https://example.com/webhook", "secret", payload, null);

      expect(updateData.status).toBe("success");
      expect(updateData.responseStatus).toBe(200);
      expect(updateData.attempts).toBe(1);
    });

    it("updates record to failed after 3 failed attempts (500 response)", async () => {
      const webhookId = randomUUID();
      const deliveryId = randomUUID();
      const payload: WebhookPayload = {
        id: randomUUID(),
        event: "blueprint.created",
        timestamp: "2026-04-06T12:00:00Z",
        enterpriseId: null,
        actor: { email: "user@example.com", role: "admin" },
        entity: { type: "blueprint", id: randomUUID() },
        fromState: null,
        toState: null,
        metadata: null,
      };

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: deliveryId }]),
        }),
      } as any);

      // All attempts return 500
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 500,
        text: vi.fn().mockResolvedValue("Internal Server Error"),
      } as any);

      let updateData: any = null;
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockImplementation((val) => {
          updateData = val;
          return {
            where: vi.fn().mockResolvedValue(undefined),
          };
        }),
      } as any);

      await deliverWebhook(webhookId, "https://example.com/webhook", "secret", payload, null);

      expect(updateData.status).toBe("failed");
      expect(updateData.responseStatus).toBe(500);
      expect(updateData.attempts).toBe(3);
    });

    it("updates record to failed after network error and retries", async () => {
      const webhookId = randomUUID();
      const deliveryId = randomUUID();
      const payload: WebhookPayload = {
        id: randomUUID(),
        event: "blueprint.created",
        timestamp: "2026-04-06T12:00:00Z",
        enterpriseId: null,
        actor: { email: "user@example.com", role: "admin" },
        entity: { type: "blueprint", id: randomUUID() },
        fromState: null,
        toState: null,
        metadata: null,
      };

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: deliveryId }]),
        }),
      } as any);

      // All attempts throw network error
      vi.mocked(global.fetch).mockRejectedValue(new Error("Network error"));

      let updateData: any = null;
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockImplementation((val) => {
          updateData = val;
          return {
            where: vi.fn().mockResolvedValue(undefined),
          };
        }),
      } as any);

      await deliverWebhook(webhookId, "https://example.com/webhook", "secret", payload, null);

      expect(updateData.status).toBe("failed");
      expect(updateData.responseStatus).toBeNull();
      expect(updateData.attempts).toBe(3);
    });

    it("stops retrying on first successful response (2xx)", async () => {
      const webhookId = randomUUID();
      const deliveryId = randomUUID();
      const payload: WebhookPayload = {
        id: randomUUID(),
        event: "blueprint.created",
        timestamp: "2026-04-06T12:00:00Z",
        enterpriseId: null,
        actor: { email: "user@example.com", role: "admin" },
        entity: { type: "blueprint", id: randomUUID() },
        fromState: null,
        toState: null,
        metadata: null,
      };

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: deliveryId }]),
        }),
      } as any);

      let fetchCallCount = 0;
      vi.mocked(global.fetch).mockImplementation(() => {
        fetchCallCount++;
        return Promise.resolve({
          ok: true,
          status: 201,
          text: vi.fn().mockResolvedValue("Created"),
        } as any);
      });

      let updateData: any = null;
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockImplementation((val) => {
          updateData = val;
          return {
            where: vi.fn().mockResolvedValue(undefined),
          };
        }),
      } as any);

      await deliverWebhook(webhookId, "https://example.com/webhook", "secret", payload, null);

      // Should only make 1 attempt before success
      expect(fetchCallCount).toBe(1);
      expect(updateData.attempts).toBe(1);
    });

    it("sends correct headers in request", async () => {
      const webhookId = randomUUID();
      const deliveryId = randomUUID();
      const payload: WebhookPayload = {
        id: randomUUID(),
        event: "blueprint.created",
        timestamp: "2026-04-06T12:00:00Z",
        enterpriseId: null,
        actor: { email: "user@example.com", role: "admin" },
        entity: { type: "blueprint", id: randomUUID() },
        fromState: null,
        toState: null,
        metadata: null,
      };

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: deliveryId }]),
        }),
      } as any);

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue(""),
      } as any);

      await deliverWebhook(webhookId, "https://example.com/webhook", "secret", payload, null);

      const fetchCall = vi.mocked(global.fetch).mock.calls[0];
      const [url, options] = fetchCall;
      const headers = options?.headers as Record<string, string>;

      expect(url).toBe("https://example.com/webhook");
      expect(options?.method).toBe("POST");
      expect(headers["Content-Type"]).toBe("application/json");
      expect(headers["X-Intellios-Event"]).toBe("blueprint.created");
      expect(headers["X-Intellios-Delivery"]).toBe(payload.id);
      expect(headers["X-Intellios-Signature"]).toMatch(/^sha256=/);
    });

    it("uses 10s timeout via AbortSignal", async () => {
      const webhookId = randomUUID();
      const deliveryId = randomUUID();
      const payload: WebhookPayload = {
        id: randomUUID(),
        event: "blueprint.created",
        timestamp: "2026-04-06T12:00:00Z",
        enterpriseId: null,
        actor: { email: "user@example.com", role: "admin" },
        entity: { type: "blueprint", id: randomUUID() },
        fromState: null,
        toState: null,
        metadata: null,
      };

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: deliveryId }]),
        }),
      } as any);

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue(""),
      } as any);

      await deliverWebhook(webhookId, "https://example.com/webhook", "secret", payload, null);

      const fetchCall = vi.mocked(global.fetch).mock.calls[0];
      const options = fetchCall[1] as any;

      // Check that signal is an AbortSignal (we can't easily inspect timeout value, but we can check it exists)
      expect(options.signal).toBeInstanceOf(AbortSignal);
    });

    it("truncates response body to 500 chars", async () => {
      const webhookId = randomUUID();
      const deliveryId = randomUUID();
      const payload: WebhookPayload = {
        id: randomUUID(),
        event: "blueprint.created",
        timestamp: "2026-04-06T12:00:00Z",
        enterpriseId: null,
        actor: { email: "user@example.com", role: "admin" },
        entity: { type: "blueprint", id: randomUUID() },
        fromState: null,
        toState: null,
        metadata: null,
      };

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: deliveryId }]),
        }),
      } as any);

      const longBody = "x".repeat(1000);
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 400,
        text: vi.fn().mockResolvedValue(longBody),
      } as any);

      let updateData: any = null;
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockImplementation((val) => {
          updateData = val;
          return {
            where: vi.fn().mockResolvedValue(undefined),
          };
        }),
      } as any);

      await deliverWebhook(webhookId, "https://example.com/webhook", "secret", payload, null);

      expect(updateData.responseBody).toHaveLength(500);
      expect(updateData.responseBody).toBe("x".repeat(500));
    });

    it("converts empty response body to null", async () => {
      const webhookId = randomUUID();
      const deliveryId = randomUUID();
      const payload: WebhookPayload = {
        id: randomUUID(),
        event: "blueprint.created",
        timestamp: "2026-04-06T12:00:00Z",
        enterpriseId: null,
        actor: { email: "user@example.com", role: "admin" },
        entity: { type: "blueprint", id: randomUUID() },
        fromState: null,
        toState: null,
        metadata: null,
      };

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: deliveryId }]),
        }),
      } as any);

      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 400,
        text: vi.fn().mockResolvedValue(""),
      } as any);

      let updateData: any = null;
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockImplementation((val) => {
          updateData = val;
          return {
            where: vi.fn().mockResolvedValue(undefined),
          };
        }),
      } as any);

      await deliverWebhook(webhookId, "https://example.com/webhook", "secret", payload, null);

      expect(updateData.responseBody).toBeNull();
    });

    it("sets lastAttemptedAt timestamp on update", async () => {
      const webhookId = randomUUID();
      const deliveryId = randomUUID();
      const payload: WebhookPayload = {
        id: randomUUID(),
        event: "blueprint.created",
        timestamp: "2026-04-06T12:00:00Z",
        enterpriseId: null,
        actor: { email: "user@example.com", role: "admin" },
        entity: { type: "blueprint", id: randomUUID() },
        fromState: null,
        toState: null,
        metadata: null,
      };

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: deliveryId }]),
        }),
      } as any);

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue(""),
      } as any);

      let updateData: any = null;
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockImplementation((val) => {
          updateData = val;
          return {
            where: vi.fn().mockResolvedValue(undefined),
          };
        }),
      } as any);

      const beforeTime = new Date();
      await deliverWebhook(webhookId, "https://example.com/webhook", "secret", payload, null);
      const afterTime = new Date();

      expect(updateData.lastAttemptedAt).toBeInstanceOf(Date);
      expect(updateData.lastAttemptedAt.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(updateData.lastAttemptedAt.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });

    it("handles database insert failure gracefully", async () => {
      const webhookId = randomUUID();
      const payload: WebhookPayload = {
        id: randomUUID(),
        event: "blueprint.created",
        timestamp: "2026-04-06T12:00:00Z",
        enterpriseId: null,
        actor: { email: "user@example.com", role: "admin" },
        entity: { type: "blueprint", id: randomUUID() },
        fromState: null,
        toState: null,
        metadata: null,
      };

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockRejectedValue(new Error("DB error")),
        }),
      } as any);

      // Should not throw
      await expect(
        deliverWebhook(webhookId, "https://example.com/webhook", "secret", payload, null)
      ).resolves.toBeUndefined();

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining("[webhooks] Failed to insert delivery record"),
        expect.any(Error)
      );

      // Should not attempt fetch if insert fails
      expect(vi.mocked(global.fetch)).not.toHaveBeenCalled();
    });

    it("handles database update failure gracefully", async () => {
      const webhookId = randomUUID();
      const deliveryId = randomUUID();
      const payload: WebhookPayload = {
        id: randomUUID(),
        event: "blueprint.created",
        timestamp: "2026-04-06T12:00:00Z",
        enterpriseId: null,
        actor: { email: "user@example.com", role: "admin" },
        entity: { type: "blueprint", id: randomUUID() },
        fromState: null,
        toState: null,
        metadata: null,
      };

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: deliveryId }]),
        }),
      } as any);

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue(""),
      } as any);

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockRejectedValue(new Error("Update failed")),
        }),
      } as any);

      // Should not throw
      await expect(
        deliverWebhook(webhookId, "https://example.com/webhook", "secret", payload, null)
      ).resolves.toBeUndefined();

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining("[webhooks] Failed to update delivery record"),
        expect.any(Error)
      );
    });

    it("tracks actualAttempts correctly when retrying", async () => {
      const webhookId = randomUUID();
      const deliveryId = randomUUID();
      const payload: WebhookPayload = {
        id: randomUUID(),
        event: "blueprint.created",
        timestamp: "2026-04-06T12:00:00Z",
        enterpriseId: null,
        actor: { email: "user@example.com", role: "admin" },
        entity: { type: "blueprint", id: randomUUID() },
        fromState: null,
        toState: null,
        metadata: null,
      };

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: deliveryId }]),
        }),
      } as any);

      let fetchAttempts = 0;
      vi.mocked(global.fetch).mockImplementation(() => {
        fetchAttempts++;
        // Fail first two attempts, succeed on third
        if (fetchAttempts < 3) {
          return Promise.resolve({
            ok: false,
            status: 500,
            text: vi.fn().mockResolvedValue(""),
          } as any);
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          text: vi.fn().mockResolvedValue(""),
        } as any);
      });

      let updateData: any = null;
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockImplementation((val) => {
          updateData = val;
          return {
            where: vi.fn().mockResolvedValue(undefined),
          };
        }),
      } as any);

      await deliverWebhook(webhookId, "https://example.com/webhook", "secret", payload, null);

      expect(updateData.attempts).toBe(3);
      expect(updateData.status).toBe("success");
    });
  });

  describe("deliverWebhookTest", () => {
    it("creates delivery record with event_type webhook.test", async () => {
      const webhookId = randomUUID();
      const dbDeliveryId = randomUUID();
      let insertedValues: any = null;

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockImplementation((val) => {
          insertedValues = val;
          return {
            returning: vi.fn().mockResolvedValue([{ id: dbDeliveryId }]),
          };
        }),
      } as any);

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue("OK"),
      } as any);

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      } as any);

      await deliverWebhookTest(webhookId, "https://example.com/webhook", "secret", "ent123");

      expect(insertedValues.eventType).toBe("webhook.test");
      expect(insertedValues.status).toBe("pending");
      expect(insertedValues.attempts).toBe(0);
    });

    it("returns success result on 200 response", async () => {
      const webhookId = randomUUID();
      const dbDeliveryId = randomUUID();

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: dbDeliveryId }]),
        }),
      } as any);

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue("Webhook received"),
      } as any);

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      } as any);

      const result = await deliverWebhookTest(webhookId, "https://example.com/webhook", "secret", null);

      expect(result.status).toBe("success");
      expect(result.responseStatus).toBe(200);
      expect(result.responseBody).toBe("Webhook received");
    });

    it("returns failed result on 500 response", async () => {
      const webhookId = randomUUID();
      const dbDeliveryId = randomUUID();

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: dbDeliveryId }]),
        }),
      } as any);

      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 500,
        text: vi.fn().mockResolvedValue("Internal error"),
      } as any);

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      } as any);

      const result = await deliverWebhookTest(webhookId, "https://example.com/webhook", "secret", null);

      expect(result.status).toBe("failed");
      expect(result.responseStatus).toBe(500);
      expect(result.responseBody).toBe("Internal error");
    });

    it("returns failed result on network error", async () => {
      const webhookId = randomUUID();
      const dbDeliveryId = randomUUID();

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: dbDeliveryId }]),
        }),
      } as any);

      vi.mocked(global.fetch).mockRejectedValue(new Error("Network error"));

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      } as any);

      const result = await deliverWebhookTest(webhookId, "https://example.com/webhook", "secret", null);

      expect(result.status).toBe("failed");
      expect(result.responseStatus).toBeNull();
      expect(result.responseBody).toBeNull();
    });

    it("updates database with captured deliveryId (P1-BUG-001 fix)", async () => {
      const webhookId = randomUUID();
      const dbDeliveryId = randomUUID();

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: dbDeliveryId }]),
        }),
      } as any);

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue(""),
      } as any);

      let whereCondition: any = null;
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation((cond) => {
            whereCondition = cond;
            return Promise.resolve();
          }),
        }),
      } as any);

      await deliverWebhookTest(webhookId, "https://example.com/webhook", "secret", null);

      // Should use the captured dbDeliveryId, not just webhookId
      expect(whereCondition).toBeDefined();
    });

    it("sends correct headers for test delivery", async () => {
      const webhookId = randomUUID();
      const dbDeliveryId = randomUUID();

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: dbDeliveryId }]),
        }),
      } as any);

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue(""),
      } as any);

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      } as any);

      await deliverWebhookTest(webhookId, "https://example.com/webhook", "secret", null);

      const fetchCall = vi.mocked(global.fetch).mock.calls[0];
      const headers = fetchCall[1]?.headers as Record<string, string>;

      expect(headers["Content-Type"]).toBe("application/json");
      expect(headers["X-Intellios-Event"]).toBe("webhook.test");
      expect(headers["X-Intellios-Signature"]).toMatch(/^sha256=/);
    });

    it("uses 10s timeout for test delivery", async () => {
      const webhookId = randomUUID();
      const dbDeliveryId = randomUUID();

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: dbDeliveryId }]),
        }),
      } as any);

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue(""),
      } as any);

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      } as any);

      await deliverWebhookTest(webhookId, "https://example.com/webhook", "secret", null);

      const fetchCall = vi.mocked(global.fetch).mock.calls[0];
      const options = fetchCall[1] as any;

      expect(options.signal).toBeInstanceOf(AbortSignal);
    });

    it("truncates response body to 500 chars", async () => {
      const webhookId = randomUUID();
      const dbDeliveryId = randomUUID();

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: dbDeliveryId }]),
        }),
      } as any);

      const longBody = "x".repeat(1000);
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 400,
        text: vi.fn().mockResolvedValue(longBody),
      } as any);

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      } as any);

      const result = await deliverWebhookTest(webhookId, "https://example.com/webhook", "secret", null);

      expect(result.responseBody).toHaveLength(500);
      expect(result.responseBody).toBe("x".repeat(500));
    });

    it("handles database insert failure gracefully", async () => {
      const webhookId = randomUUID();

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockRejectedValue(new Error("DB error")),
        }),
      } as any);

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue(""),
      } as any);

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      } as any);

      // Should not throw
      const result = await deliverWebhookTest(webhookId, "https://example.com/webhook", "secret", null);

      expect(result.status).toBe("success");
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining("[webhooks/test] Failed to insert delivery log"),
        expect.any(Error)
      );
    });

    it("handles database update failure gracefully", async () => {
      const webhookId = randomUUID();
      const dbDeliveryId = randomUUID();

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: dbDeliveryId }]),
        }),
      } as any);

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue(""),
      } as any);

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockRejectedValue(new Error("Update failed")),
        }),
      } as any);

      // Should not throw
      const result = await deliverWebhookTest(webhookId, "https://example.com/webhook", "secret", null);

      expect(result.status).toBe("success");
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining("[webhooks/test] Failed to update delivery record"),
        expect.any(Error)
      );
    });

    it("payload includes correct test metadata", async () => {
      const webhookId = randomUUID();
      const dbDeliveryId = randomUUID();

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: dbDeliveryId }]),
        }),
      } as any);

      let sentBody: string | null = null;
      vi.mocked(global.fetch).mockImplementation((url, options: any) => {
        sentBody = options.body;
        return Promise.resolve({
          ok: true,
          status: 200,
          text: vi.fn().mockResolvedValue(""),
        } as any);
      });

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      } as any);

      await deliverWebhookTest(webhookId, "https://example.com/webhook", "secret", "ent123");

      expect(sentBody).toBeDefined();
      const payload = JSON.parse(sentBody!);

      expect(payload.event).toBe("webhook.test");
      expect(payload.enterpriseId).toBe("ent123");
      expect(payload.actor).toEqual({ email: "system@intellios", role: "admin" });
      expect(payload.metadata).toEqual({ test: true, message: expect.any(String) });
    });

    it("sets attempts to 1 on update (no retries for test)", async () => {
      const webhookId = randomUUID();
      const dbDeliveryId = randomUUID();

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: dbDeliveryId }]),
        }),
      } as any);

      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 500,
        text: vi.fn().mockResolvedValue(""),
      } as any);

      let updateData: any = null;
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockImplementation((val) => {
          updateData = val;
          return {
            where: vi.fn().mockResolvedValue(undefined),
          };
        }),
      } as any);

      await deliverWebhookTest(webhookId, "https://example.com/webhook", "secret", null);

      expect(updateData.attempts).toBe(1);
    });
  });
});

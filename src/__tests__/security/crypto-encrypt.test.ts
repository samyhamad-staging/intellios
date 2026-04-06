/**
 * Tests for AES-256-GCM encryption at rest (CC-7 fix)
 *
 * Tests the encrypt/decrypt round-trip, backward compatibility with
 * plaintext values, error handling, and format correctness.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// We'll test the actual implementation by importing the real module
// but controlling the env variable

describe("Crypto Encrypt Module", () => {
  const VALID_KEY = "a".repeat(64); // 32 bytes hex = valid AES-256 key
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    // Reset module cache so env changes take effect
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  describe("encryptSecret / decryptSecret round-trip", () => {
    it("should encrypt and decrypt back to original plaintext", async () => {
      process.env.SECRETS_ENCRYPTION_KEY = VALID_KEY;
      const { encryptSecret, decryptSecret } = await import("@/lib/crypto/encrypt");

      const plaintext = "my-super-secret-webhook-key-abc123";
      const encrypted = encryptSecret(plaintext);
      const decrypted = decryptSecret(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it("should produce different ciphertext for same plaintext (unique IV)", async () => {
      process.env.SECRETS_ENCRYPTION_KEY = VALID_KEY;
      const { encryptSecret } = await import("@/lib/crypto/encrypt");

      const plaintext = "same-secret";
      const enc1 = encryptSecret(plaintext);
      const enc2 = encryptSecret(plaintext);

      // Different IVs should produce different ciphertext
      expect(enc1).not.toBe(enc2);
    });

    it("should handle empty string", async () => {
      process.env.SECRETS_ENCRYPTION_KEY = VALID_KEY;
      const { encryptSecret, decryptSecret } = await import("@/lib/crypto/encrypt");

      const encrypted = encryptSecret("");
      const decrypted = decryptSecret(encrypted);

      expect(decrypted).toBe("");
    });

    it("should handle long secrets", async () => {
      process.env.SECRETS_ENCRYPTION_KEY = VALID_KEY;
      const { encryptSecret, decryptSecret } = await import("@/lib/crypto/encrypt");

      const longSecret = "x".repeat(1000);
      const encrypted = encryptSecret(longSecret);
      const decrypted = decryptSecret(encrypted);

      expect(decrypted).toBe(longSecret);
    });

    it("should handle unicode characters", async () => {
      process.env.SECRETS_ENCRYPTION_KEY = VALID_KEY;
      const { encryptSecret, decryptSecret } = await import("@/lib/crypto/encrypt");

      const unicodeSecret = "🔐 webhook-key ñ 日本語";
      const encrypted = encryptSecret(unicodeSecret);
      const decrypted = decryptSecret(encrypted);

      expect(decrypted).toBe(unicodeSecret);
    });
  });

  describe("encrypted format", () => {
    it("should produce enc:v1: prefix", async () => {
      process.env.SECRETS_ENCRYPTION_KEY = VALID_KEY;
      const { encryptSecret } = await import("@/lib/crypto/encrypt");

      const encrypted = encryptSecret("test");

      expect(encrypted.startsWith("enc:v1:")).toBe(true);
    });

    it("should have 3 colon-separated parts after prefix (iv:ciphertext:tag)", async () => {
      process.env.SECRETS_ENCRYPTION_KEY = VALID_KEY;
      const { encryptSecret } = await import("@/lib/crypto/encrypt");

      const encrypted = encryptSecret("test");
      const afterPrefix = encrypted.slice("enc:v1:".length);
      const parts = afterPrefix.split(":");

      expect(parts).toHaveLength(3);
      // IV should be 24 hex chars (12 bytes)
      expect(parts[0]).toHaveLength(24);
      // Tag should be 32 hex chars (16 bytes)
      expect(parts[2]).toHaveLength(32);
    });
  });

  describe("backward compatibility with plaintext", () => {
    it("should return plaintext as-is when no encryption key is configured", async () => {
      delete process.env.SECRETS_ENCRYPTION_KEY;
      const { encryptSecret } = await import("@/lib/crypto/encrypt");

      const plaintext = "unencrypted-secret";
      const result = encryptSecret(plaintext);

      expect(result).toBe(plaintext);
    });

    it("should return plaintext as-is when decrypting non-prefixed value", async () => {
      process.env.SECRETS_ENCRYPTION_KEY = VALID_KEY;
      const { decryptSecret } = await import("@/lib/crypto/encrypt");

      const legacyPlaintext = "old-plaintext-webhook-secret";
      const result = decryptSecret(legacyPlaintext);

      expect(result).toBe(legacyPlaintext);
    });

    it("should handle hex strings that look like secrets but aren't encrypted", async () => {
      process.env.SECRETS_ENCRYPTION_KEY = VALID_KEY;
      const { decryptSecret } = await import("@/lib/crypto/encrypt");

      // A random hex string (like existing webhook secrets) should pass through
      const hexSecret = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2";
      const result = decryptSecret(hexSecret);

      expect(result).toBe(hexSecret);
    });
  });

  describe("isEncrypted", () => {
    it("should return true for encrypted values", async () => {
      process.env.SECRETS_ENCRYPTION_KEY = VALID_KEY;
      const { encryptSecret, isEncrypted } = await import("@/lib/crypto/encrypt");

      const encrypted = encryptSecret("test");
      expect(isEncrypted(encrypted)).toBe(true);
    });

    it("should return false for plaintext values", async () => {
      process.env.SECRETS_ENCRYPTION_KEY = VALID_KEY;
      const { isEncrypted } = await import("@/lib/crypto/encrypt");

      expect(isEncrypted("plaintext-secret")).toBe(false);
      expect(isEncrypted("")).toBe(false);
      expect(isEncrypted("abcdef1234567890")).toBe(false);
    });
  });

  describe("error handling", () => {
    it("should reject invalid key length", async () => {
      process.env.SECRETS_ENCRYPTION_KEY = "tooshort";
      const { encryptSecret } = await import("@/lib/crypto/encrypt");

      // Should fall back to plaintext (key rejected as invalid)
      const result = encryptSecret("test");
      expect(result).toBe("test");
    });

    it("should throw when decrypting with no key configured", async () => {
      // First, encrypt with a valid key
      process.env.SECRETS_ENCRYPTION_KEY = VALID_KEY;
      const mod1 = await import("@/lib/crypto/encrypt");
      const encrypted = mod1.encryptSecret("test");

      // Then try to decrypt without a key
      vi.resetModules();
      delete process.env.SECRETS_ENCRYPTION_KEY;
      const mod2 = await import("@/lib/crypto/encrypt");

      expect(() => mod2.decryptSecret(encrypted)).toThrow("SECRETS_ENCRYPTION_KEY not configured");
    });

    it("should throw on malformed encrypted value", async () => {
      process.env.SECRETS_ENCRYPTION_KEY = VALID_KEY;
      const { decryptSecret } = await import("@/lib/crypto/encrypt");

      expect(() => decryptSecret("enc:v1:bad")).toThrow("Malformed encrypted secret");
    });

    it("should throw on tampered ciphertext (GCM authentication failure)", async () => {
      process.env.SECRETS_ENCRYPTION_KEY = VALID_KEY;
      const { encryptSecret, decryptSecret } = await import("@/lib/crypto/encrypt");

      const encrypted = encryptSecret("test");
      // Tamper with the ciphertext (flip a character in the middle)
      const parts = encrypted.split(":");
      const ciphertext = parts[3];
      const tampered = ciphertext[0] === "a" ? "b" + ciphertext.slice(1) : "a" + ciphertext.slice(1);
      parts[3] = tampered;
      const tamperedStr = parts.join(":");

      expect(() => decryptSecret(tamperedStr)).toThrow();
    });
  });
});

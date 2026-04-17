/**
 * AES-256-GCM encryption/decryption for secrets at rest.
 *
 * Used to encrypt webhook HMAC signing secrets before storing them in the
 * database. Unlike API keys (which are one-way bcrypt hashed), webhook
 * secrets must be recoverable because the server needs the plaintext to
 * compute HMAC signatures when delivering webhooks.
 *
 * ## Environment variable
 *
 * `SECRETS_ENCRYPTION_KEY` — a 64-character hex string (32 bytes) used as
 * the AES-256 key. Generate with:
 *
 *   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 *
 * If not set, encryption is disabled and secrets are stored/returned as-is
 * (with a warning logged on first use). This allows gradual rollout without
 * breaking existing deployments.
 *
 * ## Storage format
 *
 * Encrypted values are stored as: `enc:v1:<iv_hex>:<ciphertext_hex>:<tag_hex>`
 *
 * - `enc:v1` — version prefix for future algorithm migration
 * - `iv` — 12-byte initialization vector (unique per encryption)
 * - `ciphertext` — the encrypted data
 * - `tag` — 16-byte GCM authentication tag
 */

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits, recommended for GCM
const TAG_LENGTH = 16; // 128 bits
const PREFIX = "enc:v1:";

let encryptionKey: Buffer | null = null;
let keyWarningLogged = false;

function getKey(): Buffer | null {
  if (encryptionKey) return encryptionKey;

  const hex = process.env.SECRETS_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64 || !/^[0-9a-fA-F]{64}$/.test(hex)) {
    // In production (ADR-018), the env validator rejects boot when the key is
    // unset or malformed — this branch is unreachable there. Kept for tests
    // and local dev, where a warning is still appropriate.
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "SECRETS_ENCRYPTION_KEY is required in production (64 hex chars). This branch should be unreachable — check env.ts validation."
      );
    }
    if (!keyWarningLogged) {
      console.warn(
        "[crypto] SECRETS_ENCRYPTION_KEY not set or invalid (expected 64 hex chars). " +
          "Secrets will be stored in plaintext for dev/test only. Production boot enforces the key via env.ts."
      );
      keyWarningLogged = true;
    }
    return null;
  }

  encryptionKey = Buffer.from(hex, "hex");
  return encryptionKey;
}

/**
 * Encrypt a plaintext secret for storage.
 * Returns the encrypted string in the format `enc:v1:<iv>:<ciphertext>:<tag>`.
 * In dev/test when no key is configured, returns plaintext unchanged.
 * In production, env validation guarantees the key is set (ADR-018).
 */
export function encryptSecret(plaintext: string): string {
  const key = getKey();
  if (!key) return plaintext;

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });

  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${PREFIX}${iv.toString("hex")}:${encrypted.toString("hex")}:${tag.toString("hex")}`;
}

/**
 * Decrypt an encrypted secret from storage.
 * Handles both encrypted (`enc:v1:...`) and legacy plaintext values.
 * If the value is not encrypted (no prefix), returns it as-is.
 */
export function decryptSecret(stored: string): string {
  // Legacy plaintext — return as-is
  if (!stored.startsWith(PREFIX)) return stored;

  const key = getKey();
  if (!key) {
    throw new Error(
      "Cannot decrypt secret: SECRETS_ENCRYPTION_KEY not configured. " +
        "The stored value is encrypted but no key is available to decrypt it."
    );
  }

  const parts = stored.slice(PREFIX.length).split(":");
  if (parts.length !== 3) {
    throw new Error("Malformed encrypted secret: expected format enc:v1:<iv>:<ciphertext>:<tag>");
  }

  const [ivHex, ciphertextHex, tagHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const ciphertext = Buffer.from(ciphertextHex, "hex");
  const tag = Buffer.from(tagHex, "hex");

  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString("utf8");
}

/**
 * Check if a stored value is encrypted.
 */
export function isEncrypted(stored: string): boolean {
  return stored.startsWith(PREFIX);
}

# ADR-018: Hard-Require SECRETS_ENCRYPTION_KEY in Production

**Status:** proposed
**Date:** 2026-04-17
**Supersedes:** (none)

## Context

`src/lib/crypto/encrypt.ts` implements AES-256-GCM encryption for secrets at rest — specifically webhook HMAC signing secrets, which must be recoverable (unlike bcrypt-hashed API keys) because the server re-signs webhook payloads on delivery.

The module's original design allowed `SECRETS_ENCRYPTION_KEY` to be unset: if so, `encryptSecret()` returned plaintext and `decryptSecret()` accepted plaintext pass-through, logging a one-time warning. This was intentional for local development ergonomics and gradual rollout.

Two problems emerged:

1. **Silent plaintext in production is a latent disaster.** If the key is ever unset in production (accidentally-reverted deploy, broken secrets-manager integration, typo'd env name), the app keeps running and starts writing webhook secrets in plaintext to the database. Detection is by log inspection only, and the damage is persistent — rotating the key later can't re-encrypt secrets that were written without a key.
2. **No schema validation.** The key's 64-hex-char format was checked at first-use inside `getKey()`, not at boot. A malformed key would boot successfully and fail at the first webhook delivery.

## Decision

Move the enforcement into the existing Zod env schema (`src/lib/env.ts`):

```ts
SECRETS_ENCRYPTION_KEY: process.env.NODE_ENV === "production"
  ? z.string().length(64).regex(/^[0-9a-fA-F]{64}$/)
  : z.string().optional(),
NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
```

This makes the invariant explicit: **production cannot boot without a valid encryption key.** A missing or malformed key surfaces as a Zod parse error at module-load time — fail fast, fail loud, before any request is accepted.

Keep the `getKey()` dev/test fallback behavior (plaintext + warning) unchanged. In production the Zod schema guarantees the key is set, so the dev fallback branch is unreachable there; a runtime `throw` was added defensively in case the invariant is ever violated (e.g., a unit test that stubs `env` but runs with `NODE_ENV=production`).

Update `.env.example` to document the production requirement and the generation command:

```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Consequences

**Benefits:**
- Production deployments that forget to set the key fail at boot, not silently at first webhook delivery — the failure is immediate and obvious.
- Malformed keys (wrong length, non-hex chars) are caught at boot by the regex check, not at first decrypt.
- Dev and test workflows remain unchanged — no key is required for local runs.

**Trade-offs:**
- A production deployment that *rotates* the encryption key and has stored data encrypted under the old key will fail to decrypt that data. This is a pre-existing concern (true before this change) and not addressed here — key-rotation tooling is out of scope for MVP.
- Operators must include `SECRETS_ENCRYPTION_KEY` in their production secrets-manager configuration alongside `AUTH_SECRET`, `DATABASE_URL`, `ANTHROPIC_API_KEY`, `CRON_SECRET`. This is documented in `.env.example`.
- No automated rotation story. Out of scope for this ADR; logged as follow-up.

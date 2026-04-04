/**
 * Auth.js (NextAuth v5) full configuration — Node.js only.
 *
 * NOT imported by middleware. Middleware uses auth.config.ts instead, which is
 * Edge-safe and has no database dependencies.
 *
 * Providers registered here:
 *  1. Credentials  — email + bcrypt password (always active)
 *  2. Per-enterprise OIDC — one provider per enterprise that has SSO enabled
 *     with a valid OIDC config (issuer + clientId). Provider IDs follow the
 *     pattern "oidc-{enterpriseId}".
 *
 * Per-enterprise OIDC provider loading
 * ─────────────────────────────────────
 * At module init time (cold start), all enterprise_settings rows with
 * sso.enabled === true and protocol === "oidc" are read from the database and
 * registered as separate NextAuth providers. Each provider has a unique ID
 * ("oidc-{enterpriseId}"), allowing correct JIT provisioning without a domain
 * scan — the enterpriseId is extracted directly from the provider ID.
 *
 * When an admin enables SSO for a new enterprise, the provider becomes active
 * on the next serverless cold start (typically within minutes on Vercel, or
 * immediately after a redeployment).
 *
 * SSO_ISSUER / SSO_CLIENT_ID / SSO_CLIENT_SECRET env vars
 * ────────────────────────────────────────────────────────
 * These were used by the previous single-provider architecture. They are now
 * superseded by per-enterprise settings stored in enterprise_settings.sso.
 * They may remain in the environment without effect.
 */

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { users, enterpriseSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import type { EnterpriseSettings } from "@/lib/settings/types";
import { getEnterpriseSettings } from "@/lib/settings/get-settings";
import { authConfig } from "@/auth.config";

// ─── Per-Enterprise OIDC Provider Loading ────────────────────────────────────
// Reads all enterprise SSO configs from the database at module init.
// Runs once per serverless function instance (cold start).

async function loadEnterpriseOidcProviders(): Promise<unknown[]> {
  try {
    const rows = await db.select().from(enterpriseSettings);
    const providers: unknown[] = [];

    for (const row of rows) {
      const settings = row.settings as Partial<EnterpriseSettings> | null;
      const sso = settings?.sso;

      if (
        !sso?.enabled ||
        sso.protocol !== "oidc" ||
        !sso.issuer?.trim() ||
        !sso.clientId?.trim()
      ) {
        continue;
      }

      providers.push({
        id: `oidc-${row.enterpriseId}`,
        name: settings?.branding?.companyName ?? "SSO",
        type: "oidc",
        issuer: sso.issuer.trim(),
        clientId: sso.clientId.trim(),
        clientSecret: sso.clientSecret ?? "",
        checks: ["pkce", "state"],
      });
    }

    console.log(
      `[auth] Registered ${providers.length} enterprise OIDC provider(s).`
    );
    return providers;
  } catch (err) {
    // DB unavailable at cold start — credentials login still works.
    console.error("[auth] Failed to load enterprise OIDC providers:", err);
    return [];
  }
}

// Module-level: kicks off at import time, awaited before NextAuth is built.
// Top-level await is valid in ESM modules (Next.js 15 server-side context).
const enterpriseProviders = await loadEnterpriseOidcProviders();

// ─── JIT Role Resolution ──────────────────────────────────────────────────────

/** Derive an Intellios role from IdP group claims using the enterprise mapping. */
function resolveRole(
  groups: string[],
  groupRoleMapping: Record<string, string>,
  defaultRole: string
): string {
  for (const group of groups) {
    if (groupRoleMapping[group]) return groupRoleMapping[group];
  }
  return defaultRole;
}

// ─── NextAuth ─────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,

  providers: [
    // ── Credentials (email + password) ─────────────────────────────────────
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await db.query.users.findFirst({
          where: eq(users.email, credentials.email as string),
        });

        if (!user) return null;
        // SSO-provisioned users have a sentinel passwordHash — deny credential login.
        if (!user.passwordHash) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          enterpriseId: user.enterpriseId ?? null,
        };
      },
    }),

    // ── Per-enterprise OIDC providers (loaded from DB at cold start) ────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(enterpriseProviders as any[]),
  ],

  callbacks: {
    /**
     * JIT provisioning for per-enterprise OIDC sign-ins.
     *
     * Provider ID pattern: "oidc-{enterpriseId}"
     * The enterpriseId is extracted directly from the provider ID — no domain
     * scan needed. On every OIDC sign-in:
     *  - Existing user → refresh display name; keep existing role/enterprise.
     *  - New user → resolve role from groupRoleMapping; create with sentinel password.
     */
    async signIn({ user, account, profile }) {
      if (account?.provider?.startsWith("oidc-") && profile?.email) {
        const email = profile.email as string;

        // Extract enterpriseId from the provider ID (e.g. "oidc-abc123" → "abc123")
        const enterpriseId = account.provider.slice("oidc-".length);

        // Load full enterprise settings (deep-merged with defaults)
        const settings = await getEnterpriseSettings(enterpriseId);
        const sso = settings.sso;

        const existing = await db.query.users.findFirst({
          where: eq(users.email, email),
        });

        if (existing) {
          // Refresh display name if the IdP provides a newer value
          const idpName = (profile.name as string | undefined) ?? existing.name;
          if (idpName !== existing.name) {
            await db
              .update(users)
              .set({ name: idpName })
              .where(eq(users.id, existing.id));
          }
          Object.assign(user, {
            id: existing.id,
            role: existing.role,
            enterpriseId: existing.enterpriseId ?? null,
          });
        } else {
          // New SSO user — resolve role from IdP group claims
          const groups = Array.isArray(profile.groups)
            ? (profile.groups as string[])
            : [];
          const role = resolveRole(
            groups,
            sso.groupRoleMapping,
            sso.defaultRole
          );

          // Sentinel password: random hash prevents credential login for SSO users
          const passwordHash = await bcrypt.hash(`sso-${randomUUID()}`, 10);

          const [newUser] = await db
            .insert(users)
            .values({
              email,
              name: (profile.name as string | undefined) ?? email,
              passwordHash,
              role,
              enterpriseId,
            })
            .returning();

          Object.assign(user, {
            id: newUser.id,
            role: newUser.role,
            enterpriseId: newUser.enterpriseId ?? null,
          });
        }
      }
      return true;
    },

    jwt({ token, user }) {
      if (user) {
        token.role = (user as { role: string }).role;
        token.id = user.id;
        token.enterpriseId =
          (user as { enterpriseId: string | null }).enterpriseId ?? null;
      }
      return token;
    },

    session({ session, token }) {
      session.user.role = token.role as string;
      session.user.id = token.id as string;
      session.user.enterpriseId = (token.enterpriseId as string | null) ?? null;
      return session;
    },
  },
});

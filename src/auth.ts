/**
 * Auth.js (NextAuth v5) configuration.
 *
 * Providers:
 *  1. Credentials — email + bcrypt password (always active)
 *  2. OIDC SSO     — generic OpenID Connect provider, activated when the
 *                    SSO_ISSUER / SSO_CLIENT_ID / SSO_CLIENT_SECRET env vars
 *                    are set by the platform operator. Per-enterprise SSO
 *                    settings (emailDomain, groupRoleMapping, etc.) are stored
 *                    in enterprise_settings.sso and consumed during JIT
 *                    provisioning in the signIn callback (H2-3.2).
 */

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { users, enterpriseSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import type { EnterpriseSettings } from "@/lib/settings/types";
import { DEFAULT_ENTERPRISE_SETTINGS } from "@/lib/settings/types";

// ─── Login rate limiting (in-memory) ─────────────────────────────────────────
// Distributed deployments should use Redis; this covers the single-instance case.
//
// Two independent mechanisms:
//  1. Hourly rate limit  — 5 failed attempts per email per hour blocks further attempts
//  2. Account lockout    — 10 consecutive failures locks the account for 15 minutes

const RATE_LIMIT_MAX_FAILURES = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

const LOCKOUT_MAX_CONSECUTIVE = 10;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

interface LoginRecord {
  hourlyFailures: number;
  hourlyWindowStart: number;
  consecutiveFailures: number;
  lockedUntil: number | null;
}

const loginRecords = new Map<string, LoginRecord>();

function getLoginRecord(email: string): LoginRecord {
  const existing = loginRecords.get(email);
  const now = Date.now();

  if (!existing) {
    const record: LoginRecord = {
      hourlyFailures: 0,
      hourlyWindowStart: now,
      consecutiveFailures: 0,
      lockedUntil: null,
    };
    loginRecords.set(email, record);
    return record;
  }

  // Reset hourly window if it has expired
  if (now - existing.hourlyWindowStart > RATE_LIMIT_WINDOW_MS) {
    existing.hourlyFailures = 0;
    existing.hourlyWindowStart = now;
  }

  return existing;
}

/**
 * Returns the block reason if the email is currently blocked, null if allowed.
 */
function checkLoginAllowed(email: string): "locked" | "rate_limited" | null {
  const record = getLoginRecord(email);
  const now = Date.now();

  // Check account lockout first
  if (record.lockedUntil !== null && now < record.lockedUntil) {
    return "locked";
  }
  if (record.lockedUntil !== null && now >= record.lockedUntil) {
    // Lockout expired — clear it
    record.lockedUntil = null;
    record.consecutiveFailures = 0;
  }

  // Check hourly rate limit
  if (record.hourlyFailures >= RATE_LIMIT_MAX_FAILURES) {
    return "rate_limited";
  }

  return null;
}

function recordLoginFailure(email: string): void {
  const record = getLoginRecord(email);
  record.hourlyFailures++;
  record.consecutiveFailures++;

  if (record.consecutiveFailures >= LOCKOUT_MAX_CONSECUTIVE) {
    record.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
  }
}

function recordLoginSuccess(email: string): void {
  const record = loginRecords.get(email);
  if (record) {
    record.consecutiveFailures = 0;
    record.lockedUntil = null;
    // Intentionally preserve hourlyFailures — rate limit window continues
  }
}

// ─── OIDC SSO Provider ───────────────────────────────────────────────────────
// Only added when operator has set the platform-level env vars.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ssoProviders: any[] = process.env.SSO_ISSUER
  ? [
      {
        id: "oidc",
        name: "SSO",
        type: "oidc",
        issuer: process.env.SSO_ISSUER,
        clientId: process.env.SSO_CLIENT_ID ?? "",
        clientSecret: process.env.SSO_CLIENT_SECRET ?? "",
        checks: ["pkce", "state"],
      },
    ]
  : [];

// ─── JIT helpers ─────────────────────────────────────────────────────────────

/** Load SSO settings for the enterprise that owns emailDomain. */
async function findSsoSettingsByDomain(
  emailDomain: string
): Promise<{ enterpriseId: string; sso: EnterpriseSettings["sso"] } | null> {
  // Scan all enterprise_settings rows for one with sso.emailDomain === domain.
  // For most deployments there are O(1–100) enterprises — full scan is fine.
  const rows = await db.select().from(enterpriseSettings);
  for (const row of rows) {
    const stored = row.settings as Partial<EnterpriseSettings> | null;
    const sso = stored?.sso;
    if (sso?.enabled && sso.emailDomain?.toLowerCase() === emailDomain.toLowerCase()) {
      const merged: EnterpriseSettings["sso"] = {
        ...DEFAULT_ENTERPRISE_SETTINGS.sso,
        ...sso,
      };
      return { enterpriseId: row.enterpriseId, sso: merged };
    }
  }
  return null;
}

/** Derive Intellios role from IdP groups using the enterprise group mapping. */
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

// ─── NextAuth ────────────────────────────────────────────────────────────────

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        // P2-57: "Remember this device" — "true" extends JWT to 30 days
        remember: { label: "Remember", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email as string;

        // Enforce rate limit and lockout before hitting the database
        const blocked = checkLoginAllowed(email);
        if (blocked !== null) return null;

        const user = await db.query.users.findFirst({
          where: eq(users.email, email),
        });

        if (!user) {
          // Record failure even for unknown emails to prevent user enumeration
          // via timing differences — caller gets null either way.
          recordLoginFailure(email);
          return null;
        }
        // SSO-provisioned users have a sentinel passwordHash — deny credential login.
        if (!user.passwordHash) {
          recordLoginFailure(email);
          return null;
        }

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );
        if (!valid) {
          recordLoginFailure(email);
          return null;
        }

        recordLoginSuccess(email);
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          enterpriseId: user.enterpriseId ?? null,
          // Forward remember flag so jwt callback can extend expiry
          remember: credentials.remember === "true" ? "true" : "false",
        };
      },
    }),
    ...ssoProviders,
  ],

  callbacks: {
    /**
     * H2-3.2: JIT provisioning for OIDC SSO users.
     *
     * On every OIDC sign-in:
     *  - Look up the enterprise by email domain.
     *  - If user exists → refresh name; keep existing role/enterprise.
     *  - If user doesn't exist → create with role from groupRoleMapping.
     *  - Attach id / role / enterpriseId to `user` so the jwt callback
     *    picks them up.
     */
    async signIn({ user, account, profile }) {
      if (account?.provider === "oidc" && profile?.email) {
        const email = profile.email as string;
        const domain = email.split("@")[1] ?? "";

        // Load enterprise SSO config for this domain
        const enterpriseInfo = await findSsoSettingsByDomain(domain);

        const existing = await db.query.users.findFirst({
          where: eq(users.email, email),
        });

        if (existing) {
          // Refresh display name if the IdP has a newer value
          const idpName = (profile.name as string | undefined) ?? existing.name;
          if (idpName !== existing.name) {
            await db.update(users).set({ name: idpName }).where(eq(users.id, existing.id));
          }
          Object.assign(user, {
            id: existing.id,
            role: existing.role,
            enterpriseId: existing.enterpriseId ?? null,
          });
        } else {
          // Determine role from group mapping
          const groups = Array.isArray(profile.groups)
            ? (profile.groups as string[])
            : [];
          const role = enterpriseInfo
            ? resolveRole(
                groups,
                enterpriseInfo.sso.groupRoleMapping,
                enterpriseInfo.sso.defaultRole
              )
            : "viewer";

          // Use a random password so SSO users can't log in via credentials
          const passwordHash = await bcrypt.hash(`sso-${randomUUID()}`, 10);

          const [newUser] = await db
            .insert(users)
            .values({
              email,
              name: (profile.name as string | undefined) ?? email,
              passwordHash,
              role,
              enterpriseId: enterpriseInfo?.enterpriseId ?? null,
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
        // P2-57: Extend JWT to 30 days when "Remember this device" was checked
        if ((user as { remember?: string }).remember === "true") {
          token.exp = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
        }
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

  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    // 8-hour sessions — standard for financial services environments
    maxAge: 8 * 60 * 60,
  },
});

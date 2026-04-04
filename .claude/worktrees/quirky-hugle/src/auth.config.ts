/**
 * Edge-safe Auth.js (NextAuth v5) base configuration.
 *
 * This file is imported by middleware, which runs on the Edge Runtime.
 * It MUST NOT import anything that uses Node.js-only APIs (pg, bcrypt, crypto,
 * etc.). No database access here.
 *
 * The full auth configuration — including per-enterprise OIDC providers,
 * bcrypt credential validation, and JIT provisioning — lives in auth.ts,
 * which is Node.js-only and NOT imported by middleware.
 *
 * Middleware uses this config solely to validate the JWT session cookie and
 * determine whether a request is authenticated. Provider list is irrelevant
 * for that purpose.
 */

import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  providers: [],   // middleware only validates JWTs — no providers needed

  pages: {
    signIn: "/login",
  },

  session: {
    strategy: "jwt",
    // 8-hour sessions — standard for financial services environments
    maxAge: 8 * 60 * 60,
  },

  callbacks: {
    // jwt / session callbacks are intentionally omitted here.
    // They live in auth.ts where custom claims (role, id, enterpriseId)
    // are populated during credential and OIDC sign-in flows.
    // Middleware only reads req.auth (presence check) — it does not need
    // the enriched claim shape.
  },
} satisfies NextAuthConfig;

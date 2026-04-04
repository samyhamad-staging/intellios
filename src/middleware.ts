import { auth } from "@/auth";
import { NextResponse } from "next/server";

// ── Header constants ─────────────────────────────────────────────────────────

/** Injected by middleware on every request for server-side correlation. */
const REQUEST_ID_HEADER = "x-request-id";

/**
 * Injected by middleware for every authenticated request.
 * Contains the enterprise_id from the user's JWT, or "__null__" if the user
 * has no enterprise (platform admin / unscoped account).
 *
 * Route handlers read this via `getEnterpriseId()` from `@/lib/auth/enterprise-scope`.
 * This creates a single enforcement point: every API route receives the
 * caller's enterprise_id from the middleware — not from the route's own
 * query logic — making cross-tenant access structurally impossible for
 * tenant-scoped users.
 */
const ENTERPRISE_ID_HEADER = "x-enterprise-id";

/**
 * Injected alongside enterprise_id to carry the user's role.
 * Enables the enterprise scope utility to apply admin bypass logic
 * without a second auth call in the route handler.
 */
const ROLE_HEADER = "x-user-role";

/**
 * Injected for audit logging — the authenticated user's email.
 */
const ACTOR_EMAIL_HEADER = "x-actor-email";

// ── Helpers ──────────────────────────────────────────────────────────────────

function withId(response: NextResponse, requestId: string): NextResponse {
  response.headers.set(REQUEST_ID_HEADER, requestId);
  return response;
}

// ── Middleware ────────────────────────────────────────────────────────────────

export default auth((req) => {
  // Generate or forward a request ID.
  const requestId = req.headers.get(REQUEST_ID_HEADER) ?? crypto.randomUUID();
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set(REQUEST_ID_HEADER, requestId);

  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  // ── Tenant isolation: inject enterprise context into request headers ────
  //
  // For every authenticated request, extract the caller's enterprise_id and
  // role from the JWT and stamp them onto the forwarded request headers.
  // Route handlers use `getEnterpriseId()` and `enterpriseScope()` to read
  // these values — ensuring every DB query is scoped to the correct tenant
  // without trusting user-supplied parameters.
  //
  // The "__null__" sentinel distinguishes "platform admin with no enterprise"
  // from "header was not injected" (empty string / missing).
  if (isLoggedIn && req.auth?.user) {
    const user = req.auth.user;
    requestHeaders.set(
      ENTERPRISE_ID_HEADER,
      user.enterpriseId ?? "__null__"
    );
    requestHeaders.set(ROLE_HEADER, user.role ?? "viewer");
    requestHeaders.set(ACTOR_EMAIL_HEADER, user.email ?? "");
  }

  // ── Route-specific rules (unchanged) ──────────────────────────────────

  if (pathname.startsWith("/api/auth")) {
    return withId(NextResponse.next({ request: { headers: requestHeaders } }), requestId);
  }

  if (pathname.startsWith("/api/")) {
    return withId(NextResponse.next({ request: { headers: requestHeaders } }), requestId);
  }

  const isLoginPage = pathname === "/login";
  const isLandingPage = pathname === "/landing";
  const isRegisterPage = pathname === "/register";
  const isTemplatesPage = pathname === "/templates";

  // Public-only pages — redirect logged-in users to the app
  if (isLandingPage || isRegisterPage) {
    if (isLoggedIn) {
      return withId(NextResponse.redirect(new URL("/", req.url)), requestId);
    }
    return withId(NextResponse.next({ request: { headers: requestHeaders } }), requestId);
  }

  // Templates page — public, accessible regardless of auth state
  if (isTemplatesPage) {
    return withId(NextResponse.next({ request: { headers: requestHeaders } }), requestId);
  }

  // Public contribution workspace — no Intellios account required
  if (pathname.startsWith("/contribute") || pathname.startsWith("/api/intake/invitations")) {
    return withId(NextResponse.next({ request: { headers: requestHeaders } }), requestId);
  }

  if (!isLoggedIn && !isLoginPage) {
    // Unauthenticated visitors to / go directly to login
    if (pathname === "/") {
      return withId(NextResponse.redirect(new URL("/login", req.url)), requestId);
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return withId(NextResponse.redirect(loginUrl), requestId);
  }

  if (isLoggedIn && isLoginPage) {
    return withId(NextResponse.redirect(new URL("/", req.url)), requestId);
  }

  return withId(NextResponse.next({ request: { headers: requestHeaders } }), requestId);
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

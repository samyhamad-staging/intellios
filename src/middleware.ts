import { auth } from "@/auth";
import { NextResponse } from "next/server";

// ── Header constants ─────────────────────────────────────────────────────────

/** Injected by middleware on every request for server-side correlation. */
const REQUEST_ID_HEADER = "x-request-id";

// ── Role-based page access map ───────────────────────────────────────────────
//
// Maps each protected route prefix to the set of roles that may access it.
// Routes not listed here are accessible to any authenticated user.
// C-10: This is the server-side enforcement layer — the sidebar hides links
// but this middleware ensures direct URL access is also blocked.
//
// Role hierarchy (most → least privileged): admin > compliance_officer > reviewer > architect/designer > viewer
//
const ROUTE_ACCESS: Array<{ prefix: string; allowed: string[] }> = [
  // Design tools — architect, designer, admin only
  { prefix: "/intake",      allowed: ["architect", "designer", "admin"] },
  { prefix: "/blueprints",  allowed: ["architect", "designer", "admin"] },
  // Review / governance — reviewer, compliance_officer, admin
  { prefix: "/review",      allowed: ["reviewer", "compliance_officer", "admin"] },
  { prefix: "/governor",    allowed: ["reviewer", "compliance_officer", "admin"] },
  { prefix: "/governance",  allowed: ["reviewer", "compliance_officer", "admin"] },
  // Compliance — compliance_officer, admin
  { prefix: "/compliance",  allowed: ["compliance_officer", "admin"] },
  // Monitoring & ops — reviewer, compliance_officer, admin
  { prefix: "/monitor",     allowed: ["reviewer", "compliance_officer", "admin"] },
  { prefix: "/pipeline",    allowed: ["reviewer", "compliance_officer", "admin"] },
  { prefix: "/audit",       allowed: ["reviewer", "compliance_officer", "admin"] },
  // Deploy — reviewer, admin (not viewer)
  { prefix: "/deploy",      allowed: ["reviewer", "compliance_officer", "admin"] },
  // Registry — all roles except viewer (read-only users shouldn't manage agents)
  { prefix: "/registry",    allowed: ["architect", "designer", "reviewer", "compliance_officer", "admin"] },
  // Admin-only routes
  { prefix: "/admin",       allowed: ["admin"] },
];

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
  // P1-SEC-008 FIX: Strip any client-supplied security headers before injecting
  // authenticated values. Without this, an unauthenticated request (or a
  // request to a public route) could spoof these headers to bypass tenant
  // isolation and role checks in downstream route handlers.
  requestHeaders.delete(ENTERPRISE_ID_HEADER);
  requestHeaders.delete(ROLE_HEADER);
  requestHeaders.delete(ACTOR_EMAIL_HEADER);

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

  // ── Permanent redirects ────────────────────────────────────────────────
  // C-01: /analytics → /dashboard (analytics page doesn't exist)
  // M-14: /overview → / (sidebar links to / but direct /overview 404s)
  if (pathname === "/analytics") {
    return withId(NextResponse.redirect(new URL("/dashboard", req.url)), requestId);
  }
  if (pathname === "/overview") {
    return withId(NextResponse.redirect(new URL("/", req.url)), requestId);
  }

  // ── Public auth pages (accessible without login) ────────────────────────
  // C-07: Forgot-password and reset-password must be public — they're the
  //       recovery path for locked-out users.
  if (
    pathname.startsWith("/auth/forgot-password") ||
    pathname.startsWith("/auth/reset-password") ||
    pathname.startsWith("/auth/invite")
  ) {
    return withId(NextResponse.next({ request: { headers: requestHeaders } }), requestId);
  }

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

  // ── Role-based route guards (C-10, W-15) ──────────────────────────────
  // Server-side enforcement: redirect unauthorized roles to the Overview page.
  // This closes the gap where sidebar-hiding is the only access control.
  if (isLoggedIn && req.auth?.user) {
    const role = req.auth.user.role ?? "viewer";
    for (const rule of ROUTE_ACCESS) {
      if (pathname.startsWith(rule.prefix) && !rule.allowed.includes(role)) {
        // Redirect to home rather than showing a blank error page
        return withId(
          NextResponse.redirect(new URL("/?access_denied=1", req.url)),
          requestId
        );
      }
    }
  }

  return withId(NextResponse.next({ request: { headers: requestHeaders } }), requestId);
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

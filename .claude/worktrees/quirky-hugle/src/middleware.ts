/**
 * Next.js middleware — runs on the Edge Runtime for every request.
 *
 * Uses the Edge-safe authConfig (auth.config.ts) to validate the JWT session
 * cookie. auth.ts (full Node.js config with DB access and per-enterprise OIDC
 * providers) is NOT imported here because the Edge Runtime does not support
 * pg or other Node.js-only modules.
 */

import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

function withId(response: NextResponse, requestId: string): NextResponse {
  response.headers.set("x-request-id", requestId);
  return response;
}

export default auth((req) => {
  // Generate or forward a request ID. Injected into the forwarded request
  // headers so route handlers can read it, and stamped onto every response
  // so clients can correlate errors with server logs.
  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-request-id", requestId);

  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

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

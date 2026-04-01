/**
 * SSO Domain Check — H2-3.1
 *
 * GET /api/auth/sso-check?domain=acme.com
 *
 * Public (no auth required). Returns whether SSO is configured for the given
 * email domain. Used by the login page to decide whether to show the
 * "Sign in with SSO" button.
 *
 * Response:
 *   { ssoEnabled: true,  protocol: "oidc" }   — SSO active for this domain
 *   { ssoEnabled: false }                       — credentials login only
 *
 * Security note: this endpoint leaks whether a domain has SSO configured,
 * but that is intentional (needed for the login UX). It does not reveal any
 * IdP credentials or configuration details.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { enterpriseSettings } from "@/lib/db/schema";
import type { EnterpriseSettings } from "@/lib/settings/types";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const domain = searchParams.get("domain")?.toLowerCase().trim();

  if (!domain) {
    return NextResponse.json({ ssoEnabled: false });
  }

  // Also gate on whether the platform-level OIDC provider is configured
  // (SSO_ISSUER env var must be set for the provider to be active in auth.ts)
  const platformSsoConfigured = !!process.env.SSO_ISSUER;

  if (!platformSsoConfigured) {
    return NextResponse.json({ ssoEnabled: false });
  }

  try {
    const rows = await db.select().from(enterpriseSettings);
    for (const row of rows) {
      const stored = row.settings as Partial<EnterpriseSettings> | null;
      const sso = stored?.sso;
      if (
        sso?.enabled &&
        sso.emailDomain?.toLowerCase() === domain
      ) {
        return NextResponse.json({
          ssoEnabled: true,
          protocol: sso.protocol ?? "oidc",
        });
      }
    }
  } catch {
    // DB error — fail safe (don't expose SSO)
  }

  return NextResponse.json({ ssoEnabled: false });
}

/**
 * SSO Domain Check — H2-3.1
 *
 * GET /api/auth/sso-check?domain=acme.com
 *
 * Public (no auth required). Returns whether SSO is configured for the given
 * email domain, and which NextAuth provider ID to use for the sign-in flow.
 *
 * Response shapes:
 *   { ssoEnabled: true, protocol: "oidc", providerId: "oidc-<enterpriseId>" }
 *   { ssoEnabled: false }
 *
 * The `providerId` is passed directly to `signIn(providerId, ...)` on the
 * login page, routing the user to their enterprise's specific IdP.
 *
 * Security note: this endpoint intentionally reveals whether a domain has SSO
 * configured — that information is required for the login UX. It does not
 * expose any IdP credentials or settings.
 *
 * Platform env-var dependency removed
 * ────────────────────────────────────
 * The previous implementation gated responses on SSO_ISSUER being set (a
 * single platform-level OIDC env var). Per-enterprise IdP routing no longer
 * requires a platform-level provider — each enterprise supplies its own
 * credentials in enterprise_settings.sso — so that gate has been removed.
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

  try {
    const rows = await db.select().from(enterpriseSettings);

    for (const row of rows) {
      const stored = row.settings as Partial<EnterpriseSettings> | null;
      const sso = stored?.sso;

      if (
        !sso?.enabled ||
        sso.emailDomain?.toLowerCase() !== domain
      ) {
        continue;
      }

      // Only OIDC is supported for now (SAML requires a separate SP implementation).
      // If the enterprise is configured as SAML but no SAML provider exists yet,
      // fall through to ssoEnabled: false so the user sees the credentials form.
      if (sso.protocol === "oidc" && sso.issuer?.trim() && sso.clientId?.trim()) {
        return NextResponse.json({
          ssoEnabled: true,
          protocol: "oidc",
          providerId: `oidc-${row.enterpriseId}`,
        });
      }
    }
  } catch {
    // DB error — fail safe (don't expose SSO, don't throw 500)
  }

  return NextResponse.json({ ssoEnabled: false });
}

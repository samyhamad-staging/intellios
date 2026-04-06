/**
 * Admin SSO Settings — H2-3.1
 *
 * GET  /api/admin/sso  — fetch current SSO config (clientSecret masked)
 * PUT  /api/admin/sso  — update SSO config (pass masked secret to keep existing)
 *
 * Auth: admin only.
 *
 * clientSecret is stored in the enterprise_settings JSONB column.
 * GET responses always return "••••••••" in place of the actual secret.
 * PUT: if the body contains "••••••••", the existing secret is preserved.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { enterpriseSettings, auditLog } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { parseBody } from "@/lib/parse-body";
import { getRequestId } from "@/lib/request-id";
import { getEnterpriseSettings } from "@/lib/settings/get-settings";
import type { EnterpriseSettings } from "@/lib/settings/types";
import { DEFAULT_ENTERPRISE_SETTINGS } from "@/lib/settings/types";

const SECRET_MASK = "••••••••";

function maskSecret(sso: EnterpriseSettings["sso"]): EnterpriseSettings["sso"] {
  return {
    ...sso,
    clientSecret: sso.clientSecret ? SECRET_MASK : "",
  };
}

/**
 * GET /api/admin/sso
 */
export async function GET(request: NextRequest) {
  const { session: authSession, error } = await requireAuth(["admin"]);
  if (error) return error;
  const requestId = getRequestId(request);

  try {
    const settings = await getEnterpriseSettings(authSession.user.enterpriseId);
    return NextResponse.json({
      sso: maskSecret(settings.sso),
      platformOidcConfigured: !!process.env.SSO_ISSUER,
    });
  } catch (err) {
    console.error(`[${requestId}] Failed to fetch SSO settings:`, err);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to fetch SSO settings", undefined, requestId);
  }
}

// ─── Validation ───────────────────────────────────────────────────────────────

const SsoBody = z.object({
  enabled: z.boolean(),
  protocol: z.enum(["oidc", "saml"]),
  issuer: z.string().max(500),
  clientId: z.string().max(500),
  /**
   * clientSecret: pass the masked value "••••••••" to keep the existing
   * secret unchanged. Any other value (including "") replaces it.
   */
  clientSecret: z.string().max(500),
  emailDomain: z
    .string()
    .max(253)
    .regex(/^$|^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z]{2,})+$/, {
      message: "Must be a valid domain (e.g. acme.com) or empty",
    }),
  attributeMapping: z.object({
    email: z.string().min(1).max(100),
    name: z.string().min(1).max(100),
    groups: z.string().min(1).max(100),
  }),
  groupRoleMapping: z.record(
    z.string().min(1).max(200),
    z.string().min(1).max(50)
  ),
  defaultRole: z.enum([
    "architect",
    "reviewer",
    "compliance_officer",
    "admin",
    "viewer",
  ]),
});

/**
 * PUT /api/admin/sso
 */
export async function PUT(request: NextRequest) {
  const { session: authSession, error } = await requireAuth(["admin"]);
  if (error) return error;
  const requestId = getRequestId(request);

  const enterpriseId = authSession.user.enterpriseId;
  if (!enterpriseId) {
    return apiError(ErrorCode.FORBIDDEN, "Enterprise ID required to update SSO settings");
  }

  // CC-3 FIX: Use parseBody for consistent validation and error responses
  const { data: body, error: bodyError } = await parseBody(request, SsoBody);
  if (bodyError) return bodyError;

  try {
    // Fetch existing row to preserve clientSecret when masked value is sent
    const existing = await db.query.enterpriseSettings.findFirst({
      where: eq(enterpriseSettings.enterpriseId, enterpriseId),
    });
    const existingSettings = (existing?.settings ?? {}) as Partial<EnterpriseSettings>;
    const existingSecret = existingSettings.sso?.clientSecret ?? "";

    const newSso: EnterpriseSettings["sso"] = {
      ...DEFAULT_ENTERPRISE_SETTINGS.sso,
      ...body,
      // Preserve secret when client sends the masked sentinel
      clientSecret: body.clientSecret === SECRET_MASK ? existingSecret : body.clientSecret,
    };

    // Merge into existing settings
    const merged = {
      ...(existingSettings as Record<string, unknown>),
      sso: newSso,
    };

    await db
      .insert(enterpriseSettings)
      .values({
        enterpriseId,
        settings: merged,
        updatedAt: new Date(),
        updatedBy: authSession.user.email!,
      })
      .onConflictDoUpdate({
        target: enterpriseSettings.enterpriseId,
        set: {
          settings: merged,
          updatedAt: new Date(),
          updatedBy: authSession.user.email!,
        },
      });

    // Audit log: SSO config changed
    try {
      await db.insert(auditLog).values({
        actorEmail: authSession.user.email!,
        actorRole: authSession.user.role!,
        action: "sso.configured",
        entityType: "enterprise_settings",
        entityId: enterpriseId,
        enterpriseId,
        metadata: {
          enabled: body.enabled,
          protocol: body.protocol,
          issuer: body.issuer,
          clientId: body.clientId,
          emailDomain: body.emailDomain,
          attributeMapping: body.attributeMapping,
          defaultRole: body.defaultRole,
          secretChanged: body.clientSecret !== SECRET_MASK,
        },
      });
    } catch (auditErr) {
      console.error(`[${requestId}] Failed to write audit log:`, auditErr);
    }

    return NextResponse.json({ sso: maskSecret(newSso) });
  } catch (err) {
    console.error(`[${requestId}] Failed to update SSO settings:`, err);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to update SSO settings", undefined, requestId);
  }
}

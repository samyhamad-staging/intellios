import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { enterpriseSettings, auditLog } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { parseBody } from "@/lib/parse-body";
import { requireAuth } from "@/lib/auth/require";
import { getEnterpriseSettings } from "@/lib/settings/get-settings";
import { getRequestId } from "@/lib/request-id";

/**
 * GET /api/admin/integrations
 * Returns current integration configs (passwords/tokens masked).
 * Access: admin only.
 */
export async function GET(_request: NextRequest) {
  const { session, error } = await requireAuth(["admin"]);
  if (error) return error;

  const enterpriseId = session.user.enterpriseId ?? null;
  const settings = await getEnterpriseSettings(enterpriseId);
  const integrations = (settings as { integrations?: Record<string, unknown> }).integrations ?? {};

  // Mask passwords/tokens for display
  const masked = Object.fromEntries(
    Object.entries(integrations).map(([key, val]) => {
      if (!val || typeof val !== "object") return [key, val];
      const obj = val as Record<string, unknown>;
      return [key, {
        ...obj,
        password: obj.password ? "••••••••" : undefined,
        apiToken: obj.apiToken ? "••••••••" : undefined,
      }];
    })
  );

  return NextResponse.json({ integrations: masked });
}

const IntegrationConfigSchema = z.record(
  z.string(),
  z.record(z.string(), z.unknown())
);

const IntegrationPutSchema = z.object({
  integrations: IntegrationConfigSchema,
});

/**
 * PUT /api/admin/integrations
 * Updates integration configs. Sensitive fields (password, apiToken) are only
 * overwritten when a non-placeholder value is provided.
 * Access: admin only.
 */
export async function PUT(request: NextRequest) {
  const { session, error } = await requireAuth(["admin"]);
  if (error) return error;
  const requestId = getRequestId(request);

  const enterpriseId = session.user.enterpriseId ?? null;
  if (!enterpriseId) {
    return NextResponse.json({ error: "Enterprise ID required to update integrations" }, { status: 403 });
  }

  const { data: body, error: bodyError } = await parseBody(request, IntegrationPutSchema);
  if (bodyError) return bodyError;

  const incomingIntegrations = body.integrations;

  // Fetch existing settings to merge
  const existing = await db.query.enterpriseSettings.findFirst({
    where: eq(enterpriseSettings.enterpriseId, enterpriseId),
  });
  const existingSettings = (existing?.settings ?? {}) as Record<string, unknown>;
  const existingIntegrations = (existingSettings.integrations ?? {}) as Record<string, Record<string, unknown>>;

  // Merge: for each adapter, deep-merge; preserve existing secrets when placeholder is sent
  const mergedIntegrations: Record<string, unknown> = { ...existingIntegrations };
  for (const [adapter, config] of Object.entries(incomingIntegrations)) {
    const existing_adapter = (existingIntegrations[adapter] ?? {}) as Record<string, unknown>;
    const merged_adapter = { ...existing_adapter, ...config };
    // Preserve existing secrets when placeholder values are sent
    if (config.password === "••••••••" || config.password === "") merged_adapter.password = existing_adapter.password;
    if (config.apiToken === "••••••••" || config.apiToken === "") merged_adapter.apiToken = existing_adapter.apiToken;
    mergedIntegrations[adapter] = merged_adapter;
  }

  const mergedSettings = { ...existingSettings, integrations: mergedIntegrations };

  await db
    .insert(enterpriseSettings)
    .values({
      enterpriseId,
      settings: mergedSettings,
      updatedAt: new Date(),
      updatedBy: session.user.email!,
    })
    .onConflictDoUpdate({
      target: enterpriseSettings.enterpriseId,
      set: {
        settings: mergedSettings,
        updatedAt: new Date(),
        updatedBy: session.user.email!,
      },
    });

  // Audit log: integration config changed
  try {
    await db.insert(auditLog).values({
      actorEmail: session.user.email!,
      actorRole: session.user.role!,
      action: "integrations.configured",
      entityType: "enterprise_settings",
      entityId: enterpriseId,
      enterpriseId,
      metadata: {
        adaptersUpdated: Object.keys(incomingIntegrations),
        changedAdapters: Object.entries(incomingIntegrations).map(([adapter, config]) => ({
          adapter,
          fieldsUpdated: Object.keys(config as Record<string, unknown>).filter(
            (k) => k !== "password" && k !== "apiToken"
          ),
          secretsChanged: {
            password: (config as Record<string, unknown>).password !== "••••••••" && (config as Record<string, unknown>).password !== "",
            apiToken: (config as Record<string, unknown>).apiToken !== "••••••••" && (config as Record<string, unknown>).apiToken !== "",
          },
        })),
      },
    });
  } catch (auditErr) {
    console.error(`[${requestId}] Failed to write audit log:`, auditErr);
  }

  return NextResponse.json({ ok: t
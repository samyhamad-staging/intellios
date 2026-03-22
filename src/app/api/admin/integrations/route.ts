import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { enterpriseSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require";
import { getEnterpriseSettings } from "@/lib/settings/get-settings";

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

/**
 * PUT /api/admin/integrations
 * Updates integration configs. Sensitive fields (password, apiToken) are only
 * overwritten when a non-placeholder value is provided.
 * Access: admin only.
 */
export async function PUT(request: NextRequest) {
  const { session, error } = await requireAuth(["admin"]);
  if (error) return error;

  const enterpriseId = session.user.enterpriseId ?? null;
  if (!enterpriseId) {
    return NextResponse.json({ error: "Enterprise ID required to update integrations" }, { status: 403 });
  }

  const body = await request.json();
  const incomingIntegrations = body.integrations as Record<string, Record<string, unknown>>;
  if (!incomingIntegrations || typeof incomingIntegrations !== "object") {
    return NextResponse.json({ error: "integrations object required" }, { status: 400 });
  }

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

  return NextResponse.json({ ok: true });
}

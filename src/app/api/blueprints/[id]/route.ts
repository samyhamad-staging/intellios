import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agentBlueprints } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { assertEnterpriseAccess } from "@/lib/auth/enterprise";
import { getRequestId } from "@/lib/request-id";
import { getEnterpriseSettings } from "@/lib/settings/get-settings";
import { withTenantScopeGuarded } from "@/lib/auth/with-tenant-scope";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session: authSession, error } = await requireAuth();
  if (error) return error;
  const requestId = getRequestId(request);
  return withTenantScopeGuarded(request, async () => {
    try {
      // Activate RLS defense-in-depth layer
      const { id } = await params;

      const blueprint = await db.query.agentBlueprints.findFirst({
        where: eq(agentBlueprints.id, id),
      });

      if (!blueprint) {
        return apiError(ErrorCode.NOT_FOUND, "Blueprint not found");
      }

      const enterpriseError = assertEnterpriseAccess(blueprint.enterpriseId, authSession.user);
      if (enterpriseError) return enterpriseError;

      // Include the enterprise's approval chain so the Blueprint Studio can render
      // an approval progress tracker without a separate settings API call.
      const settings = await getEnterpriseSettings(blueprint.enterpriseId);
      const approvalChain = settings.approvalChain ?? [];

      return NextResponse.json({ ...blueprint, approvalChain });
    } catch (error) {
      console.error(`[${requestId}] Failed to fetch blueprint:`, error);
      return apiError(ErrorCode.INTERNAL_ERROR, "Failed to fetch blueprint", undefined, requestId);
    }
  });
}

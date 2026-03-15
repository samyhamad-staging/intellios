import { NextRequest, NextResponse } from "next/server";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { getRequestId } from "@/lib/request-id";
import { TEMPLATE_PACKS } from "@/lib/governance/policy-templates";

/**
 * GET /api/governance/templates
 * Returns the list of compliance starter pack metadata.
 * No DB query — static data from policy-templates.ts.
 * All authenticated roles may view available packs.
 */
export async function GET(request: NextRequest) {
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const requestId = getRequestId(request);

  try {
    const packs = TEMPLATE_PACKS.map(({ id, name, description, framework, policyCount }) => ({
      id,
      name,
      description,
      framework,
      policyCount,
    }));

    return NextResponse.json({ packs });
  } catch (error) {
    console.error(`[${requestId}] Failed to list template packs:`, error);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to list template packs", undefined, requestId);
  }
}

/**
 * Inline ABP Field Edit API — PATCH /api/blueprints/[id]/fields
 *
 * Allows architects to update individual fields in an ABP without going
 * through the full refinement pipeline. Accepts a dot-path field reference
 * and a new value, applies the change, and returns the updated ABP.
 *
 * Only draft-status blueprints can be edited inline. In-review or approved
 * blueprints must be refined through the refinement chat.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { agentBlueprints, auditLog } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { assertEnterpriseAccess } from "@/lib/auth/enterprise";
import { parseBody } from "@/lib/parse-body";
import { getRequestId } from "@/lib/request-id";

// ─── Zod schema ───────────────────────────────────────────────────────────────

// P2-SEC-003 FIX: Validate field edits with Zod instead of raw request.json()
// Whitelist safe path characters to prevent prototype pollution (__proto__, constructor, etc.)
const FieldEditSchema = z.object({
  fieldPath: z
    .string()
    .min(1)
    .max(200)
    .regex(
      /^[a-zA-Z0-9_]+(\.[a-zA-Z0-9_]+)*$/,
      "Field path must be dot-separated alphanumeric segments (e.g. 'identity.name')"
    )
    .refine(
      (p) => !/(^|\.)((__proto__|constructor|prototype))(\..*)?$/.test(p),
      "Field path contains a disallowed segment"
    ),
  value: z.unknown(),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Sets a value at a dot-separated path within a nested object.
 * Creates intermediate objects as needed.
 * Example: setNestedValue(obj, "identity.branding.color_primary", "#ff0000")
 */
function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split(".");
  let current: Record<string, unknown> = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    if (current[key] === undefined || current[key] === null || typeof current[key] !== "object") {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }
  current[parts[parts.length - 1]] = value;
}

/**
 * Gets a value at a dot-separated path within a nested object.
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current === undefined || current === null || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

// ─── Allowed top-level field paths ──────────────────────────────────────────
// We whitelist which ABP sections can be edited inline to prevent accidental
// corruption of metadata or structural fields.

const EDITABLE_PREFIXES = [
  "identity.",
  "capabilities.",
  "constraints.",
  "governance.",
  "ownership.",
  "execution.",
];

function isEditablePath(path: string): boolean {
  return EDITABLE_PREFIXES.some((prefix) => path.startsWith(prefix));
}

// ─── Route Handler ──────────────────────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session: authSession, error: authError } = await requireAuth();
  if (authError) return authError;
  const requestId = getRequestId(request);

  try {
    const { id } = await params;
    const { data: body, error: bodyError } = await parseBody(request, FieldEditSchema);
    if (bodyError) return bodyError;
    const { fieldPath, value } = body;

    if (!isEditablePath(fieldPath)) {
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        `Field path "${fieldPath}" is not editable. Only identity, capabilities, constraints, governance, ownership, and execution fields can be edited inline.`,
        undefined,
        requestId
      );
    }

    // Load blueprint
    const blueprint = await db.query.agentBlueprints.findFirst({
      where: eq(agentBlueprints.id, id),
    });

    if (!blueprint) {
      return apiError(ErrorCode.NOT_FOUND, "Blueprint not found", undefined, requestId);
    }

    const enterpriseError = assertEnterpriseAccess(blueprint.enterpriseId, authSession.user);
    if (enterpriseError) return enterpriseError;

    // Only draft blueprints can be edited inline
    if (blueprint.status !== "draft") {
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        `Cannot edit inline — blueprint is "${blueprint.status}". Only draft blueprints support inline editing. Use the refinement chat for non-draft blueprints.`,
        undefined,
        requestId
      );
    }

    // Apply the change to the ABP
    const abp = (blueprint.abp as Record<string, unknown>) ?? {};
    const previousValue = getNestedValue(abp, fieldPath);
    setNestedValue(abp, fieldPath, value);

    // Persist
    await db
      .update(agentBlueprints)
      .set({
        abp,
        updatedAt: new Date(),
      })
      .where(eq(agentBlueprints.id, id));

    // Audit log
    try {
      await db.insert(auditLog).values({
        actorEmail: authSession.user.email!,
        actorRole: authSession.user.role!,
        action: "blueprint.fields_updated",
        entityType: "blueprint",
        entityId: id,
        enterpriseId: blueprint.enterpriseId ?? null,
        metadata: { fieldPath, previousValue, newValue: value },
      });
    } catch (auditErr) {
      console.error(`[${requestId}] Failed to write audit log:`, auditErr);
    }

    return NextResponse.json({
      success: true,
      fieldPath,
      previousValue,
      newValue: value,
      abp,
    });
  } catch (err) {
    console.error(`[${requestId}] Inline field edit failed:`, err);
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      "Failed to update field",
      undefined,
      requestId
    );
  }
}

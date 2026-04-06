import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { enterpriseSettings, auditLog } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { parseBody } from "@/lib/parse-body";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { getRequestId } from "@/lib/request-id";
import { publishEvent } from "@/lib/events/publish";
import { getEnterpriseSettings } from "@/lib/settings/get-settings";
import { DEFAULT_ENTERPRISE_SETTINGS } from "@/lib/settings/types";

/**
 * GET /api/admin/settings
 * Returns the current enterprise settings (merged with defaults).
 * Access: admin only.
 */
export async function GET(request: NextRequest) {
  const { session: authSession, error } = await requireAuth(["admin"]);
  if (error) return error;
  const requestId = getRequestId(request);

  try {
    const settings = await getEnterpriseSettings(authSession.user.enterpriseId);
    return NextResponse.json({ settings, defaults: DEFAULT_ENTERPRISE_SETTINGS });
  } catch (err) {
    console.error(`[${requestId}] Failed to fetch settings:`, err);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to fetch settings", undefined, requestId);
  }
}

// ─── Validation schema ────────────────────────────────────────────────────────

const ApprovalChainStepSchema = z.object({
  step: z.number().int().min(0).optional(),
  role: z.enum(["reviewer", "compliance_officer", "admin"]),
  label: z.string().min(1).max(100),
});

const AgentCoreConfigSchema = z.union([
  z.null(),
  z.object({
    enabled: z.boolean(),
    region: z
      .string()
      .regex(/^[a-z]{2}-[a-z]+-\d+$/, "Must be a valid AWS region (e.g. us-east-1)"),
    agentResourceRoleArn: z
      .string()
      .regex(/^arn:aws:iam::\d{12}:role\/.+$/, "Must be a valid IAM role ARN"),
    foundationModel: z.string().min(1),
    guardrailId: z.string().optional(),
    guardrailVersion: z.string().optional(),
  }).refine(
    (d) => !d.guardrailId || !!d.guardrailVersion,
    { message: "guardrailVersion is required when guardrailId is set", path: ["guardrailVersion"] }
  ),
]);

const SettingsBody = z.object({
  sla: z.object({
    warnHours: z.number().int().min(1).max(720),
    breachHours: z.number().int().min(1).max(720),
  }).optional(),
  governance: z.object({
    requireValidationBeforeReview: z.boolean(),
    requireAllPhase3Acknowledgments: z.boolean(),
    allowSelfApproval: z.boolean(),
    requireTestsBeforeApproval: z.boolean().optional().default(false),
    // H2-1.4: circuit breaker — optional so legacy PUT bodies still parse
    circuitBreaker: z.object({
      action: z.enum(["auto_suspend", "alert_only"]),
      errorViolationThreshold: z.number().int().min(1).max(100),
    }).optional(),
  }).optional(),
  notifications: z.object({
    adminEmail: z.string().email().nullable(),
    notifyOnBreach: z.boolean(),
    notifyOnApproval: z.boolean(),
    // P1-433: additional alert channels
    slackWebhookUrl: z.string().url().nullable().optional(),
    pagerdutyKey: z.string().max(64).nullable().optional(),
  }).optional(),
  approvalChain: z.array(ApprovalChainStepSchema).optional(),
  branding: z.object({
    companyName: z.string().min(1).max(60).optional(),
    logoUrl: z.string().url().nullable().optional(),
    primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a valid hex color").optional(),
  }).optional(),
  periodicReview: z.object({
    enabled: z.boolean().optional(),
    defaultCadenceMonths: z.number().int().min(1).max(60).optional(),
    reminderDaysBefore: z.number().int().min(1).max(180).optional(),
  }).optional(),
  deploymentTargets: z.object({
    agentcore: AgentCoreConfigSchema,
  }).optional(),
  costRates: z.object({
    inputCostPer1kTokens:  z.number().min(0).max(1),
    outputCostPer1kTokens: z.number().min(0).max(1),
  }).optional(),
}).refine(
  (data) => {
    if (data.sla) {
      return data.sla.warnHours < data.sla.breachHours;
    }
    return true;
  },
  { message: "SLA warn threshold must be less than breach threshold", path: ["sla"] }
);

/**
 * PUT /api/admin/settings
 * Updates enterprise settings. Partial updates are supported — only supplied
 * sections are saved. Merges with existing DB row on write.
 * Access: admin only.
 */
export async function PUT(request: NextRequest) {
  const { session: authSession, error } = await requireAuth(["admin"]);
  if (error) return error;
  const requestId = getRequestId(request);

  try {
    const enterpriseId = authSession.user.enterpriseId;
    if (!enterpriseId) {
      return apiError(ErrorCode.FORBIDDEN, "Enterprise ID required to update settings");
    }

    const { data: body, error: bodyError } = await parseBody(request, SettingsBody);
    if (bodyError) return bodyError;

    // Fetch existing row to merge
    const existing = await db.query.enterpriseSettings.findFirst({
      where: eq(enterpriseSettings.enterpriseId, enterpriseId),
    });
    const existingSettings = (existing?.settings ?? {}) as Record<string, unknown>;

    // Deep merge: apply new values on top of existing
    const merged = { ...existingSettings };
    if (body.sla) merged.sla = body.sla;
    if (body.governance) {
      // Deep-merge governance so circuitBreaker is preserved when not provided
      const existing_gov = (existingSettings.governance ?? {}) as Record<string, unknown>;
      merged.governance = { ...existing_gov, ...body.governance };
    }
    if (body.notifications) merged.notifications = body.notifications;
    if (body.approvalChain !== undefined) {
      // Normalize: fill in step from index if missing (handles legacy seed data)
      merged.approvalChain = body.approvalChain.map((s, i) => ({ ...s, step: s.step ?? i }));
    }
    if (body.branding !== undefined) {
      const existing_br = (existingSettings.branding ?? {}) as Record<string, unknown>;
      merged.branding = { ...existing_br, ...body.branding };
    }
    if (body.periodicReview !== undefined) {
      const existing_pr = (existingSettings.periodicReview ?? {}) as Record<string, unknown>;
      merged.periodicReview = { ...existing_pr, ...body.periodicReview };
    }
    if (body.deploymentTargets !== undefined) {
      const existing_dt = (existingSettings.deploymentTargets ?? {}) as Record<string, unknown>;
      merged.deploymentTargets = { ...existing_dt, ...body.deploymentTargets };
    }
    if (body.costRates !== undefined) {
      const existing_cr = (existingSettings.costRates ?? {}) as Record<string, unknown>;
      merged.costRates = { ...existing_cr, ...body.costRates };
    }

    // Upsert
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

    // Audit log: settings update
    try {
      await db.insert(auditLog).values({
        actorEmail: authSession.user.email!,
        actorRole: authSession.user.role!,
        action: "settings.updated",
        entityType: "enterprise_settings",
        entityId: enterpriseId,
        enterpriseId,
        fromState: existingSettings,
        toState: merged,
        metadata: {
          changedSections: Object.keys(body).filter(k => body[k as keyof typeof body] !== undefined),
        },
      });
    } catch (auditErr) {
      console.error(`[${requestId}] Failed to write audit log:`, auditErr);
    }

    // Audit
    await publishEvent({
      event: { type: "settings.updated", payload: { enterpriseId } },
      actor: { email: authSession.user.email!, role: authSession.user.role },
      entity: { type: "blueprint", id: enterpriseId },
      enterpriseId,
    });

    // Return merged result
    const updated = await getEnterpriseSettings(enterpriseId);
    return NextResponse.json({ settings: updated });
  } catch (err) {
    console.error(`[${requestId}] Failed to update settings:`, err);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to update settings", undefined, requestId);
  }
}

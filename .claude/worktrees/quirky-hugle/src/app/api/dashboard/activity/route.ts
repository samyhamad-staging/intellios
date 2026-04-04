/**
 * GET /api/dashboard/activity
 *
 * Returns the 25 most recent audit log entries as humanized activity items.
 * Scoped to the authenticated user's enterprise.
 * Accessible to all roles.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auditLog } from "@/lib/db/schema";
import { desc, eq, isNull } from "drizzle-orm";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { getRequestId } from "@/lib/request-id";
import type { AuditAction } from "@/lib/audit/log";

// ─── Humanize helpers ─────────────────────────────────────────────────────────

function firstNameFrom(email: string): string {
  const local = email.split("@")[0];
  // Split on common separators, drop trailing digits, fall back to full local part
  const parts = local.split(/[._\-]/);
  const first = parts[0].replace(/\d+$/, "");
  return first.length > 0 ? first : local;
}

function humanizeAction(
  action: string,
  metadata: Record<string, unknown> | null
): string {
  const name = (metadata?.agentName ?? metadata?.name ?? "agent") as string;
  const policyName = (metadata?.policyName ?? "policy") as string;
  const toStatus = (metadata?.toStatus ?? "") as string;
  const version = (metadata?.version ?? "") as string;
  const templateName = (metadata?.templateName ?? "") as string;
  const riskTier = (metadata?.riskTier ?? "") as string;
  const reviewAction = (metadata?.reviewAction ?? "") as string;

  switch (action as AuditAction) {
    case "blueprint.created":
      return `created ${name}`;
    case "blueprint.refined":
      return `refined ${name}`;
    case "blueprint.status_changed":
      return `changed ${name} to ${toStatus}`;
    case "blueprint.reviewed":
      if (reviewAction === "approve") return `approved ${name}`;
      if (reviewAction === "reject") return `rejected ${name}`;
      return `reviewed ${name}`;
    case "blueprint.agentcore_deployed":
      return `deployed ${name}${version ? ` v${version}` : ""}`;
    case "blueprint.simulated":
      return `simulated ${name}`;
    case "blueprint.red_team_run":
      return `ran red-team on ${name}${riskTier ? ` — ${riskTier} risk` : ""}`;
    case "blueprint.created_from_template":
      return `created ${name} from template ${templateName}`;
    case "blueprint.cloned":
      return `cloned ${name}`;
    case "blueprint.report_exported":
      return `exported report for ${name}`;
    case "blueprint.code_exported":
      return `exported code for ${name}`;
    case "blueprint.compliance_exported":
      return `exported compliance report for ${name}`;
    case "blueprint.health_checked":
      return `ran health check on ${name}`;
    case "blueprint.agentcore_exported":
      return `exported ${name} to AgentCore`;
    case "blueprint.approval_step_completed":
      return `completed approval step for ${name}`;
    case "blueprint.test_run_completed":
      return `completed test run for ${name}`;
    case "blueprint.periodic_review_scheduled":
      return `scheduled periodic review for ${name}`;
    case "blueprint.periodic_review_completed":
      return `completed periodic review for ${name}`;
    case "blueprint.periodic_review_reminder":
      return `sent review reminder for ${name}`;
    case "policy.created":
      return `created governance policy ${policyName}`;
    case "policy.updated":
      return `updated governance policy ${policyName}`;
    case "policy.deleted":
      return `deleted governance policy ${policyName}`;
    case "policy.simulated":
      return `simulated policy ${policyName}`;
    case "intake.finalized":
      return `completed an intake session`;
    case "intake.contribution_submitted":
      return `submitted an intake contribution`;
    case "settings.updated":
      return `updated workspace settings`;
    default:
      return action;
  }
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { session: authSession, error } = await requireAuth();
  if (error) return error;

  const requestId = getRequestId(request);

  try {
    const enterpriseId = authSession.user.enterpriseId ?? null;

    const enterpriseFilter =
      authSession.user.role === "admin"
        ? undefined
        : enterpriseId
        ? eq(auditLog.enterpriseId, enterpriseId)
        : isNull(auditLog.enterpriseId);

    const entries = await db
      .select()
      .from(auditLog)
      .where(enterpriseFilter)
      .orderBy(desc(auditLog.createdAt))
      .limit(25);

    const items = entries.map((e) => ({
      id: e.id,
      action: e.action,
      actorEmail: e.actorEmail,
      actorName: firstNameFrom(e.actorEmail),
      description: humanizeAction(e.action, e.metadata as Record<string, unknown> | null),
      entityType: e.entityType,
      entityId: e.entityId,
      createdAt: e.createdAt.toISOString(),
    }));

    return NextResponse.json({ items });
  } catch (err) {
    console.error(`[${requestId}] Activity feed failed:`, err);
    return apiError(ErrorCode.INTERNAL_ERROR, "Failed to load activity", undefined, requestId);
  }
}

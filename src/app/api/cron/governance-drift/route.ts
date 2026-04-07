import { NextRequest, NextResponse } from "next/server";
import { requireCronAuth } from "@/lib/auth/cron-auth";
import { db } from "@/lib/db";
import { agentBlueprints } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { validateBlueprint } from "@/lib/governance/validator";
import { getAdminEmails, getComplianceOfficerEmails } from "@/lib/notifications/recipients";
import { sendEmail, buildNotificationEmail } from "@/lib/notifications/email";
import { publishEvent } from "@/lib/events/publish";
import { ALL_BLUEPRINT_COLUMNS } from "@/lib/db/safe-columns";
import type { ABP } from "@/lib/types/abp";

/**
 * GET /api/cron/governance-drift
 *
 * Scheduled policy re-evaluation for all deployed agents.
 * For each deployed agent:
 *   1. Load current active policies for the enterprise
 *   2. Re-validate blueprint against current policies
 *   3. Compare new violations to baseline (approval-time) violations
 *   4. New violations not in baseline = governance drift
 *   5. On drift: notify admin + compliance_officer, update governanceDrift column
 *
 * Runs daily (or on-demand). Schedule in vercel.json.
 * Security: mandatory Bearer token via CRON_SECRET.
 */
export async function GET(request: NextRequest) {
  const cronError = requireCronAuth(request);
  if (cronError) return cronError;

  const now = new Date();

  // Load all deployed blueprints
  let deployed;
  try {
    deployed = await db
      .select(ALL_BLUEPRINT_COLUMNS)
      .from(agentBlueprints)
      .where(eq(agentBlueprints.status, "deployed"));
  } catch (err) {
    console.error("[cron/governance-drift] DB query failed:", err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  let processed = 0;
  let drifted = 0;
  let cleared = 0;

  for (const blueprint of deployed) {
    processed++;

    try {
      const abp = blueprint.abp as ABP;
      const enterpriseId = blueprint.enterpriseId ?? null;

      // Re-validate against current policies
      const freshReport = await validateBlueprint(abp, enterpriseId);

      // Load baseline (approval-time) violations
      const baseline = blueprint.baselineValidationReport as { violations?: Array<{ field: string; message: string }> } | null;
      const baselineViolationKeys = new Set(
        (baseline?.violations ?? []).map((v: { field: string; message: string }) => `${v.field}::${v.message}`)
      );

      // Find new violations not present at approval time
      const newViolations = freshReport.violations.filter(
        (v) => !baselineViolationKeys.has(`${v.field}::${v.message}`)
      );

      const driftStatus = newViolations.length > 0 ? "drifted" : "clean";
      const previousDrift = blueprint.governanceDrift as { status?: string } | null;
      const wasDrifted = previousDrift?.status === "drifted";

      // Update governance_drift column
      await db
        .update(agentBlueprints)
        .set({
          governanceDrift: {
            status: driftStatus,
            newViolations,
            checkedAt: now.toISOString(),
          },
          updatedAt: now,
        })
        .where(eq(agentBlueprints.id, blueprint.id));

      if (driftStatus === "drifted" && !wasDrifted) {
        // New drift detected — notify
        drifted++;

        const agentName = blueprint.name ?? "Agent";
        const violationSummary = newViolations
          .slice(0, 3)
          .map((v) => `• ${v.message}`)
          .join("\n");

        const title = `Governance drift detected: ${agentName}`;
        const message = `${agentName} has ${newViolations.length} new policy violation${newViolations.length === 1 ? "" : "s"} that were not present at approval time:\n\n${violationSummary}${newViolations.length > 3 ? `\n…and ${newViolations.length - 3} more` : ""}\n\nReview and remediate in Intellios.`;
        const link = `/registry/${blueprint.agentId}`;

        const [adminEmails, complianceEmails] = await Promise.all([
          getAdminEmails(enterpriseId),
          getComplianceOfficerEmails(enterpriseId),
        ]);
        const recipients = [...new Set([...adminEmails, ...complianceEmails])];

        for (const recipientEmail of recipients) {
          void sendEmail({
            to: recipientEmail,
            subject: `[Intellios] Governance drift: ${agentName}`,
            html: buildNotificationEmail(title, message, link),
          });
        }

        void publishEvent({
          event: {
            type: "blueprint.governance_drift_detected",
            payload: {
              blueprintId: blueprint.id,
              agentId: blueprint.agentId,
              agentName,
              newViolationCount: newViolations.length,
            },
          },
          actor: { email: "system@intellios", role: "system" },
          entity: { type: "blueprint", id: blueprint.id },
          enterpriseId,
        });
      } else if (driftStatus === "clean" && wasDrifted) {
        cleared++;
      }
    } catch (err) {
      console.error(`[cron/governance-drift] Failed for blueprint ${blueprint.id}:`, err);
    }
  }

  return NextResponse.json({ processed, drifted, cleared });
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { agentBlueprints, auditLog } from "@/lib/db/schema";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { apiError, ErrorCode } from "@/lib/errors";
import { requireAuth } from "@/lib/auth/require";
import { parseBody } from "@/lib/parse-body";
import { getRequestId } from "@/lib/request-id";
import { publishEvent } from "@/lib/events/publish";
import { evaluatePolicies } from "@/lib/governance/evaluate";
import type { ABP } from "@/lib/types/abp";
import type { GovernancePolicy, ValidationReport, Violation } from "@/lib/governance/types";

// ─── Zod schema ───────────────────────────────────────────────────────────────

const SimulateSchema = z.object({
  policy: z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    type: z.string().optional().default("compliance"),
    rules: z.array(z.object({
      id: z.string().optional().default(""),
      field: z.string().min(1),
      operator: z.string(),
      value: z.unknown().optional(),
      severity: z.enum(["error", "warning"]),
      message: z.string().min(1),
    })),
    appliesTo: z.array(z.string()).optional(),
  }),
  existingPolicyId: z.string().uuid().optional(),
});

// ─── Route handler ────────────────────────────────────────────────────────────

/**
 * POST /api/governance/policies/simulate
 *
 * Previews the impact of a new or modified governance policy against all
 * approved/deployed blueprints. Zero AI calls — uses deterministic evaluator only.
 *
 * Returns per-blueprint classification: new_violations | resolved_violations | no_change
 */
export async function POST(request: NextRequest) {
  const { session: authSession, error } = await requireAuth([
    "compliance_officer",
    "admin",
  ]);
  if (error) return error;
  const requestId = getRequestId(request);

  const { data: body, error: bodyError } = await parseBody(request, SimulateSchema);
  if (bodyError) return bodyError;

  const { policy: draftPolicyInput, existingPolicyId } = body;

  // Runtime policies evaluate against live telemetry, not stored ABPs.
  // Simulation against blueprint documents is not applicable.
  if (draftPolicyInput.type === "runtime") {
    return NextResponse.json(
      { message: "Runtime policies are evaluated against live telemetry and cannot be simulated against stored blueprints." },
      { status: 422 }
    );
  }

  try {
    const enterpriseId = authSession.user.enterpriseId ?? null;

    // Enterprise access is enforced implicitly: blueprints are filtered by
    // enterpriseId below — only the user's own enterprise blueprints are checked.

    // ── 1. Build the draft GovernancePolicy object ─────────────────────────
    const draftPolicy: GovernancePolicy = {
      id: existingPolicyId ?? crypto.randomUUID(),
      enterpriseId,
      name: draftPolicyInput.name,
      type: draftPolicyInput.type ?? "compliance",
      description: draftPolicyInput.description ?? null,
      rules: draftPolicyInput.rules.map(
        (
          r: {
            id: string;
            field: string;
            operator: string;
            value?: unknown;
            severity: "error" | "warning";
            message: string;
          },
          i: number
        ) => ({
          id: r.id || `draft-rule-${i}`,
          field: r.field,
          operator: r.operator as GovernancePolicy["rules"][number]["operator"],
          value: r.value,
          severity: r.severity,
          message: r.message,
        })
      ),
      scopedAgentIds: null,
    };

    // ── 2. Load approved + deployed blueprints ─────────────────────────────
    const enterpriseCondition =
      authSession.user.role === "admin" && !enterpriseId
        ? undefined
        : enterpriseId
        ? eq(agentBlueprints.enterpriseId, enterpriseId)
        : isNull(agentBlueprints.enterpriseId);

    const blueprints = await db
      .select({
        id: agentBlueprints.id,
        agentId: agentBlueprints.agentId,
        name: agentBlueprints.name,
        status: agentBlueprints.status,
        abp: agentBlueprints.abp,
        validationReport: agentBlueprints.validationReport,
      })
      .from(agentBlueprints)
      .where(
        and(
          enterpriseCondition,
          inArray(agentBlueprints.status, ["approved", "deployed"])
        )
      );

    // ── 3. Evaluate each blueprint against the draft policy ────────────────
    type BlueprintResult = {
      blueprintId: string;
      agentName: string;
      agentId: string;
      status: "new_violations" | "resolved_violations" | "no_change";
      newViolationCount: number;
      resolvedViolationCount: number;
      violations: Violation[];
    };

    const results: BlueprintResult[] = [];

    for (const bp of blueprints) {
      const abp = bp.abp as ABP;

      // Run deterministic evaluation (no AI remediation pass)
      const newViolations: Violation[] = evaluatePolicies(abp, [draftPolicy]);

      // Count baseline violations from this policy (if editing an existing one)
      let baselineViolationCount = 0;
      if (existingPolicyId) {
        const stored = bp.validationReport as ValidationReport | null;
        if (stored?.violations) {
          baselineViolationCount = stored.violations.filter(
            (v) => v.policyId === existingPolicyId
          ).length;
        }
      }

      const newViolationCount = newViolations.length;
      const resolvedViolationCount = Math.max(
        0,
        baselineViolationCount - newViolationCount
      );

      let classifiedStatus: BlueprintResult["status"] = "no_change";
      if (newViolationCount > baselineViolationCount) {
        classifiedStatus = "new_violations";
      } else if (resolvedViolationCount > 0 && newViolationCount < baselineViolationCount) {
        classifiedStatus = "resolved_violations";
      }

      results.push({
        blueprintId: bp.id,
        agentName: bp.name ?? "Unnamed Agent",
        agentId: bp.agentId,
        status: classifiedStatus,
        newViolationCount,
        resolvedViolationCount,
        violations: newViolations,
      });
    }

    // ── 4. Summary ─────────────────────────────────────────────────────────
    const summary = {
      total: results.length,
      newViolations: results.filter((r) => r.status === "new_violations").length,
      resolvedViolations: results.filter(
        (r) => r.status === "resolved_violations"
      ).length,
      noChange: results.filter((r) => r.status === "no_change").length,
    };

    // ── 5. Audit log ───────────────────────────────────────────────────────
    const policyEntityId = existingPolicyId ?? crypto.randomUUID();

    // Write audit log
    try {
      await db.insert(auditLog).values({
        actorEmail: authSession.user.email!,
        actorRole: authSession.user.role!,
        action: "governance_policy.simulated",
        entityType: "governance_policy",
        entityId: policyEntityId,
        enterpriseId: enterpriseId ?? null,
        metadata: {
          policyName: draftPolicyInput.name,
          policyType: draftPolicyInput.type,
          totalBlueprintsChecked: summary.total,
          newViolationCount: summary.newViolations,
          resolvedViolationCount: summary.resolvedViolations,
          noChangeCount: summary.noChange,
        },
      });
    } catch (auditErr) {
      console.error(`[${requestId}] Failed to write audit log:`, auditErr);
    }

    void publishEvent({
      event: {
        type: "policy.simulated",
        payload: {
          policyId: policyEntityId,
        },
      },
      actor: { email: authSession.user.email!, role: authSession.user.role! },
      entity: { type: "policy", id: policyEntityId },
      enterpriseId,
    });

    return NextResponse.json({ summary, blueprints: results });
  } catch (err) {
    console.error(`[${requestId}] Failed to simulate policy impact:`, err);
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      "Failed to simulate policy impact",
      undefined,
      requestId
    );
  }
}

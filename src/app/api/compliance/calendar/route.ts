import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agentBlueprints, governancePolicies } from "@/lib/db/schema";
import { ALL_BLUEPRINT_COLUMNS, ALL_POLICY_COLUMNS } from "@/lib/db/safe-columns";
import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require";

export async function GET(request: NextRequest) {
  const { session, error } = await requireAuth(["compliance_officer", "admin"]);
  if (error) return error;

  const enterpriseId = session.user.role === "admin" && !session.user.enterpriseId
    ? null
    : (session.user.enterpriseId ?? null);

  const now = new Date();

  const blueprintsRaw = await db
    .select(ALL_BLUEPRINT_COLUMNS)
    .from(agentBlueprints)
    .where(
      and(
        eq(agentBlueprints.status, "deployed"),
        isNotNull(agentBlueprints.nextReviewDue),
        ...(enterpriseId ? [eq(agentBlueprints.enterpriseId, enterpriseId)] : []),
      )
    );

  const policiesRaw = await db
    .select(ALL_POLICY_COLUMNS)
    .from(governancePolicies)
    .where(
      and(
        isNull(governancePolicies.supersededAt),
        ...(enterpriseId ? [eq(governancePolicies.enterpriseId, enterpriseId)] : []),
      )
    );

  const agentReviews = blueprintsRaw
    .map((bp) => {
      const due = bp.nextReviewDue!;
      const daysUntil = Math.ceil((due.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
      const urgency = daysUntil < 0 ? "overdue" : daysUntil <= 7 ? "urgent" : daysUntil <= 30 ? "upcoming" : "future";
      return {
        id: bp.id,
        agentId: bp.agentId,
        agentName: bp.name ?? "Agent",
        nextReviewDue: due.toISOString(),
        status: bp.status,
        daysUntil,
        urgency,
      };
    })
    .sort((a, b) => a.daysUntil - b.daysUntil);

  const policyReviews = policiesRaw
    .map((p) => {
      const annualReview = new Date(p.createdAt);
      annualReview.setFullYear(annualReview.getFullYear() + 1);
      const daysUntil = Math.ceil((annualReview.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
      return {
        id: p.id,
        name: p.name,
        type: p.type,
        annualReviewDue: annualReview.toISOString(),
        daysUntil,
      };
    })
    .filter((p) => p.daysUntil > 0 && p.daysUntil <= 365)
    .sort((a, b) => a.daysUntil - b.daysUntil);

  return NextResponse.json({ agentReviews, policyReviews });
}

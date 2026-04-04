/**
 * Stakeholder Collaboration Orchestrator
 *
 * Called after each stakeholder contribution is submitted. Reads all current
 * contributions for the session, generates structured insights (synthesis,
 * conflicts, gaps, suggestions), and notifies the designer.
 *
 * Runs fire-and-forget — errors are logged but never propagated to the caller.
 */

import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { db } from "@/lib/db";
import { intakeSessions, intakeContributions, intakeInvitations, intakeAIInsights } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { createNotification } from "@/lib/notifications/store";
import type { IntakeContext, IntakePayload } from "@/lib/types/intake";

const InsightSchema = z.object({
  synthesis: z.object({
    title: z.string(),
    body: z.string().describe("Markdown prose summarizing everything known so far across all domains. 2–4 paragraphs."),
  }),
  conflicts: z.array(
    z.object({
      title: z.string(),
      body: z.string().describe("Specific description of the contradiction and which domains are affected."),
      domains: z.array(z.string()),
    })
  ),
  gaps: z.array(
    z.object({
      title: z.string(),
      body: z.string().describe("What is missing and why it matters for the agent design."),
      domain: z.string().optional(),
    })
  ),
  suggestions: z.array(
    z.object({
      title: z.string(),
      body: z.string().describe("Actionable recommendation for the designer."),
      action: z.enum(["invite", "followup", "clarify"]).optional(),
      domain: z.string().optional(),
      suggestedEmail: z.string().optional(),
      suggestedRoleTitle: z.string().optional(),
    })
  ),
});

/**
 * Run the AI orchestrator for a session. Fire-and-forget: call with `void`.
 */
export async function runForSession(sessionId: string): Promise<void> {
  try {
    // Load session
    const session = await db.query.intakeSessions.findFirst({
      where: eq(intakeSessions.id, sessionId),
    });
    if (!session) return;

    const context = session.intakeContext as IntakeContext | null;
    const payload = session.intakePayload as IntakePayload | null;
    const agentName =
      (payload as { agentIdentity?: { name?: string } } | null)?.agentIdentity?.name ??
      context?.agentPurpose ??
      "this agent";

    // Load all contributions
    const contributions = await db.query.intakeContributions.findMany({
      where: eq(intakeContributions.sessionId, sessionId),
    });

    if (contributions.length === 0) return;

    // Load invitations to understand coverage
    const invitations = await db.query.intakeInvitations.findMany({
      where: eq(intakeInvitations.sessionId, sessionId),
    });

    // Build contributions summary
    const contribSummary = contributions.map((c) => {
      const fields = c.fields as Record<string, string>;
      const fieldsText = Object.entries(fields)
        .filter(([, v]) => v.trim())
        .map(([k, v]) => `  ${k}: ${v}`)
        .join("\n");
      return `[${c.domain.toUpperCase()}] Contributor: ${c.contributorEmail} (${c.contributorRole})\n${fieldsText}`;
    }).join("\n\n");

    // Build invitation coverage summary (who's been invited but hasn't contributed)
    const pendingInvitations = invitations.filter((inv) => inv.status === "pending");
    const pendingSummary = pendingInvitations.length > 0
      ? `Pending (no contribution yet): ${pendingInvitations.map((inv) => `${inv.domain} (${inv.raciRole})`).join(", ")}`
      : "No pending invitations.";

    const allDomains = ["compliance", "risk", "legal", "security", "it", "operations", "business"];
    const coveredDomains = [...new Set(contributions.map((c) => c.domain))];
    const uncoveredDomains = allDomains.filter((d) => !coveredDomains.includes(d));

    const prompt = `You are analyzing stakeholder contributions for an enterprise AI agent design session.

AGENT: ${agentName}
PURPOSE: ${context?.agentPurpose ?? "Not specified"}
RISK TIER: ${session.riskTier ?? "medium"}

CONTRIBUTIONS RECEIVED (${contributions.length} total):
${contribSummary}

INVITATION STATUS:
${pendingSummary}
Uncovered domains (no input at all): ${uncoveredDomains.join(", ") || "none"}

Your task:
1. Write a SYNTHESIS: A clear, professional summary of what requirements have been gathered across all domains. Highlight what is well-covered and what still needs attention.
2. Identify CONFLICTS: Specific contradictions between stakeholder requirements (e.g., Legal requires X but IT proposes Y that conflicts).
3. Identify GAPS: Important requirements areas that haven't been addressed yet, especially for a ${session.riskTier ?? "medium"}-risk agent.
4. Generate SUGGESTIONS: Specific actionable next steps for the designer. For uncovered critical domains, suggest inviting an expert. For existing contributors, suggest follow-up questions. Keep suggestions focused and prioritized.

For suggestions of type "invite", populate domain, suggestedRoleTitle with an appropriate role for that domain.
Be specific and grounded in the actual contributions provided.`;

    const { object: insights } = await generateObject({
      model: anthropic("claude-haiku-4-5-20251001"),
      schema: InsightSchema,
      prompt,
    });

    // Delete previous synthesis (keep only latest) — others are preserved
    // Actually, keep all for history. Designer can dismiss stale ones.

    // Save synthesis
    await db.insert(intakeAIInsights).values({
      sessionId,
      type: "synthesis",
      title: insights.synthesis.title,
      body: insights.synthesis.body,
      metadata: { coveredDomains, uncoveredDomains },
      status: "pending",
    });

    // Save conflicts
    for (const conflict of insights.conflicts) {
      await db.insert(intakeAIInsights).values({
        sessionId,
        type: "conflict",
        title: conflict.title,
        body: conflict.body,
        metadata: { domains: conflict.domains },
        status: "pending",
      });
    }

    // Save gaps
    for (const gap of insights.gaps) {
      await db.insert(intakeAIInsights).values({
        sessionId,
        type: "gap",
        title: gap.title,
        body: gap.body,
        metadata: { domain: gap.domain },
        status: "pending",
      });
    }

    // Save suggestions
    for (const suggestion of insights.suggestions) {
      await db.insert(intakeAIInsights).values({
        sessionId,
        type: "suggestion",
        title: suggestion.title,
        body: suggestion.body,
        metadata: {
          action: suggestion.action,
          domain: suggestion.domain,
          suggestedEmail: suggestion.suggestedEmail,
          suggestedRoleTitle: suggestion.suggestedRoleTitle,
        },
        status: "pending",
      });
    }

    // Notify designer if they exist
    if (session.createdBy) {
      await createNotification({
        recipientEmail: session.createdBy,
        enterpriseId: session.enterpriseId,
        type: "intake.orchestrator_run",
        title: "Stakeholder workspace updated",
        message: `New insights available for ${agentName}: ${insights.conflicts.length} conflict(s), ${insights.gaps.length} gap(s), ${insights.suggestions.length} suggestion(s).`,
        entityType: "intake_session",
        entityId: sessionId,
        link: `/intake/${sessionId}`,
      });
    }
  } catch (err) {
    console.error("[orchestrator] Failed to run for session:", sessionId, err);
  }
}

/**
 * Get the latest synthesis body for a session, or null if none exists.
 */
export async function getLatestSynthesis(sessionId: string): Promise<string | null> {
  const rows = await db
    .select({ body: intakeAIInsights.body })
    .from(intakeAIInsights)
    .where(and(eq(intakeAIInsights.sessionId, sessionId), eq(intakeAIInsights.type, "synthesis")))
    .orderBy(desc(intakeAIInsights.createdAt))
    .limit(1);

  return rows[0]?.body ?? null;
}

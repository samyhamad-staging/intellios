import { auth } from "@/auth";
import { db } from "@/lib/db";
import { intakeSessions } from "@/lib/db/schema";
import { and, desc, eq, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { NewIntakeButton } from "@/components/intake/new-intake-button";
import { Heading, Subheading } from "@/components/catalyst/heading";
import { computeDomainProgress } from "@/lib/intake/domains";
import type { IntakePayload, IntakeContext } from "@/lib/types/intake";
import { Inbox } from "lucide-react";
import { IntakePageClient } from "@/components/intake/intake-page-client";
import type { SerializedSessionData } from "@/components/intake/intake-page-client";

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function IntakeSessionsPage() {
  const session = await auth();
  const user = session?.user;
  if (!user) redirect("/login");
  if (user.role !== "architect" && user.role !== "admin") redirect("/");

  const enterpriseFilter =
    user.role === "admin"
      ? user.enterpriseId ? eq(intakeSessions.enterpriseId, user.enterpriseId) : isNull(intakeSessions.enterpriseId)
      : user.enterpriseId
        ? and(eq(intakeSessions.enterpriseId, user.enterpriseId), eq(intakeSessions.createdBy, user.email ?? ""))
        : and(isNull(intakeSessions.enterpriseId), eq(intakeSessions.createdBy, user.email ?? ""));

  const rows = await db
    .select({
      id: intakeSessions.id,
      status: intakeSessions.status,
      createdBy: intakeSessions.createdBy,
      createdAt: intakeSessions.createdAt,
      updatedAt: intakeSessions.updatedAt,
      intakePayload: intakeSessions.intakePayload,
      intakeContext: intakeSessions.intakeContext,
    })
    .from(intakeSessions)
    .where(enterpriseFilter)
    .orderBy(desc(intakeSessions.updatedAt));

  const sessions: SerializedSessionData[] = rows.map((s) => {
    const payload = (s.intakePayload ?? {}) as IntakePayload;
    const context = s.intakeContext as IntakeContext | null;
    const agentName = (payload?.identity as Record<string, unknown> | undefined)?.name as string | undefined;
    const domains = computeDomainProgress(payload, context, null);
    const filledDomains = domains.filter((d) => d.fillLevel > 0).length;

    return {
      id: s.id,
      status: s.status,
      createdBy: s.createdBy,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
      agentName: agentName ?? null,
      agentPurpose: context?.agentPurpose ?? null,
      deploymentType: context?.deploymentType ?? null,
      dataSensitivity: context?.dataSensitivity ?? null,
      hasContext: !!context,
      domains,
      filledDomains,
    };
  });

  const realActiveCount = sessions.filter(
    (s) => s.status === "active" && (s.hasContext || s.filledDomains > 0)
  ).length;
  const completedCount = sessions.filter((s) => s.status === "completed").length;

  return (
    <div className="flex flex-col">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="shrink-0 border-b border-border bg-surface px-6 py-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <Heading level={1}>Design Studio</Heading>
            <p className="mt-0.5 text-sm text-text-secondary">
              {sessions.length === 0
                ? "Start a session to begin designing an agent."
                : `${realActiveCount} in progress · ${completedCount} complete`}
            </p>
          </div>
          <NewIntakeButton className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium" />
        </div>
      </header>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      {sessions.length === 0 ? (
        <div className="max-w-screen-2xl mx-auto w-full px-6 py-6">
          <div className="flex flex-col items-center rounded-xl border border-dashed border-border bg-surface py-16 text-center">
            <Inbox size={28} className="mb-3 text-text-tertiary" />
            <Subheading level={2} className="mb-1 text-text">No intake sessions yet</Subheading>
            <p className="mb-6 max-w-xs text-xs text-text-secondary">
              Each agent starts with an intake conversation where you define its purpose, capabilities, and governance requirements.
            </p>
            <NewIntakeButton className="inline-flex items-center gap-1.5 text-sm font-medium" />
          </div>
        </div>
      ) : (
        <IntakePageClient sessions={sessions} />
      )}
    </div>
  );
}

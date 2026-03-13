import { auth } from "@/auth";
import { db } from "@/lib/db";
import { intakeSessions } from "@/lib/db/schema";
import { and, desc, eq, isNull } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { NewIntakeButton } from "@/components/intake/new-intake-button";
import { IntakeContext } from "@/lib/types/intake";

function timeAgo(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 30) return `${diffDays} days ago`;
  return `${Math.floor(diffDays / 7)}w ago`;
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  active: { label: "In Progress", className: "bg-blue-50 text-blue-700 border-blue-200" },
  completed: { label: "Complete", className: "bg-green-50 text-green-700 border-green-200" },
  abandoned: { label: "Abandoned", className: "bg-gray-100 text-gray-500 border-gray-200" },
};

const SENSITIVITY_LABELS: Record<string, string> = {
  public: "Public",
  internal: "Internal",
  confidential: "Confidential",
  pii: "PII",
  regulated: "Regulated",
};

export default async function IntakeSessionsPage() {
  const session = await auth();
  const user = session?.user;

  if (!user) redirect("/login");
  if (user.role !== "designer" && user.role !== "admin") redirect("/");

  // Scope: designer sees own sessions; admin sees all enterprise sessions
  const enterpriseFilter =
    user.role === "admin"
      ? user.enterpriseId
        ? eq(intakeSessions.enterpriseId, user.enterpriseId)
        : isNull(intakeSessions.enterpriseId)
      : user.enterpriseId
      ? and(
          eq(intakeSessions.enterpriseId, user.enterpriseId),
          eq(intakeSessions.createdBy, user.email ?? "")
        )
      : and(
          isNull(intakeSessions.enterpriseId),
          eq(intakeSessions.createdBy, user.email ?? "")
        );

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

  const sessions = rows.map((s) => {
    const payload = s.intakePayload as Record<string, unknown> | null;
    const context = s.intakeContext as IntakeContext | null;
    const agentName =
      (payload?.identity as Record<string, unknown> | undefined)?.name as string | undefined;
    return {
      id: s.id,
      status: s.status,
      createdBy: s.createdBy,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      agentName: agentName ?? null,
      agentPurpose: context?.agentPurpose ?? null,
      deploymentType: context?.deploymentType ?? null,
      dataSensitivity: context?.dataSensitivity ?? null,
      hasContext: !!context,
    };
  });

  const active = sessions.filter((s) => s.status === "active");
  const completed = sessions.filter((s) => s.status === "completed");

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-6 py-10">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Intake Sessions</h1>
            <p className="mt-1 text-sm text-gray-500">
              {sessions.length === 0
                ? "No sessions yet. Start one to begin designing an agent."
                : `${sessions.length} session${sessions.length > 1 ? "s" : ""} — ${active.length} in progress, ${completed.length} complete`}
            </p>
          </div>
          <NewIntakeButton />
        </div>

        {sessions.length === 0 && (
          <div className="rounded-xl border border-gray-200 bg-white px-6 py-16 text-center shadow-sm">
            <div className="text-2xl mb-3">🧩</div>
            <h2 className="text-base font-medium text-gray-700 mb-1">No intake sessions</h2>
            <p className="text-sm text-gray-400 mb-6">
              Each agent starts with an intake session where you define its purpose, capabilities, and governance requirements.
            </p>
            <NewIntakeButton />
          </div>
        )}

        {/* In Progress */}
        {active.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
              In Progress — {active.length}
            </h2>
            <div className="space-y-2">
              {active.map((s) => (
                <SessionRow key={s.id} session={s} />
              ))}
            </div>
          </section>
        )}

        {/* Completed */}
        {completed.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
              Completed — {completed.length}
            </h2>
            <div className="space-y-2">
              {completed.map((s) => (
                <SessionRow key={s.id} session={s} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

interface SessionRowProps {
  session: {
    id: string;
    status: string;
    createdBy: string | null;
    createdAt: Date;
    updatedAt: Date;
    agentName: string | null;
    agentPurpose: string | null;
    deploymentType: string | null;
    dataSensitivity: string | null;
    hasContext: boolean;
  };
}

function SessionRow({ session: s }: SessionRowProps) {
  const badge = STATUS_BADGE[s.status] ?? STATUS_BADGE.active;
  const displayName = s.agentName ?? (s.hasContext ? "Untitled agent" : "New session");

  return (
    <Link
      href={`/intake/${s.id}`}
      className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm hover:border-gray-300 hover:shadow-md transition-all"
    >
      {/* Name + purpose */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-medium text-gray-900 truncate">{displayName}</span>
          <span
            className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-medium ${badge.className}`}
          >
            {badge.label}
          </span>
        </div>
        {s.agentPurpose ? (
          <p className="text-xs text-gray-500 truncate">{s.agentPurpose}</p>
        ) : (
          <p className="text-xs text-gray-400 italic">
            {s.hasContext ? "No purpose captured" : "Phase 1 context not yet submitted"}
          </p>
        )}
      </div>

      {/* Context chips */}
      <div className="hidden sm:flex items-center gap-1.5 shrink-0">
        {s.deploymentType && (
          <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500 capitalize">
            {s.deploymentType.replace(/-/g, " ")}
          </span>
        )}
        {s.dataSensitivity && (
          <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
            {SENSITIVITY_LABELS[s.dataSensitivity] ?? s.dataSensitivity}
          </span>
        )}
      </div>

      {/* Time + creator */}
      <div className="text-right shrink-0">
        <div className="text-xs text-gray-500">{timeAgo(s.updatedAt)}</div>
        {s.createdBy && (
          <div className="text-xs text-gray-400 truncate max-w-[140px]">{s.createdBy}</div>
        )}
      </div>

      {/* Action arrow */}
      <span className="text-gray-300 shrink-0">→</span>
    </Link>
  );
}

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { intakeSessions } from "@/lib/db/schema";
import { and, desc, eq, isNull } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { NewIntakeButton } from "@/components/intake/new-intake-button";
import { IntakeContext } from "@/lib/types/intake";
import { MessageSquare, ChevronRight, Inbox, Plus } from "lucide-react";

function timeAgo(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays === 1) return "1d ago";
  if (diffDays < 30) return `${diffDays}d ago`;
  return `${Math.floor(diffDays / 7)}w ago`;
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  active:    { label: "In Progress", className: "bg-blue-50 text-blue-700 border-blue-200" },
  completed: { label: "Complete",    className: "bg-green-50 text-green-700 border-green-200" },
  abandoned: { label: "Abandoned",   className: "bg-gray-100 text-gray-500 border-gray-200" },
};

const SENSITIVITY_LABELS: Record<string, string> = {
  public: "Public", internal: "Internal", confidential: "Confidential",
  pii: "PII", regulated: "Regulated",
};

export default async function IntakeSessionsPage() {
  const session = await auth();
  const user = session?.user;
  if (!user) redirect("/login");
  if (user.role !== "designer" && user.role !== "admin") redirect("/");

  const enterpriseFilter =
    user.role === "admin"
      ? user.enterpriseId ? eq(intakeSessions.enterpriseId, user.enterpriseId) : isNull(intakeSessions.enterpriseId)
      : user.enterpriseId
        ? and(eq(intakeSessions.enterpriseId, user.enterpriseId), eq(intakeSessions.createdBy, user.email ?? ""))
        : and(isNull(intakeSessions.enterpriseId), eq(intakeSessions.createdBy, user.email ?? ""));

  const rows = await db
    .select({ id: intakeSessions.id, status: intakeSessions.status, createdBy: intakeSessions.createdBy, createdAt: intakeSessions.createdAt, updatedAt: intakeSessions.updatedAt, intakePayload: intakeSessions.intakePayload, intakeContext: intakeSessions.intakeContext })
    .from(intakeSessions)
    .where(enterpriseFilter)
    .orderBy(desc(intakeSessions.updatedAt));

  const sessions = rows.map((s) => {
    const payload = s.intakePayload as Record<string, unknown> | null;
    const context = s.intakeContext as IntakeContext | null;
    const agentName = (payload?.identity as Record<string, unknown> | undefined)?.name as string | undefined;
    return { id: s.id, status: s.status, createdBy: s.createdBy, createdAt: s.createdAt, updatedAt: s.updatedAt, agentName: agentName ?? null, agentPurpose: context?.agentPurpose ?? null, deploymentType: context?.deploymentType ?? null, dataSensitivity: context?.dataSensitivity ?? null, hasContext: !!context };
  });

  const active = sessions.filter((s) => s.status === "active");
  const completed = sessions.filter((s) => s.status === "completed");

  return (
    <div className="px-8 py-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Intake Sessions</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {sessions.length === 0
              ? "Start a session to begin designing an agent."
              : `${sessions.length} session${sessions.length > 1 ? "s" : ""} — ${active.length} in progress, ${completed.length} complete`}
          </p>
        </div>
        <NewIntakeButton className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 transition-colors disabled:opacity-50" />
      </div>

      {/* Empty state */}
      {sessions.length === 0 && (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-gray-200 bg-white py-16 text-center shadow-sm">
          <Inbox size={32} className="mb-4 text-gray-300" />
          <h2 className="mb-1 text-sm font-medium text-gray-700">No intake sessions yet</h2>
          <p className="mb-6 max-w-xs text-xs text-gray-400">
            Each agent starts with an intake session where you define its purpose, capabilities, and governance requirements.
          </p>
          <NewIntakeButton className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 transition-colors" />
        </div>
      )}

      {/* In Progress */}
      {active.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
            In Progress — {active.length}
          </h2>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            {active.map((s, i) => <SessionRow key={s.id} session={s} isLast={i === active.length - 1} />)}
          </div>
        </section>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Completed — {completed.length}
          </h2>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            {completed.map((s, i) => <SessionRow key={s.id} session={s} isLast={i === completed.length - 1} />)}
          </div>
        </section>
      )}
    </div>
  );
}

interface SessionRowProps {
  session: {
    id: string; status: string; createdBy: string | null; createdAt: Date; updatedAt: Date;
    agentName: string | null; agentPurpose: string | null; deploymentType: string | null;
    dataSensitivity: string | null; hasContext: boolean;
  };
  isLast: boolean;
}

function SessionRow({ session: s, isLast }: SessionRowProps) {
  const badge = STATUS_BADGE[s.status] ?? STATUS_BADGE.active;
  const displayName = s.agentName ?? (s.hasContext ? "Untitled agent" : "New session");
  const isActive = s.status === "active";
  const author = s.createdBy
    ? s.createdBy.includes("@") ? s.createdBy.split("@")[0] : s.createdBy
    : null;
  const meta = [author ? `by ${author}` : null, timeAgo(s.updatedAt)].filter(Boolean).join(" · ");

  return (
    <Link
      href={`/intake/${s.id}`}
      className={`flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors ${!isLast ? "border-b border-gray-100" : ""} ${isActive ? "border-l-2 border-amber-400" : "border-l-2 border-transparent"}`}
    >
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${isActive ? "bg-amber-50 text-amber-600" : "bg-gray-100 text-gray-400"}`}>
        <MessageSquare size={14} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-medium text-gray-900 truncate">{displayName}</span>
          <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-medium ${badge.className}`}>{badge.label}</span>
        </div>
        {s.agentPurpose ? (
          <p className="text-xs text-gray-500 truncate">{s.agentPurpose}</p>
        ) : (
          <p className="text-xs text-gray-400 italic">{s.hasContext ? "No purpose captured" : "Phase 1 context not yet submitted"}</p>
        )}
        <p className="mt-0.5 text-xs text-gray-300">{meta}</p>
      </div>
      <div className="hidden sm:flex items-center gap-1.5 shrink-0">
        {s.deploymentType && (
          <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-400 capitalize">{s.deploymentType.replace(/-/g, " ")}</span>
        )}
        {s.dataSensitivity && (
          <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-400">{SENSITIVITY_LABELS[s.dataSensitivity] ?? s.dataSensitivity}</span>
        )}
      </div>
      <ChevronRight size={14} className="shrink-0 text-gray-300" />
    </Link>
  );
}

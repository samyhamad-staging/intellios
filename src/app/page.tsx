import { auth } from "@/auth";
import { db } from "@/lib/db";
import { agentBlueprints } from "@/lib/db/schema";
import { and, desc, eq, isNull } from "drizzle-orm";
import Link from "next/link";
import { NewIntakeButton } from "@/components/intake/new-intake-button";
import { StatusBadge } from "@/components/registry/status-badge";

function timeAgo(dateStr: string | Date): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 30) return `${diffDays} days ago`;
  return `${Math.floor(diffDays / 7)}w ago`;
}

export default async function Home() {
  const session = await auth();
  const user = session?.user;

  // Fetch agents scoped to the user's enterprise
  const enterpriseFilter =
    user?.role === "admin"
      ? undefined
      : user?.enterpriseId
      ? eq(agentBlueprints.enterpriseId, user.enterpriseId)
      : isNull(agentBlueprints.enterpriseId);

  const allAgents = user
    ? await db
        .selectDistinctOn([agentBlueprints.agentId], {
          id: agentBlueprints.id,
          agentId: agentBlueprints.agentId,
          name: agentBlueprints.name,
          status: agentBlueprints.status,
          version: agentBlueprints.version,
          tags: agentBlueprints.tags,
          createdBy: agentBlueprints.createdBy,
          updatedAt: agentBlueprints.updatedAt,
        })
        .from(agentBlueprints)
        .where(enterpriseFilter)
        .orderBy(agentBlueprints.agentId, desc(agentBlueprints.updatedAt))
    : [];

  // Sort by updatedAt desc
  allAgents.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  const inReviewAgents = allAgents.filter((a) => a.status === "in_review");
  const draftAgents = allAgents.filter((a) => a.status === "draft");
  const myAgents = user?.email
    ? allAgents.filter((a) => a.createdBy === user.email)
    : allAgents;

  const role = user?.role ?? "designer";

  // ── No session (unauthenticated) ───────────────────────────────────────────
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="mb-2 text-4xl font-bold tracking-tight">Intellios</h1>
          <p className="mb-8 text-lg text-gray-600">Enterprise Agent Factory</p>
          <Link
            href="/login"
            className="rounded-lg bg-gray-900 px-6 py-3 text-white hover:bg-gray-800 transition-colors"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  // ── Designer ───────────────────────────────────────────────────────────────
  if (role === "designer") {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-5xl px-6 py-10">
          {/* Hero */}
          <div className="mb-10">
            <h1 className="text-2xl font-bold text-gray-900">
              My Work
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Design, refine, and submit agent blueprints for review.
            </p>
          </div>

          {/* Primary CTA */}
          <div className="mb-8 flex items-center gap-4">
            <NewIntakeButton className="rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 transition-colors" />
            <Link
              href="/pipeline"
              className="rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:border-gray-400 hover:text-gray-900 transition-colors"
            >
              Pipeline Board
            </Link>
            <Link
              href="/registry"
              className="text-sm text-gray-500 hover:text-gray-900"
            >
              Agent Registry →
            </Link>
          </div>

          {/* My Recent Work */}
          <section>
            <h2 className="mb-3 text-sm font-semibold text-gray-700">
              {myAgents.length > 0 ? `Recent Agents (${myAgents.length})` : "Recent Agents"}
            </h2>
            {myAgents.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
                <p className="text-sm text-gray-400">No agents yet.</p>
                <p className="mt-1 text-xs text-gray-400">
                  Start an intake session to design your first agent.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {myAgents.slice(0, 8).map((agent) => (
                  <Link
                    key={agent.agentId}
                    href={`/registry/${agent.agentId}`}
                    className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-5 py-3 hover:border-gray-400 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="truncate font-medium text-sm text-gray-900">
                        {agent.name ?? "Unnamed Agent"}
                      </span>
                      <StatusBadge status={agent.status} />
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <span className="text-xs text-gray-400">{timeAgo(agent.updatedAt)}</span>
                      <span className="text-xs text-gray-400">→</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* In-review count callout */}
          {draftAgents.length > 0 && (
            <div className="mt-6 rounded-lg border border-yellow-200 bg-yellow-50 px-5 py-3">
              <p className="text-sm text-yellow-800">
                <strong>{draftAgents.length} draft{draftAgents.length === 1 ? "" : "s"}</strong> not yet submitted for review.{" "}
                <Link href="/pipeline" className="underline hover:text-yellow-900">
                  View in pipeline →
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Reviewer / Compliance Officer ──────────────────────────────────────────
  if (role === "reviewer" || role === "compliance_officer") {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-5xl px-6 py-10">
          {/* Hero */}
          <div className="mb-10">
            <h1 className="text-2xl font-bold text-gray-900">
              {role === "compliance_officer" ? "Governance & Compliance" : "Review Queue"}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {inReviewAgents.length > 0
                ? `${inReviewAgents.length} agent${inReviewAgents.length === 1 ? "" : "s"} pending review`
                : "No agents pending review"}
            </p>
          </div>

          {/* Primary CTA */}
          <div className="mb-8 flex items-center gap-4">
            <Link
              href="/review"
              className="rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
            >
              {inReviewAgents.length > 0
                ? `Open Review Queue (${inReviewAgents.length})`
                : "Open Review Queue"}
            </Link>
            <Link
              href="/pipeline"
              className="rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:border-gray-400 hover:text-gray-900 transition-colors"
            >
              Pipeline Board
            </Link>
            <Link
              href="/registry"
              className="text-sm text-gray-500 hover:text-gray-900"
            >
              Agent Registry →
            </Link>
          </div>

          {/* Pending Reviews */}
          <section>
            <h2 className="mb-3 text-sm font-semibold text-gray-700">
              Pending Reviews
            </h2>
            {inReviewAgents.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
                <p className="text-sm text-gray-400">✓ Review queue is empty.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {inReviewAgents.slice(0, 8).map((agent) => (
                  <Link
                    key={agent.agentId}
                    href={`/registry/${agent.agentId}?tab=review`}
                    className="flex items-center justify-between rounded-lg border border-blue-200 bg-white px-5 py-3 hover:border-blue-400 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="truncate font-medium text-sm text-gray-900">
                        {agent.name ?? "Unnamed Agent"}
                      </span>
                      <StatusBadge status={agent.status} />
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <span className="text-xs text-gray-400">{timeAgo(agent.updatedAt)}</span>
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                        Review →
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    );
  }

  // ── Admin ──────────────────────────────────────────────────────────────────
  const statuses = ["draft", "in_review", "approved", "rejected", "deprecated"] as const;
  const counts = Object.fromEntries(
    statuses.map((s) => [s, allAgents.filter((a) => a.status === s).length])
  ) as Record<typeof statuses[number], number>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-6 py-10">
        {/* Hero */}
        <div className="mb-10">
          <h1 className="text-2xl font-bold text-gray-900">Intellios</h1>
          <p className="mt-1 text-sm text-gray-500">
            Enterprise Agent Factory — {allAgents.length} agent{allAgents.length === 1 ? "" : "s"} across all teams
          </p>
        </div>

        {/* Stats row */}
        <div className="mb-8 grid grid-cols-5 gap-3">
          {[
            { label: "Draft", count: counts.draft, color: "text-gray-700 bg-gray-50 border-gray-200" },
            { label: "In Review", count: counts.in_review, color: "text-blue-700 bg-blue-50 border-blue-200" },
            { label: "Approved", count: counts.approved, color: "text-green-700 bg-green-50 border-green-200" },
            { label: "Rejected", count: counts.rejected, color: "text-red-700 bg-red-50 border-red-200" },
            { label: "Deprecated", count: counts.deprecated, color: "text-amber-700 bg-amber-50 border-amber-200" },
          ].map(({ label, count, color }) => (
            <div key={label} className={`rounded-lg border px-4 py-3 text-center ${color}`}>
              <div className="text-2xl font-bold">{count}</div>
              <div className="text-xs font-medium">{label}</div>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="mb-8 flex items-center gap-3">
          <Link
            href="/pipeline"
            className="rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
          >
            Pipeline Board
          </Link>
          <Link
            href="/review"
            className="rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:border-gray-400 hover:text-gray-900 transition-colors"
          >
            Review Queue {counts.in_review > 0 && `(${counts.in_review})`}
          </Link>
          <Link
            href="/registry"
            className="text-sm text-gray-500 hover:text-gray-900"
          >
            Agent Registry →
          </Link>
        </div>

        {/* Recent agents */}
        <section>
          <h2 className="mb-3 text-sm font-semibold text-gray-700">Recent Activity</h2>
          {allAgents.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
              <p className="text-sm text-gray-400">No agents in the system yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {allAgents.slice(0, 8).map((agent) => (
                <Link
                  key={agent.agentId}
                  href={`/registry/${agent.agentId}`}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-5 py-3 hover:border-gray-400 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="truncate font-medium text-sm text-gray-900">
                      {agent.name ?? "Unnamed Agent"}
                    </span>
                    <StatusBadge status={agent.status} />
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="text-xs text-gray-400">{agent.createdBy ?? "—"}</span>
                    <span className="text-xs text-gray-400">{timeAgo(agent.updatedAt)}</span>
                    <span className="text-xs text-gray-400">→</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

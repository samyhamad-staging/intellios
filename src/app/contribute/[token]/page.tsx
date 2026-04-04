import { db } from "@/lib/db";
import { intakeInvitations, intakeSessions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getLatestSynthesis } from "@/lib/intake/orchestrator";
import { StakeholderWorkspace } from "@/components/intake/stakeholder-workspace";
import type { IntakeContext, IntakePayload, ContributionDomain } from "@/lib/types/intake";

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function ContributePage({ params }: PageProps) {
  const { token } = await params;

  // Fetch invitation
  const invitation = await db.query.intakeInvitations.findFirst({
    where: eq(intakeInvitations.token, token),
  });

  if (!invitation) {
    return <ErrorPage title="Invitation not found" message="This invitation link is invalid or has been removed." />;
  }

  // Load session context (needed for expiry message)
  const session = await db.query.intakeSessions.findFirst({
    where: eq(intakeSessions.id, invitation.sessionId),
  });

  if (new Date(invitation.expiresAt) < new Date() && invitation.status !== "completed") {
    // P1-41: Richer expired-invite page with actionable next steps
    const sessionName =
      (session?.intakeContext as { agentPurpose?: string } | null)?.agentPurpose ??
      "Agent Design Session";
    const mailtoSubject = encodeURIComponent(`Re-invitation request — ${sessionName}`);
    const mailtoBody = encodeURIComponent(
      `Hi,\n\nMy invitation link for "${sessionName}" has expired. Could you please send me a new invitation?\n\nInvitation reference: ${token.slice(0, 12)}…\n\nThank you.`
    );
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
        <div className="max-w-sm text-center">
          <div className="mb-4 text-4xl">⏱️</div>
          <h1 className="mb-2 text-lg font-semibold text-gray-900">Invitation link expired</h1>
          <p className="text-sm text-gray-500">
            Your invitation to contribute to{" "}
            <span className="font-medium text-gray-800">{sessionName}</span> has expired.
            Invitation links are valid for a limited time.
          </p>
          <div className="mt-6 space-y-3">
            <p className="text-xs font-medium text-gray-700">Request a new link</p>
            <p className="text-xs text-gray-500">
              Contact the person who sent you this invitation and ask them to resend it.
              You can use the button below to draft a request email.
            </p>
            <a
              href={`mailto:?subject=${mailtoSubject}&body=${mailtoBody}`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
            >
              ✉ Draft request email
            </a>
            {invitation.inviteeName && (
              <p className="text-xs text-gray-400">Invitation was for: {invitation.inviteeName}</p>
            )}
          </div>
          <p className="mt-8 text-xs text-gray-400">Intellios — Enterprise Agent Factory</p>
        </div>
      </div>
    );
  }


  if (!session) {
    return <ErrorPage title="Session not found" message="The associated design session could not be found." />;
  }

  const context = session.intakeContext as IntakeContext | null;
  const payload = session.intakePayload as IntakePayload | null;
  const sessionName =
    (payload as { agentIdentity?: { name?: string } } | null)?.agentIdentity?.name ??
    context?.agentPurpose ??
    "Agent Design Session";

  // Load collaborators (other invitations for this session — redact PII)
  const allInvitations = await db.query.intakeInvitations.findMany({
    where: eq(intakeInvitations.sessionId, invitation.sessionId),
  });
  const collaborators = allInvitations
    .filter((inv) => inv.id !== invitation.id)
    .map((inv) => ({
      roleTitle: inv.roleTitle ?? inv.raciRole,
      domain: inv.domain,
      raciRole: inv.raciRole,
      status: inv.status,
    }));

  const synthesis = await getLatestSynthesis(invitation.sessionId);

  // Show completed page
  if (invitation.status === "completed") {
    return (
      <CompletedPage
        inviteeName={invitation.inviteeName}
        sessionName={sessionName}
        synthesis={synthesis}
        collaborators={collaborators}
      />
    );
  }

  return (
    <StakeholderWorkspace
      token={token}
      invitationId={invitation.id}
      domain={invitation.domain as ContributionDomain}
      raciRole={invitation.raciRole}
      roleTitle={invitation.roleTitle}
      inviteeName={invitation.inviteeName}
      sessionContext={{
        name: sessionName,
        description: context?.agentPurpose ?? "",
        riskTier: session.riskTier,
        agentType: session.agentType,
      }}
      collaborators={collaborators}
      synthesis={synthesis}
    />
  );
}

function ErrorPage({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
      <div className="max-w-sm text-center">
        <div className="mb-4 text-4xl">⚠️</div>
        <h1 className="mb-2 text-lg font-semibold text-gray-900">{title}</h1>
        <p className="text-sm text-gray-500">{message}</p>
        <p className="mt-6 text-xs text-gray-400">Intellios — Enterprise Agent Factory</p>
      </div>
    </div>
  );
}

function CompletedPage({
  inviteeName,
  sessionName,
  synthesis,
  collaborators,
}: {
  inviteeName: string | null;
  sessionName: string;
  synthesis: string | null;
  collaborators: { roleTitle: string; domain: string; raciRole: string; status: string }[];
}) {
  const DOMAIN_LABELS: Record<string, string> = {
    compliance: "Compliance", risk: "Risk", legal: "Legal", security: "Security",
    it: "IT / Infrastructure", operations: "Operations", business: "Business",
  };
  const STATUS_DOT: Record<string, string> = {
    completed: "bg-green-500", pending: "bg-amber-400", expired: "bg-gray-300",
  };
  const STATUS_LABEL: Record<string, { label: string; color: string }> = {
    completed: { label: "Contributed", color: "text-green-600" },
    pending: { label: "Pending", color: "text-amber-600" },
    expired: { label: "Expired", color: "text-gray-400" },
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="mx-auto max-w-2xl flex items-center gap-3">
          <span className="text-sm font-semibold text-gray-900">Intellios</span>
          <span className="text-gray-300">|</span>
          <span className="text-sm text-gray-600">{sessionName}</span>
        </div>
      </header>

      <div className="mx-auto max-w-2xl w-full px-6 py-12 text-center">
        <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-3xl">
          ✓
        </div>
        <h1 className="mb-2 text-xl font-semibold text-gray-900">
          {inviteeName ? `Thanks, ${inviteeName}!` : "Contribution received"}
        </h1>
        <p className="mb-6 text-sm text-gray-500">
          Your requirements have been recorded and will be incorporated into the agent design for{" "}
          <strong>{sessionName}</strong>.
        </p>

        {synthesis && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-left mb-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Team Summary
            </h3>
            <div className="text-sm text-gray-600 leading-relaxed">
              {synthesis.split("\n").map((line, i) => (
                <p key={i} className="mb-2 last:mb-0">{line}</p>
              ))}
            </div>
          </div>
        )}

        {collaborators.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-4 text-left">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Team</h3>
            <div className="space-y-2">
              {collaborators.map((c, i) => {
                const st = STATUS_LABEL[c.status] ?? STATUS_LABEL.pending;
                const dot = STATUS_DOT[c.status] ?? STATUS_DOT.pending;
                return (
                  <div key={i} className="flex items-center gap-2">
                    <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${dot}`} />
                    <span className="text-xs text-gray-700">{c.roleTitle}</span>
                    <span className="text-xs text-gray-400">· {DOMAIN_LABELS[c.domain] ?? c.domain}</span>
                    <span className={`ml-auto text-2xs ${st.color}`}>{st.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <p className="mt-8 text-xs text-gray-400">Intellios — Enterprise Agent Factory</p>
      </div>
    </div>
  );
}

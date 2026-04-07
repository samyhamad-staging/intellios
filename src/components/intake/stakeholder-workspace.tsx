"use client";

import { useState, useCallback } from "react";
import { StakeholderAIChat } from "./stakeholder-ai-chat";
import type { StakeholderContribution, ContributionDomain } from "@/lib/types/intake";

interface Collaborator {
  roleTitle: string;
  domain: string;
  raciRole: string;
  status: string;
}

interface WorkspaceProps {
  token: string;
  invitationId: string;
  domain: ContributionDomain;
  raciRole: string;
  roleTitle: string | null;
  inviteeName: string | null;
  sessionContext: {
    name: string;
    description: string;
    riskTier: string | null;
    agentType: string | null;
  };
  collaborators: Collaborator[];
  synthesis: string | null;
}

const RACI_LABELS: Record<string, string> = {
  accountable: "Accountable",
  responsible: "Responsible",
  consulted: "Consulted",
  informed: "Informed",
};

const RACI_COLORS: Record<string, string> = {
  accountable: "bg-violet-100 text-violet-700 dark:text-violet-300 border-violet-200",
  responsible: "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  consulted: "bg-green-50 dark:bg-emerald-950/30 text-green-700 dark:text-emerald-300 border-green-200 dark:border-emerald-800",
  informed: "bg-surface-raised text-text-secondary border-border",
};

const DOMAIN_LABELS: Record<string, string> = {
  compliance: "Compliance",
  risk: "Risk",
  legal: "Legal",
  security: "Security",
  it: "IT / Infrastructure",
  operations: "Operations",
  business: "Business",
};

const STATUS_DISPLAY: Record<string, { label: string; color: string; dot: string }> = {
  completed: { label: "Contributed", color: "text-green-600 dark:text-emerald-400", dot: "bg-green-500" },
  pending: { label: "Pending", color: "text-amber-600 dark:text-amber-400", dot: "bg-amber-400" },
  expired: { label: "Expired", color: "text-text-tertiary", dot: "bg-text-disabled" },
};

export function StakeholderWorkspace({
  token,
  invitationId,
  domain,
  raciRole,
  roleTitle,
  inviteeName,
  sessionContext,
  collaborators: initialCollaborators,
  synthesis: initialSynthesis,
}: WorkspaceProps) {
  const [submitted, setSubmitted] = useState(false);
  const [synthesis, setSynthesis] = useState(initialSynthesis);
  const [collaborators, setCollaborators] = useState(initialCollaborators);

  const handleSubmitted = useCallback((_contribution: StakeholderContribution) => {
    setSubmitted(true);
    // Refresh workspace data after a short delay to pick up orchestrator results
    setTimeout(async () => {
      try {
        const res = await fetch(`/api/intake/invitations/${token}`);
        if (res.ok) {
          const data = await res.json();
          if (data.synthesis) setSynthesis(data.synthesis);
          if (data.collaborators) setCollaborators(data.collaborators);
        }
      } catch {
        // Non-critical — synthesized view will update on next page load
      }
    }, 3000);
  }, [token]);

  const raciLabel = RACI_LABELS[raciRole] ?? raciRole;
  const raciColor = RACI_COLORS[raciRole] ?? RACI_COLORS.consulted;
  const domainLabel = DOMAIN_LABELS[domain] ?? domain;

  return (
    <div className="min-h-screen bg-surface-raised">
      {/* Header */}
      <header className="border-b border-border bg-surface px-6 py-4">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-text">Intellios</span>
            <span className="text-text-disabled">|</span>
            <span className="text-sm text-text-secondary">{sessionContext.name}</span>
          </div>
          <div className="flex items-center gap-2">
            {sessionContext.riskTier && (
              <span className="text-xs text-text-tertiary capitalize">{sessionContext.riskTier} risk</span>
            )}
          </div>
        </div>
      </header>

      {/* Role badge */}
      <div className="border-b border-border-subtle bg-surface px-6 py-3">
        <div className="mx-auto max-w-5xl flex items-center gap-3">
          <span className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-medium ${raciColor}`}>
            {raciLabel}
          </span>
          <span className="text-sm text-text">
            {roleTitle ?? domainLabel + " Stakeholder"}
            {inviteeName && <span className="text-text-tertiary"> · {inviteeName}</span>}
          </span>
          <span className="text-text-disabled">·</span>
          <span className="text-sm text-text-secondary">Domain: {domainLabel}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="mx-auto max-w-5xl px-6 py-6">
        {submitted ? (
          <SubmittedState
            synthesis={synthesis}
            collaborators={collaborators}
            inviteeName={inviteeName}
            sessionName={sessionContext.name}
            domainLabel={domainLabel}
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
            {/* AI Interview — takes 3/5 width */}
            <div className="lg:col-span-3">
              {/* P1-39: Stakeholder orientation banner */}
              <div className="mb-4 rounded-xl border border-blue-100 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 px-4 py-3">
                <p className="text-sm font-medium text-blue-900">
                  You&apos;ve been invited to help design{" "}
                  <span className="font-semibold">{sessionContext.name}</span>
                  {(roleTitle ?? domain) && (
                    <> as the <span className="font-semibold">{roleTitle ?? domain}</span> expert</>
                  )}.
                </p>
                <p className="mt-1 text-xs text-blue-700 dark:text-blue-300">
                  Your input on requirements, constraints, and policies will directly shape how this AI agent behaves in production.
                  This interview takes approximately 10 minutes.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-surface p-5">
                <h2 className="mb-4 text-sm font-semibold text-text">
                  AI Requirements Interview
                </h2>
                <StakeholderAIChat
                  sessionId={invitationId}
                  domain={domain}
                  chatApiUrl={`/api/intake/invitations/${token}/chat`}
                  onSubmitted={handleSubmitted}
                />
              </div>
            </div>

            {/* Collaboration Context — takes 2/5 width */}
            <div className="lg:col-span-2 space-y-4">
              {/* Contributors */}
              {collaborators.length > 0 && (
                <div className="rounded-xl border border-border bg-surface p-4">
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                    Collaboration Team
                  </h3>
                  <div className="space-y-2">
                    {collaborators.map((c, i) => {
                      const st = STATUS_DISPLAY[c.status] ?? STATUS_DISPLAY.pending;
                      const rc = RACI_COLORS[c.raciRole] ?? RACI_COLORS.consulted;
                      return (
                        <div key={i} className="flex items-center gap-2.5">
                          <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${st.dot}`} />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-text truncate">
                              {c.roleTitle}
                            </p>
                            <p className="text-2xs text-text-tertiary">{DOMAIN_LABELS[c.domain] ?? c.domain}</p>
                          </div>
                          <span className={`text-2xs shrink-0 ${st.color}`}>{st.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Synthesis */}
              {synthesis && (
                <div className="rounded-xl border border-border bg-surface p-4">
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                    What&apos;s Been Agreed
                  </h3>
                  <div className="prose prose-xs max-w-none text-xs text-text-secondary leading-relaxed">
                    {synthesis.split("\n").map((line, i) => (
                      <p key={i} className="mb-1.5 last:mb-0">{line}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {collaborators.length === 0 && !synthesis && (
                <div className="rounded-xl border border-dashed border-border bg-surface p-4">
                  <p className="text-xs text-text-tertiary text-center">
                    You&apos;re the first contributor. Other stakeholders will appear here as they join.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// P2-181: Enhanced stakeholder submission confirmation
function SubmittedState({
  synthesis,
  collaborators,
  inviteeName,
  sessionName,
  domainLabel,
}: {
  synthesis: string | null;
  collaborators: Collaborator[];
  inviteeName: string | null;
  sessionName: string;
  domainLabel: string;
}) {
  const pendingCount = collaborators.filter((c) => c.status === "pending").length;
  const contributedCount = collaborators.filter((c) => c.status === "completed").length;

  return (
    <div className="mx-auto max-w-xl">
      {/* Success icon + header */}
      <div className="mb-8 text-center">
        <div className="relative inline-flex justify-center mb-5">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-emerald-900/40">
            <svg className="h-7 w-7 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          {/* Subtle pulse ring */}
          <div className="absolute inset-0 h-14 w-14 rounded-full border-2 border-green-300 dark:border-emerald-700/50 animate-ping" />
        </div>
        <h2 className="text-xl font-semibold text-text">
          {inviteeName ? `Thanks, ${inviteeName}!` : "Contribution recorded"}
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          Your <strong>{domainLabel}</strong> perspective has been captured for{" "}
          <strong>{sessionName}</strong>.
        </p>
      </div>

      {/* What happens next */}
      <div className="mb-6 rounded-xl border border-border bg-surface p-5">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">What happens next</h3>
        <div className="space-y-3">
          {[
            {
              step: "1",
              title: "Your input is added to the design",
              detail: "The architect has been notified and your requirements are visible in the intake session.",
            },
            {
              step: "2",
              title: "Stakeholder coverage is updated",
              detail: `${contributedCount + 1} of ${contributedCount + 1 + pendingCount} stakeholders${pendingCount > 0 ? ` — ${pendingCount} still pending` : " have all contributed"}.`,
            },
            {
              step: "3",
              title: "Blueprint will reflect your constraints",
              detail: "When the architect generates the blueprint, your governance requirements and constraints will be incorporated.",
            },
          ].map(({ step, title, detail }) => (
            <div key={step} className="flex gap-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-emerald-900/40 text-xs font-bold text-green-700 dark:text-emerald-300">
                {step}
              </span>
              <div>
                <p className="text-sm font-medium text-text">{title}</p>
                <p className="text-xs text-text-secondary mt-0.5">{detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Collaboration summary */}
      {synthesis && (
        <div className="mb-4 rounded-xl border border-border bg-surface p-5">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
            Team Summary
          </h3>
          <div className="text-sm text-text-secondary leading-relaxed">
            {synthesis.split("\n").filter(Boolean).map((line, i) => (
              <p key={i} className="mb-2 last:mb-0">{line}</p>
            ))}
          </div>
        </div>
      )}

      {/* Team */}
      {collaborators.length > 0 && (
        <div className="mb-4 rounded-xl border border-border bg-surface p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Team</h3>
          <div className="space-y-1.5">
            {collaborators.map((c, i) => {
              const st = STATUS_DISPLAY[c.status] ?? STATUS_DISPLAY.pending;
              return (
                <div key={i} className="flex items-center gap-2">
                  <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${st.dot}`} />
                  <span className="text-xs text-text">{c.roleTitle}</span>
                  <span className="text-xs text-text-tertiary">· {DOMAIN_LABELS[c.domain] ?? c.domain}</span>
                  <span className={`ml-auto text-2xs font-medium ${st.color}`}>{st.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Close guidance */}
      <p className="text-center text-xs text-text-tertiary mt-6">
        You&apos;re all done — you can close this tab.
      </p>
    </div>
  );
}

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
  accountable: "bg-violet-100 text-violet-700 border-violet-200",
  responsible: "bg-blue-50 text-blue-700 border-blue-200",
  consulted: "bg-green-50 text-green-700 border-green-200",
  informed: "bg-gray-50 text-gray-600 border-gray-200",
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
  completed: { label: "Contributed", color: "text-green-600", dot: "bg-green-500" },
  pending: { label: "Pending", color: "text-amber-600", dot: "bg-amber-400" },
  expired: { label: "Expired", color: "text-gray-400", dot: "bg-gray-300" },
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-900">Intellios</span>
            <span className="text-gray-300">|</span>
            <span className="text-sm text-gray-600">{sessionContext.name}</span>
          </div>
          <div className="flex items-center gap-2">
            {sessionContext.riskTier && (
              <span className="text-xs text-gray-400 capitalize">{sessionContext.riskTier} risk</span>
            )}
          </div>
        </div>
      </header>

      {/* Role badge */}
      <div className="border-b border-gray-100 bg-white px-6 py-3">
        <div className="mx-auto max-w-5xl flex items-center gap-3">
          <span className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-medium ${raciColor}`}>
            {raciLabel}
          </span>
          <span className="text-sm text-gray-700">
            {roleTitle ?? domainLabel + " Stakeholder"}
            {inviteeName && <span className="text-gray-400"> · {inviteeName}</span>}
          </span>
          <span className="text-gray-300">·</span>
          <span className="text-sm text-gray-500">Domain: {domainLabel}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="mx-auto max-w-5xl px-6 py-6">
        {submitted ? (
          <SubmittedState synthesis={synthesis} collaborators={collaborators} />
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
            {/* AI Interview — takes 3/5 width */}
            <div className="lg:col-span-3">
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <h2 className="mb-4 text-sm font-semibold text-gray-700">
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
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
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
                            <p className="text-xs font-medium text-gray-700 truncate">
                              {c.roleTitle}
                            </p>
                            <p className="text-2xs text-gray-400">{DOMAIN_LABELS[c.domain] ?? c.domain}</p>
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
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                    What&apos;s Been Agreed
                  </h3>
                  <div className="prose prose-xs max-w-none text-xs text-gray-600 leading-relaxed">
                    {synthesis.split("\n").map((line, i) => (
                      <p key={i} className="mb-1.5 last:mb-0">{line}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {collaborators.length === 0 && !synthesis && (
                <div className="rounded-xl border border-dashed border-gray-200 bg-white p-4">
                  <p className="text-xs text-gray-400 text-center">
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

function SubmittedState({
  synthesis,
  collaborators,
}: {
  synthesis: string | null;
  collaborators: Collaborator[];
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <div className="mb-6">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-2xl">
          ✓
        </span>
      </div>
      <h2 className="mb-2 text-xl font-semibold text-gray-900">
        Your contribution has been recorded
      </h2>
      <p className="mb-8 text-sm text-gray-500">
        Thank you — your requirements will be incorporated into the agent design. The AI orchestrator is updating the team&apos;s shared view.
      </p>

      {synthesis && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-left">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Collaboration Summary
          </h3>
          <div className="text-sm text-gray-600 leading-relaxed">
            {synthesis.split("\n").map((line, i) => (
              <p key={i} className="mb-2 last:mb-0">{line}</p>
            ))}
          </div>
        </div>
      )}

      {collaborators.length > 0 && (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4 text-left">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Team</h3>
          <div className="space-y-1.5">
            {collaborators.map((c, i) => {
              const st = STATUS_DISPLAY[c.status] ?? STATUS_DISPLAY.pending;
              return (
                <div key={i} className="flex items-center gap-2">
                  <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                  <span className="text-xs text-gray-600">{c.roleTitle}</span>
                  <span className="text-xs text-gray-400">· {DOMAIN_LABELS[c.domain] ?? c.domain}</span>
                  <span className={`ml-auto text-2xs ${st.color}`}>{st.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

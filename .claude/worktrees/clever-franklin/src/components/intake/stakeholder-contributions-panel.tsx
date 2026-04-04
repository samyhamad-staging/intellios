"use client";

import { useState, useEffect, useCallback } from "react";
import { ContributionDomain, IntakeContext, IntakeRiskTier, StakeholderContribution } from "@/lib/types/intake";
import { StakeholderAIChat } from "./stakeholder-ai-chat";

// ── Constants ─────────────────────────────────────────────────────────────────

const DOMAIN_ORDER: ContributionDomain[] = [
  "compliance", "risk", "legal", "security", "it", "operations", "business",
];

const DOMAIN_LABELS: Record<ContributionDomain, string> = {
  compliance: "Compliance",
  risk: "Risk",
  legal: "Legal",
  security: "Security",
  it: "IT / Infrastructure",
  operations: "Operations",
  business: "Business",
};

const RACI_OPTIONS = [
  { value: "accountable", label: "Accountable" },
  { value: "responsible", label: "Responsible" },
  { value: "consulted", label: "Consulted" },
  { value: "informed", label: "Informed" },
] as const;

const RACI_COLORS: Record<string, string> = {
  accountable: "bg-violet-100 text-violet-700 border-violet-200",
  responsible: "bg-blue-50 text-blue-700 border-blue-200",
  consulted: "bg-green-50 text-green-700 border-green-200",
  informed: "bg-gray-50 text-gray-500 border-gray-200",
};

const FIELD_LABELS: Record<string, string> = {
  required_policies: "Required policies",
  regulatory_constraints: "Regulatory constraints",
  audit_requirements: "Audit requirements",
  risk_thresholds: "Risk thresholds",
  denied_scenarios: "Denied scenarios",
  escalation_requirements: "Escalation requirements",
  use_boundaries: "Permitted use boundaries",
  prohibited_use_cases: "Prohibited use cases",
  access_control_requirements: "Access control requirements",
  data_handling_requirements: "Data handling requirements",
  integration_requirements: "Integration requirements",
  infrastructure_constraints: "Infrastructure constraints",
  sla_requirements: "SLA requirements",
  escalation_paths: "Escalation paths",
  success_criteria: "Success criteria",
  business_constraints: "Business constraints",
};

// ── Types ──────────────────────────────────────────────────────────────────────

interface Invitation {
  id: string;
  domain: string;
  inviteeEmail: string;
  inviteeName: string | null;
  roleTitle: string | null;
  raciRole: string;
  status: string;
  token: string;
}

interface Insight {
  id: string;
  type: string;
  title: string;
  body: string;
  metadata: Record<string, unknown> | null;
  status: string;
  createdAt: string;
}

interface Props {
  sessionId: string;
  contributions: StakeholderContribution[];
  onContributionAdded: (contribution: StakeholderContribution) => void;
  context?: IntakeContext;
  riskTier?: IntakeRiskTier | null;
  agentName?: string;
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function StakeholderContributionsPanel({
  sessionId,
  contributions,
  onContributionAdded,
  context,
  agentName,
}: Props) {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [inviteForm, setInviteForm] = useState<ContributionDomain | null>(null);
  const [aiInterviewDomain, setAIInterviewDomain] = useState<ContributionDomain | null>(null);
  const [expandedContribution, setExpandedContribution] = useState<string | null>(null);

  const resolvedAgentName = agentName ?? context?.agentPurpose ?? undefined;

  const fetchData = useCallback(async () => {
    try {
      const [invRes, insRes] = await Promise.all([
        fetch(`/api/intake/sessions/${sessionId}/invitations`),
        fetch(`/api/intake/sessions/${sessionId}/insights`),
      ]);
      if (invRes.ok) {
        const data = await invRes.json();
        setInvitations(data.invitations ?? []);
      }
      if (insRes.ok) {
        const data = await insRes.json();
        setInsights(data.insights ?? []);
      }
    } catch (err) {
      console.error("[stakeholder-contributions] fetchData failed:", err);
    }
  }, [sessionId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData, contributions.length]);

  function handleContributionSubmitted(contribution: StakeholderContribution) {
    onContributionAdded(contribution);
    setAIInterviewDomain(null);
    setTimeout(() => void fetchData(), 2000); // re-fetch insights after orchestrator runs
  }

  async function handleInsightAction(insightId: string, status: "approved" | "dismissed") {
    try {
      const res = await fetch(`/api/intake/sessions/${sessionId}/insights/${insightId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setInsights((prev) =>
          prev.map((i) => (i.id === insightId ? { ...i, status } : i))
        );
        if (status === "approved") setTimeout(() => void fetchData(), 800);
      }
    } catch (err) {
      console.error("[stakeholder-contributions] handleInsightAction failed:", err);
    }
  }

  // Build lookup maps
  const invitationByDomain: Record<string, Invitation | undefined> = {};
  for (const inv of invitations) {
    invitationByDomain[inv.domain] = inv;
  }
  const contributionByDomain: Record<string, StakeholderContribution | undefined> = {};
  for (const c of contributions) {
    contributionByDomain[c.domain] = c;
  }

  const pendingInsights = insights.filter((i) => i.status === "pending");

  return (
    <div className="border-t border-gray-100 pt-4 mt-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
            Stakeholder Input
          </span>
          {contributions.length > 0 && (
            <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-1.5 py-0.5 font-medium">
              {contributions.length}
            </span>
          )}
        </div>
      </div>

      {/* AI Interview panel (designer-side) */}
      {aiInterviewDomain && (
        <div className="mb-3 rounded-lg border border-violet-100 bg-violet-50/30 p-3">
          <StakeholderAIChat
            sessionId={sessionId}
            domain={aiInterviewDomain}
            agentName={resolvedAgentName}
            onSubmitted={handleContributionSubmitted}
            onCancel={() => setAIInterviewDomain(null)}
          />
        </div>
      )}

      {/* Per-domain stakeholder map */}
      {!aiInterviewDomain && (
        <div className="space-y-0.5 mb-3">
          {DOMAIN_ORDER.map((domain) => (
            <DomainRow
              key={domain}
              domain={domain}
              invitation={invitationByDomain[domain]}
              contribution={contributionByDomain[domain]}
              expandedContributionId={expandedContribution}
              onExpandContribution={(id) =>
                setExpandedContribution((prev) => (prev === id ? null : id))
              }
              onOpenInviteForm={() => setInviteForm(domain)}
              onCloseInviteForm={() => setInviteForm(null)}
              onAIInterview={() => setAIInterviewDomain(domain)}
              sessionId={sessionId}
              onInvitationCreated={(inv) => {
                setInvitations((prev) => [
                  ...prev.filter((i) => i.domain !== inv.domain || i.id === inv.id),
                  inv,
                ]);
              }}
              isInviteFormOpen={inviteForm === domain}
            />
          ))}
        </div>
      )}

      {/* AI Orchestrator Insights */}
      {pendingInsights.length > 0 && (
        <div className="border-t border-gray-100 pt-3">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-pulse" />
            <span className="text-2xs font-semibold uppercase tracking-wider text-gray-400">
              AI Orchestrator
            </span>
          </div>
          <div className="space-y-2">
            {pendingInsights.slice(0, 5).map((insight) => (
              <InsightCard
                key={insight.id}
                insight={insight}
                onApprove={() => handleInsightAction(insight.id, "approved")}
                onDismiss={() => handleInsightAction(insight.id, "dismissed")}
                onInvite={
                  insight.type === "suggestion" &&
                  (insight.metadata as { action?: string } | null)?.action === "invite"
                    ? () => {
                        const meta = insight.metadata as { domain?: string } | null;
                        if (meta?.domain) {
                          handleInsightAction(insight.id, "approved");
                          setInviteForm(meta.domain as ContributionDomain);
                        }
                      }
                    : undefined
                }
              />
            ))}
            {pendingInsights.length > 5 && (
              <p className="text-2xs text-gray-400 pl-1">
                +{pendingInsights.length - 5} more
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── DomainRow ─────────────────────────────────────────────────────────────────

interface DomainRowProps {
  domain: ContributionDomain;
  invitation?: Invitation;
  contribution?: StakeholderContribution;
  expandedContributionId: string | null;
  onExpandContribution: (id: string) => void;
  onOpenInviteForm: () => void;
  onCloseInviteForm: () => void;
  onAIInterview: () => void;
  sessionId: string;
  onInvitationCreated: (inv: Invitation) => void;
  isInviteFormOpen: boolean;
}

function DomainRow({
  domain,
  invitation,
  contribution,
  expandedContributionId,
  onExpandContribution,
  onOpenInviteForm,
  onCloseInviteForm,
  onAIInterview,
  sessionId,
  onInvitationCreated,
  isInviteFormOpen,
}: DomainRowProps) {
  const isCompleted = invitation?.status === "completed" || !!contribution;
  const isInvited = invitation?.status === "pending";

  const nonEmptyFields = contribution
    ? Object.entries(contribution.fields as Record<string, string>).filter(([, v]) => v.trim())
    : [];
  const isExpanded = contribution && expandedContributionId === contribution.id;

  return (
    <div>
      <div className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs hover:bg-gray-50 transition-colors">
        {/* Domain name */}
        <span className={`flex-1 font-medium truncate ${isCompleted ? "text-gray-500" : "text-gray-800"}`}>
          {DOMAIN_LABELS[domain]}
        </span>

        {/* RACI badge */}
        {invitation?.raciRole && (
          <span className={`shrink-0 rounded border px-1 py-0.5 text-2xs font-medium ${RACI_COLORS[invitation.raciRole] ?? RACI_COLORS.consulted}`}>
            {invitation.raciRole.charAt(0).toUpperCase() + invitation.raciRole.slice(1)}
          </span>
        )}

        {/* Invitee name */}
        {invitation && (
          <span className="text-2xs text-gray-400 shrink-0 max-w-[72px] truncate">
            {invitation.inviteeName ?? invitation.inviteeEmail.split("@")[0]}
          </span>
        )}

        {/* Status + Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {isCompleted && (
            <>
              <span className="text-2xs text-green-600 font-medium">✓</span>
              {contribution && (
                <button
                  onClick={() => onExpandContribution(contribution.id)}
                  className="text-2xs text-violet-500 hover:text-violet-700"
                >
                  {isExpanded ? "▲" : "View"}
                </button>
              )}
            </>
          )}
          {isInvited && (
            <>
              <span className="text-2xs text-amber-600">↻</span>
              <button
                onClick={onOpenInviteForm}
                className="rounded bg-gray-50 px-1.5 py-0.5 text-2xs text-gray-500 hover:bg-gray-100 transition-colors"
              >
                Resend
              </button>
            </>
          )}
          {!isCompleted && !isInvited && (
            <>
              <button
                onClick={onOpenInviteForm}
                className="rounded bg-violet-50 px-1.5 py-0.5 text-2xs font-medium text-violet-600 hover:bg-violet-100 transition-colors"
              >
                Invite
              </button>
              <button
                onClick={onAIInterview}
                className="rounded bg-gray-50 px-1.5 py-0.5 text-2xs text-gray-500 hover:bg-gray-100 transition-colors"
              >
                Interview
              </button>
            </>
          )}
        </div>
      </div>

      {/* Expanded contribution detail */}
      {isExpanded && nonEmptyFields.length > 0 && (
        <div className="ml-2.5 mr-2 mb-1 rounded border border-gray-100 bg-gray-50/80 p-2">
          {nonEmptyFields.slice(0, 3).map(([key, value]) => (
            <div key={key} className="mb-1.5 last:mb-0">
              <p className="text-2xs font-medium text-gray-500">
                {FIELD_LABELS[key] ?? key.replace(/_/g, " ")}
              </p>
              <p className="text-2xs text-gray-600 leading-relaxed line-clamp-2">{value}</p>
            </div>
          ))}
          {nonEmptyFields.length > 3 && (
            <p className="text-2xs text-gray-400">+{nonEmptyFields.length - 3} more</p>
          )}
        </div>
      )}

      {/* Inline invite form */}
      {isInviteFormOpen && (
        <InviteForm
          domain={domain}
          sessionId={sessionId}
          existingEmail={invitation?.inviteeEmail}
          onCreated={(inv) => {
            onInvitationCreated(inv);
            onCloseInviteForm();
          }}
          onClose={onCloseInviteForm}
        />
      )}
    </div>
  );
}

// ── InviteForm ────────────────────────────────────────────────────────────────

interface InviteFormProps {
  domain: ContributionDomain;
  sessionId: string;
  existingEmail?: string;
  onCreated: (invitation: Invitation) => void;
  onClose: () => void;
}

function InviteForm({ domain, sessionId, existingEmail, onCreated, onClose }: InviteFormProps) {
  const [email, setEmail] = useState(existingEmail ?? "");
  const [name, setName] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [raciRole, setRaciRole] = useState<"accountable" | "responsible" | "consulted" | "informed">("consulted");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/intake/sessions/${sessionId}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain,
          inviteeEmail: email.trim(),
          inviteeName: name.trim() || undefined,
          roleTitle: roleTitle.trim() || undefined,
          raciRole,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.message ?? "Failed to send invitation");
        return;
      }

      const data = await res.json();
      onCreated(data.invitation);
    } catch {
      setError("Failed to send invitation");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="ml-2.5 mr-2 mb-2 rounded-lg border border-violet-100 bg-violet-50/40 p-3 space-y-2"
    >
      <p className="text-2xs font-semibold uppercase tracking-wider text-gray-400">
        Invite for {DOMAIN_LABELS[domain]}
      </p>

      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email address *"
        required
        className="w-full rounded border border-gray-200 bg-white px-2.5 py-1.5 text-xs placeholder-gray-300 focus:border-violet-300 focus:outline-none focus:ring-1 focus:ring-violet-400"
      />

      <div className="grid grid-cols-2 gap-1.5">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name (optional)"
          className="rounded border border-gray-200 bg-white px-2.5 py-1.5 text-xs placeholder-gray-300 focus:border-violet-300 focus:outline-none focus:ring-1 focus:ring-violet-400"
        />
        <input
          type="text"
          value={roleTitle}
          onChange={(e) => setRoleTitle(e.target.value)}
          placeholder="Role title"
          className="rounded border border-gray-200 bg-white px-2.5 py-1.5 text-xs placeholder-gray-300 focus:border-violet-300 focus:outline-none focus:ring-1 focus:ring-violet-400"
        />
      </div>

      {/* RACI role selector */}
      <div className="flex gap-1">
        {RACI_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setRaciRole(opt.value)}
            className={`flex-1 rounded border py-1 text-2xs font-medium transition-colors ${
              raciRole === opt.value
                ? RACI_COLORS[opt.value]
                : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {error && <p className="text-2xs text-red-500">{error}</p>}

      <div className="flex items-center justify-between pt-0.5">
        <button
          type="button"
          onClick={onClose}
          className="text-2xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting || !email.trim()}
          className="rounded-lg bg-violet-600 px-3 py-1.5 text-2xs font-medium text-white hover:bg-violet-700 disabled:opacity-50 transition-colors"
        >
          {submitting ? "Sending…" : "Send Invitation"}
        </button>
      </div>
    </form>
  );
}

// ── InsightCard ───────────────────────────────────────────────────────────────

const INSIGHT_ICONS: Record<string, string> = {
  synthesis: "◎",
  conflict: "⚠",
  gap: "○",
  suggestion: "◉",
};

const INSIGHT_COLORS: Record<string, string> = {
  synthesis: "text-violet-600",
  conflict: "text-amber-600",
  gap: "text-orange-500",
  suggestion: "text-blue-600",
};

function InsightCard({
  insight,
  onApprove,
  onDismiss,
  onInvite,
}: {
  insight: Insight;
  onApprove: () => void;
  onDismiss: () => void;
  onInvite?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const icon = INSIGHT_ICONS[insight.type] ?? "◉";
  const color = INSIGHT_COLORS[insight.type] ?? "text-gray-500";
  const meta = insight.metadata as { action?: string } | null;
  const isSuggestInvite = insight.type === "suggestion" && meta?.action === "invite";

  return (
    <div className="rounded-lg border border-gray-100 bg-white p-2.5">
      <div className="flex items-start gap-2">
        <span className={`text-xs shrink-0 mt-0.5 ${color}`}>{icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-700">{insight.title}</p>
          {expanded && (
            <p className="mt-1 text-xs-tight text-gray-500 leading-relaxed">{insight.body}</p>
          )}
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          aria-label={expanded ? "Collapse insight" : "Expand insight"}
          className="text-gray-300 hover:text-gray-500 shrink-0 text-2xs"
        >
          {expanded ? "▲" : "▼"}
        </button>
      </div>

      <div className="mt-2 flex items-center gap-2 pl-4">
        {isSuggestInvite && onInvite ? (
          <button
            onClick={onInvite}
            className="rounded bg-violet-50 px-2 py-0.5 text-2xs font-medium text-violet-600 hover:bg-violet-100 transition-colors"
          >
            Invite
          </button>
        ) : insight.type === "suggestion" ? (
          <button
            onClick={onApprove}
            className="rounded bg-violet-50 px-2 py-0.5 text-2xs font-medium text-violet-600 hover:bg-violet-100 transition-colors"
          >
            Approve
          </button>
        ) : null}
        <button
          onClick={onDismiss}
          className="text-2xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

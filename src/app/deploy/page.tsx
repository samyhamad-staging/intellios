"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/registry/status-badge";
import { Heading, Subheading } from "@/components/catalyst/heading";
import { SectionHeading } from "@/components/ui/section-heading";
import { Rocket } from "lucide-react";
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from "@/components/ui/table";
import { TableToolbar, Pagination } from "@/components/ui/table-toolbar";
import { DescriptionList, DescriptionTerm, DescriptionDetails } from "@/components/ui/description-list";
import { FormField } from "@/components/ui/form-field";

/**
 * Map raw AWS SDK / server error strings to actionable operator messages.
 * Called before setting the error state in the AgentCore deploy modal.
 */
function enrichAgentCoreError(raw: string): string {
  if (raw.includes("AccessDeniedException") || raw.includes("not authorized"))
    return "AWS permission denied. Verify the IAM role has 'bedrock:CreateAgent' and 'bedrock:InvokeModel' permissions. Check Admin → Settings → Deployment Targets.";
  if (raw.includes("agentResourceRoleArn") || raw.includes("Invalid agentResourceRoleArn"))
    return "Invalid IAM role ARN. Update the agentResourceRoleArn in Admin → Settings → Deployment Targets.";
  if (raw.includes("ValidationException"))
    return `AWS validation error: ${raw.replace(/^.*?ValidationException:\s*/i, "")}. Check Admin → Settings → Deployment Targets.`;
  if (raw.includes("ServiceQuotaExceededException"))
    return "AWS Bedrock agent quota exceeded. Request a quota increase in the AWS console for your region, then retry.";
  if (raw.includes("ResourceNotFoundException") || (raw.includes("model") && raw.includes("not found")))
    return "Foundation model not found or not enabled in this region. Check the foundation model ID in Admin → Settings → Deployment Targets.";
  if (raw.includes("foundationModel"))
    return "Foundation model error. Verify the model ID is correct and enabled in your AWS region via Admin → Settings → Deployment Targets.";
  if (raw.includes("did not reach PREPARED state"))
    return "Agent preparation timed out (90s). The agent may still be preparing in AWS — check the Bedrock console. If the agent is not visible there, retry the deployment.";
  if (raw.includes("AgentCore config missing") || raw.includes("Invalid agentResourceRoleArn format"))
    return `Configuration error: ${raw}. Update deployment settings in Admin → Settings → Deployment Targets.`;
  if (raw.includes("CreateAgent failed"))
    return `Agent creation failed: ${raw.replace(/^.*?CreateAgent failed:\s*/i, "")}`;
  return raw;
}

interface Agent {
  id: string;
  agentId: string;
  version: string;
  name: string | null;
  tags: string[];
  status: string;
  violationCount: number | null;
  riskTier: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DeployModalState {
  agent: Agent;
  changeRef: string;
  deploymentNotes: string;
  authorized: boolean;
  submitting: boolean;
  error: string | null;
}

interface AgentCoreModalState {
  agent: Agent;
  phase: "confirm" | "deploying" | "success" | "error";
  /** AgentCore deploy progress label shown during deployment */
  progressLabel: string;
  /** Deployment record returned on success */
  deploymentRecord: {
    agentId: string;
    agentArn: string;
    region: string;
    foundationModel: string;
    deployedAt: string;
  } | null;
  error: string | null;
}

// P1-239: Read the most recent red-team risk tier from the localStorage run history.
// Red-team run history is written by red-team-panel.tsx under the key
// `redteam-history-${blueprintId}` as an array of RunHistoryEntry objects.
function getLatestRedTeamTier(blueprintId: string): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | null {
  try {
    const raw = localStorage.getItem(`redteam-history-${blueprintId}`);
    if (!raw) return null;
    const history = JSON.parse(raw) as Array<{ riskTier?: string }>;
    if (!history.length) return null;
    const tier = history[0].riskTier;
    if (tier === "LOW" || tier === "MEDIUM" || tier === "HIGH" || tier === "CRITICAL") return tier;
    return null;
  } catch { return null; }
}

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 30) return `${diffDays} days ago`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 8) return `${diffWeeks}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

/**
 * DeployConfirmModal — captures change ticket reference, deployment notes,
 * and explicit authorization acknowledgment before promoting an agent to
 * production. All fields are stored in the audit log as deployment metadata.
 */
function DeployConfirmModal({
  modal,
  onChange,
  onConfirm,
  onCancel,
}: {
  modal: DeployModalState;
  onChange: (patch: Partial<DeployModalState>) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const changeRefRef = useRef<HTMLInputElement>(null);
  // P1-239: Check latest red-team run tier from localStorage run history
  const [redTeamTier] = useState<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | null>(
    () => getLatestRedTeamTier(modal.agent.id)
  );

  useEffect(() => {
    changeRefRef.current?.focus();
  }, []);

  const canSubmit =
    modal.changeRef.trim().length > 0 && modal.authorized && !modal.submitting;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="w-full max-w-lg rounded-2xl border border-border bg-surface shadow-2xl">
        {/* Modal header */}
        <div className="border-b border-border-subtle px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
              <Rocket size={16} />
            </span>
            <div>
              <Subheading level={2} className="text-text">Deploy to Production</Subheading>
              <p className="text-xs text-text-secondary">
                {modal.agent.name ?? `Agent ${modal.agent.agentId.slice(0, 8)}`} — v{modal.agent.version}
              </p>
            </div>
          </div>
        </div>

        {/* P1-43: Red-team risk warning — intake risk tier */}
        {(modal.agent.riskTier === "high" || modal.agent.riskTier === "critical") && (
          <div className="mx-6 mt-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <span className="mt-0.5 shrink-0 text-red-500">⚠</span>
            <div>
              <p className="text-xs font-semibold text-red-800 capitalize">
                {modal.agent.riskTier} risk tier
              </p>
              <p className="text-xs text-red-700 mt-0.5">
                This agent has been classified as <strong>{modal.agent.riskTier} risk</strong>.
                Ensure your change reference covers a completed security review and that all red-team findings have been remediated before deploying to production.
              </p>
            </div>
          </div>
        )}
        {/* P1-239: Red-team simulation result warning — blocks if HIGH or CRITICAL */}
        {(redTeamTier === "HIGH" || redTeamTier === "CRITICAL") && (
          <div className="mx-6 mt-3 flex items-start gap-3 rounded-lg border border-orange-300 bg-orange-50 px-4 py-3">
            <span className="mt-0.5 shrink-0 text-orange-600">🛡</span>
            <div>
              <p className="text-xs font-semibold text-orange-900">
                Red Team: {redTeamTier} risk findings unresolved
              </p>
              <p className="text-xs text-orange-800 mt-0.5">
                The most recent adversarial simulation returned{" "}
                <strong>{redTeamTier}</strong> risk. Review and remediate red-team
                findings in the Blueprint Studio before deploying to production.
              </p>
            </div>
          </div>
        )}

        {/* Fields */}
        <div className="space-y-5 px-6 py-5">
          {/* Change reference — required */}
          <FormField label="Change Reference Number" htmlFor="change-ref" required description="Enter the change management ticket associated with this deployment. This will be stored permanently in the audit log.">
            <input
              id="change-ref"
              ref={changeRefRef}
              type="text"
              value={modal.changeRef}
              onChange={(e) => onChange({ changeRef: e.target.value })}
              placeholder="e.g. CHG0012345"
              maxLength={100}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </FormField>

          {/* Deployment notes — optional */}
          <FormField label="Deployment Notes" htmlFor="deploy-notes" optional>
            <textarea
              id="deploy-notes"
              value={modal.deploymentNotes}
              onChange={(e) => onChange({ deploymentNotes: e.target.value })}
              placeholder="Environment, rollout plan, stakeholder sign-offs, or other relevant context…"
              maxLength={1000}
              rows={3}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 resize-none"
            />
          </FormField>

          {/* Authorization checkbox */}
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-surface-raised p-4">
            <input
              type="checkbox"
              checked={modal.authorized}
              onChange={(e) => onChange({ authorized: e.target.checked })}
              className="mt-0.5 h-4 w-4 cursor-pointer rounded border-border text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-xs text-text leading-relaxed">
              I confirm that this deployment is authorized, the change reference
              above is valid, and all required approvals have been obtained in
              accordance with the organization&apos;s change management policy.
            </span>
          </label>

          {modal.error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              {modal.error}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-border-subtle px-6 py-4">
          <button
            onClick={onCancel}
            disabled={modal.submitting}
            className="rounded-lg border border-border px-4 py-2 text-sm text-text-secondary hover:border-border-strong hover:text-text disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!canSubmit}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {modal.submitting ? "Deploying…" : "Confirm Deployment"}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * AgentCoreDeployModal — confirm + execute direct deployment to Bedrock AgentCore.
 * Shows region/model/roleARN from settings, then calls the deploy API and
 * displays a progress indicator while awaiting agent preparation.
 */
function AgentCoreDeployModal({
  agcModal,
  onClose,
  onSuccess,
}: {
  agcModal: AgentCoreModalState;
  onClose: () => void;
  onSuccess: (agentBlueprintId: string) => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && agcModal.phase !== "deploying") onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-2xl border border-border bg-surface shadow-2xl">
        {/* Header */}
        <div className="border-b border-orange-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-orange-700 text-xs font-bold">
              AC
            </span>
            <div>
              <Subheading level={2} className="text-text">Deploy to AgentCore</Subheading>
              <p className="text-xs text-text-secondary">
                {agcModal.agent.name ?? `Agent ${agcModal.agent.agentId.slice(0, 8)}`} — v{agcModal.agent.version}
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5">
          {/* P1-43: Red-team risk warning for AgentCore modal — intake risk tier */}
          {agcModal.phase === "confirm" && (agcModal.agent.riskTier === "high" || agcModal.agent.riskTier === "critical") && (
            <div className="mb-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
              <span className="mt-0.5 shrink-0 text-red-500">⚠</span>
              <div>
                <p className="text-xs font-semibold text-red-800 capitalize">
                  {agcModal.agent.riskTier} risk tier
                </p>
                <p className="text-xs text-red-700 mt-0.5">
                  This agent is classified as <strong>{agcModal.agent.riskTier} risk</strong>.
                  Confirm all red-team findings are remediated before deploying to AgentCore.
                </p>
              </div>
            </div>
          )}
          {/* P1-239: Red-team simulation result warning for AgentCore modal */}
          {agcModal.phase === "confirm" && (() => {
            const tier = getLatestRedTeamTier(agcModal.agent.id);
            return (tier === "HIGH" || tier === "CRITICAL") ? (
              <div className="mb-4 flex items-start gap-3 rounded-lg border border-orange-300 bg-orange-50 px-4 py-3">
                <span className="mt-0.5 shrink-0 text-orange-600">🛡</span>
                <div>
                  <p className="text-xs font-semibold text-orange-900">
                    Red Team: {tier} risk findings unresolved
                  </p>
                  <p className="text-xs text-orange-800 mt-0.5">
                    Adversarial simulation returned <strong>{tier}</strong> risk. Remediate red-team findings before deploying to AgentCore.
                  </p>
                </div>
              </div>
            ) : null;
          })()}
          {/* Confirm phase */}
          {agcModal.phase === "confirm" && (
            <div className="space-y-4">
              <p className="text-sm text-text">
                This will call the Amazon Bedrock Agent API to create and prepare this agent
                directly in your AWS account. No credentials are stored in Intellios.
              </p>
              <div className="rounded-lg border border-border-subtle bg-surface-raised p-4 space-y-2 text-xs">
                <p className="text-text-tertiary font-medium uppercase tracking-wider text-2xs">
                  Deployment configuration
                </p>
                <p className="text-text-secondary">
                  AWS credentials and deployment configuration (region, IAM role, model) are
                  read from{" "}
                  <a href="/admin/settings" className="underline hover:text-text">
                    Admin → Settings → Deployment Targets
                  </a>
                  .
                </p>
              </div>
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                The deployment may take up to 90 seconds while Bedrock prepares the agent.
                Do not close this window during deployment.
              </p>
            </div>
          )}

          {/* Deploying phase */}
          {agcModal.phase === "deploying" && (
            <div className="flex flex-col items-center py-6 gap-4">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-200 border-t-orange-500" />
              <p className="text-sm font-medium text-text">{agcModal.progressLabel}</p>
              <p className="text-xs text-text-tertiary">Communicating with Amazon Bedrock…</p>
            </div>
          )}

          {/* Success phase */}
          {agcModal.phase === "success" && agcModal.deploymentRecord && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-700">
                <span className="text-lg">✓</span>
                <p className="text-sm font-semibold">Agent deployed to AgentCore</p>
              </div>
              <div className="rounded-lg border border-green-100 bg-green-50 p-4 text-xs font-mono">
                <DescriptionList>
                  <DescriptionTerm className="text-text-tertiary font-mono text-xs">Agent ID</DescriptionTerm>
                  <DescriptionDetails className="text-text font-mono text-xs">{agcModal.deploymentRecord.agentId}</DescriptionDetails>
                  <DescriptionTerm className="text-text-tertiary font-mono text-xs">Region</DescriptionTerm>
                  <DescriptionDetails className="text-text font-mono text-xs">{agcModal.deploymentRecord.region}</DescriptionDetails>
                  <DescriptionTerm className="text-text-tertiary font-mono text-xs">Model</DescriptionTerm>
                  <DescriptionDetails className="text-text font-mono text-xs">{agcModal.deploymentRecord.foundationModel}</DescriptionDetails>
                  <DescriptionTerm className="text-text-tertiary font-mono text-xs">ARN</DescriptionTerm>
                  <DescriptionDetails className="text-text font-mono text-xs break-all">{agcModal.deploymentRecord.agentArn}</DescriptionDetails>
                </DescriptionList>
              </div>
              <a
                href={`https://console.aws.amazon.com/bedrock/home?region=${agcModal.deploymentRecord.region}#/agents/${agcModal.deploymentRecord.agentId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center text-xs text-orange-700 underline hover:text-orange-900"
              >
                Open in AWS Console →
              </a>
            </div>
          )}

          {/* Error phase */}
          {agcModal.phase === "error" && agcModal.error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-medium text-red-800 mb-1">Deployment failed</p>
              <p className="text-xs text-red-700">{agcModal.error}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-border-subtle px-6 py-4">
          {agcModal.phase === "confirm" && (
            <>
              <button
                onClick={onClose}
                className="rounded-lg border border-border px-4 py-2 text-sm text-text-secondary hover:border-border-strong hover:text-text transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => onSuccess(agcModal.agent.id)}
                className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 transition-colors"
              >
                Deploy to AgentCore
              </button>
            </>
          )}
          {(agcModal.phase === "success" || agcModal.phase === "error") && (
            <div className="flex items-center gap-3">
              {agcModal.phase === "success" && (
                <Link
                  href={`/registry/${agcModal.agent.agentId}`}
                  className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 transition-colors"
                >
                  View in Registry →
                </Link>
              )}
              {agcModal.phase === "error" && (
                <Link
                  href={`/registry/${agcModal.agent.agentId}`}
                  className="rounded-lg border border-border px-4 py-2 text-sm text-text-secondary hover:border-border-strong hover:text-text transition-colors"
                >
                  ← Try previous version
                </Link>
              )}
              <button
                onClick={onClose}
                className="rounded-lg border border-border px-4 py-2 text-sm text-text-secondary hover:border-border-strong hover:text-text transition-colors"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DeploymentConsolePage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<DeployModalState | null>(null);
  const [agcModal, setAgcModal] = useState<AgentCoreModalState | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetch("/api/registry")
      .then((r) => r.json())
      .then((data) => {
        setAgents(data.agents ?? []);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load agents");
        setLoading(false);
      });
  }, []);

  const deployed = agents.filter((a) => a.status === "deployed");
  const readyToDeploy = agents.filter((a) => a.status === "approved");

  // Filter deployed agents by search
  const filteredDeployed = deployed.filter((agent) =>
    (agent.name ?? agent.agentId).toLowerCase().includes(searchValue.toLowerCase()) ||
    agent.agentId.toLowerCase().includes(searchValue.toLowerCase())
  );

  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.ceil(filteredDeployed.length / ITEMS_PER_PAGE);
  const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedDeployed = filteredDeployed.slice(startIdx, startIdx + ITEMS_PER_PAGE);

  function openModal(agent: Agent) {
    setModal({
      agent,
      changeRef: "",
      deploymentNotes: "",
      authorized: false,
      submitting: false,
      error: null,
    });
  }

  function openAgcModal(agent: Agent) {
    setAgcModal({
      agent,
      phase: "confirm",
      progressLabel: "Creating agent…",
      deploymentRecord: null,
      error: null,
    });
  }

  async function handleAgcDeploy(blueprintId: string) {
    if (!agcModal) return;
    setAgcModal((m) =>
      m && { ...m, phase: "deploying", progressLabel: "Creating agent in Bedrock…" }
    );

    // Progress label cycling so the user knows things are happening
    const labels = [
      "Creating agent in Bedrock…",
      "Attaching action groups…",
      "Preparing agent…",
      "Waiting for PREPARED status…",
    ];
    let labelIdx = 0;
    const labelTimer = setInterval(() => {
      labelIdx = Math.min(labelIdx + 1, labels.length - 1);
      setAgcModal((m) => m && m.phase === "deploying" ? { ...m, progressLabel: labels[labelIdx] } : m);
    }, 7000);

    try {
      const res = await fetch(`/api/blueprints/${blueprintId}/deploy/agentcore`, {
        method: "POST",
      });
      clearInterval(labelTimer);

      const data = await res.json();
      if (!res.ok) {
        const raw = data.message ?? data.error ?? "Deployment failed";
        setAgcModal((m) => m && { ...m, phase: "error", error: enrichAgentCoreError(raw) });
        return;
      }

      const record = data.deployment;
      setAgcModal((m) =>
        m && {
          ...m,
          phase: "success",
          deploymentRecord: record,
        }
      );
      // Update agent list — mark blueprint as deployed
      setAgents((prev) =>
        prev.map((a) => (a.id === blueprintId ? { ...a, status: "deployed" } : a))
      );
    } catch (err) {
      clearInterval(labelTimer);
      setAgcModal((m) =>
        m && {
          ...m,
          phase: "error",
          error: enrichAgentCoreError(err instanceof Error ? err.message : "Deployment failed"),
        }
      );
    }
  }

  async function handleConfirmDeploy() {
    if (!modal) return;
    setModal((m) => m && { ...m, submitting: true, error: null });
    try {
      const res = await fetch(`/api/blueprints/${modal.agent.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "deployed",
          changeRef: modal.changeRef.trim(),
          deploymentNotes: modal.deploymentNotes.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message ?? "Deployment failed");
      }
      const agentId = modal.agent.id;
      setAgents((prev) =>
        prev.map((a) => (a.id === agentId ? { ...a, status: "deployed" } : a))
      );
      setModal(null);
    } catch (err) {
      setModal((m) =>
        m && { ...m, submitting: false, error: err instanceof Error ? err.message : "Deployment failed" }
      );
    }
  }

  return (
    <div className="px-6 py-6 space-y-6">
      {/* Standard deployment confirmation modal */}
      {modal && (
        <DeployConfirmModal
          modal={modal}
          onChange={(patch) => setModal((m) => m && { ...m, ...patch })}
          onConfirm={handleConfirmDeploy}
          onCancel={() => setModal(null)}
        />
      )}

      {/* AgentCore direct deploy modal */}
      {agcModal && (
        <AgentCoreDeployModal
          agcModal={agcModal}
          onClose={() => setAgcModal(null)}
          onSuccess={handleAgcDeploy}
        />
      )}

      {/* Page header */}
      <div>
        <Heading level={1}>Deployment Console</Heading>
        <p className="mt-0.5 text-sm text-text-secondary">Deployment controls and release management</p>
      </div>

      <div className="space-y-6">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* ── Summary stats ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4">
          {[
            {
              label: "Deployed",
              value: loading ? "–" : deployed.length,
              sub: "live in production",
              color: "bg-indigo-50 border-indigo-200 text-indigo-900",
              subColor: "text-indigo-600",
            },
            {
              label: "Ready to Deploy",
              value: loading ? "–" : readyToDeploy.length,
              sub: readyToDeploy.length > 0 ? "approved, awaiting deployment" : "none pending",
              color: readyToDeploy.length > 0
                ? "bg-green-50 border-green-200 text-green-900"
                : "bg-surface border-border text-text",
              subColor: readyToDeploy.length > 0 ? "text-green-600" : "text-text-tertiary",
            },
          ].map(({ label, value, sub, color, subColor }) => (
            <div key={label} className={`rounded-card border p-5 ${color}`}>
              <div className="text-3xl font-bold">{value}</div>
              <div className="mt-1 text-sm font-medium">{label}</div>
              <div className={`mt-0.5 text-xs ${subColor}`}>{sub}</div>
            </div>
          ))}
        </div>

        {/* ── Ready to deploy ─────────────────────────────────────────────── */}
        <section>
          <SectionHeading className="mb-4">
            Ready to Deploy ({loading ? "…" : readyToDeploy.length})
          </SectionHeading>

          {!loading && readyToDeploy.length === 0 && (
            <div className="rounded-card border border-dashed border-border bg-surface p-10 text-center">
              <p className="text-sm text-text-tertiary">No agents are currently approved and awaiting deployment.</p>
              <p className="mt-1 text-xs text-text-tertiary">
                Agents must pass review before they can be deployed.{" "}
                <Link href="/registry" className="underline hover:text-text-secondary">View registry →</Link>
              </p>
            </div>
          )}

          {!loading && readyToDeploy.length > 0 && (
            <div className="space-y-3">
              {readyToDeploy.map((agent) => (
                <div
                  key={agent.agentId}
                  className="flex flex-wrap items-center gap-y-3 rounded-xl border border-green-200 bg-surface px-5 py-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/registry/${agent.agentId}`}
                        className="font-medium text-text hover:underline"
                      >
                        {agent.name ?? `Agent ${agent.agentId.slice(0, 8)}`}
                      </Link>
                      <StatusBadge status={agent.status} />
                    </div>
                    <div className="mt-0.5 flex items-center gap-3 text-xs text-text-tertiary">
                      <span className="font-mono">v{agent.version}</span>
                      <span>approved {timeAgo(agent.updatedAt)}</span>
                      {agent.tags?.length > 0 && (
                        <div className="flex gap-1">
                          {agent.tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="rounded-full bg-surface-muted px-1.5 py-0.5 text-text-secondary">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {agent.violationCount !== null && agent.violationCount > 0 && (
                      <p className="mt-1 text-xs text-amber-600">
                        ⚠ {agent.violationCount} governance issue{agent.violationCount !== 1 ? "s" : ""} — review before deploying
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 ml-auto">
                    <a
                      href={`/api/blueprints/${agent.id}/export/agentcore`}
                      download
                      className="rounded-lg border border-border px-3 py-2 text-sm text-text-secondary hover:border-border-strong hover:text-text transition-colors"
                      title="Download Amazon Bedrock AgentCore deployment manifest"
                    >
                      Export for AgentCore ↓
                    </a>
                    <button
                      onClick={() => openAgcModal(agent)}
                      className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm font-medium text-orange-700 hover:border-orange-400 hover:bg-orange-100 transition-colors"
                      title="Deploy directly to Amazon Bedrock AgentCore"
                    >
                      Deploy to AgentCore…
                    </button>
                    <button
                      onClick={() => openModal(agent)}
                      className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
                    >
                      Deploy to Production…
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Live deployments ────────────────────────────────────────────── */}
        <section>
          <SectionHeading className="mb-4">
            Live in Production ({loading ? "…" : deployed.length})
          </SectionHeading>

          {loading && (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-card bg-surface-muted" />
              ))}
            </div>
          )}

          {!loading && deployed.length === 0 && (
            <div className="rounded-card border border-dashed border-border bg-surface p-10 text-center">
              <p className="text-sm text-text-tertiary">No agents are currently deployed.</p>
            </div>
          )}

          {!loading && deployed.length > 0 && (
            <div className="space-y-4">
              <TableToolbar
                searchPlaceholder="Search deployed agents…"
                searchValue={searchValue}
                onSearchChange={(val) => {
                  setSearchValue(val);
                  setCurrentPage(1);
                }}
                resultCount={filteredDeployed.length}
                resultLabel="agent"
              />
              <div className="overflow-x-auto rounded-xl border border-border bg-surface">
                <Table striped>
                  <TableHead>
                    <TableRow>
                      <TableHeader>Agent</TableHeader>
                      <TableHeader>Version</TableHeader>
                      <TableHeader>Tags</TableHeader>
                      <TableHeader>Deployed</TableHeader>
                      <TableHeader>Governance</TableHeader>
                      <TableHeader></TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedDeployed.map((agent) => (
                    <TableRow key={agent.agentId} className="interactive-row">
                      <TableCell>
                        <span className="font-medium text-text">{agent.name ?? `Agent ${agent.agentId.slice(0, 8)}`}</span>
                      </TableCell>
                      <TableCell className="font-mono text-text-secondary text-xs">v{agent.version}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(agent.tags ?? []).slice(0, 2).map((tag) => (
                            <span key={tag} className="rounded-full bg-surface-muted px-1.5 py-0.5 text-xs text-text-secondary">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-text-tertiary text-xs">{timeAgo(agent.updatedAt)}</TableCell>
                      <TableCell>
                        {agent.violationCount === 0 && (
                          <span className="text-xs font-medium text-green-600">✓ Clean</span>
                        )}
                        {agent.violationCount !== null && agent.violationCount > 0 && (
                          <span className="text-xs font-medium text-red-600">
                            {agent.violationCount} error{agent.violationCount !== 1 ? "s" : ""}
                          </span>
                        )}
                        {agent.violationCount === null && (
                          <span className="text-xs text-text-tertiary">Not validated</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-3">
                          <a
                            href={`/api/blueprints/${agent.id}/export/agentcore`}
                            download
                            className="text-xs text-text-tertiary hover:text-text underline"
                            title="Export AgentCore manifest"
                          >
                            AgentCore ↓
                          </a>
                          <Link
                            href={`/registry/${agent.agentId}`}
                            className="text-xs text-text-tertiary hover:text-text underline"
                          >
                            View →
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  </TableBody>
                </Table>
              </div>
              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

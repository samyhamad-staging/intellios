/**
 * Typed fetch helpers for React Query.
 *
 * Each function corresponds to one API route. Using these keeps components
 * free of raw fetch() calls and makes API contracts explicit.
 *
 * Error handling: throws an Error with the API's message field on non-OK
 * responses so React Query can populate the `error` state correctly.
 */

async function apiFetch<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ── Registry ──────────────────────────────────────────────────────────────────

export interface RegistryEntry {
  id: string; agentId: string; version: string; name: string | null;
  tags: string[]; status: string; sessionId: string; createdAt: string; updatedAt: string;
  monthlyCostUsd: number | null;
  violationCount: number | null;
  warningCount: number | null;
}

export interface WorkflowEntry {
  id: string; workflowId: string; version: string; name: string;
  description: string; status: string; createdAt: string; updatedAt: string;
}

export const fetchAgents = () =>
  apiFetch<{ agents: RegistryEntry[] }>("/api/registry").then((d) => d.agents ?? []);

export const fetchWorkflows = () =>
  apiFetch<{ workflows: WorkflowEntry[] }>("/api/workflows").then((d) => d.workflows ?? []);

// ── Blueprints ────────────────────────────────────────────────────────────────

export interface BlueprintEntry {
  id: string; agentId: string; version: string; name: string | null;
  status: string; createdAt: string; updatedAt: string;
}

export const fetchBlueprints = () =>
  apiFetch<{ blueprints: BlueprintEntry[] }>("/api/blueprints").then((d) => d.blueprints ?? []);

// ── Governance ────────────────────────────────────────────────────────────────

// Matches governance_policies DB columns returned by GET /api/governance/policies
export interface GovernancePolicySummary {
  id: string;
  name: string;
  type: string;
  description: string | null;
  rules: unknown[];
  enterpriseId: string | null;
  policyVersion: number;
  scopedAgentIds: string[] | null;
  createdAt: string;
}

export interface GovernanceTemplate {
  id: string; name: string; description: string; framework: string; policyCount: number;
}

export const fetchPolicies = () =>
  apiFetch<{ policies: GovernancePolicySummary[] }>("/api/governance/policies")
    .then((d) => d.policies ?? []);

export const fetchGovernanceTemplates = () =>
  apiFetch<{ packs: GovernanceTemplate[] }>("/api/governance/templates")
    .then((d) => d.packs ?? []);

export const fetchGovernanceAnalytics = (days: number) =>
  apiFetch<Record<string, unknown>>(`/api/governance/analytics?days=${days}`);

// ── Review queue ──────────────────────────────────────────────────────────────

export interface ReviewItem {
  id: string; agentId: string; version: string; name: string | null;
  status: string; submittedAt: string; assignedTo: string | null;
}

export const fetchReviewQueue = () =>
  apiFetch<{ items: ReviewItem[] }>("/api/review").then((d) => d.items ?? []);

// ── Monitor ───────────────────────────────────────────────────────────────────

export const fetchMonitorAgents = () =>
  apiFetch<{ agents: unknown[] }>("/api/monitor").then((d) => d.agents ?? []);

// ── Pipeline ──────────────────────────────────────────────────────────────────

export const fetchPipelineBoard = () =>
  apiFetch<unknown>("/api/pipeline");

// ── Audit log ─────────────────────────────────────────────────────────────────

export const fetchAuditLog = (params: Record<string, string>) => {
  const qs = new URLSearchParams(params).toString();
  return apiFetch<unknown>(`/api/audit${qs ? `?${qs}` : ""}`);
};

// ── Current user ─────────────────────────────────────────────────────────────

export const fetchMe = () =>
  apiFetch<{ user: { email: string; name: string; role: string } | null }>("/api/me")
    .then((d) => d.user ?? null);

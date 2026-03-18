"use client";

import { useState } from "react";
import { IntakeContext } from "@/lib/types/intake";

interface IntakeContextFormProps {
  sessionId: string;
  onComplete: (context: IntakeContext) => void;
}

const DEPLOYMENT_TYPE_OPTIONS = [
  { value: "internal-only", label: "Internal only", description: "Used by employees within the enterprise" },
  { value: "customer-facing", label: "Customer-facing", description: "Interacts directly with external customers" },
  { value: "partner-facing", label: "Partner-facing", description: "Used by business partners or vendors" },
  { value: "automated-pipeline", label: "Automated pipeline", description: "Runs without human interaction in a workflow" },
] as const;

const DATA_SENSITIVITY_OPTIONS = [
  { value: "public", label: "Public", description: "No restrictions — information is publicly available" },
  { value: "internal", label: "Internal", description: "For internal use only — not for public release" },
  { value: "confidential", label: "Confidential", description: "Restricted — limited distribution within the enterprise" },
  { value: "pii", label: "PII", description: "Processes personally identifiable information" },
  { value: "regulated", label: "Regulated", description: "Subject to regulatory requirements (financial, health, etc.)" },
] as const;

const REGULATORY_SCOPE_OPTIONS = [
  { value: "FINRA", label: "FINRA" },
  { value: "SOX", label: "SOX" },
  { value: "GDPR", label: "GDPR" },
  { value: "HIPAA", label: "HIPAA" },
  { value: "PCI-DSS", label: "PCI-DSS" },
  { value: "none", label: "None / not applicable" },
] as const;

const INTEGRATION_TYPE_OPTIONS = [
  { value: "internal-apis", label: "Internal APIs" },
  { value: "external-apis", label: "External / third-party APIs" },
  { value: "databases", label: "Databases" },
  { value: "file-systems", label: "File systems / document stores" },
  { value: "none", label: "None" },
] as const;

const STAKEHOLDER_OPTIONS = [
  { value: "legal", label: "Legal" },
  { value: "compliance", label: "Compliance" },
  { value: "security", label: "Security / InfoSec" },
  { value: "it", label: "IT / Engineering" },
  { value: "business-owner", label: "Business owner" },
  { value: "none", label: "Not yet consulted" },
] as const;

type DeploymentType = IntakeContext["deploymentType"];
type DataSensitivity = IntakeContext["dataSensitivity"];
type RegulatoryScope = IntakeContext["regulatoryScope"][number];
type IntegrationTypes = IntakeContext["integrationTypes"][number];
type StakeholdersConsulted = IntakeContext["stakeholdersConsulted"][number];

function toggleArrayItem<T extends string>(arr: T[], value: T): T[] {
  if (arr.includes(value)) return arr.filter((v) => v !== value);
  return [...arr, value];
}

export function IntakeContextForm({ sessionId, onComplete }: IntakeContextFormProps) {
  const [agentPurpose, setAgentPurpose] = useState("");
  const [deploymentType, setDeploymentType] = useState<DeploymentType | "">("");
  const [dataSensitivity, setDataSensitivity] = useState<DataSensitivity | "">("");
  const [regulatoryScope, setRegulatoryScope] = useState<RegulatoryScope[]>([]);
  const [integrationTypes, setIntegrationTypes] = useState<IntegrationTypes[]>([]);
  const [stakeholdersConsulted, setStakeholdersConsulted] = useState<StakeholdersConsulted[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid =
    agentPurpose.trim().length >= 10 &&
    deploymentType !== "" &&
    dataSensitivity !== "" &&
    regulatoryScope.length > 0 &&
    integrationTypes.length > 0 &&
    stakeholdersConsulted.length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || submitting) return;

    setSubmitting(true);
    setError(null);

    const context: IntakeContext = {
      agentPurpose: agentPurpose.trim(),
      deploymentType: deploymentType as DeploymentType,
      dataSensitivity: dataSensitivity as DataSensitivity,
      regulatoryScope,
      integrationTypes,
      stakeholdersConsulted,
    };

    try {
      const res = await fetch(`/api/intake/sessions/${sessionId}/context`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(context),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "Failed to save context");
      }
      onComplete(context);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save context");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 overflow-auto bg-gray-50">
      <div className="mx-auto w-full max-w-2xl px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
            Step 1 of 3 — Context
          </div>
          <h2 className="text-2xl font-semibold text-gray-900">Tell us about the agent you need</h2>
          <p className="mt-2 text-sm text-gray-500">
            This context enables the intake conversation to ask the right governance and compliance questions for your enterprise environment.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Agent purpose */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <label className="block text-sm font-medium text-gray-900 mb-1">
              What should this agent do? <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-500 mb-3">
              One or two sentences describing the agent's purpose and the problem it solves.
            </p>
            <textarea
              value={agentPurpose}
              onChange={(e) => setAgentPurpose(e.target.value)}
              rows={3}
              placeholder="e.g. Answer customer questions about account balances and recent transactions using data from our core banking API…"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
            />
            {agentPurpose.trim().length > 0 && agentPurpose.trim().length < 10 && (
              <p className="mt-1 text-xs text-red-500">Please provide at least 10 characters.</p>
            )}
          </div>

          {/* Deployment type */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Who will interact with this agent? <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-500 mb-3">
              Determines the scope of safety and access-control requirements.
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {DEPLOYMENT_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDeploymentType(opt.value)}
                  className={`rounded-lg border p-3 text-left transition-colors ${
                    deploymentType === opt.value
                      ? "border-blue-500 bg-blue-50 text-blue-900"
                      : "border-gray-200 bg-white hover:border-gray-300 text-gray-700"
                  }`}
                >
                  <div className="text-sm font-medium">{opt.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{opt.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Data sensitivity */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <label className="block text-sm font-medium text-gray-900 mb-1">
              What is the highest data sensitivity level this agent will handle? <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-500 mb-3">
              Drives mandatory data handling and PII governance policies.
            </p>
            <div className="flex flex-col gap-2">
              {DATA_SENSITIVITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDataSensitivity(opt.value)}
                  className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                    dataSensitivity === opt.value
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <div
                    className={`h-3 w-3 shrink-0 rounded-full border-2 ${
                      dataSensitivity === opt.value
                        ? "border-blue-500 bg-blue-500"
                        : "border-gray-300 bg-white"
                    }`}
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900">{opt.label}</div>
                    <div className="text-xs text-gray-500">{opt.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Regulatory scope */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Which regulatory frameworks apply? <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-500 mb-3">
              Select all that apply. Compliance policies will be required for each selected framework.
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {REGULATORY_SCOPE_OPTIONS.map((opt) => {
                const selected = regulatoryScope.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRegulatoryScope((prev) => toggleArrayItem(prev, opt.value))}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                      selected
                        ? "border-blue-500 bg-blue-50 text-blue-900"
                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Integration types */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <label className="block text-sm font-medium text-gray-900 mb-1">
              What systems will this agent integrate with? <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-500 mb-3">
              Select all that apply. External API integrations require access-control policies.
            </p>
            <div className="flex flex-col gap-2">
              {INTEGRATION_TYPE_OPTIONS.map((opt) => {
                const selected = integrationTypes.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setIntegrationTypes((prev) => toggleArrayItem(prev, opt.value))}
                    className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                      selected
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    <div
                      className={`h-4 w-4 shrink-0 rounded border-2 flex items-center justify-center ${
                        selected ? "border-blue-500 bg-blue-500" : "border-gray-300 bg-white"
                      }`}
                    >
                      {selected && (
                        <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 10 10">
                          <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <span className="text-sm text-gray-900">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Stakeholders consulted */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Which stakeholders have been consulted? <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-500 mb-3">
              This information is recorded in the MRM compliance report for audit purposes.
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {STAKEHOLDER_OPTIONS.map((opt) => {
                const selected = stakeholdersConsulted.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setStakeholdersConsulted((prev) => toggleArrayItem(prev, opt.value))}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                      selected
                        ? "border-blue-500 bg-blue-50 text-blue-900"
                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Submit */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!isValid || submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {submitting && (
                <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {submitting ? "Submitting…" : "Start intake conversation →"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

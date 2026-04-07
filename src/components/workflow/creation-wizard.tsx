"use client";

/**
 * Guided Workflow Creation Wizard — Phase 2
 *
 * Multi-step dialog that walks architects through:
 *   Step 1: Name & description + optional template selection
 *   Step 2: Agent selection from the registry
 *   Step 3: Handoff rule definition between agents
 *   Step 4: Shared context configuration
 *   Step 5: Review & create
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogActions,
} from "@/components/catalyst/dialog";
import { Button } from "@/components/catalyst/button";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Search,
  Bot,
  ArrowRight,
  Plus,
  Trash2,
  AlertTriangle,
  GitBranch,
  Layers,
  LayoutTemplate,
  FileText,
} from "lucide-react";
import type {
  WorkflowDefinition,
  WorkflowAgent,
  HandoffRule,
  SharedContextField,
} from "@/lib/types/workflow";

// ─── Types ───────────────────────────────────────────────────────────────────

interface WizardProps {
  open: boolean;
  onClose: () => void;
  /** Called when the wizard completes — receives the created definition */
  onComplete: (definition: WorkflowDefinition) => Promise<void>;
}

interface RegistryAgent {
  id: string;
  agentId: string;
  name: string | null;
  status: string;
  tags: string[];
}

interface TemplateOption {
  id: string;
  name: string;
  description: string;
  category: string;
  agentCount: number;
  pattern: string;
}

type WizardStep = 1 | 2 | 3 | 4 | 5;

const STEP_LABELS: Record<WizardStep, string> = {
  1: "Basics",
  2: "Agents",
  3: "Handoff Rules",
  4: "Shared Context",
  5: "Review",
};

const STEP_ICONS: Record<WizardStep, React.ComponentType<{ size?: number; className?: string }>> = {
  1: FileText,
  2: Bot,
  3: ArrowRight,
  4: Layers,
  5: Check,
};

const CONTEXT_TYPES = ["string", "number", "boolean", "json"] as const;

// ─── Wizard Component ────────────────────────────────────────────────────────

export function WorkflowCreationWizard({ open, onClose, onComplete }: WizardProps) {
  const [step, setStep] = useState<WizardStep>(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1 — Basics
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [templateSearch, setTemplateSearch] = useState("");

  // Step 2 — Agents
  const [availableAgents, setAvailableAgents] = useState<RegistryAgent[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(false);
  const [selectedAgents, setSelectedAgents] = useState<WorkflowAgent[]>([]);
  const [agentSearch, setAgentSearch] = useState("");

  // Step 3 — Handoff Rules
  const [handoffRules, setHandoffRules] = useState<HandoffRule[]>([]);

  // Step 4 — Shared Context
  const [sharedContext, setSharedContext] = useState<SharedContextField[]>([]);

  // ── Reset on open ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      setStep(1);
      setName("");
      setDescription("");
      setSelectedTemplate(null);
      setTemplateSearch("");
      setSelectedAgents([]);
      setAgentSearch("");
      setHandoffRules([]);
      setSharedContext([]);
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  // ── Load templates ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    fetch("/api/workflows/templates")
      .then((r) => r.json())
      .then((d) => setTemplates(d.templates ?? []))
      .catch(() => {});
  }, [open]);

  // ── Load available agents ──────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    setAgentsLoading(true);
    fetch("/api/registry")
      .then((r) => r.json())
      .then((d) => {
        const agents = (d.agents ?? []).filter(
          (a: RegistryAgent) => a.status === "approved" || a.status === "deployed"
        );
        setAvailableAgents(agents);
      })
      .catch(() => {})
      .finally(() => setAgentsLoading(false));
  }, [open]);

  // ── Apply template ─────────────────────────────────────────────────────────
  const applyTemplate = useCallback(
    (templateId: string) => {
      const tpl = templates.find((t) => t.id === templateId);
      if (!tpl) return;
      setSelectedTemplate(templateId);

      // Fetch the full template definition
      fetch(`/api/workflows/templates?q=${encodeURIComponent(tpl.name)}`)
        .then((r) => r.json())
        .then((d) => {
          const full = (d.templates ?? []).find((t: { id: string }) => t.id === templateId);
          if (full?.definition) {
            setSelectedAgents(full.definition.agents ?? []);
            setHandoffRules(full.definition.handoffRules ?? []);
            setSharedContext(full.definition.sharedContext ?? []);
            if (!name) setName(full.name);
            if (!description) setDescription(full.description);
          }
        })
        .catch(() => {});
    },
    [templates, name, description]
  );

  // ── Filtered templates ─────────────────────────────────────────────────────
  const filteredTemplates = useMemo(() => {
    if (!templateSearch) return templates;
    const q = templateSearch.toLowerCase();
    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
    );
  }, [templates, templateSearch]);

  // ── Filtered available agents ──────────────────────────────────────────────
  const filteredAvailable = useMemo(() => {
    const alreadySelected = new Set(selectedAgents.map((a) => a.agentId));
    let list = availableAgents.filter((a) => !alreadySelected.has(a.agentId));
    if (agentSearch) {
      const q = agentSearch.toLowerCase();
      list = list.filter(
        (a) =>
          (a.name?.toLowerCase().includes(q) ?? false) ||
          a.agentId.toLowerCase().includes(q) ||
          a.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }
    return list;
  }, [availableAgents, selectedAgents, agentSearch]);

  // ── Agent helpers ──────────────────────────────────────────────────────────
  const addAgent = (agent: RegistryAgent) => {
    setSelectedAgents((prev) => [
      ...prev,
      { agentId: agent.agentId, role: agent.name ?? "Agent", required: true },
    ]);
  };

  const removeAgent = (agentId: string) => {
    setSelectedAgents((prev) => prev.filter((a) => a.agentId !== agentId));
    // Also remove handoff rules referencing this agent
    setHandoffRules((prev) =>
      prev.filter((r) => r.from !== agentId && r.to !== agentId)
    );
  };

  const updateAgentRole = (agentId: string, role: string) => {
    setSelectedAgents((prev) =>
      prev.map((a) => (a.agentId === agentId ? { ...a, role } : a))
    );
  };

  const toggleRequired = (agentId: string) => {
    setSelectedAgents((prev) =>
      prev.map((a) =>
        a.agentId === agentId ? { ...a, required: !a.required } : a
      )
    );
  };

  // ── Handoff rule helpers ───────────────────────────────────────────────────
  const allNodes = useMemo(() => {
    const nodes = [
      { id: "start", label: "Start" },
      ...selectedAgents.map((a) => ({ id: a.agentId, label: a.role })),
      { id: "human_review", label: "Human Review" },
      { id: "end", label: "End" },
    ];
    return nodes;
  }, [selectedAgents]);

  const addHandoffRule = () => {
    setHandoffRules((prev) => [
      ...prev,
      { from: "start", to: selectedAgents[0]?.agentId ?? "end", condition: "always", priority: prev.length },
    ]);
  };

  const updateRule = (index: number, field: keyof HandoffRule, value: string | number) => {
    setHandoffRules((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value } : r))
    );
  };

  const removeRule = (index: number) => {
    setHandoffRules((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Shared context helpers ─────────────────────────────────────────────────
  const addContextField = () => {
    setSharedContext((prev) => [
      ...prev,
      { field: "", type: "string", description: "" },
    ]);
  };

  const updateContextField = (
    index: number,
    field: keyof SharedContextField,
    value: string
  ) => {
    setSharedContext((prev) =>
      prev.map((f, i) => (i === index ? { ...f, [field]: value } : f))
    );
  };

  const removeContextField = (index: number) => {
    setSharedContext((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Validation ─────────────────────────────────────────────────────────────
  const stepValid = useMemo(() => {
    switch (step) {
      case 1:
        return name.trim().length > 0;
      case 2:
        return selectedAgents.length >= 1;
      case 3:
        return handoffRules.length >= 1;
      case 4:
        return true; // Shared context is optional
      case 5:
        return true;
    }
  }, [step, name, selectedAgents, handoffRules]);

  // ── Build definition ───────────────────────────────────────────────────────
  const buildDefinition = (): WorkflowDefinition => ({
    version: "1.0.0",
    name: name.trim(),
    description: description.trim(),
    agents: selectedAgents,
    handoffRules,
    sharedContext: sharedContext.filter((f) => f.field.trim().length > 0),
  });

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await onComplete(buildDefinition());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create orchestration");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Navigation ─────────────────────────────────────────────────────────────
  const goNext = () => {
    if (step < 5) setStep((step + 1) as WizardStep);
  };
  const goBack = () => {
    if (step > 1) setStep((step - 1) as WizardStep);
  };

  // ── Auto-scaffold handoff rules when entering step 3 ──────────────────────
  useEffect(() => {
    if (step === 3 && handoffRules.length === 0 && selectedAgents.length > 0) {
      // Auto-generate a basic sequential chain: start → A1 → A2 → ... → end
      const rules: HandoffRule[] = [];
      rules.push({
        from: "start",
        to: selectedAgents[0].agentId,
        condition: "always",
        priority: 0,
      });
      for (let i = 0; i < selectedAgents.length - 1; i++) {
        rules.push({
          from: selectedAgents[i].agentId,
          to: selectedAgents[i + 1].agentId,
          condition: "always",
          priority: 0,
        });
      }
      rules.push({
        from: selectedAgents[selectedAgents.length - 1].agentId,
        to: "end",
        condition: "always",
        priority: 0,
      });
      setHandoffRules(rules);
    }
  }, [step, handoffRules.length, selectedAgents]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Create Orchestration</DialogTitle>
      <DialogDescription>
        {/* Stepper */}
        <div className="flex items-center gap-1 mt-2">
          {([1, 2, 3, 4, 5] as WizardStep[]).map((s) => {
            const Icon = STEP_ICONS[s];
            const active = s === step;
            const done = s < step;
            return (
              <div key={s} className="flex items-center gap-1">
                {s > 1 && (
                  <div className={`h-px w-4 ${done ? "bg-violet-400" : "bg-border"}`} />
                )}
                <button
                  onClick={() => s < step && setStep(s)}
                  disabled={s > step}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                    active
                      ? "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800"
                      : done
                      ? "bg-violet-50 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400 cursor-pointer hover:bg-violet-100"
                      : "bg-surface-muted text-text-tertiary"
                  }`}
                >
                  {done ? (
                    <Check size={10} className="text-violet-500" />
                  ) : (
                    <Icon size={10} />
                  )}
                  {STEP_LABELS[s]}
                </button>
              </div>
            );
          })}
        </div>
      </DialogDescription>

      <DialogBody>
        <div className="min-h-[320px]">
          {/* ── Step 1: Basics ─────────────────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-text mb-1">
                  Name <span className="text-red-500 dark:text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Customer Support Pipeline"
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder-text-tertiary focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/20"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">
                  Description{" "}
                  <span className="text-text-tertiary font-normal">(optional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the purpose and agents involved…"
                  rows={2}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder-text-tertiary focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/20 resize-none"
                />
              </div>

              {/* Template picker */}
              {templates.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-text mb-2">
                    <LayoutTemplate size={12} className="inline mr-1 text-violet-500" />
                    Start from a template{" "}
                    <span className="text-text-tertiary font-normal">(optional)</span>
                  </label>
                  {templates.length > 4 && (
                    <div className="relative mb-2">
                      <Search
                        size={12}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary"
                      />
                      <input
                        type="text"
                        value={templateSearch}
                        onChange={(e) => setTemplateSearch(e.target.value)}
                        placeholder="Search templates…"
                        className="w-full rounded-lg border border-border bg-surface pl-7 pr-3 py-1.5 text-xs text-text placeholder-text-tertiary focus:border-violet-500 focus:outline-none"
                      />
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                    {filteredTemplates.map((tpl) => (
                      <button
                        key={tpl.id}
                        onClick={() => applyTemplate(tpl.id)}
                        className={`text-left rounded-lg border p-2.5 transition-colors ${
                          selectedTemplate === tpl.id
                            ? "border-violet-400 bg-violet-50 dark:bg-violet-950/30"
                            : "border-border hover:border-violet-200 dark:hover:border-violet-800 hover:bg-surface-raised"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <GitBranch size={10} className="text-violet-500 dark:text-violet-400 shrink-0" />
                          <span className="text-xs font-medium text-text truncate">
                            {tpl.name}
                          </span>
                        </div>
                        <p className="text-xs text-text-tertiary line-clamp-2">
                          {tpl.description}
                        </p>
                        <div className="flex gap-2 mt-1 text-xs text-text-tertiary">
                          <span>{tpl.agentCount} agents</span>
                          <span>·</span>
                          <span>{tpl.pattern}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Step 2: Agent Selection ───────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-4">
              {/* Selected agents */}
              {selectedAgents.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">
                    Selected Agents ({selectedAgents.length})
                  </label>
                  <div className="space-y-2">
                    {selectedAgents.map((agent) => (
                      <div
                        key={agent.agentId}
                        className="flex items-center gap-2 rounded-lg border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/30 px-3 py-2"
                      >
                        <Bot size={12} className="text-violet-500 dark:text-violet-400 shrink-0" />
                        <input
                          type="text"
                          value={agent.role}
                          onChange={(e) =>
                            updateAgentRole(agent.agentId, e.target.value)
                          }
                          className="flex-1 bg-transparent border-none text-xs font-medium text-text outline-none placeholder-text-tertiary"
                          placeholder="Role in this orchestration…"
                        />
                        <button
                          onClick={() => toggleRequired(agent.agentId)}
                          className={`text-xs px-1.5 py-0.5 rounded transition-colors ${
                            agent.required
                              ? "bg-violet-200 dark:bg-violet-800/40 text-violet-700 dark:text-violet-200"
                              : "bg-surface-muted text-text-tertiary"
                          }`}
                          title={agent.required ? "Required" : "Optional"}
                        >
                          {agent.required ? "Required" : "Optional"}
                        </button>
                        <button
                          onClick={() => removeAgent(agent.agentId)}
                          className="text-text-tertiary hover:text-red-500 dark:hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Available agents search + list */}
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  Available Agents
                </label>
                <div className="relative mb-2">
                  <Search
                    size={12}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary"
                  />
                  <input
                    type="text"
                    value={agentSearch}
                    onChange={(e) => setAgentSearch(e.target.value)}
                    placeholder="Search approved agents…"
                    className="w-full rounded-lg border border-border bg-surface pl-7 pr-3 py-1.5 text-xs text-text placeholder-text-tertiary focus:border-violet-500 focus:outline-none"
                  />
                </div>
                {agentsLoading ? (
                  <div className="text-xs text-text-tertiary py-4 text-center">
                    Loading agents…
                  </div>
                ) : filteredAvailable.length === 0 ? (
                  <div className="text-xs text-text-tertiary py-4 text-center">
                    {availableAgents.length === 0
                      ? "No approved agents available. Approve agents in the registry first."
                      : "All available agents have been added."}
                  </div>
                ) : (
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {filteredAvailable.map((agent) => (
                      <button
                        key={agent.agentId}
                        onClick={() => addAgent(agent)}
                        className="w-full flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-left hover:border-violet-200 dark:hover:border-violet-800 hover:bg-surface-raised transition-colors"
                      >
                        <Bot size={12} className="text-text-tertiary shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-medium text-text truncate block">
                            {agent.name ?? "Unnamed Agent"}
                          </span>
                          <span className="text-xs text-text-tertiary">
                            {agent.agentId.slice(0, 8)}
                          </span>
                        </div>
                        <Plus size={12} className="text-violet-500 dark:text-violet-400 shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Step 3: Handoff Rules ─────────────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-xs text-text-secondary">
                Define how control flows between agents. Rules are evaluated by
                priority (lower = first). A sequential chain has been
                pre-populated based on your agent order.
              </p>

              {handoffRules.length === 0 && (
                <div className="text-xs text-text-tertiary py-4 text-center">
                  No rules yet. Add at least one handoff rule.
                </div>
              )}

              <div className="space-y-2 max-h-56 overflow-y-auto">
                {handoffRules.map((rule, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 rounded-lg border border-border bg-surface-raised p-2.5"
                  >
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <select
                          value={rule.from}
                          onChange={(e) => updateRule(i, "from", e.target.value)}
                          className="rounded border border-border bg-surface px-2 py-1 text-xs text-text"
                        >
                          {allNodes.map((n) => (
                            <option key={n.id} value={n.id}>
                              {n.label}
                            </option>
                          ))}
                        </select>
                        <ArrowRight size={12} className="text-text-tertiary shrink-0" />
                        <select
                          value={rule.to}
                          onChange={(e) => updateRule(i, "to", e.target.value)}
                          className="rounded border border-border bg-surface px-2 py-1 text-xs text-text"
                        >
                          {allNodes.map((n) => (
                            <option key={n.id} value={n.id}>
                              {n.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={rule.condition}
                          onChange={(e) =>
                            updateRule(i, "condition", e.target.value)
                          }
                          placeholder="Condition (e.g. 'always' or 'status === done')"
                          className="flex-1 rounded border border-border bg-surface px-2 py-1 text-xs text-text placeholder-text-tertiary font-mono"
                        />
                        <input
                          type="number"
                          value={rule.priority}
                          onChange={(e) =>
                            updateRule(i, "priority", parseInt(e.target.value) || 0)
                          }
                          className="w-14 rounded border border-border bg-surface px-2 py-1 text-xs text-text text-center"
                          title="Priority (lower = first)"
                          min={0}
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => removeRule(i)}
                      className="text-text-tertiary hover:text-red-500 dark:hover:text-red-400 transition-colors mt-1"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={addHandoffRule}
                className="inline-flex items-center gap-1 text-xs text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 font-medium"
              >
                <Plus size={12} />
                Add Handoff Rule
              </button>
            </div>
          )}

          {/* ── Step 4: Shared Context ────────────────────────────────────── */}
          {step === 4 && (
            <div className="space-y-4">
              <p className="text-xs text-text-secondary">
                Define the shared context fields that agents will read from and
                write to during orchestration. This is optional but recommended
                for multi-agent coordination.
              </p>

              {sharedContext.length === 0 && (
                <div className="text-xs text-text-tertiary py-4 text-center">
                  No shared context fields. You can add them now or configure
                  later.
                </div>
              )}

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {sharedContext.map((field, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 rounded-lg border border-border bg-surface-raised p-2.5"
                  >
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={field.field}
                          onChange={(e) =>
                            updateContextField(i, "field", e.target.value)
                          }
                          placeholder="Field path (e.g. customer.riskScore)"
                          className="flex-1 rounded border border-border bg-surface px-2 py-1 text-xs text-text font-mono placeholder-text-tertiary"
                        />
                        <select
                          value={field.type}
                          onChange={(e) =>
                            updateContextField(i, "type", e.target.value)
                          }
                          className="rounded border border-border bg-surface px-2 py-1 text-xs text-text"
                        >
                          {CONTEXT_TYPES.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </div>
                      <input
                        type="text"
                        value={field.description}
                        onChange={(e) =>
                          updateContextField(i, "description", e.target.value)
                        }
                        placeholder="Description of this field…"
                        className="w-full rounded border border-border bg-surface px-2 py-1 text-xs text-text placeholder-text-tertiary"
                      />
                    </div>
                    <button
                      onClick={() => removeContextField(i)}
                      className="text-text-tertiary hover:text-red-500 dark:hover:text-red-400 transition-colors mt-1"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={addContextField}
                className="inline-flex items-center gap-1 text-xs text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 font-medium"
              >
                <Plus size={12} />
                Add Context Field
              </button>
            </div>
          )}

          {/* ── Step 5: Review ────────────────────────────────────────────── */}
          {step === 5 && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="rounded-lg border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/30 p-3 space-y-2">
                <div>
                  <span className="text-xs text-text-tertiary">Name</span>
                  <p className="text-sm font-medium text-text">{name}</p>
                </div>
                {description && (
                  <div>
                    <span className="text-xs text-text-tertiary">Description</span>
                    <p className="text-xs text-text">{description}</p>
                  </div>
                )}
              </div>

              {/* Agents */}
              <div>
                <span className="text-xs font-medium text-text-secondary">
                  Agents ({selectedAgents.length})
                </span>
                <div className="mt-1 space-y-1">
                  {selectedAgents.map((a) => (
                    <div
                      key={a.agentId}
                      className="flex items-center gap-2 text-xs"
                    >
                      <Bot size={10} className="text-violet-500" />
                      <span className="text-text">{a.role}</span>
                      {a.required && (
                        <span className="text-xs text-violet-600 dark:text-violet-400">(required)</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Handoff Rules */}
              <div>
                <span className="text-xs font-medium text-text-secondary">
                  Handoff Rules ({handoffRules.length})
                </span>
                <div className="mt-1 space-y-1">
                  {handoffRules.map((r, i) => {
                    const fromLabel =
                      allNodes.find((n) => n.id === r.from)?.label ?? r.from;
                    const toLabel =
                      allNodes.find((n) => n.id === r.to)?.label ?? r.to;
                    return (
                      <div
                        key={i}
                        className="flex items-center gap-1.5 text-xs text-text"
                      >
                        <span className="font-mono text-violet-600 dark:text-violet-400">
                          {fromLabel}
                        </span>
                        <ArrowRight size={10} className="text-text-tertiary" />
                        <span className="font-mono text-violet-600 dark:text-violet-400">
                          {toLabel}
                        </span>
                        <span className="text-text-tertiary ml-1">
                          when {r.condition}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Shared Context */}
              {sharedContext.length > 0 && (
                <div>
                  <span className="text-xs font-medium text-text-secondary">
                    Shared Context ({sharedContext.length} fields)
                  </span>
                  <div className="mt-1 space-y-1">
                    {sharedContext
                      .filter((f) => f.field.trim())
                      .map((f, i) => (
                        <div key={i} className="text-xs text-text">
                          <span className="font-mono text-violet-600 dark:text-violet-400">
                            {f.field}
                          </span>
                          <span className="text-text-tertiary ml-1">
                            ({f.type})
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Warnings */}
              {handoffRules.every(
                (r) => r.condition === "always" || r.condition === "true"
              ) &&
                selectedAgents.length > 2 && (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-2.5 text-xs text-amber-800 dark:text-amber-200">
                    <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                    <span>
                      All handoff rules use unconditional transitions. Consider
                      adding conditions for branching or error handling.
                    </span>
                  </div>
                )}

              {error && (
                <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
              )}
            </div>
          )}
        </div>
      </DialogBody>

      <DialogActions>
        <div className="flex w-full items-center justify-between">
          <div>
            {step > 1 && (
              <Button plain onClick={goBack} disabled={submitting}>
                <ChevronLeft size={14} />
                Back
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button plain onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            {step < 5 ? (
              <Button
                color="violet"
                onClick={goNext}
                disabled={!stepValid}
              >
                Next
                <ChevronRight size={14} />
              </Button>
            ) : (
              <Button
                color="violet"
                onClick={handleSubmit}
                disabled={submitting || !name.trim()}
              >
                {submitting ? "Creating…" : "Create Orchestration"}
              </Button>
            )}
          </div>
        </div>
      </DialogActions>
    </Dialog>
  );
}

"use client";

import { useState, useRef, useCallback, useEffect, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  X,
  LayoutTemplate,
  MessageSquare,
  Shield,
  ArrowRight,
  Zap,
  ArrowLeft,
  Wrench,
  Tag,
  Copy,
  Search,
} from "lucide-react";
import { BLUEPRINT_TEMPLATES } from "@/lib/templates/blueprint-templates";

// ── Starter ideas (for "Describe" tab) ───────────────────────────────────────

const STARTER_IDEAS = [
  { label: "Customer support agent",    purpose: "A customer-facing support agent that handles inquiries, resolves common issues, and escalates complex cases to human agents. Integrates with our CRM and knowledge base." },
  { label: "Internal knowledge base",   purpose: "An internal assistant that helps employees find information across our company wiki, policy documents, and internal APIs. Handles confidential company data." },
  { label: "Data analysis & reporting", purpose: "An automated data analysis agent that connects to our databases, runs reports, and generates insights for business stakeholders. Processes internal financial data." },
  { label: "Compliance monitoring",     purpose: "An agent that monitors transactions and activities for regulatory compliance, flags potential violations, and generates compliance reports for auditors." },
] as const;

// ── Tab type ─────────────────────────────────────────────────────────────────

type Tab = "describe" | "templates" | "clone";

// ── Clone tab types ───────────────────────────────────────────────────────────

interface BlueprintListItem {
  id: string;
  agentId: string;
  name: string;
  status: string;
  version: string;
  updatedAt: string;
}

// ── P2-169: Template preview (import at module scope) ─────────────────────────

import type { BlueprintTemplate } from "@/lib/templates/blueprint-templates";

// ── Governance tier styling ──────────────────────────────────────────────────

const TIER_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  standard:  { bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-700 dark:text-emerald-300", label: "Standard" },
  enhanced:  { bg: "bg-amber-50 dark:bg-amber-950/30",   text: "text-amber-700 dark:text-amber-300",   label: "Enhanced" },
  critical:  { bg: "bg-red-50 dark:bg-red-950/30",     text: "text-red-700 dark:text-red-300",     label: "Critical" },
};

const CATEGORY_LABELS: Record<string, string> = {
  "financial-services": "Financial Services",
  compliance: "Compliance",
  operations: "Operations",
  hr: "HR",
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface QuickStartModalProps {
  onClose: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function QuickStartModal({ onClose }: QuickStartModalProps) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("describe");
  const [purpose, setPurpose] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // P2-169: template preview state
  const [previewTemplate, setPreviewTemplate] = useState<BlueprintTemplate | null>(null);

  // P2-123: clone tab state
  const [cloneAgents, setCloneAgents] = useState<BlueprintListItem[]>([]);
  const [cloneLoading, setCloneLoading] = useState(false);
  const [cloneSearch, setCloneSearch] = useState("");
  const [selectedCloneId, setSelectedCloneId] = useState<string | null>(null);
  const [cloneName, setCloneName] = useState("");
  const [cloning, setCloning] = useState(false);
  const [cloneError, setCloneError] = useState<string | null>(null);

  const purposeTrimmed = purpose.trim();
  const canSubmit = purposeTrimmed.length >= 10 && !creating;

  // P2-123: Fetch agents when clone tab opens
  useEffect(() => {
    if (tab !== "clone" || cloneAgents.length > 0 || cloneLoading) return;
    setCloneLoading(true);
    fetch("/api/blueprints")
      .then((r) => r.json())
      .then((d) => { setCloneAgents(d.blueprints ?? []); setCloneLoading(false); })
      .catch(() => setCloneLoading(false));
  }, [tab, cloneAgents.length, cloneLoading]);

  // ── Handlers (Describe tab) ───────────────────────────────────────────────

  async function handleStart() {
    if (!canSubmit) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/intake/sessions", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { message?: string }).message ?? `HTTP ${res.status}`);
      }
      const session = await res.json();
      router.push(`/intake/${session.id}?purpose=${encodeURIComponent(purposeTrimmed)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start a session.");
      setCreating(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleStart();
    }
    if (e.key === "Escape") onClose();
  }

  function handleInput() {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
    }
  }

  const handleStarterClick = useCallback((starterPurpose: string) => {
    setPurpose(starterPurpose);
    setTimeout(() => {
      const el = textareaRef.current;
      if (el) {
        el.style.height = "auto";
        el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
        el.focus();
      }
    }, 0);
  }, []);

  // ── Handler (Templates tab) ───────────────────────────────────────────────

  function handleTemplateUse(templateId: string) {
    router.push(`/intake/express/${templateId}`);
    onClose();
  }

  function handleTemplateClick(template: BlueprintTemplate) {
    setPreviewTemplate(template);
  }

  // ── Handler (Clone tab) ───────────────────────────────────────────────────

  function handleCloneSelect(agent: BlueprintListItem) {
    setSelectedCloneId(agent.id);
    setCloneName(`Copy of ${agent.name}`);
    setCloneError(null);
  }

  async function handleClone() {
    if (!selectedCloneId || !cloneName.trim()) return;
    setCloning(true);
    setCloneError(null);
    try {
      const res = await fetch(`/api/blueprints/${selectedCloneId}/clone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: cloneName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error((data as { message?: string }).message ?? `HTTP ${res.status}`);
      router.push(`/blueprints/${data.id}`);
      onClose();
    } catch (err) {
      setCloneError(err instanceof Error ? err.message : "Clone failed.");
      setCloning(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-xl rounded-2xl border border-border bg-surface shadow-2xl">

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-lg p-1.5 text-text-tertiary hover:bg-surface-muted hover:text-text transition-colors"
          aria-label="Close"
        >
          <X size={15} />
        </button>

        <div className="p-7">
          {/* Header */}
          <div className="mb-5 flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Sparkles size={16} className="text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-text">Create a new agent</h2>
              <p className="mt-0.5 text-xs text-text-secondary">
                Describe your idea from scratch, or start from a proven template.
              </p>
            </div>
          </div>

          {/* Tab switcher */}
          <div className="mb-5 flex rounded-lg bg-surface-muted p-0.5">
            <button
              onClick={() => setTab("describe")}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs font-medium transition-all ${
                tab === "describe"
                  ? "bg-surface text-text shadow-sm"
                  : "text-text-secondary hover:text-text"
              }`}
            >
              <MessageSquare size={13} />
              Describe
            </button>
            <button
              onClick={() => setTab("templates")}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs font-medium transition-all ${
                tab === "templates"
                  ? "bg-surface text-text shadow-sm"
                  : "text-text-secondary hover:text-text"
              }`}
            >
              <LayoutTemplate size={13} />
              Template
              <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                Fast
              </span>
            </button>
            <button
              onClick={() => setTab("clone")}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs font-medium transition-all ${
                tab === "clone"
                  ? "bg-surface text-text shadow-sm"
                  : "text-text-secondary hover:text-text"
              }`}
            >
              <Copy size={13} />
              Clone
            </button>
          </div>

          {/* ── Describe tab ─────────────────────────────────────────────── */}
          {tab === "describe" && (
            <>
              <textarea
                ref={textareaRef}
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                onKeyDown={handleKeyDown}
                onInput={handleInput}
                placeholder="e.g. A customer support agent that handles billing inquiries, processes refunds, and escalates complex issues. It will access our CRM and billing systems, and needs to comply with GDPR since it handles EU customer data."
                disabled={creating}
                rows={3}
                autoFocus
                className="w-full resize-none rounded-xl border border-border bg-surface px-4 py-3 text-sm leading-relaxed text-text placeholder-text-tertiary outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:opacity-50"
              />

              <div className="mt-1.5 flex items-center justify-between">
                <p className="text-[11px] text-text-tertiary">
                  {purposeTrimmed.length < 10
                    ? `${10 - purposeTrimmed.length} more characters needed`
                    : "\u2318 Enter to start"}
                </p>
                {error && <p className="text-[11px] text-red-600 dark:text-red-400">{error}</p>}
              </div>

              {!purpose && (
                <div className="mt-4">
                  <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-text-tertiary">
                    Suggestions
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {STARTER_IDEAS.map((idea) => (
                      <button
                        key={idea.label}
                        onClick={() => handleStarterClick(idea.purpose)}
                        className="rounded-lg border border-border bg-surface px-3 py-2 text-left text-xs text-text-secondary transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                      >
                        {idea.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={handleStart}
                disabled={!canSubmit}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                {creating ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Setting up your session…
                  </>
                ) : (
                  "Start Designing"
                )}
              </button>
            </>
          )}

          {/* ── Templates tab ────────────────────────────────────────────── */}
          {tab === "templates" && (
            <>
              <div className="mb-3 flex items-center gap-2 rounded-lg bg-primary/5 px-3 py-2">
                <Zap size={13} className="shrink-0 text-primary" />
                <p className="text-xs text-text-secondary">
                  Templates come pre-configured with identity, tools, governance, and constraints.
                  Click a template to preview it before use.
                </p>
              </div>

              <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                {BLUEPRINT_TEMPLATES.map((t) => {
                  const tier = TIER_STYLES[t.governanceTier] ?? TIER_STYLES.standard;
                  return (
                    <button
                      key={t.id}
                      onClick={() => handleTemplateClick(t)}
                      className="group flex w-full items-start gap-3 rounded-xl border border-border bg-surface p-4 text-left transition-all hover:border-primary/30 hover:shadow-[var(--shadow-raised)]"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-text group-hover:text-primary transition-colors">
                            {t.name}
                          </span>
                        </div>
                        <p className="text-xs text-text-secondary line-clamp-2 mb-2">
                          {t.description}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${tier.bg} ${tier.text}`}>
                            <Shield size={10} />
                            {tier.label}
                          </span>
                          <span className="rounded-full bg-surface-raised px-2 py-0.5 text-[10px] text-text-tertiary">
                            {CATEGORY_LABELS[t.category] ?? t.category}
                          </span>
                          <span className="rounded-full bg-surface-raised px-2 py-0.5 text-[10px] text-text-tertiary">
                            {t.abp.capabilities.tools.length} tools
                          </span>
                          <span className="rounded-full bg-surface-raised px-2 py-0.5 text-[10px] text-text-tertiary">
                            {t.abp.governance.policies.length} policies
                          </span>
                        </div>
                      </div>
                      <ArrowRight
                        size={16}
                        className="mt-1 shrink-0 text-text-tertiary opacity-0 transition-all group-hover:opacity-100 group-hover:text-primary group-hover:translate-x-0.5"
                      />
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* ── Clone tab ────────────────────────────────────────────────── */}
          {tab === "clone" && (
            <>
              <div className="mb-3 flex items-center gap-2 rounded-lg bg-primary/5 px-3 py-2">
                <Copy size={13} className="shrink-0 text-primary" />
                <p className="text-xs text-text-secondary">
                  Fork an existing agent into a new draft. All tools, policies, and configuration are copied — nothing is shared with the original.
                </p>
              </div>

              {/* Search */}
              <div className="relative mb-3">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                <input
                  type="text"
                  value={cloneSearch}
                  onChange={(e) => setCloneSearch(e.target.value)}
                  placeholder="Search agents…"
                  className="w-full rounded-lg border border-border bg-surface pl-8 pr-3 py-2 text-xs text-text placeholder-text-tertiary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                />
              </div>

              {/* Agent list */}
              {cloneLoading ? (
                <div className="flex items-center justify-center py-8 text-xs text-text-tertiary">Loading agents…</div>
              ) : (
                <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                  {cloneAgents
                    .filter((a) => a.name.toLowerCase().includes(cloneSearch.toLowerCase()))
                    .map((a) => (
                      <button
                        key={a.id}
                        onClick={() => handleCloneSelect(a)}
                        className={`group flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-xs transition-all ${
                          selectedCloneId === a.id
                            ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
                            : "border-border bg-surface hover:border-primary/20 hover:bg-surface-muted"
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-text truncate">{a.name}</p>
                          <p className="text-text-tertiary mt-0.5">v{a.version} · {a.status}</p>
                        </div>
                        {selectedCloneId === a.id && (
                          <span className="shrink-0 text-primary text-[10px] font-medium">Selected</span>
                        )}
                      </button>
                    ))}
                  {cloneAgents.filter((a) => a.name.toLowerCase().includes(cloneSearch.toLowerCase())).length === 0 && (
                    <p className="py-6 text-center text-xs text-text-tertiary">No agents match your search.</p>
                  )}
                </div>
              )}

              {/* New name + clone button */}
              {selectedCloneId && (
                <div className="mt-3 space-y-2">
                  <input
                    type="text"
                    value={cloneName}
                    onChange={(e) => setCloneName(e.target.value)}
                    placeholder="Name for the cloned agent"
                    className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-text placeholder-text-tertiary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                  />
                  {cloneError && <p className="text-xs text-red-600 dark:text-red-400">{cloneError}</p>}
                  <button
                    onClick={handleClone}
                    disabled={!cloneName.trim() || cloning}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                  >
                    {cloning ? (
                      <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Cloning…</>
                    ) : (
                      <><Copy size={14} /> Clone Agent</>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* P2-169: Template preview overlay */}
        {previewTemplate && (
          <TemplatePreviewPanel
            template={previewTemplate}
            onBack={() => setPreviewTemplate(null)}
            onUse={() => handleTemplateUse(previewTemplate.id)}
          />
        )}
      </div>
    </div>
  );
}

// ── P2-169: TemplatePreviewPanel ──────────────────────────────────────────────

function TemplatePreviewPanel({
  template: t,
  onBack,
  onUse,
}: {
  template: BlueprintTemplate;
  onBack: () => void;
  onUse: () => void;
}) {
  const tier = TIER_STYLES[t.governanceTier] ?? TIER_STYLES.standard;
  return (
    <div className="absolute inset-0 z-10 flex flex-col rounded-2xl bg-surface overflow-hidden">
      {/* Preview header */}
      <div className="flex items-center gap-2 border-b border-border px-5 py-3.5 shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-text-secondary hover:bg-surface-muted hover:text-text transition-colors"
        >
          <ArrowLeft size={13} />
          Back
        </button>
        <span className="text-text-tertiary text-xs">·</span>
        <span className="text-xs font-medium text-text truncate">{t.name}</span>
        <span className={`ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0 ${tier.bg} ${tier.text}`}>
          <Shield size={9} />
          {tier.label}
        </span>
      </div>

      {/* Preview body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {/* Description */}
        <div>
          <p className="text-sm text-text leading-relaxed">{t.description}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-surface-raised px-2 py-0.5 text-[10px] text-text-tertiary">
              {CATEGORY_LABELS[t.category] ?? t.category}
            </span>
            {t.tags.slice(0, 4).map((tag) => (
              <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-2 py-0.5 text-[10px] text-text-tertiary">
                <Tag size={8} />
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Persona */}
        {t.abp.identity.persona && (
          <div className="rounded-lg border border-border bg-surface-muted p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary mb-1">Persona</p>
            <p className="text-xs text-text-secondary leading-relaxed line-clamp-3">{t.abp.identity.persona}</p>
          </div>
        )}

        {/* Tools */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Wrench size={12} className="text-text-tertiary" />
            <p className="text-xs font-semibold text-text">
              Tools <span className="font-normal text-text-tertiary">({t.abp.capabilities.tools.length})</span>
            </p>
          </div>
          <div className="space-y-1.5">
            {t.abp.capabilities.tools.map((tool) => (
              <div key={tool.name} className="flex items-start gap-2 rounded-lg border border-border bg-surface p-2.5">
                <span className="mt-0.5 shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-mono font-medium text-primary">
                  {tool.type}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-text">{tool.name}</p>
                  <p className="text-[11px] text-text-secondary mt-0.5 line-clamp-1">{tool.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Governance policies */}
        {t.abp.governance.policies.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Shield size={12} className="text-text-tertiary" />
              <p className="text-xs font-semibold text-text">
                Governance Policies <span className="font-normal text-text-tertiary">({t.abp.governance.policies.length})</span>
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {t.abp.governance.policies.map((p, i) => (
                <span
                  key={i}
                  className="rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] text-text-secondary"
                >
                  {p.type ?? `Policy ${i + 1}`}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Use Template CTA */}
      <div className="shrink-0 border-t border-border px-5 py-4">
        <button
          onClick={onUse}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          Use This Template
          <ArrowRight size={15} />
        </button>
        <p className="mt-2 text-center text-[11px] text-text-tertiary">
          Pre-configured with tools, governance, and constraints. Customize anything before generating.
        </p>
      </div>
    </div>
  );
}

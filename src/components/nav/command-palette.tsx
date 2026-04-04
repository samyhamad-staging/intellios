"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  LayoutDashboard,
  MessageSquare,
  Kanban,
  Library,
  ClipboardList,
  Shield,
  CheckSquare,
  Rocket,
  Activity,
  BarChart3,
  ScrollText,
  Users,
  Settings,
  Webhook,
  Search,
  Bot,
  ShieldCheck,
} from "lucide-react";

// ── Nav item catalogue ──────────────────────────────────────────────────────

interface NavEntry {
  label: string;
  description: string;
  href: string;
  section: string;
  icon: React.ElementType;
  roles: string[];
  keywords: string[];
}

const ALL_ENTRIES: NavEntry[] = [
  {
    label: "Overview",
    description: "Your dashboard and workspace summary",
    href: "/",
    section: "Navigate",
    icon: LayoutDashboard,
    roles: ["all"],
    keywords: ["home", "dashboard", "overview", "summary"],
  },
  {
    label: "Intake",
    description: "Design new agents via AI-guided intake sessions",
    href: "/intake",
    section: "Navigate",
    icon: MessageSquare,
    roles: ["architect", "admin"],
    keywords: ["intake", "new agent", "design", "session", "create"],
  },
  {
    label: "Pipeline Board",
    description: "Kanban view of all agents across lifecycle stages",
    href: "/pipeline",
    section: "Navigate",
    icon: Kanban,
    roles: ["all"],
    keywords: ["pipeline", "kanban", "board", "stages", "draft", "review", "deployed"],
  },
  {
    label: "Agent Registry",
    description: "Browse and manage all agent blueprints",
    href: "/registry",
    section: "Navigate",
    icon: Library,
    roles: ["all"],
    keywords: ["registry", "agents", "blueprints", "library"],
  },
  {
    label: "Review Queue",
    description: "Pending blueprints awaiting human review",
    href: "/review",
    section: "Governance",
    icon: ClipboardList,
    roles: ["reviewer", "compliance_officer", "admin"],
    keywords: ["review", "queue", "pending", "approve", "reject"],
  },
  {
    label: "Governance",
    description: "Enterprise policies and governance rules",
    href: "/governance",
    section: "Governance",
    icon: Shield,
    roles: ["compliance_officer", "admin"],
    keywords: ["governance", "policies", "rules", "enterprise"],
  },
  {
    label: "Compliance",
    description: "Compliance posture, SLA tracking, activity trends",
    href: "/compliance",
    section: "Governance",
    icon: CheckSquare,
    roles: ["compliance_officer", "admin"],
    keywords: ["compliance", "posture", "sla", "risk", "violations"],
  },
  {
    label: "Deploy",
    description: "Manage agent deployments to AgentCore",
    href: "/deploy",
    section: "Operations",
    icon: Rocket,
    roles: ["reviewer", "compliance_officer", "admin"],
    keywords: ["deploy", "deployment", "release", "agentcore"],
  },
  {
    label: "Monitor",
    description: "Live health and performance of deployed agents",
    href: "/monitor",
    section: "Operations",
    icon: Activity,
    roles: ["reviewer", "compliance_officer", "admin"],
    keywords: ["monitor", "health", "performance", "live", "uptime"],
  },
  {
    label: "Dashboard",
    description: "Enterprise analytics and KPI reporting",
    href: "/dashboard",
    section: "Operations",
    icon: BarChart3,
    roles: ["compliance_officer", "admin"],
    keywords: ["dashboard", "analytics", "kpi", "reporting", "metrics"],
  },
  {
    label: "Audit Log",
    description: "Full audit trail of all platform events",
    href: "/audit",
    section: "Operations",
    icon: ScrollText,
    roles: ["compliance_officer", "admin"],
    keywords: ["audit", "log", "trail", "events", "history"],
  },
  {
    label: "Users",
    description: "Manage team members, roles, and invitations",
    href: "/admin/users",
    section: "Administration",
    icon: Users,
    roles: ["admin"],
    keywords: ["users", "team", "roles", "invite", "members"],
  },
  {
    label: "Settings",
    description: "Enterprise branding, policies, and configuration",
    href: "/admin/settings",
    section: "Administration",
    icon: Settings,
    roles: ["admin"],
    keywords: ["settings", "config", "branding", "enterprise"],
  },
  {
    label: "Webhooks",
    description: "Configure outbound webhook integrations",
    href: "/admin/webhooks",
    section: "Administration",
    icon: Webhook,
    roles: ["admin"],
    keywords: ["webhooks", "integrations", "events", "api"],
  },
];

interface AgentResult {
  agentId: string;
  name: string | null;
  status: string;
  version: string;
  tags: string[];
}

const STATUS_DOTS: Record<string, string> = {
  draft: "bg-text-tertiary",
  in_review: "bg-amber-400",
  approved: "bg-green-400",
  deployed: "bg-violet-400",
  rejected: "bg-red-400",
  deprecated: "bg-text-disabled",
};

// P2-584: Policy result shape
interface PolicyResult {
  id: string;
  name: string;
  type: string;
  description?: string | null;
}

const POLICY_TYPE_LABELS: Record<string, string> = {
  safety: "Safety",
  compliance: "Compliance",
  data_handling: "Data Handling",
  access_control: "Access Control",
  audit: "Audit",
};

// ── Component ───────────────────────────────────────────────────────────────

interface Props {
  role: string;
  onClose: () => void;
}

export function CommandPalette({ role, onClose }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [agentResults, setAgentResults] = useState<AgentResult[]>([]);
  const agentFetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // P2-584: Policy search state
  const [policyResults, setPolicyResults] = useState<PolicyResult[]>([]);
  const allPoliciesRef = useRef<PolicyResult[]>([]);
  const policiesFetchedRef = useRef(false);

  const entries = ALL_ENTRIES.filter(
    (e) => e.roles.includes("all") || e.roles.includes(role)
  );

  // Group nav entries by section
  const grouped = new Map<string, NavEntry[]>();
  for (const entry of entries) {
    const arr = grouped.get(entry.section) ?? [];
    arr.push(entry);
    grouped.set(entry.section, arr);
  }

  const fetchAgents = useCallback(async (q: string) => {
    if (q.length < 2) { setAgentResults([]); return; }
    try {
      const res = await fetch("/api/registry");
      if (!res.ok) return;
      const data = await res.json();
      const agents = (data.agents ?? []) as AgentResult[];
      const lq = q.toLowerCase();
      setAgentResults(
        agents
          .filter((a) =>
            (a.name ?? "").toLowerCase().includes(lq) ||
            a.agentId.toLowerCase().includes(lq) ||
            a.tags?.some((t: string) => t.toLowerCase().includes(lq))
          )
          .slice(0, 5)
      );
    } catch { /* non-critical */ }
  }, []);

  // P2-584: Fetch policies once on first open, then filter client-side
  const fetchPolicies = useCallback(async () => {
    if (policiesFetchedRef.current) return;
    policiesFetchedRef.current = true;
    try {
      const res = await fetch("/api/governance/policies");
      if (!res.ok) return;
      const data = await res.json();
      allPoliciesRef.current = (data.policies ?? []) as PolicyResult[];
    } catch { /* non-critical */ }
  }, []);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  useEffect(() => {
    if (agentFetchTimer.current) clearTimeout(agentFetchTimer.current);
    agentFetchTimer.current = setTimeout(() => fetchAgents(query), 200);
    return () => { if (agentFetchTimer.current) clearTimeout(agentFetchTimer.current); };
  }, [query, fetchAgents]);

  // P2-584: Filter policies client-side (no debounce needed — data already loaded)
  useEffect(() => {
    if (query.length < 2) { setPolicyResults([]); return; }
    const lq = query.toLowerCase();
    setPolicyResults(
      allPoliciesRef.current
        .filter((p) =>
          p.name.toLowerCase().includes(lq) ||
          p.type.toLowerCase().includes(lq) ||
          (p.description ?? "").toLowerCase().includes(lq)
        )
        .slice(0, 4)
    );
  }, [query]);

  function navigate(href: string) {
    router.push(href);
    onClose();
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] animate-in fade-in-0 duration-150"
        onClick={onClose}
      />

      {/* Palette */}
      <div className="fixed left-1/2 top-[20vh] z-50 w-full max-w-xl -translate-x-1/2 overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl shadow-black/10 animate-in fade-in-0 zoom-in-95 duration-150">
        <Command
          label="Command palette"
          onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
          shouldFilter
        >
          {/* Search input */}
          <div className="flex items-center gap-3 border-b border-border-subtle px-4 py-3.5">
            <Search size={15} className="shrink-0 text-text-tertiary" />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Search pages, agents, and policies…"
              className="flex-1 bg-transparent text-sm text-text placeholder-text-tertiary focus:outline-none"
            />
            <kbd className="shrink-0 rounded border border-border bg-surface-raised px-1.5 py-0.5 text-2xs font-medium text-text-tertiary">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <Command.List className="max-h-80 overflow-y-auto py-2">
            <Command.Empty className="px-4 py-6 text-center text-sm text-text-tertiary">
              No results for &ldquo;{query}&rdquo;
            </Command.Empty>

            {Array.from(grouped.entries()).map(([section, items]) => (
              <Command.Group key={section} heading={section} className="mb-1 [&_[cmdk-group-heading]]:mb-1 [&_[cmdk-group-heading]]:px-4 [&_[cmdk-group-heading]]:pt-1 [&_[cmdk-group-heading]]:text-2xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-text-tertiary">
                {items.map((entry) => {
                  const Icon = entry.icon;
                  const searchValue = [entry.label, entry.description, ...entry.keywords].join(" ");
                  return (
                    <Command.Item
                      key={entry.href}
                      value={searchValue}
                      onSelect={() => navigate(entry.href)}
                      className="group flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left transition-colors aria-selected:bg-violet-50 hover:bg-surface-raised"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-raised text-text-secondary group-aria-selected:border-violet-200 group-aria-selected:bg-violet-100 group-aria-selected:text-violet-600">
                        <Icon size={14} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-text group-aria-selected:text-violet-700">
                          {entry.label}
                        </p>
                        <p className="truncate text-xs text-text-tertiary">{entry.description}</p>
                      </div>
                    </Command.Item>
                  );
                })}
              </Command.Group>
            ))}

            {agentResults.length > 0 && (
              <Command.Group heading="Agents" className="mb-1 [&_[cmdk-group-heading]]:mb-1 [&_[cmdk-group-heading]]:px-4 [&_[cmdk-group-heading]]:pt-1 [&_[cmdk-group-heading]]:text-2xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-text-tertiary">
                {agentResults.map((agent) => (
                  <Command.Item
                    key={agent.agentId}
                    value={[agent.name ?? "", agent.agentId, ...(agent.tags ?? [])].join(" ")}
                    onSelect={() => navigate(`/registry/${agent.agentId}`)}
                    className="group flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left transition-colors aria-selected:bg-violet-50 hover:bg-surface-raised"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-raised text-text-secondary group-aria-selected:border-violet-200 group-aria-selected:bg-violet-100 group-aria-selected:text-violet-600">
                      <Bot size={14} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-text">
                        {agent.name ?? "Unnamed Agent"}
                      </p>
                      <p className="truncate text-xs text-text-tertiary">
                        <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${STATUS_DOTS[agent.status] ?? "bg-text-disabled"}`} />
                        {agent.status.replace("_", " ")} · v{agent.version}
                        {agent.tags?.length > 0 && ` · ${agent.tags.slice(0, 2).join(", ")}`}
                      </p>
                    </div>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* P2-584: Policy search results */}
            {policyResults.length > 0 && (
              <Command.Group heading="Policies" className="mb-1 [&_[cmdk-group-heading]]:mb-1 [&_[cmdk-group-heading]]:px-4 [&_[cmdk-group-heading]]:pt-1 [&_[cmdk-group-heading]]:text-2xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-text-tertiary">
                {policyResults.map((policy) => (
                  <Command.Item
                    key={policy.id}
                    value={[policy.name, policy.type, policy.description ?? ""].join(" ")}
                    onSelect={() => navigate(`/governance?policy=${policy.id}`)}
                    className="group flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left transition-colors aria-selected:bg-violet-50 hover:bg-surface-raised"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-raised text-text-secondary group-aria-selected:border-violet-200 group-aria-selected:bg-violet-100 group-aria-selected:text-violet-600">
                      <ShieldCheck size={14} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-text group-aria-selected:text-violet-700">
                        {policy.name}
                      </p>
                      <p className="truncate text-xs text-text-tertiary">
                        {POLICY_TYPE_LABELS[policy.type] ?? policy.type}
                        {policy.description && ` · ${policy.description.slice(0, 60)}`}
                      </p>
                    </div>
                  </Command.Item>
                ))}
              </Command.Group>
            )}
          </Command.List>

          {/* Footer hint */}
          <div className="flex items-center gap-3 border-t border-border-subtle px-4 py-2">
            <div className="flex items-center gap-1 text-2xs text-text-tertiary">
              <kbd className="rounded border border-border bg-surface-raised px-1 py-0.5 font-medium">↑↓</kbd>
              <span>navigate</span>
            </div>
            <div className="flex items-center gap-1 text-2xs text-text-tertiary">
              <kbd className="rounded border border-border bg-surface-raised px-1 py-0.5 font-medium">↵</kbd>
              <span>open</span>
            </div>
            <div className="ml-auto flex items-center gap-1 text-2xs text-text-tertiary">
              <kbd className="rounded border border-border bg-surface-raised px-1 py-0.5 font-medium">⌘K</kbd>
              <span>close</span>
            </div>
          </div>
        </Command>
      </div>
    </>
  );
}

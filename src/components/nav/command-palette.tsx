"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
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
  ArrowRight,
  Bot,
} from "lucide-react";

// ── Nav item catalogue ─────────────────────────────────────────────────────────

interface NavEntry {
  label: string;
  description: string;
  href: string;
  section: string;
  icon: React.ElementType;
  roles: string[]; // "all" = every role
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

function matchesRole(entry: NavEntry, role: string): boolean {
  return entry.roles.includes("all") || entry.roles.includes(role);
}

function matchesQuery(entry: NavEntry, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    entry.label.toLowerCase().includes(q) ||
    entry.description.toLowerCase().includes(q) ||
    entry.keywords.some((k) => k.includes(q))
  );
}

// ── Component ──────────────────────────────────────────────────────────────────

interface Props {
  role: string;
  onClose: () => void;
}

interface AgentResult {
  agentId: string;
  name: string | null;
  status: string;
  version: string;
  tags: string[];
}

export function CommandPalette({ role, onClose }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Dynamic agent search
  const [agentResults, setAgentResults] = useState<AgentResult[]>([]);
  const agentFetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Debounced agent search
  useEffect(() => {
    if (agentFetchTimer.current) clearTimeout(agentFetchTimer.current);
    agentFetchTimer.current = setTimeout(() => fetchAgents(query), 200);
    return () => { if (agentFetchTimer.current) clearTimeout(agentFetchTimer.current); };
  }, [query, fetchAgents]);

  const entries = useMemo(() => {
    return ALL_ENTRIES.filter(
      (e) => matchesRole(e, role) && matchesQuery(e, query)
    );
  }, [role, query]);

  // Total items = nav entries + agent results
  const totalItems = entries.length + agentResults.length;

  // Group by section
  const grouped = useMemo(() => {
    const map = new Map<string, NavEntry[]>();
    for (const entry of entries) {
      const arr = map.get(entry.section) ?? [];
      arr.push(entry);
      map.set(entry.section, arr);
    }
    return map;
  }, [entries]);

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Keyboard navigation
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, totalItems - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      }
      if (e.key === "Enter") {
        e.preventDefault();
        if (selectedIndex < entries.length) {
          const entry = entries[selectedIndex];
          if (entry) navigate(entry.href);
        } else {
          const agentIdx = selectedIndex - entries.length;
          const agent = agentResults[agentIdx];
          if (agent) navigate(`/registry/${agent.agentId}`);
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [entries, selectedIndex, onClose, totalItems, agentResults]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.querySelector("[data-selected=true]");
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  function navigate(href: string) {
    router.push(href);
    onClose();
  }

  // Flat index across sections for keyboard selection
  let flatIndex = 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Palette */}
      <div className="fixed left-1/2 top-[20vh] z-50 w-full max-w-xl -translate-x-1/2 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl shadow-black/10">
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3.5">
          <Search size={15} className="shrink-0 text-gray-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages and agents…"
            className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 focus:outline-none"
          />
          <kbd className="shrink-0 rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-2xs font-medium text-gray-400">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-80 overflow-y-auto py-2">
          {totalItems === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-gray-400">
              No results for &ldquo;{query}&rdquo;
            </p>
          ) : (
            <>
            {Array.from(grouped.entries()).map(([section, items]) => (
              <div key={section} className="mb-1">
                <p className="mb-1 px-4 pt-1 text-2xs font-semibold uppercase tracking-widest text-gray-400">
                  {section}
                </p>
                {items.map((entry) => {
                  const Icon = entry.icon;
                  const isSelected = flatIndex === selectedIndex;
                  const currentFlatIndex = flatIndex;
                  flatIndex++;

                  return (
                    <button
                      key={entry.href}
                      data-selected={isSelected}
                      onClick={() => navigate(entry.href)}
                      onMouseEnter={() => setSelectedIndex(currentFlatIndex)}
                      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        isSelected ? "bg-violet-50" : "hover:bg-gray-50"
                      }`}
                    >
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                          isSelected
                            ? "border-violet-200 bg-violet-100 text-violet-600"
                            : "border-gray-200 bg-gray-50 text-gray-500"
                        }`}
                      >
                        <Icon size={14} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-sm font-medium ${
                            isSelected ? "text-violet-700" : "text-gray-800"
                          }`}
                        >
                          {entry.label}
                        </p>
                        <p className="truncate text-xs text-gray-400">
                          {entry.description}
                        </p>
                      </div>
                      {isSelected && (
                        <ArrowRight size={13} className="shrink-0 text-violet-400" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))}

            {/* Agent search results */}
            {agentResults.length > 0 && (
              <div className="mb-1">
                <p className="mb-1 px-4 pt-1 text-2xs font-semibold uppercase tracking-widest text-gray-400">
                  Agents
                </p>
                {agentResults.map((agent, i) => {
                  const agentFlatIndex = entries.length + i;
                  const isSelected = agentFlatIndex === selectedIndex;
                  const STATUS_DOTS: Record<string, string> = {
                    draft: "bg-gray-400", in_review: "bg-amber-400",
                    approved: "bg-green-400", deployed: "bg-violet-400",
                    rejected: "bg-red-400", deprecated: "bg-gray-300",
                  };
                  return (
                    <button
                      key={agent.agentId}
                      data-selected={isSelected}
                      onClick={() => navigate(`/registry/${agent.agentId}`)}
                      onMouseEnter={() => setSelectedIndex(agentFlatIndex)}
                      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        isSelected ? "bg-violet-50" : "hover:bg-gray-50"
                      }`}
                    >
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                          isSelected
                            ? "border-violet-200 bg-violet-100 text-violet-600"
                            : "border-gray-200 bg-gray-50 text-gray-500"
                        }`}
                      >
                        <Bot size={14} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-medium ${isSelected ? "text-violet-700" : "text-gray-800"}`}>
                          {agent.name ?? "Unnamed Agent"}
                        </p>
                        <p className="truncate text-xs text-gray-400">
                          <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${STATUS_DOTS[agent.status] ?? "bg-gray-300"}`} />
                          {agent.status.replace("_", " ")} · v{agent.version}
                          {agent.tags?.length > 0 && ` · ${agent.tags.slice(0, 2).join(", ")}`}
                        </p>
                      </div>
                      {isSelected && (
                        <ArrowRight size={13} className="shrink-0 text-violet-400" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
            </>
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center gap-3 border-t border-gray-100 px-4 py-2">
          <div className="flex items-center gap-1 text-2xs text-gray-400">
            <kbd className="rounded border border-gray-200 bg-gray-50 px-1 py-0.5 font-medium">↑↓</kbd>
            <span>navigate</span>
          </div>
          <div className="flex items-center gap-1 text-2xs text-gray-400">
            <kbd className="rounded border border-gray-200 bg-gray-50 px-1 py-0.5 font-medium">↵</kbd>
            <span>open</span>
          </div>
          <div className="ml-auto flex items-center gap-1 text-2xs text-gray-400">
            <kbd className="rounded border border-gray-200 bg-gray-50 px-1 py-0.5 font-medium">⌘K</kbd>
            <span>close</span>
          </div>
        </div>
      </div>
    </>
  );
}
